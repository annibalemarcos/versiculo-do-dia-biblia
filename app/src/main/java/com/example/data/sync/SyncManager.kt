package com.example.data.sync

import android.content.Context
import android.util.Log
import com.example.core.auth.TokenManager
import com.example.core.config.AppConfig
import com.example.core.datastore.AppThemeMode
import com.example.core.datastore.PreferencesManager
import com.example.core.datastore.TextScale
import com.example.data.local.db.*
import com.example.data.remote.*
import com.example.data.repository.ConfigRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

sealed class SyncState {
    object Idle : SyncState()
    object Syncing : SyncState()
    data class Success(val message: String = "Tudo atualizado", val timestamp: Long = System.currentTimeMillis()) : SyncState()
    data class Error(val message: String = "Offline — sincronizaremos automaticamente") : SyncState()
    object UpToDate : SyncState()
    object PendingConnection : SyncState()
    object Offline : SyncState()

    fun getDisplayMessage(): String {
        return when (this) {
            is Syncing -> "Sincronizando..."
            is UpToDate -> "Tudo atualizado"
            is PendingConnection -> "Alterações aguardando conexão"
            is Offline -> "Offline — sincronizaremos automaticamente"
            is Success -> message
            is Error -> message
            is Idle -> "Tudo atualizado"
        }
    }
}

data class RemoteContentResult(
    val configSuccess: Boolean = false,
    val dailyVerseSuccess: Boolean = false,
    val themesSuccess: Boolean = false,
    val devotionalsSuccess: Boolean = false,
    val versesSuccess: Boolean = false,
    val updatedCount: Int = 0
) {
    val isAnySuccessful: Boolean get() = configSuccess || dailyVerseSuccess || themesSuccess || devotionalsSuccess || versesSuccess
}

class SyncManager(
    private val context: Context,
    private val database: AppDatabase,
    private val apiService: BibleApiService,
    private val preferencesManager: PreferencesManager,
    private val tokenManager: TokenManager,
    private val configRepository: ConfigRepository,
    private val syncScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
) {
    companion object {
        private const val TAG = "SyncManager"
    }

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState: StateFlow<SyncState> = _syncState.asStateFlow()

    private val syncMutex = Mutex()
    private var activeSyncDeferred: Deferred<Boolean>? = null

    private val dailyVerseDao = database.dailyVerseDao()
    private val verseDao = database.verseDao()
    private val favoriteDao = database.favoriteDao()
    private val historyDao = database.historyDao()
    private val devotionalDao = database.devotionalDao()
    private val themeEmotionDao = database.themeEmotionDao()
    private val syncQueueDao = database.syncQueueDao()
    private val notificationDao = database.notificationDao()

    suspend fun syncAll(isManualTrigger: Boolean = false): Boolean {
        val deferred: Deferred<Boolean> = syncMutex.withLock {
            val current = activeSyncDeferred
            if (current != null && current.isActive) {
                Log.d(TAG, "Sync already in progress. Consolidating concurrent syncAll caller into active execution.")
                current
            } else {
                lateinit var newDeferred: Deferred<Boolean>
                newDeferred = syncScope.async {
                    try {
                        executeSyncInternal(isManualTrigger)
                    } finally {
                        syncMutex.withLock {
                            if (activeSyncDeferred === newDeferred) {
                                activeSyncDeferred = null
                            }
                        }
                    }
                }
                activeSyncDeferred = newDeferred
                newDeferred
            }
        }

        return try {
            deferred.await()
        } catch (c: kotlinx.coroutines.CancellationException) {
            throw c
        } catch (e: Exception) {
            Log.w(TAG, "Exception while awaiting syncAll execution: ${e.message}")
            false
        }
    }

    private suspend fun executeSyncInternal(isManualTrigger: Boolean): Boolean = withContext(Dispatchers.IO) {
        _syncState.value = SyncState.Syncing
        Log.d(TAG, "Starting full synchronization (manual: $isManualTrigger)...")

        try {
            val pendingBefore = try { syncQueueDao.getTotalPendingCount() } catch (_: Exception) { 0 }

            // 1. Download and refresh all remote content (Config, Daily Verse, Themes, Emotions, Devotionals)
            val remoteResult = refreshRemoteContent()

            // 2. Upload pending offline mutations & user favorites
            val pushedCount = pushPendingChanges()

            val pendingAfter = try { syncQueueDao.getTotalPendingCount() } catch (_: Exception) { 0 }

            if (!remoteResult.isAnySuccessful && pushedCount == 0) {
                // Network unreachable or server down
                val errorMsg = if (pendingBefore > 0) {
                    "Alterações aguardando conexão"
                } else {
                    "Offline — sincronizaremos automaticamente"
                }
                Log.d(TAG, "Sync incomplete: $errorMsg")
                _syncState.value = SyncState.Error(errorMsg)
                return@withContext false
            }

            val successMsg = if (pendingAfter > 0) {
                "Alterações aguardando conexão"
            } else {
                "Tudo atualizado"
            }

            _syncState.value = SyncState.Success(successMsg)
            return@withContext true
        } catch (e: Exception) {
            Log.d(TAG, "Sync note: ${e.javaClass.simpleName} - ${e.message}")
            val pendingCount = try { syncQueueDao.getTotalPendingCount() } catch (_: Exception) { 0 }
            val errorMsg = if (pendingCount > 0) "Alterações aguardando conexão" else "Offline — sincronizaremos automaticamente"
            _syncState.value = SyncState.Error(errorMsg)
            return@withContext false
        }
    }

    suspend fun refreshRemoteContent(): RemoteContentResult = withContext(Dispatchers.IO) {
        var updatedCount = 0
        val configOk = syncConfig()
        if (configOk) updatedCount++

        val dailyOk = syncDailyVerse()
        if (dailyOk) updatedCount++

        val themesOk = syncThemesAndEmotions()
        if (themesOk) updatedCount++

        val devOk = syncDevotionals()
        if (devOk) updatedCount++

        val versesOk = syncVerses()
        if (versesOk) updatedCount++

        RemoteContentResult(
            configSuccess = configOk,
            dailyVerseSuccess = dailyOk,
            themesSuccess = themesOk,
            devotionalsSuccess = devOk,
            versesSuccess = versesOk,
            updatedCount = updatedCount
        )
    }

    suspend fun pushPendingChanges(): Int = withContext(Dispatchers.IO) {
        var pushedCount = 0
        try {
            // Process queue
            processPendingQueue()

            val token = tokenManager.getAccessToken()
            if (!token.isNullOrBlank()) {
                val favsCount = syncUserFavorites()
                pushedCount += favsCount
                syncUserPreferences()
                syncBillingEntitlements()
                syncNotifications()
            }
        } catch (e: Exception) {
            Log.w(TAG, "pushPendingChanges error: ${e.message}")
        }
        return@withContext pushedCount
    }

    suspend fun syncConfig(): Boolean = withContext(Dispatchers.IO) {
        try {
            configRepository.fetchRemoteConfig()
            configRepository.isLastFetchSuccessful
        } catch (e: Exception) {
            Log.w(TAG, "Config sync failed: ${e.message}")
            false
        }
    }

    suspend fun syncDailyVerse(): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getDailyVerse()
            if (response.isSuccessful && response.body()?.data != null) {
                val data = response.body()!!.data!!
                val entity = DailyVerseEntity(
                    dateStr = data.targetDate.ifBlank { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) },
                    verseId = data.verseId.ifBlank { data.id },
                    reference = data.reference,
                    text = data.text,
                    translation = data.translation,
                    reflection = data.reflectionText ?: "",
                    theme = data.themeName ?: "Esperança",
                    cachedAt = System.currentTimeMillis()
                )
                dailyVerseDao.insertDailyVerse(entity)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Daily verse sync failed: ${e.message}")
            false
        }
    }

    suspend fun syncThemesAndEmotions(): Boolean = withContext(Dispatchers.IO) {
        try {
            val themesResp = apiService.getThemes()
            if (themesResp.isSuccessful && themesResp.body()?.data != null) {
                val themes = themesResp.body()!!.data!!.map {
                    ThemeEntity(
                        id = it.id,
                        name = it.name,
                        iconName = it.iconName ?: "favorite",
                        description = it.description ?: ""
                    )
                }
                themeEmotionDao.insertThemes(themes)
            }

            val emotionsResp = apiService.getEmotions()
            if (emotionsResp.isSuccessful && emotionsResp.body()?.data != null) {
                val emotions = emotionsResp.body()!!.data!!.map {
                    EmotionEntity(
                        id = it.id,
                        name = it.name,
                        emoji = it.iconName ?: "🕊️",
                        description = it.description ?: ""
                    )
                }
                themeEmotionDao.insertEmotions(emotions)
            }
            true
        } catch (e: Exception) {
            Log.w(TAG, "Themes/Emotions sync failed: ${e.message}")
            false
        }
    }

    suspend fun syncDevotionals(): Boolean = withContext(Dispatchers.IO) {
        try {
            val resp = apiService.getDevotionals()
            if (resp.isSuccessful && resp.body()?.data != null) {
                val dtoList = resp.body()!!.data!!
                val devList = dtoList.map { dto ->
                    DevotionalEntity(
                        id = dto.id,
                        title = dto.title,
                        description = dto.description ?: "",
                        coverUrl = dto.coverImageUrl ?: "",
                        totalDays = dto.totalDays,
                        isPremium = dto.isPremium
                    )
                }
                devotionalDao.insertDevotionals(devList)

                // Also fetch full daily content for each devotional
                for (dto in dtoList) {
                    try {
                        val detailResp = apiService.getDevotionalDetail(dto.id)
                        if (detailResp.isSuccessful && detailResp.body()?.data?.days != null) {
                            val daysList = detailResp.body()!!.data!!.days.map { dayDto ->
                                DevotionalDayEntity(
                                    id = "${dto.id}_d${dayDto.dayNumber}",
                                    devotionalId = dto.id,
                                    dayNumber = dayDto.dayNumber,
                                    title = dayDto.title,
                                    scriptureRef = dayDto.verseReference,
                                    scriptureText = dayDto.verseText,
                                    reflection = dayDto.reflection,
                                    prayer = dayDto.prayer ?: "",
                                    isCompleted = false
                                )
                            }
                            devotionalDao.insertDays(daysList)
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to sync days for devotional ${dto.id}: ${e.message}")
                    }
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Devotionals sync failed: ${e.message}")
            false
        }
    }

    suspend fun syncVerses(): Boolean = withContext(Dispatchers.IO) {
        try {
            val resp = apiService.getVerses(limit = 100)
            if (resp.isSuccessful && resp.body()?.data != null) {
                val dtoList = resp.body()!!.data!!
                val entities = dtoList.map { dto ->
                    VerseEntity(
                        id = dto.id,
                        bookName = dto.reference.split(" ").firstOrNull() ?: "Bíblia",
                        chapter = dto.chapter,
                        verseNumber = dto.verseNumber,
                        text = dto.text,
                        translation = dto.translation,
                        theme = "",
                        emotion = "",
                        reflection = "",
                        isDaily = false
                    )
                }
                verseDao.insertVerses(entities)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sync verses failed: ${e.message}")
            false
        }
    }

    suspend fun syncUserFavorites(): Int = withContext(Dispatchers.IO) {
        var mergedCount = 0
        try {
            val userId = preferencesManager.getCurrentUserIdDirect()

            // 1. Fetch remote favorites from FastAPI
            val resp = apiService.getUserFavorites()
            val remoteFavorites = if (resp.isSuccessful && resp.body()?.data != null) {
                resp.body()!!.data!!
            } else {
                emptyList()
            }

            // 2. Fetch local favorites from Room for current user
            val localFavorites = favoriteDao.getAllFavoritesList(userId)
            val localIds = localFavorites.map { it.verseId }.toSet()
            val remoteIds = remoteFavorites.map { it.verseId }.toSet()

            // 3. Save remote items to Room (union merge)
            val newFromRemote = remoteFavorites.filter { it.verseId !in localIds }.map { dto ->
                FavoriteEntity(
                    verseId = dto.verseId,
                    userId = userId,
                    reference = dto.reference,
                    text = dto.text,
                    translation = dto.translation,
                    reflection = dto.reflection ?: "",
                    theme = dto.theme ?: "",
                    savedAt = System.currentTimeMillis(),
                    isSynced = true
                )
            }
            if (newFromRemote.isNotEmpty()) {
                favoriteDao.insertFavorites(newFromRemote)
                mergedCount += newFromRemote.size
            }

            // 4. Upload un-synced local favorites to FastAPI backend
            val unSyncedLocal = localFavorites.filter { !it.isSynced || it.verseId !in remoteIds }
            for (fav in unSyncedLocal) {
                try {
                    apiService.addUserFavorite(
                        FavoriteItemDto(
                            verseId = fav.verseId,
                            reference = fav.reference,
                            text = fav.text,
                            translation = fav.translation,
                            reflection = fav.reflection,
                            theme = fav.theme
                        )
                    )
                    favoriteDao.markFavoriteSynced(fav.verseId, userId)
                    mergedCount++
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to upload local favorite ${fav.verseId}: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sync user favorites failed: ${e.message}")
        }
        return@withContext mergedCount
    }

    suspend fun syncUserPreferences() = withContext(Dispatchers.IO) {
        try {
            val currentMode = preferencesManager.themeMode.first()
            val currentScale = preferencesManager.textScale.first()
            val currentTrans = preferencesManager.preferredTranslation.first()
            val currentNotif = preferencesManager.isNotificationsEnabled.first()
            val (hour, min) = preferencesManager.notificationTime.first()

            // Update backend preferences
            apiService.updatePreferences(
                PreferenceDto(
                    themeMode = currentMode.name,
                    textScale = currentScale.name,
                    preferredTranslation = currentTrans,
                    notificationsEnabled = currentNotif,
                    notificationHour = hour,
                    notificationMinute = min
                )
            )
        } catch (e: Exception) {
            Log.w(TAG, "Sync user preferences failed: ${e.message}")
        }
    }

    suspend fun syncBillingEntitlements() = withContext(Dispatchers.IO) {
        try {
            val resp = apiService.getBillingStatus()
            if (resp.isSuccessful && resp.body()?.data != null) {
                val data = resp.body()!!.data!!
                preferencesManager.setPremiumStatus(data.isPremium)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sync billing status failed: ${e.message}")
        }
    }

    suspend fun syncNotifications() = withContext(Dispatchers.IO) {
        try {
            val resp = apiService.getNotifications(limit = 50)
            if (resp.isSuccessful && resp.body()?.data != null) {
                val dtoList = resp.body()!!.data!!
                val userId = preferencesManager.getCurrentUserIdDirect()
                val entities = dtoList.map { dto ->
                    NotificationEntity(
                        id = dto.id,
                        userId = userId,
                        title = dto.title,
                        message = dto.message,
                        type = dto.type,
                        deepLink = dto.deepLink,
                        isRead = dto.isRead,
                        createdAt = dto.createdAt ?: "",
                        receivedAt = System.currentTimeMillis()
                    )
                }
                notificationDao.insertNotifications(entities)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sync notifications failed: ${e.message}")
        }
    }

    suspend fun processPendingQueue() = withContext(Dispatchers.IO) {
        try {
            val userId = preferencesManager.getCurrentUserIdDirect()
            val pendingItems = syncQueueDao.getAllPending(userId)
            for (item in pendingItems) {
                var processed = false
                try {
                    when (item.actionType) {
                        "ADD_FAVORITE" -> {
                            val fav = favoriteDao.getAllFavoritesList(userId).find { it.verseId == item.payloadJson }
                            if (fav != null) {
                                val res = apiService.addUserFavorite(
                                    FavoriteItemDto(
                                        verseId = fav.verseId,
                                        reference = fav.reference,
                                        text = fav.text,
                                        translation = fav.translation,
                                        reflection = fav.reflection,
                                        theme = fav.theme
                                    )
                                )
                                processed = res.isSuccessful
                            } else {
                                processed = true // deleted already
                            }
                        }
                        "REMOVE_FAVORITE" -> {
                            val res = apiService.removeUserFavorite(item.payloadJson)
                            processed = res.isSuccessful || res.code() == 404
                        }
                        else -> {
                            processed = true
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error processing pending item ${item.id}: ${e.message}")
                    processed = false
                }

                if (processed) {
                    syncQueueDao.deleteSyncItem(item.id)
                } else {
                    syncQueueDao.incrementRetryCount(item.id)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Process pending queue error: ${e.message}")
        }
    }
}

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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

sealed class SyncState {
    object Idle : SyncState()
    object Syncing : SyncState()
    data class Success(val message: String, val timestamp: Long = System.currentTimeMillis()) : SyncState()
    data class Error(val message: String) : SyncState()
}

data class RemoteContentResult(
    val configSuccess: Boolean = false,
    val dailyVerseSuccess: Boolean = false,
    val themesSuccess: Boolean = false,
    val devotionalsSuccess: Boolean = false,
    val updatedCount: Int = 0
) {
    val isAnySuccessful: Boolean get() = configSuccess || dailyVerseSuccess || themesSuccess || devotionalsSuccess
}

class SyncManager(
    private val context: Context,
    private val database: AppDatabase,
    private val apiService: BibleApiService,
    private val preferencesManager: PreferencesManager,
    private val tokenManager: TokenManager,
    private val configRepository: ConfigRepository
) {
    companion object {
        private const val TAG = "SyncManager"
    }

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState: StateFlow<SyncState> = _syncState.asStateFlow()

    private val dailyVerseDao = database.dailyVerseDao()
    private val verseDao = database.verseDao()
    private val favoriteDao = database.favoriteDao()
    private val historyDao = database.historyDao()
    private val devotionalDao = database.devotionalDao()
    private val themeEmotionDao = database.themeEmotionDao()
    private val syncQueueDao = database.syncQueueDao()
    private val notificationDao = database.notificationDao()
    private val syncMetadataDao = database.syncMetadataDao()

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val pendingQueueCount: Flow<Int> = preferencesManager.currentUserId.flatMapLatest { userId ->
        syncQueueDao.getPendingCount(userId)
    }

    suspend fun getPendingCountDirect(): Int {
        val userId = preferencesManager.getCurrentUserIdDirect()
        return syncQueueDao.getPendingCountDirect(userId)
    }

    suspend fun getLastSyncTime(): Long {
        return syncMetadataDao.getMetadata("last_sync_time")?.toLongOrNull() ?: 0L
    }

    suspend fun syncAll(isManualTrigger: Boolean = false): Boolean = withContext(Dispatchers.IO) {
        _syncState.value = SyncState.Syncing
        Log.d(TAG, "Starting full synchronization (manual: $isManualTrigger, url: ${AppConfig.getApiBaseUrl()})...")

        try {
            // 1. Download and refresh all remote content (Config, Daily Verse, Themes, Emotions, Devotionals)
            val remoteResult = refreshRemoteContent()

            // 2. Upload pending offline mutations & user favorites
            val pushedCount = pushPendingChanges()

            val token = tokenManager.getAccessToken()

            if (!remoteResult.isAnySuccessful && pushedCount == 0) {
                // Network unreachable or server down
                val errorMsg = "Servidor offline ou inacessível (${AppConfig.getApiBaseUrl()}). Modo offline ativo."
                Log.d(TAG, errorMsg)
                _syncState.value = if (isManualTrigger) SyncState.Error(errorMsg) else SyncState.Idle
                return@withContext false
            }

            val parts = mutableListOf<String>()
            if (remoteResult.updatedCount > 0) {
                parts.add("Conteúdo remoto atualizado (${remoteResult.updatedCount} módulos sincronizados)")
            }
            if (pushedCount > 0) {
                parts.add("$pushedCount alterações locais enviadas à nuvem")
            } else if (!token.isNullOrBlank()) {
                parts.add("Dados do usuário sincronizados")
            }

            val successMsg = if (parts.isNotEmpty()) {
                parts.joinToString(". ") + "."
            } else {
                "Sincronização concluída com sucesso."
            }

            try {
                syncMetadataDao.setMetadata(SyncMetadataEntity("last_sync_time", System.currentTimeMillis().toString()))
            } catch (e: Exception) {
                Log.w(TAG, "Could not persist sync metadata: ${e.message}")
            }

            _syncState.value = SyncState.Success(successMsg)
            return@withContext true
        } catch (e: Exception) {
            Log.d(TAG, "Sync note: ${e.javaClass.simpleName} - ${e.message}")
            val errorMsg = "Servidor offline ou inacessível (${AppConfig.getApiBaseUrl()}). Modo offline ativo."
            _syncState.value = if (isManualTrigger) SyncState.Error(errorMsg) else SyncState.Idle
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

        RemoteContentResult(
            configSuccess = configOk,
            dailyVerseSuccess = dailyOk,
            themesSuccess = themesOk,
            devotionalsSuccess = devOk,
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
            true
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
                var errorReason: String? = null
                try {
                    val action = when {
                        item.actionType.isNotBlank() -> item.actionType
                        item.entityType.equals("favorite", ignoreCase = true) && item.operation.equals("DELETE", ignoreCase = true) -> "REMOVE_FAVORITE"
                        item.entityType.equals("favorite", ignoreCase = true) -> "ADD_FAVORITE"
                        else -> item.actionType
                    }

                    val targetVerseId = if (item.payloadJson.isNotBlank()) item.payloadJson else item.entityId

                    when (action) {
                        "ADD_FAVORITE" -> {
                            val fav = favoriteDao.getAllFavoritesList(userId).find { it.verseId == targetVerseId }
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
                                if (!processed) errorReason = "HTTP ${res.code()}"
                            } else {
                                processed = true // deleted or not found
                            }
                        }
                        "REMOVE_FAVORITE" -> {
                            val res = apiService.removeUserFavorite(targetVerseId)
                            processed = res.isSuccessful || res.code() == 404
                            if (!processed) errorReason = "HTTP ${res.code()}"
                        }
                        else -> {
                            processed = true
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error processing pending item ${item.id}: ${e.message}")
                    processed = false
                    errorReason = e.message ?: "Network error"
                }

                if (processed) {
                    syncQueueDao.deleteSyncItem(item.id)
                } else {
                    syncQueueDao.updateSyncItemStatus(
                        id = item.id,
                        status = "FAILED",
                        retryCount = item.retryCount + 1,
                        lastError = errorReason
                    )
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Process pending queue error: ${e.message}")
        }
    }
}

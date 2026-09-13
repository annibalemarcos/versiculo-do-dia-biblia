package com.example.data.repository

import android.content.Context
import android.util.Log
import com.example.core.auth.TokenManager
import com.example.core.datastore.PreferencesManager
import com.example.data.local.SeedData
import com.example.data.local.db.*
import com.example.data.remote.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BibleRepository(
    private val database: AppDatabase,
    private val apiService: BibleApiService
) {
    private val verseDao = database.verseDao()
    private val dailyVerseDao = database.dailyVerseDao()
    private val themeEmotionDao = database.themeEmotionDao()

    suspend fun initializeOfflineSeed() {
        withContext(Dispatchers.IO) {
            val count = verseDao.getCount()
            if (count == 0) {
                verseDao.insertVerses(SeedData.sampleVerses)
                dailyVerseDao.insertDailyVerse(SeedData.getTodayDailyVerse())
                themeEmotionDao.insertThemes(SeedData.initialThemes)
                themeEmotionDao.insertEmotions(SeedData.initialEmotions)
                database.devotionalDao().insertDevotionals(SeedData.sampleDevotionals)
                database.devotionalDao().insertDays(SeedData.sampleDevotionalDays)
            }
        }
    }

    fun getDailyVerseFlow(): Flow<DailyVerseEntity?> = dailyVerseDao.getLatestDailyVerse()

    suspend fun refreshDailyVerse(): Result<DailyVerseEntity> = withContext(Dispatchers.IO) {
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
                Result.success(entity)
            } else {
                val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                val local = dailyVerseDao.getDailyVerseByDate(todayStr)
                    ?: dailyVerseDao.getLatestDailyVerseDirect()
                    ?: SeedData.getTodayDailyVerse().also { dailyVerseDao.insertDailyVerse(it) }
                Result.success(local)
            }
        } catch (e: Exception) {
            Log.w("BibleRepository", "Network unreachable, using cached Room database: ${e.message}")
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val local = dailyVerseDao.getDailyVerseByDate(todayStr)
                ?: dailyVerseDao.getLatestDailyVerseDirect()
                ?: SeedData.getTodayDailyVerse().also { dailyVerseDao.insertDailyVerse(it) }
            Result.success(local)
        }
    }

    fun getThemes(): Flow<List<ThemeEntity>> = themeEmotionDao.getAllThemes()
    fun getEmotions(): Flow<List<EmotionEntity>> = themeEmotionDao.getAllEmotions()

    fun getVersesByTheme(theme: String): Flow<List<VerseEntity>> = verseDao.getVersesByTheme(theme)
    fun getVersesByEmotion(emotion: String): Flow<List<VerseEntity>> = verseDao.getVersesByEmotion(emotion)
    fun searchVerses(query: String): Flow<List<VerseEntity>> = verseDao.searchVerses(query)

    suspend fun getVerseById(id: String): VerseEntity? = withContext(Dispatchers.IO) {
        verseDao.getVerseById(id)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class FavoriteRepository(
    private val favoriteDao: FavoriteDao,
    private val syncQueueDao: SyncQueueDao,
    private val apiService: BibleApiService,
    private val tokenManager: TokenManager,
    private val preferencesManager: PreferencesManager,
    private val context: Context? = null
) {
    private suspend fun getUserId(): String = preferencesManager.getCurrentUserIdDirect()

    fun getAllFavorites(): Flow<List<FavoriteEntity>> = preferencesManager.currentUserId.flatMapLatest { userId ->
        favoriteDao.getAllFavorites(userId)
    }

    fun isFavorite(verseId: String): Flow<Boolean> = preferencesManager.currentUserId.flatMapLatest { userId ->
        favoriteDao.isFavorite(verseId, userId)
    }

    suspend fun toggleFavorite(
        verseId: String,
        reference: String,
        text: String,
        translation: String,
        reflection: String = "",
        theme: String = ""
    ): Boolean = withContext(Dispatchers.IO) {
        val userId = getUserId()
        val exists = favoriteDao.isFavoriteDirect(verseId, userId)
        if (exists) {
            favoriteDao.deleteFavorite(verseId, userId)
            queueOrExecuteSync(verseId, isAdd = false, userId = userId)
            false
        } else {
            val fav = FavoriteEntity(
                verseId = verseId,
                userId = userId,
                reference = reference,
                text = text,
                translation = translation,
                reflection = reflection,
                theme = theme,
                savedAt = System.currentTimeMillis(),
                isSynced = false
            )
            favoriteDao.insertFavorite(fav)
            queueOrExecuteSync(verseId, isAdd = true, favorite = fav, userId = userId)
            true
        }
    }

    suspend fun deleteFavorite(verseId: String) = withContext(Dispatchers.IO) {
        val userId = getUserId()
        favoriteDao.deleteFavorite(verseId, userId)
        queueOrExecuteSync(verseId, isAdd = false, userId = userId)
    }

    private suspend fun queueOrExecuteSync(verseId: String, isAdd: Boolean, favorite: FavoriteEntity? = null, userId: String) {
        val token = tokenManager.getAccessToken()
        if (!token.isNullOrBlank()) {
            try {
                if (isAdd && favorite != null) {
                    val res = apiService.addUserFavorite(
                        FavoriteItemDto(
                            verseId = favorite.verseId,
                            reference = favorite.reference,
                            text = favorite.text,
                            translation = favorite.translation,
                            reflection = favorite.reflection,
                            theme = favorite.theme
                        )
                    )
                    if (res.isSuccessful) {
                        favoriteDao.markFavoriteSynced(verseId, userId)
                        return
                    }
                } else if (!isAdd) {
                    val res = apiService.removeUserFavorite(verseId)
                    if (res.isSuccessful || res.code() == 404) {
                        return
                    }
                }
            } catch (e: Exception) {
                Log.d("FavoriteRepository", "Network offline, queueing sync action: ${e.message}")
            }
        }
        // Save to offline pending queue
        syncQueueDao.insertSyncItem(
            SyncQueueEntity(
                userId = userId,
                actionType = if (isAdd) "ADD_FAVORITE" else "REMOVE_FAVORITE",
                payloadJson = verseId
            )
        )
        context?.let { ctx ->
            try {
                com.example.data.sync.SyncWorker.enqueueImmediateSync(ctx)
            } catch (e: Exception) {
                Log.w("FavoriteRepository", "Could not trigger SyncWorker: ${e.message}")
            }
        }
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class HistoryRepository(
    private val historyDao: HistoryDao,
    private val apiService: BibleApiService? = null,
    private val tokenManager: TokenManager? = null,
    private val preferencesManager: PreferencesManager? = null
) {
    fun getRecentHistory(): Flow<List<HistoryEntity>> {
        return preferencesManager?.currentUserId?.flatMapLatest { userId ->
            historyDao.getRecentHistory(userId)
        } ?: historyDao.getRecentHistory("guest")
    }

    suspend fun addHistory(verseId: String, reference: String, text: String, translation: String, source: String = "home") {
        withContext(Dispatchers.IO) {
            val userId = preferencesManager?.getCurrentUserIdDirect() ?: "guest"
            val entity = HistoryEntity(
                userId = userId,
                verseId = verseId,
                reference = reference,
                text = text,
                translation = translation,
                source = source,
                viewedAt = System.currentTimeMillis()
            )
            historyDao.insertHistory(entity)

            val token = tokenManager?.getAccessToken()
            if (!token.isNullOrBlank() && apiService != null) {
                try {
                    apiService.addReadingHistory(
                        ReadingHistoryDto(
                            verseId = verseId,
                            reference = reference,
                            text = text,
                            translation = translation
                        )
                    )
                } catch (e: Exception) {
                    Log.d("HistoryRepository", "Offline history recorded locally")
                }
            }
        }
    }

    suspend fun clearHistory() {
        withContext(Dispatchers.IO) {
            val userId = preferencesManager?.getCurrentUserIdDirect() ?: "guest"
            historyDao.clearHistory(userId)
        }
    }
}

class DevotionalRepository(
    private val devotionalDao: DevotionalDao
) {
    fun getAllDevotionals(): Flow<List<DevotionalEntity>> = devotionalDao.getAllDevotionals()

    fun getDaysForDevotional(devotionalId: String): Flow<List<DevotionalDayEntity>> =
        devotionalDao.getDaysForDevotional(devotionalId)

    suspend fun getDevotionalById(id: String): DevotionalEntity? = withContext(Dispatchers.IO) {
        devotionalDao.getDevotionalById(id)
    }

    suspend fun markDayCompleted(dayId: String, devotionalId: String, currentDay: Int, totalDays: Int) {
        withContext(Dispatchers.IO) {
            devotionalDao.setDayCompleted(dayId, true)
            val isCompleted = currentDay >= totalDays
            val nextDay = if (currentDay < totalDays) currentDay + 1 else totalDays
            devotionalDao.updateDevotionalProgress(devotionalId, nextDay, isCompleted)
        }
    }
}

class AuthRepository(
    private val apiService: BibleApiService,
    private val tokenManager: TokenManager,
    private val preferencesManager: PreferencesManager,
    private val database: AppDatabase,
    private val context: Context? = null
) {
    val currentUserProfile = preferencesManager.userProfile

    private fun parseApiError(rawError: String?, defaultMsg: String): String {
        if (rawError.isNullOrBlank()) return defaultMsg
        return try {
            val json = org.json.JSONObject(rawError)
            if (json.has("error")) {
                val errObj = json.optJSONObject("error")
                errObj?.optString("message") ?: json.optString("error", defaultMsg)
            } else if (json.has("detail")) {
                json.optString("detail", defaultMsg)
            } else if (json.has("message")) {
                json.optString("message", defaultMsg)
            } else {
                defaultMsg
            }
        } catch (_: Exception) {
            defaultMsg
        }
    }

    suspend fun register(name: String, email: String, pass: String): Result<UserDto> = withContext(Dispatchers.IO) {
        try {
            val resp = apiService.register(
                UserRegisterRequest(
                    email = email.trim(),
                    password = pass,
                    name = name.trim().ifEmpty { email.trim().substringBefore("@") }
                )
            )
            if (resp.isSuccessful && resp.body()?.data != null) {
                val data = resp.body()!!.data!!
                val user = data.user
                val finalName = user?.name ?: name.trim().ifEmpty { email.substringBefore("@") }
                val finalEmail = user?.email ?: email.trim()
                val isPrem = user?.isPremium ?: false
                val userId = user?.id ?: "user_${System.currentTimeMillis()}"
                tokenManager.saveTokens(
                    accessToken = data.accessToken,
                    refreshToken = data.refreshToken,
                    name = finalName,
                    email = finalEmail,
                    isPremium = isPrem,
                    userId = userId
                )
                context?.let { ctx ->
                    try {
                        com.example.data.sync.SyncWorker.enqueueImmediateSync(ctx, replaceExisting = true)
                    } catch (e: Exception) {
                        Log.w("AuthRepository", "SyncWorker enqueue after register note: ${e.message}")
                    }
                }
                Result.success(user ?: UserDto(id = userId, email = finalEmail, name = finalName, isPremium = isPrem))
            } else {
                val rawError = resp.errorBody()?.string()
                val fallbackMsg = when (resp.code()) {
                    409 -> "Este e-mail já está cadastrado no sistema."
                    422 -> "Dados de cadastro inválidos."
                    else -> "Erro ao cadastrar usuário (${resp.code()})"
                }
                val errorMsg = parseApiError(rawError, fallbackMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("AuthRepository", "Register failed", e)
            Result.failure(Exception(e.message ?: "Falha de conexão com o servidor."))
        }
    }

    suspend fun login(email: String, pass: String): Result<UserDto> = withContext(Dispatchers.IO) {
        try {
            val resp = apiService.login(
                UserLoginRequest(
                    email = email.trim(),
                    password = pass
                )
            )
            if (resp.isSuccessful && resp.body()?.data != null) {
                val data = resp.body()!!.data!!
                val user = data.user
                val finalName = user?.name ?: email.trim().substringBefore("@")
                val finalEmail = user?.email ?: email.trim()
                val isPrem = user?.isPremium ?: false
                val userId = user?.id ?: "user_${System.currentTimeMillis()}"
                tokenManager.saveTokens(
                    accessToken = data.accessToken,
                    refreshToken = data.refreshToken,
                    name = finalName,
                    email = finalEmail,
                    isPremium = isPrem,
                    userId = userId
                )
                context?.let { ctx ->
                    try {
                        com.example.data.sync.SyncWorker.enqueueImmediateSync(ctx, replaceExisting = true)
                    } catch (e: Exception) {
                        Log.w("AuthRepository", "SyncWorker enqueue after login note: ${e.message}")
                    }
                }
                Result.success(user ?: UserDto(id = userId, email = finalEmail, name = finalName, isPremium = isPrem))
            } else {
                val rawError = resp.errorBody()?.string()
                val fallbackMsg = when (resp.code()) {
                    401 -> "Credenciais inválidas. Verifique seu e-mail e senha."
                    403 -> "Esta conta foi desativada ou excluída."
                    404 -> "Usuário não encontrado."
                    else -> "Erro ao realizar login (${resp.code()})"
                }
                val errorMsg = parseApiError(rawError, fallbackMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("AuthRepository", "Login failed", e)
            Result.failure(Exception(e.message ?: "Falha de conexão com o servidor."))
        }
    }

    suspend fun logout() {
        try {
            apiService.logout()
        } catch (_: Exception) {}
        tokenManager.clearTokens()
        preferencesManager.setPremiumStatus(false)
    }

    suspend fun deleteAccount(): Result<Unit> = withContext(Dispatchers.IO) {
        val userId = preferencesManager.getCurrentUserIdDirect()
        try {
            val token = tokenManager.getAccessToken()
            if (!token.isNullOrBlank()) {
                val resp = apiService.deleteAccount()
                if (!resp.isSuccessful && resp.code() != 404) {
                    val rawError = resp.errorBody()?.string()
                    val errorMsg = parseApiError(rawError, "Erro ao excluir conta no servidor (${resp.code()})")
                    Log.w("AuthRepository", "Delete account API warning: $errorMsg")
                }
            }
            // Clear local credentials, session and user-specific local caches
            tokenManager.clearTokens()
            database.favoriteDao().clearUserFavorites(userId)
            database.historyDao().clearHistory(userId)
            database.notificationDao().clearUserNotifications(userId)
            database.syncQueueDao().clearUserQueue(userId)
            preferencesManager.setPremiumStatus(false)
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("AuthRepository", "Delete account error", e)
            // Even if network fails, ensure client session is purged locally
            tokenManager.clearTokens()
            database.favoriteDao().clearUserFavorites(userId)
            database.historyDao().clearHistory(userId)
            database.notificationDao().clearUserNotifications(userId)
            database.syncQueueDao().clearUserQueue(userId)
            preferencesManager.setPremiumStatus(false)
            Result.success(Unit)
        }
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationRepository(
    private val notificationDao: NotificationDao,
    private val apiService: BibleApiService,
    private val tokenManager: TokenManager,
    private val preferencesManager: PreferencesManager? = null
) {
    fun getAllNotifications(): Flow<List<NotificationEntity>> {
        return preferencesManager?.currentUserId?.flatMapLatest { userId ->
            notificationDao.getAllNotifications(userId)
        } ?: notificationDao.getAllNotifications("guest")
    }

    fun getUnreadCount(): Flow<Int> {
        return preferencesManager?.currentUserId?.flatMapLatest { userId ->
            notificationDao.getUnreadCount(userId)
        } ?: notificationDao.getUnreadCount("guest")
    }

    suspend fun refreshNotifications(): Boolean = withContext(Dispatchers.IO) {
        try {
            val resp = apiService.getNotifications(limit = 50)
            if (resp.isSuccessful && resp.body()?.data != null) {
                val dtoList = resp.body()!!.data!!
                val userId = preferencesManager?.getCurrentUserIdDirect() ?: "guest"
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
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w("NotificationRepository", "Failed to sync notifications: ${e.message}")
            false
        }
    }

    suspend fun markAsRead(id: String) = withContext(Dispatchers.IO) {
        notificationDao.markAsRead(id)
        val token = tokenManager.getAccessToken()
        if (!token.isNullOrBlank()) {
            try {
                apiService.markNotificationRead(id)
            } catch (e: Exception) {
                Log.d("NotificationRepository", "Network offline, marked read locally")
            }
        }
    }

    suspend fun markAllAsRead() = withContext(Dispatchers.IO) {
        val userId = preferencesManager?.getCurrentUserIdDirect() ?: "guest"
        notificationDao.markAllAsRead(userId)
        val token = tokenManager.getAccessToken()
        if (!token.isNullOrBlank()) {
            try {
                apiService.markAllNotificationsRead()
            } catch (e: Exception) {
                Log.d("NotificationRepository", "Network offline, marked all read locally")
            }
        }
    }

    suspend fun clearNotifications() = withContext(Dispatchers.IO) {
        val userId = preferencesManager?.getCurrentUserIdDirect() ?: "guest"
        notificationDao.clearUserNotifications(userId)
    }

    suspend fun registerPushToken(token: String): Boolean = withContext(Dispatchers.IO) {
        val authToken = tokenManager.getAccessToken()
        if (authToken.isNullOrBlank()) return@withContext false
        try {
            val resp = apiService.registerDevice(
                RegisterDeviceRequest(
                    token = token,
                    platform = "android",
                    deviceName = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}",
                    appVersion = com.example.BuildConfig.VERSION_NAME
                )
            )
            resp.isSuccessful
        } catch (e: Exception) {
            Log.w("NotificationRepository", "Failed to register push token: ${e.message}")
            false
        }
    }

    suspend fun unregisterPushToken(token: String): Boolean = withContext(Dispatchers.IO) {
        val authToken = tokenManager.getAccessToken()
        if (authToken.isNullOrBlank()) return@withContext false
        try {
            val resp = apiService.unregisterDevice(token)
            resp.isSuccessful
        } catch (e: Exception) {
            Log.w("NotificationRepository", "Failed to unregister push token: ${e.message}")
            false
        }
    }
}


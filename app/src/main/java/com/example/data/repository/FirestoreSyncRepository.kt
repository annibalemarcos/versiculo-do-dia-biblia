package com.example.data.repository

import android.content.Context
import android.util.Log
import com.example.core.datastore.AppThemeMode
import com.example.core.datastore.PreferencesManager
import com.example.core.datastore.TextScale
import com.example.data.local.db.FavoriteDao
import com.example.data.local.db.FavoriteEntity
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

/**
 * Data transfer object for Favorite verse in Firestore.
 */
data class FirestoreFavoriteDto(
    val verseId: String = "",
    val reference: String = "",
    val text: String = "",
    val translation: String = "NVI",
    val reflection: String = "",
    val theme: String = "",
    val savedAt: Long = System.currentTimeMillis()
) {
    fun toEntity(userId: String = "guest"): FavoriteEntity = FavoriteEntity(
        verseId = verseId,
        userId = userId,
        reference = reference,
        text = text,
        translation = translation,
        reflection = reflection,
        theme = theme,
        savedAt = if (savedAt > 0) savedAt else System.currentTimeMillis(),
        isSynced = true
    )

    companion object {
        fun fromEntity(entity: FavoriteEntity): FirestoreFavoriteDto = FirestoreFavoriteDto(
            verseId = entity.verseId,
            reference = entity.reference,
            text = entity.text,
            translation = entity.translation,
            reflection = entity.reflection,
            theme = entity.theme,
            savedAt = entity.savedAt
        )
    }
}

/**
 * Data transfer object for User Preferences in Firestore.
 */
data class FirestorePreferencesDto(
    val themeMode: String = AppThemeMode.SYSTEM.name,
    val textScale: String = TextScale.NORMAL.name,
    val preferredTranslation: String = "NVI",
    val notificationsEnabled: Boolean = true,
    val notificationHour: Int = 8,
    val notificationMinute: Int = 0,
    val updatedAt: Long = System.currentTimeMillis()
)

sealed class SyncResult {
    data class Success(val favoritesSynced: Int, val preferencesUpdated: Boolean, val timestamp: Long) : SyncResult()
    data class Error(val message: String, val exception: Throwable? = null) : SyncResult()
}

/**
 * Repository responsible for synchronizing user favorites and preferences with Firebase Firestore.
 */
class FirestoreSyncRepository(
    private val context: Context? = null,
    private val favoriteDao: FavoriteDao,
    private val preferencesManager: PreferencesManager
) {
    companion object {
        private const val TAG = "FirestoreSyncRepository"
        private const val USERS_COLLECTION = "users"
        private const val FAVORITES_COLLECTION = "favorites"
        private const val PREFERENCES_COLLECTION = "preferences"
        private const val SETTINGS_DOC = "settings"
    }

    private val firestore: FirebaseFirestore?
        get() = try {
            if (context != null && FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(context)
            }
            FirebaseFirestore.getInstance()
        } catch (e: Exception) {
            Log.w(TAG, "FirebaseFirestore instance unavailable: ${e.message}")
            null
        }

    private val auth: FirebaseAuth?
        get() = try {
            if (context != null && FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(context)
            }
            FirebaseAuth.getInstance()
        } catch (e: Exception) {
            Log.w(TAG, "FirebaseAuth instance unavailable: ${e.message}")
            null
        }

    /**
     * Gets the currently authenticated Firebase user.
     */
    val currentUser: FirebaseUser?
        get() = try {
            auth?.currentUser
        } catch (e: Exception) {
            null
        }

    /**
     * Flow that emits real-time updates for the current Firebase user.
     */
    val authStateFlow: Flow<FirebaseUser?> = callbackFlow {
        val currentAuth = auth
        if (currentAuth == null) {
            trySend(null)
            awaitClose { }
            return@callbackFlow
        }

        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser)
        }
        currentAuth.addAuthStateListener(listener)
        awaitClose { currentAuth.removeAuthStateListener(listener) }
    }

    /**
     * Performs a full bi-directional sync of Favorites and Preferences for the specified user ID.
     */
    suspend fun syncAllUserData(userId: String = getEffectiveUserId()): SyncResult = withContext(Dispatchers.IO) {
        val db = firestore
        if (db == null) {
            return@withContext SyncResult.Error("Firebase Firestore não inicializado")
        }

        if (userId.isBlank()) {
            return@withContext SyncResult.Error("Usuário não autenticado para sincronização no Firestore")
        }

        try {
            Log.d(TAG, "Starting full sync for user: $userId")

            // 1. Synchronize Preferences
            val preferencesSynced = syncPreferencesInternal(db, userId)

            // 2. Synchronize Favorites
            val favoritesCount = syncFavoritesInternal(db, userId)

            val now = System.currentTimeMillis()
            Log.d(TAG, "Full sync complete: $favoritesCount favorites, prefs synced: $preferencesSynced")
            SyncResult.Success(
                favoritesSynced = favoritesCount,
                preferencesUpdated = preferencesSynced,
                timestamp = now
            )
        } catch (e: Exception) {
            Log.e(TAG, "Sync failed: ${e.message}", e)
            SyncResult.Error(e.localizedMessage ?: "Erro desconhecido ao sincronizar com Firestore", e)
        }
    }

    /**
     * Synchronizes user preferences bidirectionally.
     */
    private suspend fun syncPreferencesInternal(db: FirebaseFirestore, userId: String): Boolean {
        val userPrefsDoc = db.collection(USERS_COLLECTION)
            .document(userId)
            .collection(PREFERENCES_COLLECTION)
            .document(SETTINGS_DOC)

        val snapshot = userPrefsDoc.get().await()

        if (snapshot.exists()) {
            val remote = snapshot.toObject(FirestorePreferencesDto::class.java)
            if (remote != null) {
                // Apply remote preferences locally
                try {
                    val theme = AppThemeMode.valueOf(remote.themeMode)
                    preferencesManager.setThemeMode(theme)
                } catch (_: Exception) {}

                try {
                    val scale = TextScale.valueOf(remote.textScale)
                    preferencesManager.setTextScale(scale)
                } catch (_: Exception) {}

                preferencesManager.setPreferredTranslation(remote.preferredTranslation)
                preferencesManager.setNotificationsEnabled(remote.notificationsEnabled)
                preferencesManager.setNotificationTime(remote.notificationHour, remote.notificationMinute)
                return true
            }
        }

        // Remote does not exist yet or we need to push local preferences to remote
        val localTheme = preferencesManager.themeMode.first()
        val localScale = preferencesManager.textScale.first()
        val localTrans = preferencesManager.preferredTranslation.first()
        val localNotifEnabled = preferencesManager.isNotificationsEnabled.first()
        val (hour, minute) = preferencesManager.notificationTime.first()

        val dto = FirestorePreferencesDto(
            themeMode = localTheme.name,
            textScale = localScale.name,
            preferredTranslation = localTrans,
            notificationsEnabled = localNotifEnabled,
            notificationHour = hour,
            notificationMinute = minute,
            updatedAt = System.currentTimeMillis()
        )
        userPrefsDoc.set(dto, SetOptions.merge()).await()
        return true
    }

    /**
     * Synchronizes favorites bidirectionally:
     * - Pulls remote favorites and saves to Room.
     * - Pushes local favorites that aren't in Firestore yet.
     */
    private suspend fun syncFavoritesInternal(db: FirebaseFirestore, userId: String): Int {
        val favoritesRef = db.collection(USERS_COLLECTION)
            .document(userId)
            .collection(FAVORITES_COLLECTION)

        // 1. Fetch remote favorites
        val remoteSnapshot = favoritesRef.get().await()
        val remoteFavorites = remoteSnapshot.documents.mapNotNull { it.toObject(FirestoreFavoriteDto::class.java) }
        val remoteMap = remoteFavorites.associateBy { it.verseId }

        // 2. Fetch local favorites
        val localFavorites = favoriteDao.getAllFavorites(userId).first()
        val localMap = localFavorites.associateBy { it.verseId }

        // 3. Insert missing remote favorites into local Room DB
        val toInsertLocally = mutableListOf<FavoriteEntity>()
        for ((verseId, remoteFav) in remoteMap) {
            if (!localMap.containsKey(verseId)) {
                toInsertLocally.add(remoteFav.toEntity(userId))
            }
        }
        if (toInsertLocally.isNotEmpty()) {
            favoriteDao.insertFavorites(toInsertLocally)
            Log.d(TAG, "Inserted ${toInsertLocally.size} remote favorites into local DB")
        }

        // 4. Push local favorites to remote Firestore
        for (localFav in localFavorites) {
            if (!remoteMap.containsKey(localFav.verseId)) {
                val dto = FirestoreFavoriteDto.fromEntity(localFav)
                favoritesRef.document(localFav.verseId).set(dto, SetOptions.merge()).await()
                Log.d(TAG, "Uploaded local favorite '${localFav.reference}' to Firestore")
            }
        }

        return localFavorites.size + toInsertLocally.size
    }

    /**
     * Saves a single favorite directly to Firestore for the current user.
     */
    suspend fun saveFavoriteToFirestore(
        favorite: FavoriteEntity,
        userId: String = getEffectiveUserId()
    ): Boolean = withContext(Dispatchers.IO) {
        val db = firestore ?: return@withContext false
        if (userId.isBlank()) return@withContext false
        try {
            val dto = FirestoreFavoriteDto.fromEntity(favorite)
            db.collection(USERS_COLLECTION)
                .document(userId)
                .collection(FAVORITES_COLLECTION)
                .document(favorite.verseId)
                .set(dto, SetOptions.merge())
                .await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error saving favorite to Firestore: ${e.message}")
            false
        }
    }

    /**
     * Removes a single favorite from Firestore for the current user.
     */
    suspend fun removeFavoriteFromFirestore(
        verseId: String,
        userId: String = getEffectiveUserId()
    ): Boolean = withContext(Dispatchers.IO) {
        val db = firestore ?: return@withContext false
        if (userId.isBlank()) return@withContext false
        try {
            db.collection(USERS_COLLECTION)
                .document(userId)
                .collection(FAVORITES_COLLECTION)
                .document(verseId)
                .delete()
                .await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error removing favorite from Firestore: ${e.message}")
            false
        }
    }

    /**
     * Saves current preferences directly to Firestore for the user.
     */
    suspend fun savePreferencesToFirestore(
        themeMode: AppThemeMode,
        textScale: TextScale,
        translation: String,
        isNotificationsEnabled: Boolean,
        hour: Int,
        minute: Int,
        userId: String = getEffectiveUserId()
    ): Boolean = withContext(Dispatchers.IO) {
        val db = firestore ?: return@withContext false
        if (userId.isBlank()) return@withContext false
        try {
            val dto = FirestorePreferencesDto(
                themeMode = themeMode.name,
                textScale = textScale.name,
                preferredTranslation = translation,
                notificationsEnabled = isNotificationsEnabled,
                notificationHour = hour,
                notificationMinute = minute,
                updatedAt = System.currentTimeMillis()
            )
            db.collection(USERS_COLLECTION)
                .document(userId)
                .collection(PREFERENCES_COLLECTION)
                .document(SETTINGS_DOC)
                .set(dto, SetOptions.merge())
                .await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error saving preferences to Firestore: ${e.message}")
            false
        }
    }

    /**
     * Realtime Flow listener for Firestore favorites.
     */
    fun observeRemoteFavorites(userId: String = getEffectiveUserId()): Flow<List<FirestoreFavoriteDto>> = callbackFlow {
        val db = firestore
        if (db == null || userId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = db.collection(USERS_COLLECTION)
            .document(userId)
            .collection(FAVORITES_COLLECTION)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e(TAG, "Listen failed: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val favorites = snapshot.documents.mapNotNull { it.toObject(FirestoreFavoriteDto::class.java) }
                    trySend(favorites)
                }
            }

        awaitClose { listener.remove() }
    }

    /**
     * Helper to retrieve either current Firebase UID, or stored user email / ID.
     */
    private fun getEffectiveUserId(): String {
        return try {
            val fbUser = auth?.currentUser
            if (fbUser != null && fbUser.uid.isNotBlank()) {
                fbUser.uid
            } else {
                ""
            }
        } catch (e: Exception) {
            ""
        }
    }
}

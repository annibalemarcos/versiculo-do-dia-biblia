package com.example.core.auth

import android.util.Log
import com.example.core.datastore.PreferencesManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class TokenManager(
    private val preferencesManager: PreferencesManager,
    private val onRefreshTokenCall: suspend (refreshToken: String) -> Pair<String, String>? = { null } // returns (newAccess, newRefresh)
) {
    private val refreshMutex = Mutex()

    @Volatile
    private var cachedAccessToken: String? = null

    init {
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
            preferencesManager.authToken.collect { token ->
                cachedAccessToken = token
            }
        }
    }

    suspend fun getAccessToken(): String? {
        val token = preferencesManager.authToken.first()
        cachedAccessToken = token
        return token
    }

    fun getAccessTokenSync(): String? = cachedAccessToken

    suspend fun getRefreshToken(): String? {
        return preferencesManager.refreshToken.first()
    }

    suspend fun saveTokens(accessToken: String, refreshToken: String, name: String?, email: String?, isPremium: Boolean, userId: String? = null) {
        cachedAccessToken = accessToken
        preferencesManager.saveAuth(
            token = accessToken,
            refreshToken = refreshToken,
            name = name,
            email = email,
            isPremium = isPremium,
            userId = userId
        )
    }

    suspend fun clearTokens() {
        cachedAccessToken = null
        preferencesManager.clearAuth()
    }

    /**
     * Safely refreshes the access token using the refresh token.
     * Uses a Mutex so that concurrent requests receiving 401 do not trigger multiple refresh calls.
     */
    suspend fun refreshTokensSafely(): String? = refreshMutex.withLock {
        val currentRefresh = preferencesManager.refreshToken.first()
        if (currentRefresh.isNullOrBlank()) {
            return null
        }

        try {
            val newTokens = onRefreshTokenCall(currentRefresh)
            if (newTokens != null) {
                val (newAccess, newRefresh) = newTokens
                val profile = preferencesManager.userProfile.first()
                preferencesManager.saveAuth(
                    token = newAccess,
                    refreshToken = newRefresh,
                    name = profile.first,
                    email = profile.second,
                    isPremium = profile.third
                )
                Log.d("TokenManager", "Auth tokens refreshed successfully")
                return newAccess
            } else {
                Log.w("TokenManager", "Token refresh returned null")
                return null
            }
        } catch (e: Exception) {
            Log.w("TokenManager", "Error during token refresh: ${e.message}")
            return null
        }
    }
}

package com.example.core.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "biblia_preferences")

enum class AppThemeMode {
    SYSTEM, LIGHT, DARK
}

enum class TextScale(val factor: Float, val label: String) {
    SMALL(0.85f, "Pequeno"),
    NORMAL(1.0f, "Padrão"),
    LARGE(1.15f, "Grande"),
    EXTRA_LARGE(1.30f, "Muito Grande")
}

class PreferencesManager(private val context: Context) {

    companion object {
        private val THEME_KEY = stringPreferencesKey("app_theme_mode")
        private val TEXT_SCALE_KEY = stringPreferencesKey("text_scale_mode")
        private val ONBOARDING_COMPLETED_KEY = booleanPreferencesKey("onboarding_completed")
        private val NOTIFICATIONS_ENABLED_KEY = booleanPreferencesKey("notifications_enabled")
        private val NOTIFICATION_HOUR_KEY = intPreferencesKey("notification_hour")
        private val NOTIFICATION_MINUTE_KEY = intPreferencesKey("notification_minute")
        private val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
        private val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
        private val IS_PREMIUM_KEY = booleanPreferencesKey("is_premium")
        private val TRANSLATION_KEY = stringPreferencesKey("preferred_translation")
        private val APP_MODE_KEY = stringPreferencesKey("app_mode")
        private val DEBUG_HOST_IP_KEY = stringPreferencesKey("debug_host_ip")
        private val DEBUG_ENVIRONMENT_KEY = stringPreferencesKey("debug_environment")
    }

    val debugHostIp: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[DEBUG_HOST_IP_KEY]
    }

    val debugEnvironment: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[DEBUG_ENVIRONMENT_KEY]
    }

    suspend fun saveDebugSettings(hostIp: String?, environment: String?) {
        context.dataStore.edit { preferences ->
            if (hostIp != null) {
                preferences[DEBUG_HOST_IP_KEY] = hostIp
            }
            if (environment != null) {
                preferences[DEBUG_ENVIRONMENT_KEY] = environment
            }
        }
    }

    val themeMode: Flow<AppThemeMode> = context.dataStore.data.map { preferences ->
        val value = preferences[THEME_KEY] ?: AppThemeMode.SYSTEM.name
        try { AppThemeMode.valueOf(value) } catch (e: Exception) { AppThemeMode.SYSTEM }
    }

    val textScale: Flow<TextScale> = context.dataStore.data.map { preferences ->
        val value = preferences[TEXT_SCALE_KEY] ?: TextScale.NORMAL.name
        try { TextScale.valueOf(value) } catch (e: Exception) { TextScale.NORMAL }
    }

    val isOnboardingCompleted: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[ONBOARDING_COMPLETED_KEY] ?: false
    }

    val isNotificationsEnabled: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[NOTIFICATIONS_ENABLED_KEY] ?: true
    }

    val notificationTime: Flow<Pair<Int, Int>> = context.dataStore.data.map { preferences ->
        val hour = preferences[NOTIFICATION_HOUR_KEY] ?: 8
        val minute = preferences[NOTIFICATION_MINUTE_KEY] ?: 0
        Pair(hour, minute)
    }

    val authToken: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[AUTH_TOKEN_KEY]
    }

    val refreshToken: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[REFRESH_TOKEN_KEY]
    }

    val isPremium: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[IS_PREMIUM_KEY] ?: false
    }

    val currentUserId: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[USER_ID_KEY] ?: preferences[USER_EMAIL_KEY] ?: "guest"
    }

    suspend fun getCurrentUserIdDirect(): String {
        val prefs = context.dataStore.data.first()
        return prefs[USER_ID_KEY] ?: prefs[USER_EMAIL_KEY] ?: "guest"
    }

    val appMode: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[APP_MODE_KEY]
    }

    val preferredTranslation: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[TRANSLATION_KEY] ?: "NVI"
    }

    val userProfile: Flow<Triple<String?, String?, Boolean>> = context.dataStore.data.map { preferences ->
        Triple(
            preferences[USER_NAME_KEY],
            preferences[USER_EMAIL_KEY],
            preferences[IS_PREMIUM_KEY] ?: false
        )
    }

    suspend fun setThemeMode(mode: AppThemeMode) {
        context.dataStore.edit { preferences ->
            preferences[THEME_KEY] = mode.name
        }
    }

    suspend fun setTextScale(scale: TextScale) {
        context.dataStore.edit { preferences ->
            preferences[TEXT_SCALE_KEY] = scale.name
        }
    }

    suspend fun setOnboardingCompleted(completed: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[ONBOARDING_COMPLETED_KEY] = completed
        }
    }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[NOTIFICATIONS_ENABLED_KEY] = enabled
        }
    }

    suspend fun setNotificationTime(hour: Int, minute: Int) {
        context.dataStore.edit { preferences ->
            preferences[NOTIFICATION_HOUR_KEY] = hour
            preferences[NOTIFICATION_MINUTE_KEY] = minute
        }
    }

    suspend fun saveAuth(token: String, refreshToken: String, name: String?, email: String?, isPremium: Boolean, userId: String? = null) {
        context.dataStore.edit { preferences ->
            preferences[AUTH_TOKEN_KEY] = token
            preferences[REFRESH_TOKEN_KEY] = refreshToken
            if (userId != null) preferences[USER_ID_KEY] = userId
            if (name != null) preferences[USER_NAME_KEY] = name
            if (email != null) preferences[USER_EMAIL_KEY] = email
            preferences[IS_PREMIUM_KEY] = isPremium
        }
    }

    suspend fun setPremiumStatus(isPremium: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[IS_PREMIUM_KEY] = isPremium
        }
    }

    suspend fun setPreferredTranslation(translation: String) {
        context.dataStore.edit { preferences ->
            preferences[TRANSLATION_KEY] = translation
        }
    }

    suspend fun setAppMode(mode: String) {
        context.dataStore.edit { preferences ->
            preferences[APP_MODE_KEY] = mode
        }
    }

    suspend fun clearAuth() {
        context.dataStore.edit { preferences ->
            preferences.remove(AUTH_TOKEN_KEY)
            preferences.remove(REFRESH_TOKEN_KEY)
            preferences.remove(USER_ID_KEY)
            preferences.remove(USER_EMAIL_KEY)
            preferences.remove(USER_NAME_KEY)
            preferences[IS_PREMIUM_KEY] = false
        }
    }
}

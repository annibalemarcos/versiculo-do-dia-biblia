package com.example.core.analytics

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

data class AnalyticsEvent(
    val eventName: String,
    val params: Map<String, String> = emptyMap(),
    val timestamp: Long = System.currentTimeMillis()
)

class AnalyticsTracker(
    private val scope: CoroutineScope,
    private val onSendServerEvent: (suspend (AnalyticsEvent) -> Unit)? = null
) {
    fun logEvent(name: String, params: Map<String, String> = emptyMap()) {
        val event = AnalyticsEvent(eventName = name, params = params)
        Log.d("AnalyticsTracker", "Event: $name | Params: $params")
        
        onSendServerEvent?.let { sendFn ->
            scope.launch(Dispatchers.IO) {
                try {
                    sendFn(event)
                } catch (e: Exception) {
                    Log.w("AnalyticsTracker", "Could not dispatch event to backend: ${e.message}")
                }
            }
        }
    }

    fun logAppOpen() = logEvent("app_open")
    fun logVerseView(verseId: String, reference: String) = logEvent("verse_view", mapOf("verse_id" to verseId, "reference" to reference))
    fun logDailyVerseView(date: String) = logEvent("daily_verse_view", mapOf("date" to date))
    fun logSearch(query: String) = logEvent("search", mapOf("query" to query))
    fun logFavoriteAdd(verseId: String) = logEvent("favorite_add", mapOf("verse_id" to verseId))
    fun logFavoriteRemove(verseId: String) = logEvent("favorite_remove", mapOf("verse_id" to verseId))
    fun logShare(verseId: String, format: String) = logEvent("share", mapOf("verse_id" to verseId, "format" to format))
    fun logEmotionSelected(emotionId: String, name: String) = logEvent("emotion_selected", mapOf("emotion_id" to emotionId, "name" to name))
    fun logThemeOpen(themeId: String, name: String) = logEvent("theme_open", mapOf("theme_id" to themeId, "name" to name))
    fun logDevotionalOpen(devotionalId: String) = logEvent("devotional_open", mapOf("devotional_id" to devotionalId))
    fun logPremiumScreenView() = logEvent("premium_screen_view")
    fun logPurchaseStarted(planId: String) = logEvent("purchase_started", mapOf("plan_id" to planId))
    fun logPurchaseCompleted(planId: String) = logEvent("purchase_completed", mapOf("plan_id" to planId))
}

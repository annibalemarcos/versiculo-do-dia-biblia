package com.example.core.ads

import android.content.Context
import android.util.Log

enum class AdPlacement(val placementId: String, val isProtected: Boolean = false) {
    HOME_BANNER("home_after_daily_verse"),
    EXPLORE_BANNER("explore_between_sections"),
    SEARCH_BOTTOM("search_after_results"),
    VERSE_BOTTOM("verse_bottom", isProtected = true),
    DEVOTIONAL_END("devotional_end")
}

data class AdConfig(
    val adsGlobalEnabled: Boolean = true,
    val admobEnabled: Boolean = true,
    val emergencyMonetizationDisable: Boolean = false,
    val maxInterstitialsPerSession: Int = 3,
    val minSecondsBetweenInterstitials: Long = 180L
)

class AdProvider(
    private val context: Context,
    private val isPremiumSupplier: () -> Boolean,
    private val configSupplier: () -> AdConfig = { AdConfig() }
) {
    private var lastInterstitialTimeMs: Long = 0
    private var interstitialsShownThisSession: Int = 0

    fun canShowAds(): Boolean {
        if (isPremiumSupplier()) return false
        val config = configSupplier()
        if (config.emergencyMonetizationDisable) return false
        return config.adsGlobalEnabled && config.admobEnabled
    }

    fun canShowPlacement(placement: AdPlacement): Boolean {
        if (!canShowAds()) return false
        if (placement.isProtected) return false
        return true
    }

    fun canShowInterstitial(): Boolean {
        if (!canShowAds()) return false
        val config = configSupplier()
        if (interstitialsShownThisSession >= config.maxInterstitialsPerSession) return false
        val elapsedSeconds = (System.currentTimeMillis() - lastInterstitialTimeMs) / 1000
        return elapsedSeconds >= config.minSecondsBetweenInterstitials
    }

    fun onInterstitialShown() {
        lastInterstitialTimeMs = System.currentTimeMillis()
        interstitialsShownThisSession++
        Log.d("AdProvider", "Interstitial shown: $interstitialsShownThisSession")
    }
}

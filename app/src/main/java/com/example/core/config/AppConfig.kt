package com.example.core.config

import android.os.Build
import com.example.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class AppEnvironment(val displayName: String) {
    EMULATOR("Emulador Android (10.0.2.2)"),
    LOCAL_LAN("Celular Físico / Wi-Fi Local"),
    STAGING("Homologação / Staging"),
    PRODUCTION("Produção (HTTPS)")
}

object AppConfig {
    const val APP_ID = "verse_daily"
    const val PACKAGE_ID = "com.aistudio.biblia.nvgtnt"
    const val VERSION_NAME = "1.0.0"
    const val VERSION_CODE = 1

    // Default Endpoints
    const val DEFAULT_PRODUCTION_API_URL = "https://biblia-api.larzusapps.com/api/v1/"
    const val DEFAULT_STAGING_API_URL = "https://staging-api.larzusapps.com/api/v1/"
    const val DEFAULT_EMULATOR_DEBUG_API_URL = "http://10.0.2.2:8000/api/v1/"

    /**
     * Detects if the current Android execution environment is an Android Emulator or a Physical Device.
     */
    fun isRunningOnEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT ?: ""
        val model = Build.MODEL ?: ""
        val manufacturer = Build.MANUFACTURER ?: ""
        val hardware = Build.HARDWARE ?: ""
        val product = Build.PRODUCT ?: ""
        return (fingerprint.startsWith("generic")
                || fingerprint.startsWith("unknown")
                || model.contains("google_sdk")
                || model.contains("Emulator")
                || model.contains("Android SDK built for x86")
                || manufacturer.contains("Genymotion")
                || hardware.contains("goldfish")
                || hardware.contains("ranchu")
                || product.contains("sdk_gphone")
                || product.contains("sdk")
                || product.contains("vbox86p"))
    }

    private val _appMode = MutableStateFlow(if (BuildConfig.DEBUG) "TEST" else "PRODUCTION")
    val appMode: StateFlow<String> = _appMode.asStateFlow()

    val isTestMode: Boolean
        get() = _appMode.value.equals("TEST", ignoreCase = true)

    fun setAppMode(mode: String) {
        val normalized = mode.trim().uppercase()
        if (normalized.isNotBlank()) {
            _appMode.value = normalized
        }
    }

    var currentEnvironment: AppEnvironment = AppEnvironment.PRODUCTION
        private set

    var customDebugApiUrl: String? = null
        private set

    var lastConfiguredHostIp: String = "192.168.1.37"
        private set

    var lastConfiguredPort: Int = 8000
        private set

    /**
     * Configures a custom LAN IP & Port for testing FastAPI on physical Android devices.
     * Example: setDebugHostIp("192.168.1.37", 8000) -> http://192.168.1.37:8000/api/v1/
     */
    fun setDebugHostIp(ip: String, port: Int = 8000) {
        if (!BuildConfig.DEBUG) return
        val sanitizedIp = ip.trim().removePrefix("http://").removePrefix("https://").removeSuffix("/")
        lastConfiguredHostIp = sanitizedIp
        lastConfiguredPort = port
        customDebugApiUrl = "http://$sanitizedIp:$port/api/v1/"
        currentEnvironment = AppEnvironment.LOCAL_LAN
    }

    fun setCustomDebugApiUrl(url: String) {
        if (!BuildConfig.DEBUG) return
        var formatted = url.trim()
        if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
            formatted = "http://$formatted"
        }
        if (!formatted.endsWith("/")) {
            formatted = "$formatted/"
        }
        if (!formatted.endsWith("api/v1/")) {
            formatted = "${formatted.removeSuffix("/")}/api/v1/"
        }
        customDebugApiUrl = formatted
        currentEnvironment = AppEnvironment.LOCAL_LAN
    }

    fun setEnvironment(environment: AppEnvironment) {
        if (!BuildConfig.DEBUG) {
            currentEnvironment = AppEnvironment.PRODUCTION
            return
        }
        currentEnvironment = environment
    }

    /**
     * Resolves the release base URL ensuring:
     * - Release builds CANNOT use cleartext HTTP, localhost, 10.0.2.2, or developer LAN IPs.
     * - Enforces HTTPS and strictly points to the definitive production endpoint.
     */
    fun getReleaseApiBaseUrl(): String {
        val prodUrl = BuildConfig.BASE_API_URL.ifBlank { DEFAULT_PRODUCTION_API_URL }
        return if (prodUrl.startsWith("https://")) prodUrl else DEFAULT_PRODUCTION_API_URL
    }

    /**
     * Resolves the active Base URL ensuring:
     * - Release builds CANNOT use cleartext HTTP, localhost, 10.0.2.2, or developer LAN IPs.
     * - Debug builds route to the chosen local IP, Emulator (10.0.2.2), Staging, or Production.
     */
    fun getApiBaseUrl(): String {
        // STRICT RELEASE SAFETY ENFORCEMENT:
        if (!BuildConfig.DEBUG) {
            return getReleaseApiBaseUrl()
        }

        // DEBUG RESOLUTION:
        return when (currentEnvironment) {
            AppEnvironment.PRODUCTION -> {
                BuildConfig.BASE_API_URL.ifBlank { DEFAULT_PRODUCTION_API_URL }
            }
            AppEnvironment.STAGING -> {
                BuildConfig.STAGING_API_URL.ifBlank { DEFAULT_STAGING_API_URL }
            }
            AppEnvironment.EMULATOR -> {
                if (BuildConfig.DEBUG_API_URL.isNotBlank()) {
                    BuildConfig.DEBUG_API_URL
                } else {
                    DEFAULT_EMULATOR_DEBUG_API_URL
                }
            }
            AppEnvironment.LOCAL_LAN -> {
                when {
                    !customDebugApiUrl.isNullOrBlank() -> customDebugApiUrl!!
                    BuildConfig.DEBUG_API_URL.isNotBlank() && !BuildConfig.DEBUG_API_URL.contains("10.0.2.2") -> BuildConfig.DEBUG_API_URL
                    else -> "http://$lastConfiguredHostIp:$lastConfiguredPort/api/v1/"
                }
            }
        }
    }

    // Official AdMob test IDs for debug mode
    const val TEST_ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713"
    const val TEST_BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"
    const val TEST_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"

    // Product identifiers
    const val PRODUCT_PREMIUM_MONTHLY = "premium_monthly"
    const val PRODUCT_PREMIUM_YEARLY = "premium_yearly"
    const val PRODUCT_PREMIUM_LIFETIME = "premium_lifetime"
}

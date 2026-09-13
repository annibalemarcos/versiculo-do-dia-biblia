package com.example.data.repository

import android.util.Log
import com.example.core.config.AppConfig
import com.example.core.datastore.PreferencesManager
import com.example.data.remote.AppConfigData
import com.example.data.remote.BibleApiService
import com.example.data.remote.PlacementDto
import com.example.data.remote.PremiumProductDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext

data class RemoteAppConfig(
    val appMode: String = "PRODUCTION",
    val maintenance: Boolean = false,
    val maintenanceMessage: String = "O aplicativo está passando por manutenção preventiva para melhorias.",
    val minimumSupportedVersion: Int = 1,
    val latestVersion: Int = 1,
    val forceUpdate: Boolean = false,
    val storeUrl: String = "",
    val adsGlobal: Boolean = true,
    val admobAppId: String = "",
    val paywallEnabled: Boolean = true,
    val devotionalsEnabled: Boolean = true,
    val sharingEnabled: Boolean = true,
    val offlineDownloadEnabled: Boolean = true,
    val emergencyMonetizationDisable: Boolean = false,
    val placements: List<PlacementDto> = emptyList(),
    val premiumProducts: List<PremiumProductDto> = emptyList()
)

class ConfigRepository(
    private val apiService: BibleApiService,
    private val preferencesManager: PreferencesManager? = null
) {
    private val _config = MutableStateFlow(RemoteAppConfig())
    val config: StateFlow<RemoteAppConfig> = _config.asStateFlow()

    private val _appMode = MutableStateFlow(AppConfig.appMode.value)
    val appMode: StateFlow<String> = _appMode.asStateFlow()

    suspend fun fetchRemoteConfig(): RemoteAppConfig = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getAppConfig()
            if (response.isSuccessful && response.body()?.data != null) {
                val dto = response.body()!!.data!!
                val parsed = RemoteAppConfig(
                    appMode = dto.appMode,
                    maintenance = dto.maintenance,
                    maintenanceMessage = dto.maintenanceMessage ?: "O aplicativo está passando por manutenção preventiva para melhorias.",
                    minimumSupportedVersion = dto.minimumSupportedVersion,
                    latestVersion = dto.latestVersion,
                    forceUpdate = dto.forceUpdate,
                    storeUrl = dto.storeUrl ?: "",
                    adsGlobal = dto.monetization?.adsEnabled ?: (dto.features["ads_global"] ?: true),
                    admobAppId = dto.monetization?.admobAppId ?: "",
                    paywallEnabled = dto.features["premium_paywall"] ?: true,
                    devotionalsEnabled = dto.features["devotionals"] ?: true,
                    sharingEnabled = dto.features["sharing"] ?: true,
                    offlineDownloadEnabled = dto.features["offline_download"] ?: true,
                    emergencyMonetizationDisable = dto.features["monetization_emergency_disable"] ?: false,
                    placements = dto.placements,
                    premiumProducts = dto.premiumProducts
                )
                _config.value = parsed
                _appMode.value = parsed.appMode
                AppConfig.setAppMode(parsed.appMode)
                try {
                    preferencesManager?.setAppMode(parsed.appMode)
                } catch (e: Exception) {
                    Log.d("ConfigRepository", "Could not persist appMode to preferences: ${e.message}")
                }
                parsed
            } else {
                _config.value
            }
        } catch (e: Exception) {
            Log.d("ConfigRepository", "Using local default config fallback: ${e.message}")
            _config.value
        }
    }
}

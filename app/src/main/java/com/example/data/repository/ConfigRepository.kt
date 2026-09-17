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
    val maintenanceLevel: String = "informational",
    val maintenanceTitle: String = "Manutenção em Andamento",
    val maintenanceMessage: String = "O aplicativo está passando por manutenção preventiva para melhorias.",
    val maintenanceEstimatedEnd: String? = null,
    val minimumSupportedVersion: Int = 1,
    val latestVersion: Int = 1,
    val forceUpdate: Boolean = false,
    val storeUrl: String = "",
    val adsGlobal: Boolean = true,
    val admobAppId: String = "",
    val paywallEnabled: Boolean = true,
    val registrationEnabled: Boolean = true,
    val purchasesEnabled: Boolean = true,
    val premiumEnabled: Boolean = true,
    val notificationsEnabled: Boolean = true,
    val supportEnabled: Boolean = true,
    val cloudSyncEnabled: Boolean = true,
    val devotionalsEnabled: Boolean = true,
    val searchEnabled: Boolean = true,
    val sharingEnabled: Boolean = true,
    val offlineDownloadEnabled: Boolean = true,
    val googleLoginEnabled: Boolean = false,
    val emergencyMonetizationDisable: Boolean = false,
    val testEnvironmentEnabled: Boolean = true,
    val testEnvironmentTitle: String = "Ambiente de Testes: Simulação de Assinatura",
    val testEnvironmentDescription: String = "Este painel só funciona em ambiente de teste/debug e valida a autoridade do servidor sem burlar a Google Play em produção.",
    val testEnvironmentActivateText: String = "Ativar (24h)",
    val testEnvironmentExpireText: String = "Expirar",
    val testEnvironmentResetText: String = "Resetar para Gratuito",
    val testEnvironmentDurationHours: Int = 24,
    val testEnvironmentVisibleTo: String = "all",
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

    @Volatile
    private var _isLastFetchSuccessful = false
    val isLastFetchSuccessful: Boolean get() = _isLastFetchSuccessful

    suspend fun fetchRemoteConfig(): RemoteAppConfig = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getAppConfig()
            if (response.isSuccessful && response.body()?.data != null) {
                _isLastFetchSuccessful = true
                val dto = response.body()!!.data!!
                val premEnabled = dto.premiumEnabled ?: (dto.features["premium_enabled"] ?: dto.features["premium_paywall"] ?: true)
                val parsed = RemoteAppConfig(
                    appMode = dto.appMode,
                    maintenance = dto.maintenanceEnabled ?: dto.maintenance,
                    maintenanceLevel = dto.maintenanceLevel ?: "informational",
                    maintenanceTitle = dto.maintenanceTitle ?: "Manutenção em Andamento",
                    maintenanceMessage = dto.maintenanceMessage ?: "O aplicativo está passando por manutenção preventiva para melhorias.",
                    maintenanceEstimatedEnd = dto.maintenanceEstimatedEnd,
                    minimumSupportedVersion = dto.minimumSupportedVersion,
                    latestVersion = dto.latestVersion,
                    forceUpdate = dto.forceUpdate,
                    storeUrl = dto.storeUrl ?: "",
                    adsGlobal = dto.monetization?.adsEnabled ?: (dto.features["ads_global"] ?: true),
                    admobAppId = dto.monetization?.admobAppId ?: "",
                    paywallEnabled = premEnabled,
                    registrationEnabled = dto.registrationEnabled ?: (dto.features["registration_enabled"] ?: true),
                    purchasesEnabled = dto.purchasesEnabled ?: (dto.features["purchases_enabled"] ?: true),
                    premiumEnabled = premEnabled,
                    notificationsEnabled = dto.notificationsEnabled ?: (dto.features["notifications_enabled"] ?: true),
                    supportEnabled = dto.supportEnabled ?: (dto.features["support_enabled"] ?: true),
                    cloudSyncEnabled = dto.cloudSyncEnabled ?: (dto.features["cloud_sync_enabled"] ?: true),
                    devotionalsEnabled = dto.devotionalsEnabled ?: (dto.features["devotionals_enabled"] ?: dto.features["devotionals"] ?: true),
                    searchEnabled = dto.searchEnabled ?: (dto.features["search_enabled"] ?: true),
                    sharingEnabled = dto.sharingEnabled ?: (dto.features["sharing_enabled"] ?: dto.features["sharing"] ?: true),
                    offlineDownloadEnabled = dto.offlineDownloadEnabled ?: (dto.features["offline_download_enabled"] ?: dto.features["offline_download"] ?: true),
                    googleLoginEnabled = dto.googleLoginEnabled ?: (dto.features["google_login_enabled"] ?: false),
                    emergencyMonetizationDisable = dto.features["monetization_emergency_disable"] ?: false,
                    testEnvironmentEnabled = dto.testEnvironment?.enabled ?: true,
                    testEnvironmentTitle = dto.testEnvironment?.title ?: "Ambiente de Testes: Simulação de Assinatura",
                    testEnvironmentDescription = dto.testEnvironment?.description ?: "Este painel só funciona em ambiente de teste/debug e valida a autoridade do servidor sem burlar a Google Play em produção.",
                    testEnvironmentActivateText = dto.testEnvironment?.buttonActivateText ?: "Ativar (24h)",
                    testEnvironmentExpireText = dto.testEnvironment?.buttonExpireText ?: "Expirar",
                    testEnvironmentResetText = dto.testEnvironment?.buttonResetText ?: "Resetar para Gratuito",
                    testEnvironmentDurationHours = dto.testEnvironment?.defaultDurationHours ?: 24,
                    testEnvironmentVisibleTo = dto.testEnvironment?.visibleTo ?: "all",
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
                _isLastFetchSuccessful = false
                _config.value
            }
        } catch (e: Exception) {
            _isLastFetchSuccessful = false
            Log.d("ConfigRepository", "Using local default config fallback: ${e.message}")
            _config.value
        }
    }
}

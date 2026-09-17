package com.example.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.Room
import com.example.BibleApplication
import com.example.core.ads.AdConfig
import com.example.core.ads.AdProvider
import com.example.core.analytics.AnalyticsTracker
import com.example.core.auth.TokenManager
import com.example.core.billing.BillingProvider
import com.example.core.billing.Entitlement
import com.example.core.config.AppConfig
import com.example.core.datastore.AppThemeMode
import com.example.core.datastore.PreferencesManager
import com.example.core.datastore.TextScale
import com.example.data.local.db.*
import com.example.data.remote.*
import com.example.data.repository.*
import com.example.data.sync.SyncManager
import com.example.data.sync.SyncState
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

@OptIn(FlowPreview::class)
class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as? BibleApplication

    val preferencesManager = app?.preferencesManager ?: PreferencesManager(application)
    val database: AppDatabase = app?.database ?: AppDatabase.getInstance(application)
    val tokenManager = app?.tokenManager ?: TokenManager(preferencesManager = preferencesManager)
    val apiService: BibleApiService = app?.apiService ?: ApiClient.create(
        baseUrl = AppConfig.getApiBaseUrl(),
        tokenProvider = { tokenManager.getAccessTokenSync() }
    )
    val configRepository = app?.configRepository ?: ConfigRepository(apiService, preferencesManager)
    val bibleRepository = BibleRepository(database, apiService)
    val favoriteRepository = app?.favoriteRepository ?: FavoriteRepository(
        favoriteDao = database.favoriteDao(),
        syncQueueDao = database.syncQueueDao(),
        apiService = apiService,
        tokenManager = tokenManager,
        preferencesManager = preferencesManager,
        context = application
    )
    val historyRepository = app?.historyRepository ?: HistoryRepository(
        historyDao = database.historyDao(),
        apiService = apiService,
        tokenManager = tokenManager,
        preferencesManager = preferencesManager
    )
    val devotionalRepository = app?.devotionalRepository ?: DevotionalRepository(database.devotionalDao())
    val authRepository = app?.authRepository ?: AuthRepository(apiService, tokenManager, preferencesManager, database)
    val supportRepository = app?.supportRepository ?: SupportRepository(apiService)
    val notificationRepository = app?.notificationRepository ?: NotificationRepository(
        notificationDao = database.notificationDao(),
        apiService = apiService,
        tokenManager = tokenManager,
        preferencesManager = preferencesManager
    )
    val syncManager = app?.syncManager ?: SyncManager(
        context = application,
        database = database,
        apiService = apiService,
        preferencesManager = preferencesManager,
        tokenManager = tokenManager,
        configRepository = configRepository
    )
    val networkMonitor: com.example.core.network.NetworkMonitor =
        app?.networkMonitor ?: com.example.core.network.ConnectivityManagerNetworkMonitor(application)

    private val _activeApiBaseUrl = MutableStateFlow(AppConfig.getApiBaseUrl())
    val activeApiBaseUrl: StateFlow<String> = _activeApiBaseUrl.asStateFlow()

    private val _activeEnvironment = MutableStateFlow(AppConfig.currentEnvironment)
    val activeEnvironment: StateFlow<com.example.core.config.AppEnvironment> = _activeEnvironment.asStateFlow()

    private val _isTestingConnectivity = MutableStateFlow(false)
    val isTestingConnectivity: StateFlow<Boolean> = _isTestingConnectivity.asStateFlow()

    fun updateDebugHostIp(ip: String, port: Int = 8000) {
        if (!com.example.BuildConfig.DEBUG) return
        AppConfig.setDebugHostIp(ip, port)
        _activeEnvironment.value = AppConfig.currentEnvironment
        _activeApiBaseUrl.value = AppConfig.getApiBaseUrl()
        viewModelScope.launch {
            preferencesManager.saveDebugSettings(ip, AppConfig.currentEnvironment.name)
        }
    }

    fun updateDebugEnvironment(env: com.example.core.config.AppEnvironment) {
        if (!com.example.BuildConfig.DEBUG) return
        AppConfig.setEnvironment(env)
        _activeEnvironment.value = env
        _activeApiBaseUrl.value = AppConfig.getApiBaseUrl()
        viewModelScope.launch {
            preferencesManager.saveDebugSettings(null, env.name)
        }
    }

    fun testApiConnectivity(onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            _isTestingConnectivity.value = true
            val currentUrl = AppConfig.getApiBaseUrl()
            val startMs = System.currentTimeMillis()
            try {
                val response = apiService.getAppConfig()
                val latency = System.currentTimeMillis() - startMs
                if (response.isSuccessful) {
                    val appName = response.body()?.data?.appName ?: "FastAPI Backend"
                    val msg = "Conexão bem-sucedida ($latency ms)! Backend respondendo em: $currentUrl ($appName)"
                    onResult(true, msg)
                } else {
                    val code = response.code()
                    val errorMsg = "Servidor respondeu com HTTP $code em $currentUrl"
                    onResult(false, errorMsg)
                }
            } catch (e: Exception) {
                val latency = System.currentTimeMillis() - startMs
                val errorMsg = "Falha ao conectar (${e.javaClass.simpleName}) após ${latency}ms em $currentUrl: ${e.message ?: "Conexão recusada"}"
                onResult(false, errorMsg)
            } finally {
                _isTestingConnectivity.value = false
            }
        }
    }

    val syncState: StateFlow<SyncState> = syncManager.syncState

    val analyticsTracker = AnalyticsTracker(viewModelScope) { event ->
        apiService.sendAnalyticsEvent(
            AnalyticsEventRequest(
                eventName = event.eventName,
                params = event.params,
                timestamp = event.timestamp
            )
        )
    }

    val billingProvider = BillingProvider(
        onVerifyPurchaseServer = { token, productId ->
            val currentEmail = preferencesManager.userProfile.first().second
            if (currentEmail.isNullOrBlank()) {
                // Anonymous users are strictly prohibited from possessing or activating Premium
                preferencesManager.saveBillingState(false, "FREE", "NONE", null)
                Pair(false, emptyList())
            } else {
                try {
                    val res = apiService.verifyPurchase(
                        VerifyPurchaseRequest(
                            productId = productId,
                            purchaseToken = token,
                            packageName = AppConfig.PACKAGE_ID
                        )
                    )
                    if (res.isSuccessful && res.body()?.data != null) {
                        val data = res.body()!!.data!!
                        if (data.isPremium) {
                            preferencesManager.saveBillingState(
                                isPremium = true,
                                status = "ACTIVE",
                                source = data.source,
                                expiresAt = data.expiresAt
                            )
                            Pair(true, data.entitlements)
                        } else {
                            preferencesManager.saveBillingState(false, "FREE", "NONE", null)
                            Pair(false, emptyList())
                        }
                    } else {
                        // Fail-secure: Never assume premium on failed responses
                        Pair(false, emptyList())
                    }
                } catch (e: Exception) {
                    // Fail-secure: Network or server errors must never grant entitlement
                    Pair(false, emptyList())
                }
            }
        },
        onRestorePurchasesServer = {
            val currentEmail = preferencesManager.userProfile.first().second
            if (currentEmail.isNullOrBlank()) {
                preferencesManager.saveBillingState(false, "FREE", "NONE", null)
                Pair(false, emptyList())
            } else {
                try {
                    val res = apiService.restorePurchases(
                        RestorePurchasesRequest(
                            purchaseTokens = emptyList()
                        )
                    )
                    if (res.isSuccessful && res.body()?.data != null) {
                        val data = res.body()!!.data!!
                        if (data.isPremium) {
                            preferencesManager.saveBillingState(
                                isPremium = true,
                                status = data.status,
                                source = data.source,
                                expiresAt = data.expiresAt
                            )
                            Pair(true, listOf("premium", "ad_free", "offline_full", "unlimited_favorites"))
                        } else {
                            preferencesManager.saveBillingState(false, "FREE", "NONE", null)
                            Pair(false, emptyList())
                        }
                    } else {
                        Pair(false, emptyList())
                    }
                } catch (e: Exception) {
                    Pair(false, emptyList())
                }
            }
        }
    )

    val adProvider = AdProvider(
        context = application,
        isPremiumSupplier = { billingProvider.isPremium() },
        configSupplier = {
            val cfg = configRepository.config.value
            AdConfig(
                adsGlobalEnabled = cfg.adsGlobal,
                admobEnabled = true,
                emergencyMonetizationDisable = cfg.emergencyMonetizationDisable
            )
        }
    )

    // StateFlows
    val themeMode: StateFlow<AppThemeMode> = preferencesManager.themeMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AppThemeMode.SYSTEM)

    val textScale: StateFlow<TextScale> = preferencesManager.textScale
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TextScale.NORMAL)

    val isOnboardingCompleted: StateFlow<Boolean> = preferencesManager.isOnboardingCompleted
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val userProfile = preferencesManager.userProfile
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), Triple(null, null, false))

    val isPremium: StateFlow<Boolean> = preferencesManager.isPremium
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val premiumDetails: StateFlow<Triple<String, String, String?>> = preferencesManager.premiumDetails
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), Triple("FREE", "NONE", null))

    val dailyVerse: StateFlow<DailyVerseEntity?> = bibleRepository.getDailyVerseFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val themes: StateFlow<List<ThemeEntity>> = bibleRepository.getThemes()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val emotions: StateFlow<List<EmotionEntity>> = bibleRepository.getEmotions()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val favorites: StateFlow<List<FavoriteEntity>> = favoriteRepository.getAllFavorites()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val history: StateFlow<List<HistoryEntity>> = historyRepository.getRecentHistory()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val devotionals: StateFlow<List<DevotionalEntity>> = devotionalRepository.getAllDevotionals()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val notifications: StateFlow<List<NotificationEntity>> = notificationRepository.getAllNotifications()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val unreadNotificationsCount: StateFlow<Int> = notificationRepository.getUnreadCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val remoteConfig: StateFlow<RemoteAppConfig> = configRepository.config
    val appMode: StateFlow<String> = configRepository.appMode

    // Dynamic Registration Fields Flow
    private val _registrationFields = MutableStateFlow<List<RegistrationFieldDto>>(emptyList())
    val registrationFields: StateFlow<List<RegistrationFieldDto>> = _registrationFields.asStateFlow()

    private val _isLoadingRegistrationFields = MutableStateFlow(false)
    val isLoadingRegistrationFields: StateFlow<Boolean> = _isLoadingRegistrationFields.asStateFlow()

    // In-App Banners Flow
    private val _homeBanners = MutableStateFlow<List<BannerItemDto>>(emptyList())
    val homeBanners: StateFlow<List<BannerItemDto>> = _homeBanners.asStateFlow()

    fun loadRegistrationFields() {
        viewModelScope.launch {
            _isLoadingRegistrationFields.value = true
            val res = authRepository.getRegistrationFields()
            res.onSuccess { fields ->
                _registrationFields.value = fields
            }
            _isLoadingRegistrationFields.value = false
        }
    }

    fun loadHomeBanners() {
        viewModelScope.launch {
            try {
                val isPrem = isPremium.value
                val userTriple = userProfile.value
                val isLoggedIn = !userTriple.second.isNullOrBlank()
                val audience = when {
                    isPrem -> "premium_only"
                    !isLoggedIn -> "anonymous_only"
                    else -> "free_only"
                }
                val resp = apiService.getBanners(placement = "home_top", audience = audience)
                if (resp.isSuccessful && resp.body()?.data != null) {
                    _homeBanners.value = resp.body()!!.data!!
                }
            } catch (e: Exception) {
                Log.w("MainViewModel", "Failed to load home banners: ${e.message}")
            }
        }
    }

    // Search query StateFlow with debounce
    val searchQuery = MutableStateFlow("")
    val searchResults: StateFlow<List<VerseEntity>> = searchQuery
        .debounce(300)
        .flatMapLatest { query ->
            if (query.isBlank()) {
                flowOf(emptyList())
            } else {
                bibleRepository.searchVerses(query)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Selected emotion/theme filters for explore
    val selectedEmotion = MutableStateFlow<EmotionEntity?>(null)
    val selectedTheme = MutableStateFlow<ThemeEntity?>(null)

    val versesForSelectedEmotion: StateFlow<List<VerseEntity>> = selectedEmotion
        .flatMapLatest { emotion ->
            if (emotion == null) flowOf(emptyList())
            else bibleRepository.getVersesByEmotion(emotion.id)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val versesForSelectedTheme: StateFlow<List<VerseEntity>> = selectedTheme
        .flatMapLatest { theme ->
            if (theme == null) flowOf(emptyList())
            else bibleRepository.getVersesByTheme(theme.name)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch {
            // Security invariant: Purge any invalid legacy state stored during previous bug
            preferencesManager.purgeLegacyUnauthenticatedPremium()
            preferencesManager.isPremium.collect { isPrem ->
                if (!isPrem) {
                    billingProvider.clearPremium()
                }
            }
        }
        viewModelScope.launch {
            preferencesManager.appMode.collect { cachedMode ->
                if (!cachedMode.isNullOrBlank()) {
                    AppConfig.setAppMode(cachedMode)
                }
            }
        }
        viewModelScope.launch {
            configRepository.config.collect { cfg ->
                if (cfg.premiumProducts.isNotEmpty()) {
                    billingProvider.updateRemoteProducts(cfg.premiumProducts)
                }
            }
        }
        viewModelScope.launch {
            bibleRepository.initializeOfflineSeed()
            syncManager.syncAll()
            analyticsTracker.logAppOpen()
            // Server-side entitlement reconciliation
            refreshBillingStatus()
        }
    }

    fun refreshRemoteConfig(onComplete: ((Boolean) -> Unit)? = null) {
        viewModelScope.launch {
            try {
                val cfg = configRepository.fetchRemoteConfig()
                if (cfg.premiumProducts.isNotEmpty()) {
                    billingProvider.updateRemoteProducts(cfg.premiumProducts)
                }
                onComplete?.invoke(true)
            } catch (e: Exception) {
                android.util.Log.e("MainViewModel", "Error refreshing remote config: ${e.message}")
                onComplete?.invoke(false)
            }
        }
    }

    fun triggerManualSync(onComplete: ((Boolean, String) -> Unit)? = null) {
        viewModelScope.launch {
            val ok = syncManager.syncAll(isManualTrigger = true)
            val msg = when (val s = syncManager.syncState.value) {
                is SyncState.Success -> s.message
                is SyncState.Error -> s.message
                else -> if (ok) "Tudo atualizado" else "Offline — sincronizaremos automaticamente"
            }
            onComplete?.invoke(ok, msg)
        }
    }

    fun completeOnboarding() {
        viewModelScope.launch {
            preferencesManager.setOnboardingCompleted(true)
        }
    }

    fun toggleDailyVerseFavorite() {
        val current = dailyVerse.value ?: return
        viewModelScope.launch {
            val isNowFav = favoriteRepository.toggleFavorite(
                verseId = current.verseId,
                reference = current.reference,
                text = current.text,
                translation = current.translation,
                reflection = current.reflection,
                theme = current.theme
            )
            if (isNowFav) {
                analyticsTracker.logFavoriteAdd(current.verseId)
            } else {
                analyticsTracker.logFavoriteRemove(current.verseId)
            }
        }
    }

    fun toggleVerseFavorite(verse: VerseEntity) {
        viewModelScope.launch {
            val isNowFav = favoriteRepository.toggleFavorite(
                verseId = verse.id,
                reference = "${verse.bookName} ${verse.chapter}:${verse.verseNumber}",
                text = verse.text,
                translation = verse.translation,
                reflection = verse.reflection,
                theme = verse.theme
            )
            if (isNowFav) {
                analyticsTracker.logFavoriteAdd(verse.id)
            } else {
                analyticsTracker.logFavoriteRemove(verse.id)
            }
        }
    }

    fun recordVerseRead(verseId: String, reference: String, text: String, translation: String) {
        viewModelScope.launch {
            historyRepository.addHistory(verseId, reference, text, translation)
            analyticsTracker.logVerseView(verseId, reference)
        }
    }

    fun selectEmotion(emotion: EmotionEntity?) {
        selectedEmotion.value = emotion
        if (emotion != null) {
            analyticsTracker.logEmotionSelected(emotion.id, emotion.name)
        }
    }

    fun selectTheme(theme: ThemeEntity?) {
        selectedTheme.value = theme
        if (theme != null) {
            analyticsTracker.logThemeOpen(theme.id, theme.name)
        }
    }

    fun markDevotionalDayComplete(dayId: String, devotionalId: String, dayNumber: Int, totalDays: Int) {
        viewModelScope.launch {
            devotionalRepository.markDayCompleted(dayId, devotionalId, dayNumber, totalDays)
        }
    }

    fun clearReadingHistory() {
        viewModelScope.launch {
            historyRepository.clearHistory()
        }
    }

    fun setThemeMode(mode: AppThemeMode) {
        viewModelScope.launch {
            preferencesManager.setThemeMode(mode)
            syncManager.syncUserPreferences()
        }
    }

    fun setTextScale(scale: TextScale) {
        viewModelScope.launch {
            preferencesManager.setTextScale(scale)
            syncManager.syncUserPreferences()
        }
    }

    fun deleteFavorite(verseId: String) {
        viewModelScope.launch {
            favoriteRepository.deleteFavorite(verseId)
            analyticsTracker.logFavoriteRemove(verseId)
        }
    }

    private val _isVerifyingBlockedResource = MutableStateFlow(false)
    val isVerifyingBlockedResource: StateFlow<Boolean> = _isVerifyingBlockedResource.asStateFlow()

    fun registerUser(
        name: String,
        email: String,
        pass: String,
        customFields: Map<String, Any> = emptyMap(),
        onResult: (Boolean, String?) -> Unit
    ) {
        viewModelScope.launch {
            val res = authRepository.register(name, email, pass, customFields)
            res.onSuccess {
                fetchRealSubscriptionStatusFromServer()
                onResult(true, null)
            }.onFailure { error ->
                onResult(false, error.message ?: "Erro ao realizar cadastro")
            }
        }
    }

    fun registerUser(name: String, email: String, pass: String, onResult: (Boolean, String?) -> Unit) {
        registerUser(name, email, pass, emptyMap(), onResult)
    }

    fun registerUser(name: String, email: String, pass: String, onResult: (Boolean) -> Unit) {
        registerUser(name, email, pass, emptyMap()) { success, _ -> onResult(success) }
    }

    fun loginUser(email: String, pass: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            val res = authRepository.login(email, pass)
            res.onSuccess {
                // Consult backend billing endpoint for the real subscription status upon login
                fetchRealSubscriptionStatusFromServer()
                onResult(true, null)
            }.onFailure { error ->
                onResult(false, error.message ?: "Erro ao realizar login")
            }
        }
    }

    fun loginUser(email: String, pass: String, onResult: (Boolean) -> Unit) {
        loginUser(email, pass) { success, _ -> onResult(success) }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            billingProvider.clearPremium()
            preferencesManager.clearAuth()
        }
    }

    fun deleteAccount(onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val result = authRepository.deleteAccount()
            billingProvider.clearPremium()
            preferencesManager.clearAuth()
            onResult(result.isSuccess)
        }
    }

    /**
     * Consults the backend endpoint (/billing/status) to verify the real subscription status.
     * Updates the local billing state only with the server response.
     * Prevents local state mutation and guarantees that entitlement is strictly validated against the server.
     */
    suspend fun fetchRealSubscriptionStatusFromServer(): Boolean {
        val currentEmail = preferencesManager.userProfile.first().second
        if (currentEmail.isNullOrBlank()) {
            preferencesManager.saveBillingState(false, "FREE", "NONE", null)
            billingProvider.clearPremium()
            return false
        }

        return try {
            val res = apiService.getBillingStatus()
            if (res.isSuccessful && res.body()?.data != null) {
                val data = res.body()!!.data!!
                val isRealPremium = data.isPremium && data.status.equals("ACTIVE", ignoreCase = true)
                preferencesManager.saveBillingState(
                    isPremium = isRealPremium,
                    status = data.status,
                    source = data.source,
                    expiresAt = data.premiumExpiresAt
                )
                billingProvider.syncWithServer(
                    isPremium = isRealPremium,
                    status = data.status,
                    source = data.source,
                    expiresAt = data.premiumExpiresAt,
                    entitlementsList = data.entitlements
                )
                isRealPremium
            } else {
                // Fail-secure: If backend denies or fails to confirm, revoke local state
                preferencesManager.saveBillingState(false, "FREE", "NONE", null)
                billingProvider.clearPremium()
                false
            }
        } catch (e: Exception) {
            // Fail-secure: Network or server errors must never assume or maintain unverified premium
            false
        }
    }

    /**
     * Checks if the user is authorized to access a blocked or premium resource.
     * Consults the backend billing endpoint directly to verify the real, current subscription status.
     * Prevents any local state override; if the backend does not confirm an active subscription,
     * access is denied.
     */
    fun checkAccessToBlockedResource(
        onAccessGranted: () -> Unit,
        onAccessDenied: (reason: String) -> Unit = {}
    ) {
        viewModelScope.launch {
            _isVerifyingBlockedResource.value = true
            val hasActiveSubscription = fetchRealSubscriptionStatusFromServer()
            _isVerifyingBlockedResource.value = false
            if (hasActiveSubscription) {
                onAccessGranted()
            } else {
                val currentEmail = preferencesManager.userProfile.first().second
                val reason = if (currentEmail.isNullOrBlank()) {
                    "Faça login na sua conta para acessar conteúdos Premium."
                } else {
                    "Este recurso exige uma assinatura Premium ativa."
                }
                onAccessDenied(reason)
            }
        }
    }

    fun refreshBillingStatus(onComplete: ((Boolean) -> Unit)? = null) {
        viewModelScope.launch {
            val isPrem = fetchRealSubscriptionStatusFromServer()
            onComplete?.invoke(isPrem)
        }
    }

    fun devSimulateSubscription(
        action: String,
        productId: String = "premium_yearly",
        durationHours: Int = 24,
        onResult: (Boolean, String?) -> Unit
    ) {
        viewModelScope.launch {
            val currentEmail = preferencesManager.userProfile.first().second
            if (currentEmail.isNullOrBlank()) {
                onResult(false, "Crie uma conta ou entre nela antes de realizar testes de assinatura.")
                return@launch
            }
            try {
                val res = apiService.devSimulateBilling(
                    DevSimulateRequest(
                        action = action,
                        productId = productId,
                        durationHours = durationHours
                    )
                )
                if (res.isSuccessful && res.body()?.data != null) {
                    val data = res.body()!!.data!!
                    preferencesManager.saveBillingState(
                        isPremium = data.isPremium,
                        status = data.status,
                        source = data.source,
                        expiresAt = data.premiumExpiresAt
                    )
                    billingProvider.syncWithServer(
                        isPremium = data.isPremium,
                        status = data.status,
                        source = data.source,
                        expiresAt = data.premiumExpiresAt,
                        entitlementsList = data.entitlements
                    )
                    val label = when (action) {
                        "activate" -> "Ativado com sucesso (modo teste)!"
                        "expire" -> "Expirado com sucesso!"
                        "cancel" -> "Cancelado com sucesso!"
                        "reset" -> "Resetado para plano Gratuito!"
                        else -> "Operação concluída!"
                    }
                    onResult(true, label)
                } else {
                    onResult(false, res.errorBody()?.string() ?: "Falha na simulação de desenvolvimento.")
                }
            } catch (e: Exception) {
                onResult(false, e.message ?: "Erro ao conectar com serviço de simulação.")
            }
        }
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    fun markNotificationAsRead(id: String) {
        viewModelScope.launch {
            notificationRepository.markAsRead(id)
        }
    }

    fun markAllNotificationsAsRead() {
        viewModelScope.launch {
            notificationRepository.markAllAsRead()
        }
    }

    fun refreshNotifications() {
        viewModelScope.launch {
            notificationRepository.refreshNotifications()
        }
    }

    fun registerPushToken(token: String) {
        viewModelScope.launch {
            notificationRepository.registerPushToken(token)
        }
    }

    // ==========================================
    // SUPPORT & HELPDESK
    // ==========================================
    private val _myTickets = MutableStateFlow<List<TicketItemDto>>(emptyList())
    val myTickets: StateFlow<List<TicketItemDto>> = _myTickets.asStateFlow()

    private val _ticketsLoading = MutableStateFlow(false)
    val ticketsLoading: StateFlow<Boolean> = _ticketsLoading.asStateFlow()

    private val _currentTicketDetail = MutableStateFlow<TicketDetailDto?>(null)
    val currentTicketDetail: StateFlow<TicketDetailDto?> = _currentTicketDetail.asStateFlow()

    private val _ticketDetailLoading = MutableStateFlow(false)
    val ticketDetailLoading: StateFlow<Boolean> = _ticketDetailLoading.asStateFlow()

    fun loadMyTickets() {
        viewModelScope.launch {
            _ticketsLoading.value = true
            val result = supportRepository.getMyTickets()
            result.onSuccess { list ->
                _myTickets.value = list
            }.onFailure {
                // Keep existing tickets if network fails
            }
            _ticketsLoading.value = false
        }
    }

    fun loadTicketDetail(ticketId: String) {
        viewModelScope.launch {
            _ticketDetailLoading.value = true
            val result = supportRepository.getTicketDetail(ticketId)
            result.onSuccess { detail ->
                _currentTicketDetail.value = detail
            }
            _ticketDetailLoading.value = false
        }
    }

    fun createSupportTicket(
        subject: String,
        description: String,
        category: String,
        priority: String = "NORMAL",
        guestName: String? = null,
        guestEmail: String? = null,
        onResult: (Boolean, TicketDetailDto?, String?) -> Unit
    ) {
        viewModelScope.launch {
            val result = supportRepository.createTicket(
                subject = subject,
                description = description,
                category = category,
                priority = priority,
                guestName = guestName,
                guestEmail = guestEmail
            )
            result.onSuccess { created ->
                loadMyTickets()
                onResult(true, created, null)
            }.onFailure { error ->
                onResult(false, null, error.message ?: "Erro ao criar chamado")
            }
        }
    }

    fun replyToTicket(
        ticketId: String,
        message: String,
        onResult: (Boolean, String?) -> Unit
    ) {
        viewModelScope.launch {
            val result = supportRepository.replyToTicket(ticketId, message)
            result.onSuccess {
                loadTicketDetail(ticketId)
                loadMyTickets()
                onResult(true, null)
            }.onFailure { error ->
                onResult(false, error.message ?: "Erro ao enviar resposta")
            }
        }
    }
}

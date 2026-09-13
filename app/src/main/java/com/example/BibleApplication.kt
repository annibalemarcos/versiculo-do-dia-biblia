package com.example

import android.app.Application
import android.util.Log
import com.example.core.auth.TokenManager
import com.example.core.config.AppConfig
import com.example.core.datastore.PreferencesManager
import com.example.core.network.ConnectivityManagerNetworkMonitor
import com.example.core.network.NetworkMonitor
import com.example.data.local.db.AppDatabase
import com.example.data.remote.ApiClient
import com.example.data.remote.BibleApiService
import com.example.data.repository.*
import com.example.data.sync.SyncManager
import com.example.data.sync.SyncWorker
import com.google.firebase.FirebaseApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class BibleApplication : Application() {

    companion object {
        private const val TAG = "BibleApplication"
        var instance: BibleApplication? = null
            private set
    }

    val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    lateinit var database: AppDatabase
        private set
    lateinit var preferencesManager: PreferencesManager
        private set
    lateinit var tokenManager: TokenManager
        private set
    lateinit var apiService: BibleApiService
        private set
    lateinit var configRepository: ConfigRepository
        private set
    lateinit var syncManager: SyncManager
        private set
    lateinit var networkMonitor: NetworkMonitor
        private set
    lateinit var favoriteRepository: FavoriteRepository
        private set
    lateinit var historyRepository: HistoryRepository
        private set
    lateinit var devotionalRepository: DevotionalRepository
        private set
    lateinit var authRepository: AuthRepository
        private set
    lateinit var supportRepository: SupportRepository
        private set
    lateinit var notificationRepository: NotificationRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        initFirebase()
        initDependencies()
        setupBackgroundSync()
        setupNetworkObserver()
    }

    private fun initFirebase() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this)
                Log.d(TAG, "Firebase initialized successfully")
            }
        } catch (e: Exception) {
            Log.w(TAG, "FirebaseApp init handled gracefully: ${e.message}")
        }
    }

    private fun initDependencies() {
        preferencesManager = PreferencesManager(this)
        database = AppDatabase.getInstance(this)

        tokenManager = TokenManager(
            preferencesManager = preferencesManager,
            onRefreshTokenCall = { refreshTok ->
                try {
                    val res = apiService.refreshToken(refreshTok)
                    if (res.isSuccessful && res.body()?.data != null) {
                        val data = res.body()!!.data!!
                        Pair(data.accessToken, data.refreshToken)
                    } else {
                        null
                    }
                } catch (e: Exception) {
                    null
                }
            }
        )

        apiService = ApiClient.create(
            baseUrl = AppConfig.getApiBaseUrl(),
            tokenProvider = { tokenManager.getAccessTokenSync() }
        )

        configRepository = ConfigRepository(apiService, preferencesManager)
        networkMonitor = ConnectivityManagerNetworkMonitor(this)

        syncManager = SyncManager(
            context = this,
            database = database,
            apiService = apiService,
            preferencesManager = preferencesManager,
            tokenManager = tokenManager,
            configRepository = configRepository
        )

        favoriteRepository = FavoriteRepository(
            favoriteDao = database.favoriteDao(),
            syncQueueDao = database.syncQueueDao(),
            apiService = apiService,
            tokenManager = tokenManager,
            preferencesManager = preferencesManager,
            context = this
        )

        historyRepository = HistoryRepository(
            historyDao = database.historyDao(),
            apiService = apiService,
            tokenManager = tokenManager,
            preferencesManager = preferencesManager
        )

        devotionalRepository = DevotionalRepository(database.devotionalDao())
        authRepository = AuthRepository(apiService, tokenManager, preferencesManager, database, this)
        supportRepository = SupportRepository(apiService)
        notificationRepository = NotificationRepository(
            notificationDao = database.notificationDao(),
            apiService = apiService,
            tokenManager = tokenManager,
            preferencesManager = preferencesManager
        )
    }

    private fun setupBackgroundSync() {
        try {
            SyncWorker.enqueuePeriodicSync(this)
            Log.d(TAG, "WorkManager periodic sync configured with ExistingPeriodicWorkPolicy.KEEP")
        } catch (e: Exception) {
            Log.w(TAG, "Could not schedule periodic sync via WorkManager: ${e.message}")
        }

        // On cold startup, check for pending items in offline queue
        applicationScope.launch {
            try {
                val pending = database.syncQueueDao().getTotalPendingCount()
                if (pending > 0) {
                    Log.d(TAG, "Application launched with $pending offline items. Enqueueing immediate sync...")
                    SyncWorker.enqueueImmediateSync(this@BibleApplication)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Startup pending queue check note: ${e.message}")
            }
        }
    }

    private fun setupNetworkObserver() {
        applicationScope.launch {
            var wasPreviouslyOffline = false
            var isFirstEmission = true

            networkMonitor.isOnline.collectLatest { isOnline ->
                Log.d(TAG, "NetworkMonitor isOnline changed to: $isOnline")
                if (isFirstEmission) {
                    isFirstEmission = false
                    wasPreviouslyOffline = !isOnline
                    if (isOnline) {
                        val pending = try { database.syncQueueDao().getTotalPendingCount() } catch (_: Exception) { 0 }
                        if (pending > 0) {
                            SyncWorker.enqueueImmediateSync(this@BibleApplication)
                        }
                    }
                    return@collectLatest
                }

                if (isOnline && wasPreviouslyOffline) {
                    Log.d(TAG, "Internet connectivity restored (offline -> online). Requesting automatic sync...")
                    SyncWorker.enqueueImmediateSync(this@BibleApplication, replaceExisting = true)
                }

                wasPreviouslyOffline = !isOnline
            }
        }
    }
}

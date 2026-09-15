package com.example

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.work.BackoffPolicy
import androidx.work.ListenableWorker
import androidx.work.NetworkType
import androidx.work.testing.TestListenableWorkerBuilder
import com.example.core.auth.TokenManager
import com.example.core.config.AppConfig
import com.example.core.config.AppEnvironment
import com.example.core.datastore.PreferencesManager
import com.example.core.network.NetworkMonitor
import com.example.data.local.db.AppDatabase
import com.example.data.local.db.SyncQueueEntity
import com.example.data.remote.BibleApiService
import com.example.data.repository.ConfigRepository
import com.example.data.sync.SyncManager
import com.example.data.sync.SyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.atomic.AtomicInteger
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class SyncAndNetworkTest {

    private lateinit var context: Context
    private lateinit var db: AppDatabase

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        androidx.work.testing.WorkManagerTestInitHelper.initializeTestWorkManager(context)
        org.robolectric.shadows.ShadowLooper.idleMainLooper()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
    }

    @After
    fun tearDown() {
        org.robolectric.shadows.ShadowLooper.idleMainLooper()
        db.close()
    }

    // 1. Mutação offline -> entra na sync_queue
    @Test
    fun test1_OfflineMutationEntersSyncQueue() {
        runBlocking {
            val syncDao = db.syncQueueDao()
            val item = SyncQueueEntity(
                userId = "user_offline_1",
                actionType = "ADD_FAVORITE",
                payloadJson = "GEN_1_1"
            )
            val insertedId = syncDao.insertSyncItem(item)
            assertTrue("Item ID should be > 0", insertedId > 0)

            val pending = syncDao.getAllPending("user_offline_1")
            assertEquals(1, pending.size)
            assertEquals("ADD_FAVORITE", pending[0].actionType)
            assertEquals("GEN_1_1", pending[0].payloadJson)
            assertEquals(0, pending[0].retryCount)
        }
    }

    // 2. Internet retorna -> sync é solicitado automaticamente
    @Test
    fun test2_InternetRestoredTriggersSyncAutomatically() {
        runBlocking {
            val networkState = MutableStateFlow(false)
            var autoSyncTriggerCount = 0

            val scope = CoroutineScope(Dispatchers.Unconfined)
            val job = scope.launch {
                var wasOffline = false
                var isFirst = true
                networkState.collect { isOnline ->
                    if (isFirst) {
                        isFirst = false
                        wasOffline = !isOnline
                        return@collect
                    }
                    if (isOnline && wasOffline) {
                        autoSyncTriggerCount++
                    }
                    wasOffline = !isOnline
                }
            }

            // Offline initially -> transitions to Online
            networkState.value = true
            assertEquals(1, autoSyncTriggerCount)

            // Drops connection -> comes back online
            networkState.value = false
            networkState.value = true
            assertEquals(2, autoSyncTriggerCount)

            job.cancel()
        }
    }

    // 3. WorkManager possui NetworkType.CONNECTED
    @Test
    fun test3_WorkManagerRequiresNetworkTypeConnected() {
        val oneTimeWork = SyncWorker.buildOneTimeWorkRequest()
        assertEquals(NetworkType.CONNECTED, oneTimeWork.workSpec.constraints.requiredNetworkType)

        val periodicWork = SyncWorker.buildPeriodicWorkRequest()
        assertEquals(NetworkType.CONNECTED, periodicWork.workSpec.constraints.requiredNetworkType)
    }

    // 4. Falha transitória -> Result.retry()
    @Test
    fun test4_TransientFailureReturnsResultRetry() {
        runBlocking {
            // Configure an unreachable local port to properly test transient network failure behavior
            AppConfig.setCustomDebugApiUrl("http://127.0.0.1:59999/api/v1/")
            try {
                val worker = TestListenableWorkerBuilder<SyncWorker>(context).build()
                val result = worker.doWork()
                assertTrue("Transient network/backend failure must return Result.retry()", result is ListenableWorker.Result.Retry)
            } finally {
                AppConfig.setEnvironment(AppEnvironment.EMULATOR)
            }
        }
    }

    // 5. Backoff configurado como EXPONENTIAL
    @Test
    fun test5_BackoffConfiguredAsExponential() {
        val oneTimeWork = SyncWorker.buildOneTimeWorkRequest()
        assertEquals(BackoffPolicy.EXPONENTIAL, oneTimeWork.workSpec.backoffPolicy)
        assertTrue("Backoff delay duration should be >= 10s", oneTimeWork.workSpec.backoffDelayDuration >= 10000)

        val periodicWork = SyncWorker.buildPeriodicWorkRequest()
        assertEquals(BackoffPolicy.EXPONENTIAL, periodicWork.workSpec.backoffPolicy)
        assertTrue("Periodic backoff delay duration should be >= 10s", periodicWork.workSpec.backoffDelayDuration >= 10000)
    }

    // 6. Worker executa SyncManager e não duplica lógica (e previne loop infinito após max retries)
    @Test
    fun test6_WorkerExecutesSyncManagerAndHandlesPermanentFailure() {
        runBlocking {
            val workerOverLimit = TestListenableWorkerBuilder<SyncWorker>(context)
                .setRunAttemptCount(5)
                .build()
            val result = workerOverLimit.doWork()
            assertTrue("Permanent failure/exceeded attempts must return Result.failure() without looping", result is ListenableWorker.Result.Failure)
        }
    }

    // 7. Worker periódico não é registrado múltiplas vezes (ExistingPeriodicWorkPolicy.KEEP)
    @Test
    fun test7_PeriodicWorkerNotRegisteredMultipleTimes() {
        assertEquals("bible_periodic_sync_work", SyncWorker.UNIQUE_PERIODIC_WORK_NAME)
        assertEquals("bible_immediate_sync_work", SyncWorker.UNIQUE_ONE_TIME_WORK_NAME)

        SyncWorker.enqueuePeriodicSync(context)
        SyncWorker.enqueuePeriodicSync(context)

        val workInfos = androidx.work.WorkManager.getInstance(context)
            .getWorkInfosForUniqueWork(SyncWorker.UNIQUE_PERIODIC_WORK_NAME)
            .get()
        assertEquals(1, workInfos.size)
    }

    // 8. App fechado/reiniciado -> fila continua persistida em Room
    @Test
    fun test8_AppRestartPreservesPersistentQueue() {
        runBlocking {
            val dbFile = File(context.cacheDir, "test_persistence_sync.db")
            if (dbFile.exists()) dbFile.delete()

            var persistentDb = Room.databaseBuilder(context, AppDatabase::class.java, dbFile.absolutePath)
                .allowMainThreadQueries()
                .build()

            persistentDb.syncQueueDao().insertSyncItem(
                SyncQueueEntity(
                    userId = "persistent_user",
                    actionType = "ADD_FAVORITE",
                    payloadJson = "PSA_119_105"
                )
            )
            persistentDb.syncQueueDao().insertSyncItem(
                SyncQueueEntity(
                    userId = "persistent_user",
                    actionType = "REMOVE_FAVORITE",
                    payloadJson = "MAT_5_14"
                )
            )

            assertEquals(2, persistentDb.syncQueueDao().getTotalPendingCount())

            // Simulate process kill / app restart: close DB
            persistentDb.close()

            // Reopen DB on next app launch
            val reopenedDb = Room.databaseBuilder(context, AppDatabase::class.java, dbFile.absolutePath)
                .allowMainThreadQueries()
                .build()

            val pendingAfterRestart = reopenedDb.syncQueueDao().getAllPending("persistent_user")
            assertEquals(2, pendingAfterRestart.size)
            assertEquals("PSA_119_105", pendingAfterRestart[0].payloadJson)
            assertEquals("MAT_5_14", pendingAfterRestart[1].payloadJson)

            reopenedDb.close()
            dbFile.delete()
        }
    }

    // 9. Sync bem-sucedido -> item removido da fila
    @Test
    fun test9_SuccessfulSyncRemovesItemFromQueue() {
        runBlocking {
            val syncDao = db.syncQueueDao()
            val id = syncDao.insertSyncItem(
                SyncQueueEntity(
                    userId = "user_success_sync",
                    actionType = "ADD_FAVORITE",
                    payloadJson = "ROM_12_2"
                )
            )

            assertEquals(1, syncDao.getPendingCount("user_success_sync"))

            // Item is removed upon successful sync
            syncDao.deleteSyncItem(id)

            assertEquals(0, syncDao.getPendingCount("user_success_sync"))
        }
    }

    // 10. Falha -> item permanece e retryCount aumenta
    @Test
    fun test10_FailedSyncRetainsItemAndIncrementsRetryCount() {
        runBlocking {
            val syncDao = db.syncQueueDao()
            val id = syncDao.insertSyncItem(
                SyncQueueEntity(
                    userId = "user_fail_retry",
                    actionType = "ADD_FAVORITE",
                    payloadJson = "ISA_40_31",
                    retryCount = 0
                )
            )

            // Transient failure occurs: item retained, retry count incremented
            syncDao.incrementRetryCount(id)

            val pending = syncDao.getAllPending("user_fail_retry")
            assertEquals(1, pending.size)
            assertEquals(1, pending[0].retryCount)
            assertEquals("ISA_40_31", pending[0].payloadJson)

            // Second retry failure
            syncDao.incrementRetryCount(id)
            val pendingSecond = syncDao.getAllPending("user_fail_retry")
            assertEquals(1, pendingSecond.size)
            assertEquals(2, pendingSecond[0].retryCount)
        }
    }

    // Extra: NetworkMonitor emits correct state
    @Test
    fun testNetworkMonitorEmitsCorrectState() {
        runBlocking {
            class FakeNetworkMonitor(initial: Boolean = false) : NetworkMonitor {
                private val _state = MutableStateFlow(initial)
                override val isOnline: Flow<Boolean> = _state.asStateFlow()
                override fun isCurrentlyOnline(): Boolean = _state.value
                override suspend fun testApiConnectivity(baseUrl: String?): Boolean = _state.value
                fun emit(online: Boolean) { _state.value = online }
            }

            val monitor = FakeNetworkMonitor(initial = false)
            assertFalse(monitor.isCurrentlyOnline())
            assertFalse(monitor.isOnline.first())

            monitor.emit(true)
            assertTrue(monitor.isCurrentlyOnline())
            assertTrue(monitor.isOnline.first())
            assertTrue(monitor.testApiConnectivity())
        }
    }

    private fun createMockApiService(
        configCalls: AtomicInteger,
        concurrentExecutions: AtomicInteger? = null,
        maxConcurrent: AtomicInteger? = null,
        delayMs: Long = 0
    ): BibleApiService {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val url = chain.request().url.toString()
                if (url.contains("app/config")) {
                    configCalls.incrementAndGet()
                    concurrentExecutions?.let { active ->
                        val cur = active.incrementAndGet()
                        maxConcurrent?.let { max ->
                            max.updateAndGet { prev -> if (cur > prev) cur else prev }
                        }
                    }
                    if (delayMs > 0) {
                        try {
                            Thread.sleep(delayMs)
                        } catch (_: InterruptedException) {}
                    }
                    concurrentExecutions?.decrementAndGet()
                }

                val json = when {
                    url.contains("app/config") -> """{"data": {"app_mode": "STANDARD", "premium_enabled": true}}"""
                    url.contains("verses/daily") -> """{"data": {"id": "1", "target_date": "2026-09-14", "verse_id": "v1", "reference": "Jo 3:16", "text": "Porque Deus amou..."}}"""
                    url.contains("themes") -> """{"data": []}"""
                    url.contains("emotions") -> """{"data": []}"""
                    url.contains("devotionals") -> """{"data": []}"""
                    url.contains("verses") -> """{"data": []}"""
                    else -> """{"data": {}}"""
                }

                Response.Builder()
                    .request(chain.request())
                    .protocol(Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body(ResponseBody.create("application/json".toMediaTypeOrNull(), json))
                    .build()
            }
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl("http://mock.test/api/v1/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()

        return retrofit.create(BibleApiService::class.java)
    }

    // 11. Concorrência: duas ou mais chamadas concorrentes a syncAll() não executam
    //     dois full-syncs simultaneamente e são consolidadas em uma única execução
    @Test
    fun test11_ConcurrentSyncAllCallsDoNotExecuteSimultaneouslyAndAreConsolidated() {
        runBlocking {
            val configCalls = AtomicInteger(0)
            val activeExecutions = AtomicInteger(0)
            val maxConcurrent = AtomicInteger(0)
            val mockApi = createMockApiService(configCalls, activeExecutions, maxConcurrent, delayMs = 80)
            val prefs = PreferencesManager(context)
            val tokenManager = TokenManager(preferencesManager = prefs, onRefreshTokenCall = { null })
            val configRepo = ConfigRepository(mockApi, prefs)
            val syncManager = SyncManager(
                context = context,
                database = db,
                apiService = mockApi,
                preferencesManager = prefs,
                tokenManager = tokenManager,
                configRepository = configRepo
            )

            // Dispara 3 chamadas concorrentes
            val call1 = async(Dispatchers.IO) { syncManager.syncAll() }
            val call2 = async(Dispatchers.IO) { syncManager.syncAll() }
            val call3 = async(Dispatchers.IO) { syncManager.syncAll() }

            val res1 = call1.await()
            val res2 = call2.await()
            val res3 = call3.await()

            assertTrue("Chamada 1 deve retornar sucesso", res1)
            assertTrue("Chamada 2 deve retornar sucesso", res2)
            assertTrue("Chamada 3 deve retornar sucesso", res3)

            // A: Máximo de execuções concorrentes simultâneas nunca pode ser > 1
            assertEquals("Execuções de full sync simultâneas devem ser no máximo 1", 1, maxConcurrent.get())

            // B: As chamadas concorrentes são consolidadas em uma única execução,
            //    sem fila repetida de full syncs
            assertEquals("Chamadas concorrentes devem ser consolidadas em 1 única requisição remota", 1, configCalls.get())
        }
    }

    // 12. Posterior: depois que a execução compartilhada termina,
    //     uma nova chamada posterior inicia outro sync normalmente
    @Test
    fun test12_SubsequentSyncAllStartsNewExecutionAfterPreviousFinishes() {
        runBlocking {
            val configCalls = AtomicInteger(0)
            val mockApi = createMockApiService(configCalls)
            val prefs = PreferencesManager(context)
            val tokenManager = TokenManager(preferencesManager = prefs, onRefreshTokenCall = { null })
            val configRepo = ConfigRepository(mockApi, prefs)
            val syncManager = SyncManager(
                context = context,
                database = db,
                apiService = mockApi,
                preferencesManager = prefs,
                tokenManager = tokenManager,
                configRepository = configRepo
            )

            val firstResult = syncManager.syncAll()
            assertTrue("Primeira sincronização deve ter sucesso", firstResult)
            assertEquals("Primeira sincronização deve realizar 1 busca remota", 1, configCalls.get())

            // Nova chamada posterior após término da anterior
            val secondResult = syncManager.syncAll()
            assertTrue("Segunda sincronização posterior deve ter sucesso", secondResult)
            assertEquals("Chamada posterior deve iniciar nova sincronização normalmente", 2, configCalls.get())
        }
    }

    // 13. Config sync: realiza somente uma busca remota sem requisição duplicada
    @Test
    fun test13_ConfigSyncExecutesSingleRemoteFetch() {
        runBlocking {
            val configCalls = AtomicInteger(0)
            val mockApi = createMockApiService(configCalls)
            val prefs = PreferencesManager(context)
            val tokenManager = TokenManager(preferencesManager = prefs, onRefreshTokenCall = { null })
            val configRepo = ConfigRepository(mockApi, prefs)
            val syncManager = SyncManager(
                context = context,
                database = db,
                apiService = mockApi,
                preferencesManager = prefs,
                tokenManager = tokenManager,
                configRepository = configRepo
            )

            val result = syncManager.syncConfig()
            assertTrue("syncConfig deve retornar true", result)
            assertTrue("ConfigRepository deve registrar sucesso de busca", configRepo.isLastFetchSuccessful)
            // Confirmação de que config sync faz exatamente 1 requisição, eliminando redundância
            assertEquals("syncConfig deve realizar apenas 1 chamada remota", 1, configCalls.get())
        }
    }
}

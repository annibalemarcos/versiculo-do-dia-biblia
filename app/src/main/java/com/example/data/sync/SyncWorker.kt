package com.example.data.sync

import android.content.Context
import android.util.Log
import androidx.room.Room
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.core.auth.TokenManager
import com.example.core.config.AppConfig
import com.example.core.datastore.PreferencesManager
import com.example.data.local.db.AppDatabase
import com.example.data.remote.ApiClient
import com.example.data.remote.BibleApiService
import com.example.data.repository.ConfigRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "SyncWorker"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Starting resilient background sync (attempt: $runAttemptCount)...")

        try {
            val database = Room.databaseBuilder(
                applicationContext,
                AppDatabase::class.java,
                "biblia_database.db"
            ).fallbackToDestructiveMigration().build()

            val preferencesManager = PreferencesManager(applicationContext)
            var currentToken: String? = null
            var serviceRef: BibleApiService? = null

            val tokenManager = TokenManager(
                preferencesManager = preferencesManager,
                onRefreshTokenCall = { refreshTok ->
                    try {
                        val res = serviceRef?.refreshToken(refreshTok)
                        if (res?.isSuccessful == true && res.body()?.data != null) {
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

            currentToken = tokenManager.getAccessToken()

            val apiService = ApiClient.create(
                baseUrl = AppConfig.getApiBaseUrl(),
                tokenProvider = { currentToken }
            )
            serviceRef = apiService

            val configRepository = ConfigRepository(apiService, preferencesManager)

            val syncManager = SyncManager(
                context = applicationContext,
                database = database,
                apiService = apiService,
                preferencesManager = preferencesManager,
                tokenManager = tokenManager,
                configRepository = configRepository
            )

            val success = syncManager.syncAll(isManualTrigger = false)

            if (success) {
                Log.i(TAG, "SyncWorker successfully finished sync cycle.")
                Result.success()
            } else {
                val pendingCount = syncManager.getPendingCountDirect()
                if (pendingCount > 0 && runAttemptCount < 5) {
                    Log.w(TAG, "Sync failed with $pendingCount pending queue items. Scheduling retry with exponential backoff.")
                    Result.retry()
                } else {
                    Result.success()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "SyncWorker unexpected exception: ${e.message}", e)
            if (runAttemptCount < 5) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
}

object WorkManagerSyncScheduler {
    private const val PERIODIC_WORK_NAME = "bible_periodic_sync_work"
    private const val ONE_TIME_WORK_NAME = "bible_immediate_sync_work"

    fun schedulePeriodicSync(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val periodicRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            repeatInterval = 15,
            repeatIntervalTimeUnit = TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                30,
                TimeUnit.SECONDS
            )
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicRequest
        )
    }

    fun enqueueImmediateSync(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val immediateRequest = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                15,
                TimeUnit.SECONDS
            )
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            ONE_TIME_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            immediateRequest
        )
    }
}

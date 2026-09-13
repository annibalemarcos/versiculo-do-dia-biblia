package com.example.data.sync

import android.content.Context
import android.util.Log
import androidx.work.*
import com.example.BibleApplication
import java.util.concurrent.TimeUnit

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val TAG = "SyncWorker"
        const val UNIQUE_PERIODIC_WORK_NAME = "bible_periodic_sync_work"
        const val UNIQUE_ONE_TIME_WORK_NAME = "bible_immediate_sync_work"

        // Constraint: Must have active network connectivity
        val SYNC_CONSTRAINTS: Constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        fun buildOneTimeWorkRequest(): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(SYNC_CONSTRAINTS)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    15,
                    TimeUnit.SECONDS
                )
                .addTag(TAG)
                .build()
        }

        fun buildPeriodicWorkRequest(): PeriodicWorkRequest {
            return PeriodicWorkRequestBuilder<SyncWorker>(
                repeatInterval = 6,
                repeatIntervalTimeUnit = TimeUnit.HOURS
            )
                .setConstraints(SYNC_CONSTRAINTS)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    15,
                    TimeUnit.SECONDS
                )
                .addTag(TAG)
                .build()
        }

        fun enqueuePeriodicSync(context: Context) {
            val workManager = WorkManager.getInstance(context)
            workManager.enqueueUniquePeriodicWork(
                UNIQUE_PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                buildPeriodicWorkRequest()
            )
            Log.d(TAG, "Unique periodic sync enqueued with ExistingPeriodicWorkPolicy.KEEP")
        }

        fun enqueueImmediateSync(context: Context, replaceExisting: Boolean = false) {
            val workManager = WorkManager.getInstance(context)
            val policy = if (replaceExisting) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.KEEP
            workManager.enqueueUniqueWork(
                UNIQUE_ONE_TIME_WORK_NAME,
                policy,
                buildOneTimeWorkRequest()
            )
            Log.d(TAG, "Unique immediate sync enqueued with policy $policy")
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "SyncWorker execution started. Attempt count: $runAttemptCount")

        // Guard against infinite retry loops if server or payload is permanently broken
        if (runAttemptCount >= 5) {
            Log.w(TAG, "SyncWorker exceeded maximum retry attempts ($runAttemptCount). Marking as failure to avoid loop.")
            return Result.failure()
        }

        return try {
            val app = applicationContext as? BibleApplication
            val syncManager = app?.syncManager ?: BibleApplication.instance?.syncManager

            if (syncManager == null) {
                Log.e(TAG, "SyncManager instance is null in BibleApplication. Retrying later.")
                return Result.retry()
            }

            val syncSuccess = syncManager.syncAll(isManualTrigger = false)
            if (syncSuccess) {
                Log.d(TAG, "SyncWorker finished successfully.")
                Result.success()
            } else {
                Log.w(TAG, "SyncManager returned false (transient network or server error). Requesting exponential backoff retry.")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unhandled exception during SyncWorker: ${e.message}", e)
            Result.retry()
        }
    }
}

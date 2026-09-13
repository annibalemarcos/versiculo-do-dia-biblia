package com.example

import android.app.Application
import android.util.Log
import com.example.data.sync.WorkManagerSyncScheduler
import com.google.firebase.FirebaseApp

class BibleApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this)
                Log.d("BibleApplication", "Firebase initialized successfully")
            }
        } catch (e: Exception) {
            Log.w("BibleApplication", "FirebaseApp init handled gracefully: ${e.message}")
        }

        try {
            WorkManagerSyncScheduler.schedulePeriodicSync(this)
            Log.d("BibleApplication", "WorkManager resilient periodic sync scheduled.")
        } catch (e: Exception) {
            Log.e("BibleApplication", "Failed to schedule WorkManager sync: ${e.message}")
        }
    }
}

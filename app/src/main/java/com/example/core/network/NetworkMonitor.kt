package com.example.core.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.flow.distinctUntilChanged

interface NetworkMonitor {
    val isOnline: Flow<Boolean>
    fun isCurrentlyOnline(): Boolean
    suspend fun testApiConnectivity(baseUrl: String? = null): Boolean
}

class ConnectivityManagerNetworkMonitor(
    private val context: Context
) : NetworkMonitor {

    companion object {
        private const val TAG = "NetworkMonitor"
    }

    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    override fun isCurrentlyOnline(): Boolean {
        val cm = connectivityManager ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val capabilities = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    override suspend fun testApiConnectivity(baseUrl: String?): Boolean = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        if (!isCurrentlyOnline()) return@withContext false
        try {
            val target = baseUrl ?: com.example.core.config.AppConfig.getApiBaseUrl()
            val url = java.net.URI(target).toURL()
            val connection = url.openConnection() as java.net.HttpURLConnection
            connection.connectTimeout = 3000
            connection.readTimeout = 3000
            connection.requestMethod = "HEAD"
            val code = connection.responseCode
            code in 200..399
        } catch (_: Exception) {
            false
        }
    }

    override val isOnline: Flow<Boolean> = callbackFlow {
        val cm = connectivityManager
        if (cm == null) {
            channel.trySend(false)
            channel.close()
            return@callbackFlow
        }

        // Send current initial connectivity state
        val initial = isCurrentlyOnline()
        channel.trySend(initial)
        Log.d(TAG, "NetworkMonitor initialized. Initial online status: $initial")

        val callback = object : ConnectivityManager.NetworkCallback() {
            private val availableNetworks = mutableSetOf<Network>()

            override fun onAvailable(network: Network) {
                availableNetworks.add(network)
                Log.d(TAG, "Network available. Active networks count: ${availableNetworks.size}")
                channel.trySend(true)
            }

            override fun onLost(network: Network) {
                availableNetworks.remove(network)
                val online = availableNetworks.isNotEmpty() || isCurrentlyOnline()
                Log.d(TAG, "Network lost. Remaining online: $online")
                channel.trySend(online)
            }

            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                val hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                if (hasInternet) {
                    availableNetworks.add(network)
                } else {
                    availableNetworks.remove(network)
                }
                val online = availableNetworks.isNotEmpty()
                Log.d(TAG, "Network capabilities changed. Online: $online")
                channel.trySend(online)
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        try {
            cm.registerNetworkCallback(request, callback)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register network callback with request, falling back to default: ${e.message}")
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    cm.registerDefaultNetworkCallback(callback)
                }
            } catch (fallbackEx: Exception) {
                Log.e(TAG, "Failed fallback network callback registration: ${fallbackEx.message}")
                channel.trySend(isCurrentlyOnline())
            }
        }

        awaitClose {
            try {
                cm.unregisterNetworkCallback(callback)
            } catch (e: Exception) {
                Log.w(TAG, "Error unregistering network callback: ${e.message}")
            }
        }
    }
        .distinctUntilChanged()
        .conflate()
}

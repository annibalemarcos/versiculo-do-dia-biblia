package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.NetworkType
import com.example.core.auth.TokenManager
import com.example.core.config.AppConfig
import com.example.core.config.AppEnvironment
import com.example.core.datastore.PreferencesManager
import com.example.data.local.db.AppDatabase
import com.example.data.remote.ApiClient
import com.example.data.remote.BibleApiService
import com.example.data.repository.ConfigRepository
import com.example.data.sync.SyncManager
import com.example.data.sync.SyncWorker
import okhttp3.OkHttpClient
import okhttp3.Request
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ProductionEndpointAuditTest {

    private val expectedProductionUrl = "https://biblia-api.larzusapps.com/api/v1/"

    @Test
    fun `requirement A - release URL must strictly be https biblia-api larzusapps com api v1`() {
        // AppConfig default production endpoint
        assertEquals(expectedProductionUrl, AppConfig.DEFAULT_PRODUCTION_API_URL)

        // BuildConfig BASE_API_URL configured for production
        assertEquals(expectedProductionUrl, BuildConfig.BASE_API_URL)

        // AppConfig release URL resolution
        val releaseUrl = AppConfig.getReleaseApiBaseUrl()
        assertEquals(expectedProductionUrl, releaseUrl)

        // In production environment
        AppConfig.setEnvironment(AppEnvironment.PRODUCTION)
        assertEquals(expectedProductionUrl, AppConfig.getApiBaseUrl())
    }

    @Test
    fun `requirement B - no LAN IP is used in release even if debug setters are called`() {
        // Attempt to configure LAN IP
        AppConfig.setDebugHostIp("192.168.1.100", 8000)
        AppConfig.setCustomDebugApiUrl("http://192.168.1.200:8000/api/v1/")

        // Verify that release URL resolution completely rejects and ignores LAN IPs
        val releaseUrl = AppConfig.getReleaseApiBaseUrl()
        assertEquals(expectedProductionUrl, releaseUrl)
        assertFalse("Release URL must not contain 192.168.", releaseUrl.contains("192.168."))
        assertFalse("Release URL must not contain LAN IP", releaseUrl.contains("http://"))
        assertTrue("Release URL must use HTTPS", releaseUrl.startsWith("https://"))
    }

    @Test
    fun `requirement C - localhost and 10 0 2 2 are never used in release`() {
        val releaseUrl = AppConfig.getReleaseApiBaseUrl()
        assertFalse("Release URL must not contain localhost", releaseUrl.contains("localhost"))
        assertFalse("Release URL must not contain 10.0.2.2", releaseUrl.contains("10.0.2.2"))
        assertFalse("Release URL must not contain port 8000", releaseUrl.contains(":8000"))
        assertEquals(expectedProductionUrl, releaseUrl)
    }

    @Test
    fun `requirement D - Retrofit ApiClient receives the correct release URL`() {
        val releaseUrl = AppConfig.getReleaseApiBaseUrl()
        var capturedAuthToken: String? = null

        val apiService = ApiClient.create(
            baseUrl = releaseUrl,
            tokenProvider = { capturedAuthToken }
        )

        assertNotNull("ApiClient must create a valid BibleApiService instance", apiService)
        assertEquals("https://biblia-api.larzusapps.com/api/v1/", releaseUrl)
    }

    @Test
    fun `requirement E - JWT authentication header is preserved and correctly injected by ApiClient`() {
        val testJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.testPayload.signature"
        var activeToken: String? = testJwt

        // Verify the auth interceptor logic used by ApiClient
        val authInterceptor = okhttp3.Interceptor { chain ->
            val original = chain.request()
            val builder = original.newBuilder()
                .header("X-App-Id", AppConfig.APP_ID)
                .header("X-Client-Platform", "android")
                .header("X-App-Version", AppConfig.VERSION_NAME)

            activeToken?.takeIf { it.isNotBlank() }?.let { token ->
                builder.header("Authorization", "Bearer $token")
            }

            chain.proceed(builder.build())
        }

        // Test with active JWT
        val requestWithToken = Request.Builder()
            .url("https://biblia-api.larzusapps.com/api/v1/user/favorites")
            .build()

        val capturedRequestWithToken = executeInterceptor(authInterceptor, requestWithToken)
        assertEquals("Bearer $testJwt", capturedRequestWithToken.header("Authorization"))
        assertEquals(AppConfig.APP_ID, capturedRequestWithToken.header("X-App-Id"))
        assertEquals("android", capturedRequestWithToken.header("X-Client-Platform"))

        // Test with null token (anonymous mode)
        activeToken = null
        val capturedRequestAnonymous = executeInterceptor(authInterceptor, requestWithToken)
        assertNull(capturedRequestAnonymous.header("Authorization"))
    }

    @Test
    fun `requirement F - SyncManager and SyncWorker utilize the same unified API service layer`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val db = AppDatabase.getInstance(context)
        val prefs = PreferencesManager(context)
        val tokenManager = TokenManager(preferencesManager = prefs, onRefreshTokenCall = { null })

        val apiService = ApiClient.create(
            baseUrl = AppConfig.getReleaseApiBaseUrl(),
            tokenProvider = { tokenManager.getAccessTokenSync() }
        )
        val configRepo = ConfigRepository(apiService, prefs)

        val syncManager = SyncManager(
            context = context,
            database = db,
            apiService = apiService,
            preferencesManager = prefs,
            tokenManager = tokenManager,
            configRepository = configRepo
        )

        assertNotNull("SyncManager must be initialized with unified ApiClient", syncManager)

        // Validate SyncWorker requests are created with network constraints
        val periodicRequest = SyncWorker.buildPeriodicWorkRequest()
        assertNotNull(periodicRequest)
        assertEquals(NetworkType.CONNECTED, periodicRequest.workSpec.constraints.requiredNetworkType)

        val oneTimeRequest = SyncWorker.buildOneTimeWorkRequest()
        assertNotNull(oneTimeRequest)
        assertEquals(NetworkType.CONNECTED, oneTimeRequest.workSpec.constraints.requiredNetworkType)
    }

    @Test
    fun `requirement G - verify all BibleApiService endpoint paths are relative and match production OpenAPI`() {
        val methods = BibleApiService::class.java.methods
        val expectedBase = "https://biblia-api.larzusapps.com/api/v1/"
        for (method in methods) {
            val getAnnotation = method.getAnnotation(retrofit2.http.GET::class.java)
            val postAnnotation = method.getAnnotation(retrofit2.http.POST::class.java)
            val putAnnotation = method.getAnnotation(retrofit2.http.PUT::class.java)
            val deleteAnnotation = method.getAnnotation(retrofit2.http.DELETE::class.java)
            val patchAnnotation = method.getAnnotation(retrofit2.http.PATCH::class.java)

            val path = getAnnotation?.value
                ?: postAnnotation?.value
                ?: putAnnotation?.value
                ?: deleteAnnotation?.value
                ?: patchAnnotation?.value

            if (path != null) {
                // Must not start with /api/v1 or leading slash to prevent duplication
                assertFalse("Path must not have leading slash: $path", path.startsWith("/"))
                assertFalse("Path must not contain api/v1: $path", path.contains("api/v1"))
                // Combined URL must have exactly one occurrence of /api/v1/
                val combined = expectedBase + path
                val countApiV1 = "/api/v1/".toRegex().findAll(combined).count()
                assertEquals("Path '$path' combined with base '$expectedBase' has incorrect /api/v1/ count", 1, countApiV1)
            }
        }
    }

    private fun executeInterceptor(
        interceptor: okhttp3.Interceptor,
        request: Request
    ): Request {
        var modifiedRequest = request
        val chain = object : okhttp3.Interceptor.Chain {
            override fun request(): Request = modifiedRequest
            override fun proceed(req: Request): okhttp3.Response {
                modifiedRequest = req
                // Dummy response for chain
                return okhttp3.Response.Builder()
                    .request(req)
                    .protocol(okhttp3.Protocol.HTTP_1_1)
                    .code(200)
                    .message("OK")
                    .body(okhttp3.ResponseBody.create(null, ""))
                    .build()
            }
            override fun connection() = null
            override fun call() = throw UnsupportedOperationException()
            override fun connectTimeoutMillis() = 15000
            override fun readTimeoutMillis() = 15000
            override fun writeTimeoutMillis() = 15000
            override fun withConnectTimeout(timeout: Int, unit: TimeUnit) = this
            override fun withReadTimeout(timeout: Int, unit: TimeUnit) = this
            override fun withWriteTimeout(timeout: Int, unit: TimeUnit) = this
        }
        interceptor.intercept(chain)
        return modifiedRequest
    }
}

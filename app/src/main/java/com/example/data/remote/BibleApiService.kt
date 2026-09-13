package com.example.data.remote

import android.util.Log
import com.example.BuildConfig
import com.example.core.config.AppConfig
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface BibleApiService {

    // ==========================================
    // HEALTH & DIAGNOSTICS
    // ==========================================
    @GET("health")
    suspend fun getHealth(): Response<Map<String, Any>>

    // ==========================================
    // APP CONFIG & REMOTE CONTROL
    // ==========================================
    @GET("app/config")
    suspend fun getAppConfig(): Response<ApiResponse<AppConfigData>>

    // ==========================================
    // BIBLE CONTENT & VERSES
    // ==========================================
    @GET("verses/daily")
    suspend fun getDailyVerse(@Query("target_date") targetDate: String? = null): Response<ApiResponse<DailyVerseData>>

    @GET("verses/search")
    suspend fun searchVerses(
        @Query("q") query: String,
        @Query("translation") translation: String? = null,
        @Query("limit") limit: Int = 30
    ): Response<ApiResponse<List<VerseDto>>>

    @GET("verses/{verseId}")
    suspend fun getVerseById(@Path("verseId") verseId: String): Response<ApiResponse<VerseDto>>

    @GET("books")
    suspend fun getBooks(): Response<ApiResponse<List<BookDto>>>

    @GET("themes")
    suspend fun getThemes(): Response<ApiResponse<List<ThemeDto>>>

    @GET("emotions")
    suspend fun getEmotions(): Response<ApiResponse<List<EmotionDto>>>

    // ==========================================
    // DEVOTIONALS
    // ==========================================
    @GET("devotionals")
    suspend fun getDevotionals(): Response<ApiResponse<List<DevotionalDto>>>

    @GET("devotionals/{devotionalId}")
    suspend fun getDevotionalDetail(@Path("devotionalId") devotionalId: String): Response<ApiResponse<DevotionalDetailData>>

    // ==========================================
    // AUTHENTICATION
    // ==========================================
    @POST("auth/register")
    suspend fun register(@Body request: UserRegisterRequest): Response<ApiResponse<AuthData>>

    @POST("auth/login")
    suspend fun login(@Body request: UserLoginRequest): Response<ApiResponse<AuthData>>

    @POST("auth/refresh")
    suspend fun refreshToken(@Query("refresh_token") refreshToken: String): Response<ApiResponse<RefreshTokenData>>

    @POST("auth/logout")
    suspend fun logout(): Response<ApiResponse<Unit>>

    // ==========================================
    // USER DATA SYNC
    // ==========================================
    @GET("me")
    suspend fun getCurrentUser(): Response<ApiResponse<UserDto>>

    @GET("me/favorites")
    suspend fun getUserFavorites(): Response<ApiResponse<List<FavoriteItemDto>>>

    @POST("me/favorites")
    suspend fun addUserFavorite(@Body favorite: FavoriteItemDto): Response<ApiResponse<Map<String, String>>>

    @DELETE("me/favorites/{verseId}")
    suspend fun removeUserFavorite(@Path("verseId") verseId: String): Response<ApiResponse<Unit>>

    @GET("me/history")
    suspend fun getReadingHistory(): Response<ApiResponse<List<ReadingHistoryDto>>>

    @POST("me/history")
    suspend fun addReadingHistory(@Body history: ReadingHistoryDto): Response<ApiResponse<Map<String, String>>>

    @GET("me/preferences")
    suspend fun getPreferences(): Response<ApiResponse<UserPreferencesDto>>

    @PUT("me/preferences")
    suspend fun updatePreferences(@Body preferences: PreferenceDto): Response<ApiResponse<Unit>>

    // ==========================================
    // BILLING & ENTITLEMENTS
    // ==========================================
    @GET("billing/products")
    suspend fun getBillingProducts(): Response<ApiResponse<List<PremiumProductDto>>>

    @GET("billing/status")
    suspend fun getBillingStatus(): Response<ApiResponse<BillingStatusData>>

    @POST("billing/verify")
    suspend fun verifyPurchase(@Body request: VerifyPurchaseRequest): Response<ApiResponse<VerifyPurchaseData>>

    @POST("billing/restore")
    suspend fun restorePurchases(@Body request: RestorePurchasesRequest): Response<ApiResponse<RestorePurchasesData>>

    // ==========================================
    // ANALYTICS
    // ==========================================
    @POST("analytics/events")
    suspend fun sendAnalyticsEvent(@Body event: AnalyticsEventRequest): Response<ApiResponse<Unit>>

    // ==========================================
    // SUPPORT & HELPDESK
    // ==========================================
    @POST("support/tickets")
    suspend fun createSupportTicket(@Body request: TicketCreateRequest): Response<ApiResponse<TicketDetailDto>>

    @GET("support/tickets")
    suspend fun getMySupportTickets(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<List<TicketItemDto>>>

    @GET("support/tickets/{ticketId}")
    suspend fun getSupportTicketDetail(@Path("ticketId") ticketId: String): Response<ApiResponse<TicketDetailDto>>

    @POST("support/tickets/{ticketId}/messages")
    suspend fun replySupportTicket(
        @Path("ticketId") ticketId: String,
        @Body request: TicketMessageCreateRequest
    ): Response<ApiResponse<TicketMessageDto>>

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    @GET("me/notifications")
    suspend fun getNotifications(@Query("limit") limit: Int = 50): Response<ApiResponse<List<NotificationDto>>>

    @GET("me/notifications/unread-count")
    suspend fun getUnreadNotificationsCount(): Response<ApiResponse<UnreadCountData>>

    @POST("me/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<ApiResponse<Map<String, Any>>>

    @POST("me/notifications/read-all")
    suspend fun markAllNotificationsRead(): Response<ApiResponse<Unit>>

    // ==========================================
    // PUSH DEVICES (FCM)
    // ==========================================
    @POST("me/devices")
    suspend fun registerDevice(@Body request: RegisterDeviceRequest): Response<ApiResponse<Unit>>

    @DELETE("me/devices/{token}")
    suspend fun unregisterDevice(@Path("token") token: String): Response<ApiResponse<Unit>>

    // ==========================================
    // ACCOUNT DELETION (LGPD / PRIVACY)
    // ==========================================
    @DELETE("me")
    suspend fun deleteAccount(): Response<ApiResponse<Unit>>
}

object ApiClient {
    fun create(
        baseUrl: String = AppConfig.getApiBaseUrl(),
        tokenProvider: () -> String?
    ): BibleApiService {

        // Interceptor that dynamically routes requests to the latest active Base URL from AppConfig
        val dynamicBaseUrlInterceptor = Interceptor { chain ->
            var request = chain.request()
            val activeBaseUrlStr = AppConfig.getApiBaseUrl()
            val activeHttpUrl = activeBaseUrlStr.toHttpUrlOrNull()
            if (activeHttpUrl != null) {
                val originalUrl = request.url
                val newUrlBuilder = originalUrl.newBuilder()
                    .scheme(activeHttpUrl.scheme)
                    .host(activeHttpUrl.host)
                    .port(activeHttpUrl.port)

                val activePathSegments = activeHttpUrl.encodedPathSegments.filter { it.isNotBlank() }
                val originalPathSegments = originalUrl.encodedPathSegments.filter { it.isNotBlank() }

                if (activePathSegments.isNotEmpty()) {
                    val hasPrefix = originalPathSegments.take(activePathSegments.size) == activePathSegments
                    if (!hasPrefix) {
                        val newSegments = activePathSegments + originalPathSegments
                        newUrlBuilder.encodedPath("/" + newSegments.joinToString("/"))
                    }
                }

                request = request.newBuilder().url(newUrlBuilder.build()).build()
            }
            chain.proceed(request)
        }

        // Header Interceptor
        val authAndAppIdInterceptor = Interceptor { chain ->
            val original = chain.request()
            val builder = original.newBuilder()
                .header("X-App-Id", AppConfig.APP_ID)
                .header("X-Client-Platform", "android")
                .header("X-App-Version", AppConfig.VERSION_NAME)

            tokenProvider()?.takeIf { it.isNotBlank() }?.let { token ->
                builder.header("Authorization", "Bearer $token")
            }

            chain.proceed(builder.build())
        }

        // Sanitized Debug Logging Interceptor (NUNCA loga senhas, segredos ou JWTs completos)
        val sanitizedLoggingInterceptor = Interceptor { chain ->
            val request = chain.request()
            val startNs = System.nanoTime()

            if (BuildConfig.DEBUG) {
                val authHeader = request.header("Authorization")
                val sanitizedAuth = if (!authHeader.isNullOrBlank()) "Bearer [REDACTED]" else "[NONE]"
                val pathWithQuery = "${request.url.encodedPath}${if (request.url.query != null) "?${request.url.query}" else ""}"
                Log.i(
                    "BibleNetwork",
                    "--> [DEBUG] [Env: ${AppConfig.currentEnvironment.name}] ${request.method} $pathWithQuery (Base: ${AppConfig.getApiBaseUrl()}, Host: ${request.url.host}:${request.url.port}, Auth: $sanitizedAuth)"
                )
            }

            val response = try {
                chain.proceed(request)
            } catch (e: Exception) {
                if (BuildConfig.DEBUG) {
                    Log.d(
                        "BibleNetwork",
                        "--> [OFFLINE / UNREACHABLE] ${request.method} ${request.url.encodedPath}: ${e.javaClass.simpleName} (${e.message ?: "offline"})"
                    )
                }
                throw e
            }

            val tookMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNs)
            if (BuildConfig.DEBUG) {
                Log.i(
                    "BibleNetwork",
                    "<-- [DEBUG] [HTTP ${response.code} ${response.message}] ${request.url.encodedPath} (${tookMs}ms)"
                )
            }

            response
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(dynamicBaseUrlInterceptor)
            .addInterceptor(authAndAppIdInterceptor)
            .addInterceptor(sanitizedLoggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create(BibleApiService::class.java)
    }
}

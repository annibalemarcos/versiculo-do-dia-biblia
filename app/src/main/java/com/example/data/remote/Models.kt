package com.example.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    @Json(name = "success") val success: Boolean = true,
    @Json(name = "data") val data: T? = null,
    @Json(name = "message") val message: String? = null
)

// ==========================================
// APP CONFIG & REMOTE CONTROL
// ==========================================

@JsonClass(generateAdapter = true)
data class PlacementDto(
    @Json(name = "name") val name: String,
    @Json(name = "provider") val provider: String = "admob",
    @Json(name = "platform") val platform: String = "android",
    @Json(name = "ad_unit_id") val adUnitId: String? = null,
    @Json(name = "format") val format: String = "banner",
    @Json(name = "min_interval_seconds") val minIntervalSeconds: Int = 180,
    @Json(name = "max_per_session") val maxPerSession: Int = 3,
    @Json(name = "free_only") val freeOnly: Boolean = true
)

@JsonClass(generateAdapter = true)
data class MonetizationInfoDto(
    @Json(name = "ads_enabled") val adsEnabled: Boolean = true,
    @Json(name = "admob_app_id") val admobAppId: String = "",
    @Json(name = "ump_consent_required") val umpConsentRequired: Boolean = true,
    @Json(name = "test_mode") val testMode: Boolean = false
)

@JsonClass(generateAdapter = true)
data class PremiumProductDto(
    @Json(name = "id") val id: String,
    @Json(name = "product_id") val productId: String,
    @Json(name = "base_plan_id") val basePlanId: String? = null,
    @Json(name = "offer_id") val offerId: String? = null,
    @Json(name = "product_type") val productType: String = "subs",
    @Json(name = "title") val title: String,
    @Json(name = "description") val description: String? = null,
    @Json(name = "reference_price") val referencePrice: Double? = null,
    @Json(name = "entitlements") val entitlements: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class AppConfigData(
    @Json(name = "app_id") val appId: String = "verse_daily",
    @Json(name = "app_name") val appName: String = "Versículo do Dia",
    @Json(name = "app_mode") val appMode: String = "PRODUCTION",
    @Json(name = "maintenance") val maintenance: Boolean = false,
    @Json(name = "maintenance_enabled") val maintenanceEnabled: Boolean? = null,
    @Json(name = "maintenance_level") val maintenanceLevel: String? = null,
    @Json(name = "maintenance_title") val maintenanceTitle: String? = null,
    @Json(name = "maintenance_message") val maintenanceMessage: String? = null,
    @Json(name = "maintenance_estimated_end") val maintenanceEstimatedEnd: String? = null,
    @Json(name = "registration_enabled") val registrationEnabled: Boolean? = null,
    @Json(name = "purchases_enabled") val purchasesEnabled: Boolean? = null,
    @Json(name = "premium_enabled") val premiumEnabled: Boolean? = null,
    @Json(name = "notifications_enabled") val notificationsEnabled: Boolean? = null,
    @Json(name = "support_enabled") val supportEnabled: Boolean? = null,
    @Json(name = "cloud_sync_enabled") val cloudSyncEnabled: Boolean? = null,
    @Json(name = "devotionals_enabled") val devotionalsEnabled: Boolean? = null,
    @Json(name = "search_enabled") val searchEnabled: Boolean? = null,
    @Json(name = "sharing_enabled") val sharingEnabled: Boolean? = null,
    @Json(name = "offline_download_enabled") val offlineDownloadEnabled: Boolean? = null,
    @Json(name = "google_login_enabled") val googleLoginEnabled: Boolean? = null,
    @Json(name = "minimum_supported_version") val minimumSupportedVersion: Int = 1,
    @Json(name = "latest_version") val latestVersion: Int = 1,
    @Json(name = "force_update") val forceUpdate: Boolean = false,
    @Json(name = "store_url") val storeUrl: String? = null,
    @Json(name = "features") val features: Map<String, Boolean> = emptyMap(),
    @Json(name = "monetization") val monetization: MonetizationInfoDto? = null,
    @Json(name = "placements") val placements: List<PlacementDto> = emptyList(),
    @Json(name = "premium_products") val premiumProducts: List<PremiumProductDto> = emptyList(),
    @Json(name = "custom_settings") val customSettings: Map<String, Any> = emptyMap()
)

// ==========================================
// DAILY VERSE & VERSES
// ==========================================

@JsonClass(generateAdapter = true)
data class DailyVerseData(
    @Json(name = "id") val id: String = "",
    @Json(name = "target_date") val targetDate: String = "",
    @Json(name = "verse_id") val verseId: String = "",
    @Json(name = "reference") val reference: String = "",
    @Json(name = "text") val text: String = "",
    @Json(name = "translation") val translation: String = "NVI",
    @Json(name = "reflection_title") val reflectionTitle: String? = null,
    @Json(name = "reflection_text") val reflectionText: String? = null,
    @Json(name = "prayer_text") val prayerText: String? = null,
    @Json(name = "theme_name") val themeName: String? = null,
    @Json(name = "background_image_url") val backgroundImageUrl: String? = null
)

@JsonClass(generateAdapter = true)
data class VerseDto(
    @Json(name = "id") val id: String,
    @Json(name = "book_id") val bookId: String? = null,
    @Json(name = "translation") val translation: String = "NVI",
    @Json(name = "chapter") val chapter: Int = 1,
    @Json(name = "verse_number") val verseNumber: Int = 1,
    @Json(name = "reference") val reference: String = "",
    @Json(name = "text") val text: String = "",
    @Json(name = "language") val language: String? = "pt"
)

@JsonClass(generateAdapter = true)
data class BookDto(
    @Json(name = "id") val id: String,
    @Json(name = "number") val number: Int,
    @Json(name = "name") val name: String,
    @Json(name = "testament") val testament: String = "OT",
    @Json(name = "chapters_count") val chaptersCount: Int = 1
)

@JsonClass(generateAdapter = true)
data class ThemeDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "slug") val slug: String = "",
    @Json(name = "description") val description: String? = null,
    @Json(name = "icon_name") val iconName: String? = null,
    @Json(name = "color_hex") val colorHex: String? = null
)

@JsonClass(generateAdapter = true)
data class EmotionDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "slug") val slug: String = "",
    @Json(name = "description") val description: String? = null,
    @Json(name = "icon_name") val iconName: String? = null,
    @Json(name = "color_hex") val colorHex: String? = null
)

// ==========================================
// DEVOTIONALS
// ==========================================

@JsonClass(generateAdapter = true)
data class DevotionalDto(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String,
    @Json(name = "slug") val slug: String = "",
    @Json(name = "description") val description: String? = null,
    @Json(name = "cover_image_url") val coverImageUrl: String? = null,
    @Json(name = "total_days") val totalDays: Int = 7,
    @Json(name = "is_premium") val isPremium: Boolean = false
)

@JsonClass(generateAdapter = true)
data class DevotionalDayDto(
    @Json(name = "day_number") val dayNumber: Int,
    @Json(name = "title") val title: String,
    @Json(name = "verse_reference") val verseReference: String = "",
    @Json(name = "verse_text") val verseText: String = "",
    @Json(name = "reflection") val reflection: String = "",
    @Json(name = "prayer") val prayer: String = "",
    @Json(name = "reading_passage") val readingPassage: String? = null
)

@JsonClass(generateAdapter = true)
data class DevotionalDetailData(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String,
    @Json(name = "slug") val slug: String = "",
    @Json(name = "description") val description: String? = null,
    @Json(name = "cover_image_url") val coverImageUrl: String? = null,
    @Json(name = "total_days") val totalDays: Int = 7,
    @Json(name = "is_premium") val isPremium: Boolean = false,
    @Json(name = "days") val days: List<DevotionalDayDto> = emptyList()
)

// ==========================================
// AUTH & USER
// ==========================================

@JsonClass(generateAdapter = true)
data class UserRegisterRequest(
    @Json(name = "email") val email: String,
    @Json(name = "password") val password: String,
    @Json(name = "name") val name: String? = null,
    @Json(name = "platform") val platform: String = "android",
    @Json(name = "app_id") val appId: String = "verse_daily"
)

@JsonClass(generateAdapter = true)
data class UserLoginRequest(
    @Json(name = "email") val email: String,
    @Json(name = "password") val password: String
)

@JsonClass(generateAdapter = true)
data class UserPreferencesDto(
    @Json(name = "theme_mode") val themeMode: String = "SYSTEM",
    @Json(name = "text_scale") val textScale: String = "NORMAL",
    @Json(name = "preferred_translation") val preferredTranslation: String = "NVI",
    @Json(name = "notifications_enabled") val notificationsEnabled: Boolean = true,
    @Json(name = "notification_hour") val notificationHour: Int = 8,
    @Json(name = "notification_minute") val notificationMinute: Int = 0,
    @Json(name = "custom_prefs") val customPrefs: Map<String, Any> = emptyMap()
)

@JsonClass(generateAdapter = true)
data class UserDto(
    @Json(name = "id") val id: String,
    @Json(name = "email") val email: String,
    @Json(name = "name") val name: String? = null,
    @Json(name = "platform") val platform: String? = "android",
    @Json(name = "language") val language: String? = "pt",
    @Json(name = "app_id") val appId: String? = "verse_daily",
    @Json(name = "is_anonymous") val isAnonymous: Boolean? = false,
    @Json(name = "is_active") val isActive: Boolean? = true,
    @Json(name = "is_premium") val isPremium: Boolean = false,
    @Json(name = "premium_expires_at") val premiumExpiresAt: String? = null,
    @Json(name = "created_at") val createdAt: String? = null,
    @Json(name = "preferences") val preferences: UserPreferencesDto? = null
)

@JsonClass(generateAdapter = true)
data class AuthData(
    @Json(name = "access_token") val accessToken: String,
    @Json(name = "refresh_token") val refreshToken: String,
    @Json(name = "token_type") val tokenType: String = "Bearer",
    @Json(name = "expires_in_seconds") val expiresInSeconds: Int = 3600,
    @Json(name = "user") val user: UserDto? = null
)

@JsonClass(generateAdapter = true)
data class RefreshTokenData(
    @Json(name = "access_token") val accessToken: String,
    @Json(name = "refresh_token") val refreshToken: String,
    @Json(name = "token_type") val tokenType: String = "Bearer",
    @Json(name = "expires_in_seconds") val expiresInSeconds: Int = 3600
)

// ==========================================
// USER SYNC (FAVORITES, HISTORY, PREFS)
// ==========================================

@JsonClass(generateAdapter = true)
data class FavoriteItemDto(
    @Json(name = "id") val id: String? = null,
    @Json(name = "verse_id") val verseId: String,
    @Json(name = "reference") val reference: String,
    @Json(name = "text") val text: String,
    @Json(name = "translation") val translation: String = "NVI",
    @Json(name = "reflection") val reflection: String? = null,
    @Json(name = "theme") val theme: String? = null,
    @Json(name = "saved_at") val savedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class ReadingHistoryDto(
    @Json(name = "id") val id: String? = null,
    @Json(name = "verse_id") val verseId: String,
    @Json(name = "reference") val reference: String,
    @Json(name = "text") val text: String,
    @Json(name = "translation") val translation: String = "NVI",
    @Json(name = "read_at") val readAt: String? = null
)

@JsonClass(generateAdapter = true)
data class PreferenceDto(
    @Json(name = "theme_mode") val themeMode: String = "SYSTEM",
    @Json(name = "text_scale") val textScale: String = "NORMAL",
    @Json(name = "preferred_translation") val preferredTranslation: String = "NVI",
    @Json(name = "notifications_enabled") val notificationsEnabled: Boolean = true,
    @Json(name = "notification_hour") val notificationHour: Int = 8,
    @Json(name = "notification_minute") val notificationMinute: Int = 0,
    @Json(name = "custom_prefs") val customPrefs: Map<String, Any> = emptyMap()
)

// ==========================================
// BILLING & MONETIZATION
// ==========================================

@JsonClass(generateAdapter = true)
data class ActiveSubscriptionDto(
    @Json(name = "id") val id: String? = null,
    @Json(name = "product_id") val productId: String,
    @Json(name = "status") val status: String,
    @Json(name = "starts_at") val startsAt: String,
    @Json(name = "expires_at") val expiresAt: String? = null,
    @Json(name = "is_auto_renewing") val isAutoRenewing: Boolean = true
)

@JsonClass(generateAdapter = true)
data class BillingStatusData(
    @Json(name = "is_premium") val isPremium: Boolean = false,
    @Json(name = "premium_expires_at") val premiumExpiresAt: String? = null,
    @Json(name = "active_subscription") val activeSubscription: ActiveSubscriptionDto? = null,
    @Json(name = "entitlements") val entitlements: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class VerifyPurchaseRequest(
    @Json(name = "product_id") val productId: String,
    @Json(name = "purchase_token") val purchaseToken: String,
    @Json(name = "order_id") val orderId: String? = null,
    @Json(name = "package_name") val packageName: String? = "com.aistudio.biblia.qxudqu"
)

@JsonClass(generateAdapter = true)
data class VerifyPurchaseData(
    @Json(name = "status") val status: String = "verified",
    @Json(name = "is_premium") val isPremium: Boolean = true,
    @Json(name = "expires_at") val expiresAt: String? = null,
    @Json(name = "entitlements") val entitlements: List<String> = emptyList(),
    @Json(name = "notice") val notice: String? = null
)

@JsonClass(generateAdapter = true)
data class RestorePurchasesRequest(
    @Json(name = "purchase_tokens") val purchaseTokens: List<String>
)

@JsonClass(generateAdapter = true)
data class RestorePurchasesData(
    @Json(name = "restored_count") val restoredCount: Int = 0,
    @Json(name = "is_premium") val isPremium: Boolean = false,
    @Json(name = "message") val message: String? = null
)

// ==========================================
// ANALYTICS
// ==========================================

@JsonClass(generateAdapter = true)
data class AnalyticsEventRequest(
    @Json(name = "event_name") val eventName: String,
    @Json(name = "params") val params: Map<String, String>? = null,
    @Json(name = "timestamp") val timestamp: Long = System.currentTimeMillis(),
    @Json(name = "platform") val platform: String = "android",
    @Json(name = "app_id") val appId: String = "verse_daily"
)

// ==========================================
// SUPPORT TICKETS & HELPDESK
// ==========================================

@JsonClass(generateAdapter = true)
data class TicketCreateRequest(
    @Json(name = "subject") val subject: String,
    @Json(name = "description") val description: String,
    @Json(name = "category") val category: String = "OTHER",
    @Json(name = "priority") val priority: String = "NORMAL",
    @Json(name = "guest_name") val guestName: String? = null,
    @Json(name = "guest_email") val guestEmail: String? = null
)

@JsonClass(generateAdapter = true)
data class TicketMessageCreateRequest(
    @Json(name = "message") val message: String,
    @Json(name = "is_internal_note") val isInternalNote: Boolean = false
)

@JsonClass(generateAdapter = true)
data class TicketAttachmentDto(
    @Json(name = "id") val id: String = "",
    @Json(name = "ticket_id") val ticketId: String = "",
    @Json(name = "message_id") val messageId: String? = null,
    @Json(name = "file_name") val fileName: String = "",
    @Json(name = "mime_type") val mimeType: String = "",
    @Json(name = "file_size") val fileSize: Int = 0,
    @Json(name = "storage_reference") val storageReference: String = "",
    @Json(name = "uploaded_by") val uploadedBy: String = "USER",
    @Json(name = "created_at") val createdAt: String = ""
)

@JsonClass(generateAdapter = true)
data class TicketMessageDto(
    @Json(name = "id") val id: String = "",
    @Json(name = "ticket_id") val ticketId: String = "",
    @Json(name = "sender_type") val senderType: String = "USER", // USER, ADMIN, SYSTEM
    @Json(name = "sender_user_id") val senderUserId: String? = null,
    @Json(name = "sender_admin_id") val senderAdminId: String? = null,
    @Json(name = "sender_name") val senderName: String? = null,
    @Json(name = "message") val message: String = "",
    @Json(name = "is_internal_note") val isInternalNote: Boolean = false,
    @Json(name = "created_at") val createdAt: String = "",
    @Json(name = "updated_at") val updatedAt: String? = null,
    @Json(name = "attachments") val attachments: List<TicketAttachmentDto> = emptyList()
)

@JsonClass(generateAdapter = true)
data class TicketItemDto(
    @Json(name = "id") val id: String = "",
    @Json(name = "ticket_number") val ticketNumber: String = "",
    @Json(name = "app_id") val appId: String = "verse_daily",
    @Json(name = "user_id") val userId: String? = null,
    @Json(name = "user_name") val userName: String? = null,
    @Json(name = "user_email") val userEmail: String? = null,
    @Json(name = "guest_name") val guestName: String? = null,
    @Json(name = "guest_email") val guestEmail: String? = null,
    @Json(name = "subject") val subject: String = "",
    @Json(name = "description") val description: String? = null,
    @Json(name = "category") val category: String = "OTHER",
    @Json(name = "priority") val priority: String = "NORMAL",
    @Json(name = "status") val status: String = "OPEN",
    @Json(name = "assigned_admin_id") val assignedAdminId: String? = null,
    @Json(name = "assigned_admin_name") val assignedAdminName: String? = null,
    @Json(name = "messages_count") val messagesCount: Int = 0,
    @Json(name = "created_at") val createdAt: String = "",
    @Json(name = "updated_at") val updatedAt: String = "",
    @Json(name = "first_response_at") val firstResponseAt: String? = null,
    @Json(name = "resolved_at") val resolvedAt: String? = null,
    @Json(name = "closed_at") val closedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class TicketDetailDto(
    @Json(name = "id") val id: String = "",
    @Json(name = "ticket_number") val ticketNumber: String = "",
    @Json(name = "app_id") val appId: String = "verse_daily",
    @Json(name = "user_id") val userId: String? = null,
    @Json(name = "user_name") val userName: String? = null,
    @Json(name = "user_email") val userEmail: String? = null,
    @Json(name = "guest_name") val guestName: String? = null,
    @Json(name = "guest_email") val guestEmail: String? = null,
    @Json(name = "subject") val subject: String = "",
    @Json(name = "description") val description: String? = null,
    @Json(name = "category") val category: String = "OTHER",
    @Json(name = "priority") val priority: String = "NORMAL",
    @Json(name = "status") val status: String = "OPEN",
    @Json(name = "assigned_admin_id") val assignedAdminId: String? = null,
    @Json(name = "assigned_admin_name") val assignedAdminName: String? = null,
    @Json(name = "first_response_at") val firstResponseAt: String? = null,
    @Json(name = "resolved_at") val resolvedAt: String? = null,
    @Json(name = "closed_at") val closedAt: String? = null,
    @Json(name = "created_at") val createdAt: String = "",
    @Json(name = "updated_at") val updatedAt: String = "",
    @Json(name = "messages") val messages: List<TicketMessageDto> = emptyList(),
    @Json(name = "attachments") val attachments: List<TicketAttachmentDto> = emptyList()
)

// ==========================================
// IN-APP NOTIFICATIONS
// ==========================================

@JsonClass(generateAdapter = true)
data class NotificationDto(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String,
    @Json(name = "message") val message: String,
    @Json(name = "type") val type: String = "system",
    @Json(name = "deep_link") val deepLink: String? = null,
    @Json(name = "is_read") val isRead: Boolean = false,
    @Json(name = "created_at") val createdAt: String? = null,
    @Json(name = "read_at") val readAt: String? = null
)

@JsonClass(generateAdapter = true)
data class UnreadCountData(
    @Json(name = "unread_count") val unreadCount: Int = 0
)

@JsonClass(generateAdapter = true)
data class RegisterDeviceRequest(
    @Json(name = "token") val token: String,
    @Json(name = "platform") val platform: String = "android",
    @Json(name = "device_name") val deviceName: String? = null,
    @Json(name = "app_version") val appVersion: String? = null
)



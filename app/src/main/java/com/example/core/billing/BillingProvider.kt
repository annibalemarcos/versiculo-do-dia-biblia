package com.example.core.billing

import com.example.data.remote.PremiumProductDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class Entitlement {
    PREMIUM,
    AD_FREE,
    OFFLINE_FULL,
    UNLIMITED_FAVORITES,
    PREMIUM_DEVOTIONALS,
    EXCLUSIVE_CONTENT;

    companion object {
        fun fromString(name: String): Entitlement? = when (name.lowercase().trim()) {
            "premium" -> PREMIUM
            "ad_free", "ad-free", "adfree" -> AD_FREE
            "offline_full", "offline" -> OFFLINE_FULL
            "unlimited_favorites" -> UNLIMITED_FAVORITES
            "premium_devotionals", "devotionals" -> PREMIUM_DEVOTIONALS
            "exclusive_content" -> EXCLUSIVE_CONTENT
            else -> null
        }
    }
}

enum class PurchaseState {
    IDLE,
    PENDING,
    SUCCESS,
    CANCELLED,
    ERROR
}

data class PremiumPlan(
    val productId: String,
    val title: String,
    val priceFormatted: String,
    val period: String,
    val discountBadge: String? = null,
    val isPopular: Boolean = false,
    val entitlements: List<String> = emptyList()
)

class BillingProvider(
    private val onVerifyPurchaseServer: suspend (purchaseToken: String, productId: String) -> Pair<Boolean, List<String>>,
    private val onRestorePurchasesServer: suspend () -> Pair<Boolean, List<String>> = { Pair(false, emptyList()) }
) {
    private val _activeEntitlements = MutableStateFlow<Set<Entitlement>>(emptySet())
    val activeEntitlements: StateFlow<Set<Entitlement>> = _activeEntitlements.asStateFlow()

    private val _purchaseState = MutableStateFlow(PurchaseState.IDLE)
    val purchaseState: StateFlow<PurchaseState> = _purchaseState.asStateFlow()

    private val _availablePlans = MutableStateFlow(defaultPlans)
    val availablePlans: StateFlow<List<PremiumPlan>> = _availablePlans.asStateFlow()

    companion object {
        val defaultPlans = listOf(
            PremiumPlan(
                productId = "premium_monthly",
                title = "Mensal",
                priceFormatted = "R$ 9,90",
                period = "/mês",
                discountBadge = null,
                isPopular = false,
                entitlements = listOf("premium", "ad_free", "unlimited_favorites")
            ),
            PremiumPlan(
                productId = "premium_yearly",
                title = "Anual",
                priceFormatted = "R$ 59,90",
                period = "/ano",
                discountBadge = "Economize 50%",
                isPopular = true,
                entitlements = listOf("premium", "ad_free", "offline_full", "unlimited_favorites", "premium_devotionals")
            ),
            PremiumPlan(
                productId = "premium_lifetime",
                title = "Vitalício",
                priceFormatted = "R$ 119,90",
                period = "pagamento único",
                discountBadge = "Acesso Eterno",
                isPopular = false,
                entitlements = listOf("premium", "ad_free", "offline_full", "unlimited_favorites", "premium_devotionals", "exclusive_content")
            )
        )
    }

    fun updateRemoteProducts(remoteProducts: List<PremiumProductDto>) {
        if (remoteProducts.isEmpty()) return
        val mapped = remoteProducts.map { dto ->
            val isYearly = dto.productId.contains("yearly", ignoreCase = true) || dto.productId.contains("anual", ignoreCase = true)
            val isLifetime = dto.productId.contains("lifetime", ignoreCase = true) || dto.productId.contains("vitalicio", ignoreCase = true)
            val priceStr = dto.referencePrice?.let { "R$ ${String.format("%.2f", it).replace(".", ",")}" } ?: "R$ 9,90"
            val periodStr = when {
                isLifetime -> "pagamento único"
                isYearly -> "/ano"
                else -> "/mês"
            }
            PremiumPlan(
                productId = dto.productId,
                title = dto.title,
                priceFormatted = priceStr,
                period = periodStr,
                discountBadge = if (isYearly) "Economize 50%" else if (isLifetime) "Acesso Vitalício" else null,
                isPopular = isYearly,
                entitlements = dto.entitlements
            )
        }
        _availablePlans.value = mapped
    }

    fun hasEntitlement(entitlement: Entitlement): Boolean {
        return _activeEntitlements.value.contains(entitlement)
    }

    fun isPremium(): Boolean {
        return hasEntitlement(Entitlement.PREMIUM)
    }

    fun setLocalPremium(isPremium: Boolean, entitlementsList: List<String> = emptyList()) {
        if (isPremium) {
            val parsed = entitlementsList.mapNotNull { Entitlement.fromString(it) }.toSet()
            _activeEntitlements.value = if (parsed.isNotEmpty()) parsed else Entitlement.values().toSet()
        } else {
            _activeEntitlements.value = emptySet()
        }
    }

    suspend fun purchasePlan(productId: String): Boolean {
        _purchaseState.value = PurchaseState.PENDING
        try {
            val simulatedPurchaseToken = "play_token_${System.currentTimeMillis()}_$productId"
            val (verified, returnedEntitlements) = onVerifyPurchaseServer(simulatedPurchaseToken, productId)
            if (verified) {
                setLocalPremium(true, returnedEntitlements)
                _purchaseState.value = PurchaseState.SUCCESS
                return true
            } else {
                _purchaseState.value = PurchaseState.ERROR
                return false
            }
        } catch (e: Exception) {
            _purchaseState.value = PurchaseState.ERROR
            return false
        }
    }

    suspend fun restorePurchases(): Boolean {
        _purchaseState.value = PurchaseState.PENDING
        try {
            val (restored, returnedEntitlements) = onRestorePurchasesServer()
            if (restored) {
                setLocalPremium(true, returnedEntitlements)
                _purchaseState.value = PurchaseState.SUCCESS
                return true
            } else {
                _purchaseState.value = PurchaseState.IDLE
                return false
            }
        } catch (e: Exception) {
            _purchaseState.value = PurchaseState.ERROR
            return false
        }
    }

    fun resetState() {
        _purchaseState.value = PurchaseState.IDLE
    }
}

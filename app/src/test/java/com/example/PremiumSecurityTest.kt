package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.core.auth.TokenManager
import com.example.core.datastore.PreferencesManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class PremiumSecurityTest {

    private lateinit var context: Context
    private lateinit var preferencesManager: PreferencesManager
    private lateinit var tokenManager: TokenManager

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        preferencesManager = PreferencesManager(context)
        tokenManager = TokenManager(preferencesManager = preferencesManager, onRefreshTokenCall = { null })
    }

    @Test
    fun test1_DefaultStateIsFreeAndAnonymous() = runBlocking {
        // App starts fresh: no tokens, free status
        tokenManager.clearTokens()
        preferencesManager.clearAuth()

        val isPrem = preferencesManager.isPremium.first()
        val profile = preferencesManager.userProfile.first()
        val details = preferencesManager.premiumDetails.first()

        assertFalse("New user must not have premium", isPrem)
        assertNull("New user must not have email before login", profile.second)
        assertEquals("FREE", details.first)
        assertEquals("NONE", details.second)
    }

    @Test
    fun test2_LegacyUnauthenticatedPremiumIsPurged() = runBlocking {
        // Simulate a legacy installation that had the bug (isPremium = true without account)
        preferencesManager.clearAuth()
        // Force legacy corrupted state
        preferencesManager.simulateLegacyCorruptedState(true)

        // Run purge logic executed during app startup
        preferencesManager.purgeLegacyUnauthenticatedPremium()

        // Verify that invalid premium was purged
        val isPrem = preferencesManager.isPremium.first()
        val details = preferencesManager.premiumDetails.first()

        assertFalse("Corrupted legacy premium MUST be revoked on startup", isPrem)
        assertEquals("FREE", details.first)
    }

    @Test
    fun test3_LogoutRevokesLocalPremiumState() = runBlocking {
        // Given authenticated user with premium
        tokenManager.saveTokens(
            accessToken = "mock_access_token",
            refreshToken = "mock_refresh_token",
            name = "John Doe",
            email = "john@example.com",
            isPremium = true,
            userId = "user_123"
        )
        preferencesManager.saveBillingState(
            isPremium = true,
            status = "ACTIVE",
            source = "GOOGLE_PLAY",
            expiresAt = "2026-12-31T23:59:59Z"
        )

        assertTrue(preferencesManager.isPremium.first())
        val profileBefore = preferencesManager.userProfile.first()
        assertEquals("john@example.com", profileBefore.second)

        // User logs out
        tokenManager.clearTokens()

        // Verify all states wiped
        assertFalse("Logout must clear premium flag", preferencesManager.isPremium.first())
        val profileAfter = preferencesManager.userProfile.first()
        assertNull("Logout must clear email", profileAfter.second)
        val detailsAfter = preferencesManager.premiumDetails.first()
        assertEquals("FREE", detailsAfter.first)
        assertEquals("NONE", detailsAfter.second)
    }

    @Test
    fun test4_DevSimulationStoresExplicitDevSourceAndExpires() = runBlocking {
        tokenManager.saveTokens(
            accessToken = "test_token",
            refreshToken = "test_refresh",
            name = "Tester",
            email = "test@domain.com",
            isPremium = true,
            userId = "test_user_id"
        )

        // Activate dev simulation
        preferencesManager.saveBillingState(
            isPremium = true,
            status = "ACTIVE",
            source = "DEVELOPMENT_SIMULATION",
            expiresAt = "2026-09-16T12:00:00Z"
        )

        assertTrue(preferencesManager.isPremium.first())
        val detailsActive = preferencesManager.premiumDetails.first()
        assertEquals("DEVELOPMENT_SIMULATION", detailsActive.second)
        assertEquals("ACTIVE", detailsActive.first)

        // Expire dev simulation
        preferencesManager.saveBillingState(
            isPremium = false,
            status = "EXPIRED",
            source = "DEVELOPMENT_SIMULATION",
            expiresAt = null
        )

        assertFalse(preferencesManager.isPremium.first())
        val detailsExpired = preferencesManager.premiumDetails.first()
        assertEquals("EXPIRED", detailsExpired.first)
    }

    @Test
    fun test5_LocalPremiumMutationIsPrevented() = runBlocking {
        // Given an unauthenticated or authenticated user with FREE status
        tokenManager.clearTokens()
        preferencesManager.clearAuth()

        // Attempting to mutate premium locally via setPremiumStatus(true) MUST NOT succeed
        preferencesManager.setPremiumStatus(true)

        val isPrem = preferencesManager.isPremium.first()
        val details = preferencesManager.premiumDetails.first()

        assertFalse("Local setPremiumStatus(true) must be ignored and not change premium state", isPrem)
        assertEquals("FREE", details.first)
    }
}

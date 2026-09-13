package com.example

import com.example.core.config.AppConfig
import com.example.core.config.AppEnvironment
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class AppConfigTest {

    @Before
    fun setup() {
        // Reset to default
        AppConfig.setEnvironment(AppEnvironment.EMULATOR)
    }

    @Test
    fun `test emulator default url`() {
        AppConfig.setEnvironment(AppEnvironment.EMULATOR)
        val url = AppConfig.getApiBaseUrl()
        assertTrue(url.contains("10.0.2.2:8000") || url.contains("/api/v1/"))
    }

    @Test
    fun `test custom host ip configuration for physical phone`() {
        AppConfig.setDebugHostIp("192.168.1.37", 8000)
        assertEquals("http://192.168.1.37:8000/api/v1/", AppConfig.getApiBaseUrl())
        assertEquals(AppEnvironment.LOCAL_LAN, AppConfig.currentEnvironment)

        AppConfig.setDebugHostIp("http://10.0.0.55/", 8080)
        assertEquals("http://10.0.0.55:8080/api/v1/", AppConfig.getApiBaseUrl())
    }

    @Test
    fun `test custom debug api url with custom paths`() {
        AppConfig.setCustomDebugApiUrl("http://192.168.1.100:8000/api/v1/")
        assertEquals("http://192.168.1.100:8000/api/v1/", AppConfig.getApiBaseUrl())

        AppConfig.setCustomDebugApiUrl("192.168.1.200:9000")
        assertEquals("http://192.168.1.200:9000/api/v1/", AppConfig.getApiBaseUrl())
    }

    @Test
    fun `test switching to staging and production`() {
        AppConfig.setEnvironment(AppEnvironment.STAGING)
        assertEquals(AppConfig.DEFAULT_STAGING_API_URL, AppConfig.getApiBaseUrl())

        AppConfig.setEnvironment(AppEnvironment.PRODUCTION)
        assertEquals(AppConfig.DEFAULT_PRODUCTION_API_URL, AppConfig.getApiBaseUrl())
    }
}

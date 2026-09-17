package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material.icons.outlined.Science
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.BuildConfig
import com.example.core.config.AppConfig
import com.example.ui.MainViewModel

// High-contrast color tokens for the Test Mode Banner
private val TestBannerAmberBackground = Color(0xFFFFF3CD)
private val TestBannerAmberBorder = Color(0xFFFFC107)
private val TestBannerAmberDarkText = Color(0xFF664D03)
private val TestBadgeGold = Color(0xFFD97706)

/**
 * Permanent, high-contrast Compose banner component that observes the `appMode`
 * state and displays a prominent 'MODO DE TESTE' banner when set to 'TEST'.
 *
 * @param appMode The current environment mode (e.g. "TEST", "PRODUCTION").
 * @param modifier Optional modifier for the banner.
 * @param customMessage Optional message to display alongside the test mode badge.
 */
@Composable
fun TestModeBanner(
    appMode: String,
    modifier: Modifier = Modifier,
    customMessage: String? = null
) {
    val isTestMode = BuildConfig.DEBUG && appMode.trim().equals("TEST", ignoreCase = true)

    AnimatedVisibility(
        visible = isTestMode,
        enter = fadeIn() + expandVertically(),
        exit = fadeOut() + shrinkVertically(),
        modifier = modifier
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .testTag("test_mode_banner"),
            colors = CardDefaults.cardColors(
                containerColor = TestBannerAmberBackground,
                contentColor = TestBannerAmberDarkText
            ),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.5.dp, TestBannerAmberBorder),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Surface(
                        color = TestBadgeGold,
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.testTag("test_mode_badge")
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.WarningAmber,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "MODO DE TESTE",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                letterSpacing = 0.6.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Text(
                            text = customMessage ?: "Ambiente de Teste Ativo (Homologação)",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = TestBannerAmberDarkText,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Modo de homologação e validação",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = TestBannerAmberDarkText.copy(alpha = 0.85f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

/**
 * Convenience overload that observes the global [AppConfig.appMode] StateFlow directly.
 */
@Composable
fun TestModeBanner(
    modifier: Modifier = Modifier,
    customMessage: String? = null
) {
    val appMode by AppConfig.appMode.collectAsState()
    TestModeBanner(
        appMode = appMode,
        modifier = modifier,
        customMessage = customMessage
    )
}

/**
 * Convenience overload that observes the [MainViewModel]'s appMode StateFlow.
 */
@Composable
fun TestModeBanner(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier,
    customMessage: String? = null
) {
    val appMode by viewModel.appMode.collectAsState()
    TestModeBanner(
        appMode = appMode,
        modifier = modifier,
        customMessage = customMessage
    )
}

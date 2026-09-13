package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.example.core.datastore.AppThemeMode

private val DarkColorScheme = darkColorScheme(
    primary = DarkSagePrimary,
    onPrimary = DarkForestBg,
    primaryContainer = DarkSageContainer,
    onPrimaryContainer = DarkSageOnContainer,
    secondary = SageMid,
    onSecondary = DarkForestBg,
    secondaryContainer = DarkForestSurfaceVariant,
    onSecondaryContainer = DarkForestTextPrimary,
    background = DarkForestBg,
    onBackground = DarkForestTextPrimary,
    surface = DarkForestSurface,
    onSurface = DarkForestTextPrimary,
    surfaceVariant = DarkForestSurfaceVariant,
    onSurfaceVariant = DarkForestTextSecondary,
    outline = DarkForestOutline
)

private val LightColorScheme = lightColorScheme(
    primary = SagePrimary,
    onPrimary = Color.White,
    primaryContainer = SageLight,
    onPrimaryContainer = ForestDark,
    secondary = SagePrimary,
    onSecondary = Color.White,
    secondaryContainer = SageLight,
    onSecondaryContainer = ForestDark,
    background = NaturalBg,
    onBackground = NaturalTextPrimary,
    surface = NaturalSurface,
    onSurface = NaturalTextPrimary,
    surfaceVariant = NaturalSurfaceVariant,
    onSurfaceVariant = NaturalTextSecondary,
    outline = NaturalOutline
)

@Composable
fun BibleAppTheme(
    themeMode: AppThemeMode = AppThemeMode.SYSTEM,
    content: @Composable () -> Unit
) {
    val isDark = when (themeMode) {
        AppThemeMode.SYSTEM -> isSystemInDarkTheme()
        AppThemeMode.DARK -> true
        AppThemeMode.LIGHT -> false
    }

    val colorScheme = if (isDark) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}


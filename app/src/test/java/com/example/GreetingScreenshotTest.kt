package com.example

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.example.data.local.db.DailyVerseEntity
import com.example.ui.components.DailyVerseHeroCard
import com.example.ui.theme.BibleAppTheme
import com.github.takahirom.roborazzi.RobolectricDeviceQualifiers
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = RobolectricDeviceQualifiers.Pixel8, sdk = [36])
class GreetingScreenshotTest {

  @get:Rule val composeTestRule = createComposeRule()

  @Test
  fun greeting_screenshot() {
    val sampleVerse = DailyVerseEntity(
        dateStr = "2025-01-01",
        verseId = "v_1",
        reference = "Salmos 23:1",
        text = "O Senhor é o meu pastor; de nada terei falta.",
        translation = "NVI",
        reflection = "Deus cuida de cada detalhe das nossas vidas.",
        theme = "Paz & Confiança"
    )

    composeTestRule.setContent {
      BibleAppTheme {
        DailyVerseHeroCard(
            dailyVerse = sampleVerse,
            isFavorite = true,
            onToggleFavorite = {},
            onShare = {},
            onOpenReader = {}
        )
      }
    }

    composeTestRule.onRoot().captureRoboImage(filePath = "src/test/screenshots/greeting.png")
  }
}

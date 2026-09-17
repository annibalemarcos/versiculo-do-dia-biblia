package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.FormatSize
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.datastore.TextScale
import com.example.ui.MainViewModel
import com.example.ui.components.ShareVerseBottomSheet
import com.example.ui.theme.Gold500
import com.example.ui.theme.Navy900

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VerseReaderScreen(
    verseId: String,
    verseText: String,
    reference: String,
    viewModel: MainViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val favorites by viewModel.favorites.collectAsState()
    val textScale by viewModel.textScale.collectAsState()
    val isFavorite = favorites.any { it.verseId == verseId }

    var showShareModal by remember { mutableStateOf(false) }
    var showFontControls by remember { mutableStateOf(false) }
    var selectedTranslation by remember { mutableStateOf("NVI") }
    var readerThemeIndex by remember { mutableStateOf(0) } // 0: Normal, 1: Sepia, 2: Dark

    val baseFontSize = 20.sp * textScale.factor
    val baseLineHeight = 32.sp * textScale.factor

    val bgColor = when (readerThemeIndex) {
        1 -> Color(0xFFFBF0D9)
        2 -> Color(0xFF0F172A)
        else -> MaterialTheme.colorScheme.background
    }

    val textColor = when (readerThemeIndex) {
        1 -> Color(0xFF3E2723)
        2 -> Color(0xFFE2E8F0)
        else -> MaterialTheme.colorScheme.onBackground
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = reference, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                actions = {
                    IconButton(onClick = { showFontControls = !showFontControls }) {
                        Icon(imageVector = Icons.Default.FormatSize, contentDescription = "Ajustar fonte")
                    }
                    IconButton(onClick = {
                        viewModel.dailyVerse.value?.let {
                            viewModel.toggleDailyVerseFavorite()
                        }
                    }) {
                        Icon(
                            imageVector = if (isFavorite) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                            contentDescription = "Favoritar",
                            tint = if (isFavorite) Gold500 else MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = { showShareModal = true }) {
                        Icon(imageVector = Icons.Default.Share, contentDescription = "Compartilhar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = bgColor)
            )
        },
        containerColor = bgColor,
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Font controls panel
            if (showFontControls) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 20.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Tamanho do Texto",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            TextScale.values().forEach { scale ->
                                FilterChip(
                                    selected = textScale == scale,
                                    onClick = { viewModel.setTextScale(scale) },
                                    label = { Text(scale.label, fontSize = 12.sp) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "Tradução",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("NVI", "ACF", "ARA").forEach { trans ->
                                FilterChip(
                                    selected = selectedTranslation == trans,
                                    onClick = { selectedTranslation = trans },
                                    label = { Text(trans) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "Tom de Leitura",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF8FAFC))
                                    .border(1.dp, if (readerThemeIndex == 0) Gold500 else Color.Gray, CircleShape)
                                    .clickable { readerThemeIndex = 0 }
                            )
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFFBF0D9))
                                    .border(1.dp, if (readerThemeIndex == 1) Gold500 else Color.Gray, CircleShape)
                                    .clickable { readerThemeIndex = 1 }
                            )
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF0F172A))
                                    .border(1.dp, if (readerThemeIndex == 2) Gold500 else Color.Gray, CircleShape)
                                    .clickable { readerThemeIndex = 2 }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Gold500.copy(alpha = 0.2f)
            ) {
                Text(
                    text = selectedTranslation,
                    style = MaterialTheme.typography.labelSmall,
                    color = Gold500,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Main Verse Text
            Text(
                text = "“$verseText”",
                style = TextStyle(
                    fontFamily = FontFamily.Serif,
                    fontSize = baseFontSize,
                    lineHeight = baseLineHeight,
                    color = textColor,
                    textAlign = TextAlign.Center
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "— $reference —",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Gold500
            )

            Spacer(modifier = Modifier.height(48.dp))

            Button(
                onClick = { showShareModal = true },
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Gold500, contentColor = Navy900),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("reader_share_button")
            ) {
                Icon(imageVector = Icons.Default.Share, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Compartilhar Este Versículo", fontWeight = FontWeight.Bold)
            }
        }

        if (showShareModal) {
            ShareVerseBottomSheet(
                context = context,
                verseText = verseText,
                reference = reference,
                onDismiss = { showShareModal = false }
            )
        }
    }
}

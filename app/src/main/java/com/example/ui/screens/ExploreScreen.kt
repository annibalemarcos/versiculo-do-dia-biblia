package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.db.EmotionEntity
import com.example.data.local.db.ThemeEntity
import com.example.data.local.db.VerseEntity
import com.example.ui.MainViewModel
import com.example.ui.components.*
import com.example.ui.theme.ForestDark
import com.example.ui.theme.SageLight
import com.example.ui.theme.SagePrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    viewModel: MainViewModel,
    onOpenVerseReader: (String, String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val themes by viewModel.themes.collectAsState()
    val emotions by viewModel.emotions.collectAsState()
    val selectedEmotion by viewModel.selectedEmotion.collectAsState()
    val selectedTheme by viewModel.selectedTheme.collectAsState()
    val emotionVerses by viewModel.versesForSelectedEmotion.collectAsState()
    val themeVerses by viewModel.versesForSelectedTheme.collectAsState()
    val favorites by viewModel.favorites.collectAsState()

    var selectedTab by remember { mutableStateOf(0) } // 0: Emoções, 1: Temas, 2: Livros
    var shareModalData by remember { mutableStateOf<Pair<String, String>?>(null) }

    val bibleBooksOld = listOf("Gênesis", "Êxodo", "Salmos", "Provérbios", "Isaías", "Jeremias")
    val bibleBooksNew = listOf("Mateus", "Marcos", "Lucas", "João", "Romanos", "1 Coríntios", "Filipenses", "Apocalipse")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Explorar a Palavra",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
        ) {
            // Segmented tabs
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = SagePrimary,
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .testTag("explore_tab_row")
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = {
                        Text(
                            "Emoções",
                            color = if (selectedTab == 0) SagePrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = {
                        Text(
                            "Temas",
                            color = if (selectedTab == 1) SagePrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                )
                Tab(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    text = {
                        Text(
                            "Livros",
                            color = if (selectedTab == 2) SagePrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (selectedTab == 2) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            when (selectedTab) {
                0 -> {
                    // Emoções
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        item {
                            Text(
                                text = "Encontre paz de acordo com o que você sente",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        item {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(emotions) { emotion ->
                                    EmotionChipCard(
                                        emotion = emotion,
                                        isSelected = selectedEmotion?.id == emotion.id,
                                        onClick = {
                                            if (selectedEmotion?.id == emotion.id) viewModel.selectEmotion(null)
                                            else viewModel.selectEmotion(emotion)
                                        }
                                    )
                                }
                            }
                        }

                        if (selectedEmotion != null) {
                            item {
                                Surface(
                                    shape = RoundedCornerShape(18.dp),
                                    color = SageLight.copy(alpha = 0.5f),
                                    border = BorderStroke(1.dp, SagePrimary.copy(alpha = 0.3f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text(
                                            text = "🕊️ Mensagem para quando estiver ${selectedEmotion?.name?.lowercase()}:",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = SagePrimary
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = selectedEmotion?.comfortingWord ?: "",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                            }

                            if (emotionVerses.isEmpty()) {
                                item {
                                    EmptyStateView(
                                        title = "Carregando versículos...",
                                        message = "Buscando passagens de conforto para esta emoção."
                                    )
                                }
                            } else {
                                items(emotionVerses) { verse ->
                                    val isFav = favorites.any { it.verseId == verse.id }
                                    VerseItemCard(
                                        verse = verse,
                                        isFavorite = isFav,
                                        onToggleFavorite = { viewModel.toggleVerseFavorite(verse) },
                                        onShare = {
                                            shareModalData = Pair(
                                                verse.text,
                                                "${verse.bookName} ${verse.chapter}:${verse.verseNumber}"
                                            )
                                        },
                                        onClick = {
                                            viewModel.recordVerseRead(
                                                verse.id,
                                                "${verse.bookName} ${verse.chapter}:${verse.verseNumber}",
                                                verse.text,
                                                verse.translation
                                            )
                                            onOpenVerseReader(
                                                verse.id,
                                                verse.text,
                                                "${verse.bookName} ${verse.chapter}:${verse.verseNumber}"
                                            )
                                        }
                                    )
                                }
                            }
                        } else {
                            item {
                                EmptyStateView(
                                    title = "Selecione uma emoção acima",
                                    message = "Toque em 'Ansioso', 'Triste', 'Feliz' ou qualquer estado para ver versículos direcionados.",
                                    icon = Icons.Default.AutoStories
                                )
                            }
                        }
                    }
                }

                1 -> {
                    // Temas
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        item {
                            Text(
                                text = "Edifique sua vida com ensinamentos temáticos",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        item {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(themes) { theme ->
                                    val isSel = selectedTheme?.id == theme.id
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = if (isSel) SageLight else MaterialTheme.colorScheme.surfaceVariant,
                                        contentColor = if (isSel) ForestDark else MaterialTheme.colorScheme.onSurfaceVariant,
                                        border = if (isSel) BorderStroke(1.5.dp, SagePrimary) else BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)),
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(14.dp))
                                            .clickable {
                                                if (isSel) viewModel.selectTheme(null)
                                                else viewModel.selectTheme(theme)
                                            }
                                    ) {
                                        Text(
                                            text = theme.name,
                                            style = MaterialTheme.typography.labelLarge,
                                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                        )
                                    }
                                }
                            }
                        }

                        if (selectedTheme != null) {
                            if (themeVerses.isEmpty()) {
                                item {
                                    EmptyStateView(
                                        title = "Sem versículos cadastrados",
                                        message = "Não encontramos versículos sob este tema no momento."
                                    )
                                }
                            } else {
                                items(themeVerses) { verse ->
                                    val isFav = favorites.any { it.verseId == verse.id }
                                    VerseItemCard(
                                        verse = verse,
                                        isFavorite = isFav,
                                        onToggleFavorite = { viewModel.toggleVerseFavorite(verse) },
                                        onShare = {
                                            shareModalData = Pair(
                                                verse.text,
                                                "${verse.bookName} ${verse.chapter}:${verse.verseNumber}"
                                            )
                                        },
                                        onClick = {
                                            viewModel.recordVerseRead(
                                                verse.id,
                                                "${verse.bookName} ${verse.chapter}:${verse.verseNumber}",
                                                verse.text,
                                                verse.translation
                                            )
                                            onOpenVerseReader(
                                                verse.id,
                                                verse.text,
                                                "${verse.bookName} ${verse.chapter}:${verse.verseNumber}"
                                            )
                                        }
                                    )
                                }
                            }
                        } else {
                            items(themes) { theme ->
                                ThemeCard(
                                    theme = theme,
                                    onClick = { viewModel.selectTheme(theme) },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }

                2 -> {
                    // Livros da Bíblia
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        item {
                            Text(
                                text = "Antigo Testamento",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                bibleBooksOld.forEach { book ->
                                    BookItemRow(bookName = book, onClick = {
                                        viewModel.searchQuery.value = book
                                    })
                                }
                            }
                        }

                        item {
                            Text(
                                text = "Novo Testamento",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                bibleBooksNew.forEach { book ->
                                    BookItemRow(bookName = book, onClick = {
                                        viewModel.searchQuery.value = book
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }

        shareModalData?.let { (text, ref) ->
            ShareVerseBottomSheet(
                context = context,
                verseText = text,
                reference = ref,
                onDismiss = { shareModalData = null }
            )
        }
    }
}

@Composable
fun VerseItemCard(
    verse: VerseEntity,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onShare: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .testTag("verse_item_${verse.id}"),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${verse.bookName} ${verse.chapter}:${verse.verseNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                Row {
                    IconButton(onClick = onToggleFavorite, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = "Favoritar",
                            tint = if (isFavorite) androidx.compose.ui.graphics.Color(0xFFE11D48) else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = onShare, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = Icons.Outlined.Share,
                            contentDescription = "Compartilhar",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "“${verse.text}”",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface
            )

            if (verse.reflection.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "💡 ${verse.reflection}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun BookItemRow(
    bookName: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = bookName,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}


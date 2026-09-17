package com.example.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.ui.MainViewModel
import com.example.ui.components.EmptyStateView
import com.example.ui.components.ShareVerseBottomSheet
import com.example.ui.theme.Gold500

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    viewModel: MainViewModel,
    onOpenVerseReader: (String, String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val query by viewModel.searchQuery.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    val favorites by viewModel.favorites.collectAsState()

    var shareModalData by remember { mutableStateOf<Pair<String, String>?>(null) }
    val quickFilters = listOf("Ansiedade", "Paz", "Fé", "Amor", "Esperança", "Salmos", "Sabedoria", "Coragem")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Buscar na Bíblia",
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
            // Search Bar
            OutlinedTextField(
                value = query,
                onValueChange = { viewModel.searchQuery.value = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("search_text_input"),
                placeholder = { Text("Pesquisar palavra, livro ou tema...") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Buscar",
                        tint = Gold500
                    )
                },
                trailingIcon = {
                    if (query.isNotBlank()) {
                        IconButton(onClick = { viewModel.searchQuery.value = "" }) {
                            Icon(imageVector = Icons.Default.Close, contentDescription = "Limpar")
                        }
                    }
                },
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Gold500,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Quick suggestion chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 4.dp)
            ) {
                items(quickFilters) { filter ->
                    SuggestionChip(
                        onClick = { viewModel.searchQuery.value = filter },
                        label = { Text(filter) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (query.isBlank()) {
                EmptyStateView(
                    title = "O que você busca hoje?",
                    message = "Digite uma palavra-chave como 'medo', 'cura', 'amor' ou o nome de um livro bíblico para encontrar passagens.",
                    icon = Icons.Default.Search
                )
            } else if (searchResults.isEmpty()) {
                EmptyStateView(
                    title = "Nenhum versículo encontrado",
                    message = "Tente buscar por termos mais genéricos ou verifique a ortografia."
                )
            } else {
                Text(
                    text = "${searchResults.size} resultados para “$query”",
                    style = MaterialTheme.typography.labelLarge,
                    color = Gold500,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(searchResults) { verse ->
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

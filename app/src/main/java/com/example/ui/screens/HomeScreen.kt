package com.example.ui.screens

import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.CloudSync
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.config.AppConfig
import com.example.core.config.AppEnvironment
import com.example.data.local.db.*
import com.example.data.sync.SyncState
import com.example.ui.MainViewModel
import com.example.ui.components.*
import com.example.ui.theme.ForestDark
import com.example.ui.theme.SageLight
import com.example.ui.theme.SagePrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: MainViewModel,
    onNavigateToExplore: () -> Unit,
    onNavigateToDevotionals: (String) -> Unit,
    onNavigateToPaywall: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onOpenVerseReader: (String, String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val dailyVerse by viewModel.dailyVerse.collectAsState()
    val themes by viewModel.themes.collectAsState()
    val emotions by viewModel.emotions.collectAsState()
    val favorites by viewModel.favorites.collectAsState()
    val history by viewModel.history.collectAsState()
    val devotionals by viewModel.devotionals.collectAsState()
    val selectedEmotion by viewModel.selectedEmotion.collectAsState()
    val emotionVerses by viewModel.versesForSelectedEmotion.collectAsState()
    val remoteConfig by viewModel.remoteConfig.collectAsState()
    val syncState by viewModel.syncState.collectAsState()
    val unreadNotificationsCount by viewModel.unreadNotificationsCount.collectAsState()
    val isPremium by viewModel.isPremium.collectAsState()
    val homeBanners by viewModel.homeBanners.collectAsState()
    var dismissedBannerIds by remember { mutableStateOf(setOf<String>()) }

    LaunchedEffect(Unit) {
        viewModel.loadHomeBanners()
    }

    val isDailyFav = dailyVerse?.let { dv ->
        favorites.any { it.verseId == dv.verseId }
    } ?: false

    var shareModalData by remember { mutableStateOf<Pair<String, String>?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Versículo do Dia",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Pão diário para a sua alma",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                actions = {
                    if (remoteConfig.cloudSyncEnabled) {
                        IconButton(
                            onClick = { viewModel.triggerManualSync() },
                            modifier = Modifier.testTag("sync_icon_button")
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.CloudSync,
                                contentDescription = "Sincronizar",
                                tint = SagePrimary
                            )
                        }
                    }

                    if (remoteConfig.notificationsEnabled) {
                        IconButton(
                            onClick = { onNavigateToNotifications() },
                            modifier = Modifier.testTag("notifications_icon_button")
                        ) {
                            BadgedBox(
                                badge = {
                                    if (unreadNotificationsCount > 0) {
                                        Badge(
                                            containerColor = MaterialTheme.colorScheme.error,
                                            contentColor = MaterialTheme.colorScheme.onError
                                        ) {
                                            Text(if (unreadNotificationsCount > 99) "99+" else unreadNotificationsCount.toString())
                                        }
                                    }
                                }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Notifications,
                                    contentDescription = "Central de Notificações",
                                    tint = SagePrimary
                                )
                            }
                        }
                    }

                    if (!isPremium && remoteConfig.premiumEnabled && remoteConfig.purchasesEnabled) {
                        Surface(
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .clickable { onNavigateToPaywall() }
                                .testTag("premium_header_badge"),
                            color = SageLight,
                            shape = RoundedCornerShape(20.dp),
                            border = BorderStroke(1.dp, SagePrimary.copy(alpha = 0.3f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Diamond,
                                    contentDescription = null,
                                    tint = SagePrimary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Premium",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = SagePrimary
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
        modifier = modifier
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Visual Test Mode Banner observing remote config 'app_mode'
            item {
                TestModeBanner(
                    appMode = remoteConfig.appMode,
                    customMessage = if (AppConfig.currentEnvironment == AppEnvironment.PRODUCTION) "Ambiente de Teste Ativo (Homologação)" else "Modo de Teste: ${AppConfig.currentEnvironment.displayName}"
                )
            }
            // Maintenance Mode Alert Card (Observes maintenance_level, message and estimated return date)
            if (remoteConfig.maintenance) {
                item {
                    val isFull = remoteConfig.maintenanceLevel.equals("full", ignoreCase = true)
                    val isPartial = remoteConfig.maintenanceLevel.equals("partial", ignoreCase = true)
                    val containerColor = when {
                        isFull -> MaterialTheme.colorScheme.errorContainer
                        isPartial -> Color(0xFFFEF3C7)
                        else -> MaterialTheme.colorScheme.primaryContainer
                    }
                    val contentColor = when {
                        isFull -> MaterialTheme.colorScheme.onErrorContainer
                        isPartial -> Color(0xFF92400E)
                        else -> MaterialTheme.colorScheme.onPrimaryContainer
                    }
                    val iconColor = when {
                        isFull -> MaterialTheme.colorScheme.error
                        isPartial -> Color(0xFFD97706)
                        else -> MaterialTheme.colorScheme.primary
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = containerColor),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = if (isFull || isPartial) Icons.Outlined.Warning else Icons.Outlined.Info,
                                contentDescription = null,
                                tint = iconColor,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = remoteConfig.maintenanceTitle.ifBlank { "Modo de Manutenção" },
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = contentColor
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = remoteConfig.maintenanceMessage,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = contentColor
                                )
                                if (!remoteConfig.maintenanceEstimatedEnd.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Previsão de retorno: ${remoteConfig.maintenanceEstimatedEnd}",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = contentColor.copy(alpha = 0.85f)
                                    )
                                }
                                if (isFull) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Aviso: Sincronização e novos recursos pausados. Seus versículos locais permanecem disponíveis para leitura.",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = contentColor.copy(alpha = 0.8f)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Force Update Notice
            if (AppConfig.VERSION_CODE < remoteConfig.minimumSupportedVersion && remoteConfig.forceUpdate) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SageLight),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, SagePrimary)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Atualização Necessária",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = SagePrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Uma nova versão com melhorias está disponível na loja.",
                                style = MaterialTheme.typography.bodySmall,
                                color = ForestDark
                            )
                        }
                    }
                }
            }

            // In-App Banners (from backend Banner system)
            homeBanners.filter { it.id !in dismissedBannerIds }.forEach { banner ->
                item(key = "banner_${banner.id}") {
                    InAppBannerCard(
                        banner = banner,
                        onActionClick = { actionType, actionUrl ->
                            when (actionType) {
                                "navigate_paywall", "paywall" -> onNavigateToPaywall()
                                "navigate_notifications" -> onNavigateToNotifications()
                                "open_url" -> {
                                    if (!actionUrl.isNullOrBlank()) {
                                        try {
                                            val intent = android.content.Intent(
                                                android.content.Intent.ACTION_VIEW,
                                                android.net.Uri.parse(actionUrl)
                                            )
                                            context.startActivity(intent)
                                        } catch (e: Exception) {
                                            android.util.Log.w("HomeScreen", "Error opening banner URL", e)
                                        }
                                    }
                                }
                                else -> {
                                    if (!actionUrl.isNullOrBlank() && actionUrl.startsWith("http")) {
                                        try {
                                            val intent = android.content.Intent(
                                                android.content.Intent.ACTION_VIEW,
                                                android.net.Uri.parse(actionUrl)
                                            )
                                            context.startActivity(intent)
                                        } catch (_: Exception) {}
                                    }
                                }
                            }
                        },
                        onDismiss = if (banner.dismissible) {
                            { dismissedBannerIds = dismissedBannerIds + banner.id }
                        } else null
                    )
                }
            }

            // Daily Verse Hero Section
            item {
                DailyVerseHeroCard(
                    dailyVerse = dailyVerse,
                    isFavorite = isDailyFav,
                    onToggleFavorite = { viewModel.toggleDailyVerseFavorite() },
                    onShare = {
                        dailyVerse?.let { dv ->
                            shareModalData = Pair(dv.text, dv.reference)
                        }
                    },
                    onOpenReader = {
                        dailyVerse?.let { dv ->
                            onOpenVerseReader(dv.verseId, dv.text, dv.reference)
                        }
                    }
                )
            }

            // Emotion Selector: "Como você está se sentindo hoje?"
            item {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Como você está se sentindo hoje?",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        if (selectedEmotion != null) {
                            TextButton(onClick = { viewModel.selectEmotion(null) }) {
                                Text("Limpar", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(end = 8.dp)
                    ) {
                        items(emotions) { emotion ->
                            EmotionChipCard(
                                emotion = emotion,
                                isSelected = selectedEmotion?.id == emotion.id,
                                onClick = {
                                    if (selectedEmotion?.id == emotion.id) {
                                        viewModel.selectEmotion(null)
                                    } else {
                                        viewModel.selectEmotion(emotion)
                                    }
                                }
                            )
                        }
                    }

                    // Display comfort word or verses for selected emotion
                    if (selectedEmotion != null) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp),
                            shape = RoundedCornerShape(18.dp),
                            color = SageLight.copy(alpha = 0.5f),
                            border = BorderStroke(1.dp, SagePrimary.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Palavra de Conforto: ${selectedEmotion?.name}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = SagePrimary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = selectedEmotion?.comfortingWord ?: "",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }

            // Popular Themes Carousel
            item {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Temas Populares",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        TextButton(onClick = onNavigateToExplore) {
                            Text("Ver Todos", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(themes.take(5)) { theme ->
                            ThemeCard(
                                theme = theme,
                                onClick = {
                                    viewModel.selectTheme(theme)
                                    onNavigateToExplore()
                                },
                                modifier = Modifier.width(180.dp)
                            )
                        }
                    }
                }
            }

            // Featured Devotionals (only shown if backend feature flag is enabled)
            if (remoteConfig.devotionalsEnabled && devotionals.isNotEmpty()) {
                item {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Planos Devocionais",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            devotionals.forEach { dev ->
                                DevotionalCard(
                                    devotional = dev,
                                    onClick = {
                                        if (dev.isPremium) {
                                            viewModel.checkAccessToBlockedResource(
                                                onAccessGranted = { onNavigateToDevotionals(dev.id) },
                                                onAccessDenied = { onNavigateToPaywall() }
                                            )
                                        } else {
                                            onNavigateToDevotionals(dev.id)
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // Reading History Snapshot
            if (history.isNotEmpty()) {
                item {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.Default.History,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Continuar Lendo",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        history.take(2).forEach { item ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .clickable { onOpenVerseReader(item.verseId, item.text, item.reference) },
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = item.reference,
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Text(
                                            text = item.text,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 1
                                        )
                                    }
                                    Icon(
                                        imageVector = Icons.Default.ChevronRight,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Ad Placement
            item {
                BannerAdPlacement(isAdAllowed = viewModel.adProvider.canShowPlacement(com.example.core.ads.AdPlacement.HOME_BANNER))
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }

        // Native share modal
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

package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.db.NotificationEntity
import com.example.ui.MainViewModel
import com.example.ui.components.EmptyStateView
import com.example.ui.theme.SagePrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    viewModel: MainViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToHome: () -> Unit,
    onNavigateToDevotionals: (String) -> Unit,
    onNavigateToSupport: () -> Unit,
    onNavigateToPaywall: () -> Unit,
    modifier: Modifier = Modifier
) {
    val notifications by viewModel.notifications.collectAsState()
    val unreadCount by viewModel.unreadNotificationsCount.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.refreshNotifications()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Central de Notificações",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        if (unreadCount > 0) {
                            Text(
                                text = "$unreadCount não lida${if (unreadCount > 1) "s" else ""}",
                                style = MaterialTheme.typography.labelSmall,
                                color = SagePrimary
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.testTag("back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Voltar"
                        )
                    }
                },
                actions = {
                    if (notifications.any { !it.isRead }) {
                        TextButton(
                            onClick = { viewModel.markAllNotificationsAsRead() },
                            modifier = Modifier.testTag("mark_all_read_button")
                        ) {
                            Text(
                                text = "Ler todas",
                                style = MaterialTheme.typography.labelMedium,
                                color = SagePrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    IconButton(
                        onClick = { viewModel.refreshNotifications() },
                        modifier = Modifier.testTag("refresh_notifications_button")
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Refresh,
                            contentDescription = "Atualizar notificações",
                            tint = SagePrimary
                        )
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
        if (notifications.isEmpty()) {
            EmptyStateView(
                title = "Nenhuma notificação",
                message = "Você está em dia! Avisos sobre seus devocionais diários, novos versículos e mensagens aparecerão aqui.",
                icon = Icons.Outlined.NotificationsNone,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                items(notifications, key = { it.id }) { notification ->
                    NotificationCard(
                        notification = notification,
                        onClick = {
                            viewModel.markNotificationAsRead(notification.id)
                            handleNotificationDeepLink(
                                deepLink = notification.deepLink,
                                onNavigateToHome = onNavigateToHome,
                                onNavigateToDevotionals = onNavigateToDevotionals,
                                onNavigateToSupport = onNavigateToSupport,
                                onNavigateToPaywall = onNavigateToPaywall
                            )
                        },
                        modifier = Modifier.testTag("notification_item_${notification.id}")
                    )
                }
            }
        }
    }
}

@Composable
fun NotificationCard(
    notification: NotificationEntity,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isUnread = !notification.isRead
    val icon = getNotificationIcon(notification.type)
    val iconTint = if (isUnread) SagePrimary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isUnread) {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        border = if (isUnread) {
            BorderStroke(1.dp, SagePrimary.copy(alpha = 0.35f))
        } else {
            BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
        },
        elevation = CardDefaults.cardElevation(defaultElevation = if (isUnread) 2.dp else 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Icon container
            Surface(
                shape = CircleShape,
                color = if (isUnread) SagePrimary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.size(44.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconTint,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            // Notification text content
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = notification.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = if (isUnread) FontWeight.Bold else FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )

                    if (isUnread) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .testTag("unread_dot")
                        ) {
                            Surface(
                                color = SagePrimary,
                                shape = CircleShape,
                                modifier = Modifier.fillMaxSize()
                            ) {}
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isUnread) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 20.sp
                )

                if (notification.createdAt.isNotBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = formatNotificationDate(notification.createdAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
        }
    }
}

private fun getNotificationIcon(type: String): ImageVector {
    return when (type.lowercase()) {
        "devotional", "devocional" -> Icons.Outlined.AutoStories
        "verse", "daily_verse", "versiculo" -> Icons.Outlined.MenuBook
        "support", "ticket", "ajuda" -> Icons.Outlined.SupportAgent
        "premium", "promo" -> Icons.Outlined.Diamond
        "alert", "system", "sistema" -> Icons.Outlined.Notifications
        else -> Icons.Outlined.Notifications
    }
}

private fun handleNotificationDeepLink(
    deepLink: String?,
    onNavigateToHome: () -> Unit,
    onNavigateToDevotionals: (String) -> Unit,
    onNavigateToSupport: () -> Unit,
    onNavigateToPaywall: () -> Unit
) {
    val link = deepLink?.trim()?.lowercase() ?: return
    when {
        link.contains("devotional") -> {
            val devId = if (link.contains("/")) link.substringAfterLast("/") else "dev_ansiedade"
            onNavigateToDevotionals(devId)
        }
        link.contains("support") || link.contains("ticket") || link.contains("ajuda") -> {
            onNavigateToSupport()
        }
        link.contains("premium") || link.contains("paywall") || link.contains("assinatura") -> {
            onNavigateToPaywall()
        }
        link.contains("home") || link.contains("verse") -> {
            onNavigateToHome()
        }
        else -> {
            onNavigateToHome()
        }
    }
}

private fun formatNotificationDate(rawDate: String): String {
    return try {
        if (rawDate.contains("T")) {
            val datePart = rawDate.substringBefore("T")
            val timePart = rawDate.substringAfter("T").take(5)
            val parts = datePart.split("-")
            if (parts.size == 3) {
                "${parts[2]}/${parts[1]}/${parts[0]} às $timePart"
            } else {
                rawDate
            }
        } else {
            rawDate
        }
    } catch (_: Exception) {
        rawDate
    }
}

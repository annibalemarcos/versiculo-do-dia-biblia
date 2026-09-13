package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.remote.TicketDetailDto
import com.example.data.remote.TicketMessageDto
import com.example.ui.MainViewModel
import com.example.ui.theme.Gold500
import com.example.ui.theme.Navy900
import com.example.ui.theme.SageLight
import com.example.ui.theme.SagePrimary

private val STATUS_MAP = mapOf(
    "OPEN" to Triple("Aberto", Color(0xFF3B82F6), Color(0xFF1E3A8A)),
    "IN_PROGRESS" to Triple("Em análise", Color(0xFFA855F7), Color(0xFF581C87)),
    "WAITING_USER" to Triple("Aguardando sua resposta", Color(0xFFF59E0B), Color(0xFF78350F)),
    "RESOLVED" to Triple("Resolvido", Color(0xFF10B981), Color(0xFF064E3B)),
    "CLOSED" to Triple("Encerrado", Color(0xFF6B7280), Color(0xFF1F2937))
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketDetailScreen(
    ticketId: String,
    viewModel: MainViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val ticketDetail by viewModel.currentTicketDetail.collectAsState()
    val isLoading by viewModel.ticketDetailLoading.collectAsState()

    var replyText by remember { mutableStateOf("") }
    var isSending by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()

    LaunchedEffect(ticketId) {
        viewModel.loadTicketDetail(ticketId)
    }

    LaunchedEffect(ticketDetail?.messages?.size) {
        if ((ticketDetail?.messages?.size ?: 0) > 0) {
            listState.animateScrollToItem((ticketDetail?.messages?.size ?: 1) - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = ticketDetail?.ticketNumber ?: "Chamado",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            if (ticketDetail != null) {
                                Spacer(modifier = Modifier.width(6.dp))
                                IconButton(
                                    onClick = {
                                        clipboardManager.setText(AnnotatedString(ticketDetail!!.ticketNumber))
                                        Toast.makeText(context, "ID do chamado copiado: ${ticketDetail!!.ticketNumber}", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier
                                        .size(28.dp)
                                        .testTag("btn_copy_ticket_id")
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.ContentCopy,
                                        contentDescription = "Copiar ID do chamado",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                        ticketDetail?.let {
                            Text(
                                text = it.subject,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("btn_back_ticket_detail")) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Voltar"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadTicketDetail(ticketId) }, modifier = Modifier.testTag("btn_refresh_ticket")) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Atualizar conversa"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
        modifier = modifier
    ) { innerPadding ->
        if (isLoading && ticketDetail == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (ticketDetail != null) {
            val ticket = ticketDetail!!
            val (statusLabel, statusColor, _) = STATUS_MAP[ticket.status] ?: Triple(ticket.status, Color.Gray, Color.DarkGray)
            val isClosed = ticket.status.uppercase() == "CLOSED"

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                // Header Status Bar
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = statusColor.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = "Status: $statusLabel",
                                color = statusColor,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }

                        Text(
                            text = "Criado em ${ticket.createdAt.take(10)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Closed Ticket Notification Banner
                if (isClosed) {
                    Surface(
                        color = Color(0xFF1E293B),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Este chamado foi encerrado.",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFE2E8F0)
                            )
                        }
                    }
                }

                // Messages Chat List
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 16.dp)
                ) {
                    // Initial ticket description if messages is empty
                    if (ticket.messages.isEmpty()) {
                        item {
                            MessageBubble(
                                message = TicketMessageDto(
                                    id = "orig",
                                    ticketId = ticket.id,
                                    senderType = "USER",
                                    senderName = ticket.userName ?: "Você",
                                    message = ticket.description ?: "",
                                    createdAt = ticket.createdAt
                                ),
                                isFromUser = true
                            )
                        }
                    } else {
                        items(ticket.messages, key = { it.id }) { msg ->
                            val isUser = msg.senderType == "USER"
                            MessageBubble(message = msg, isFromUser = isUser)
                        }
                    }
                }

                // Reply Input Bar or Closed notice
                if (isClosed) {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                        tonalElevation = 2.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Info,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Este chamado foi encerrado e está em modo somente leitura.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else {
                    Surface(
                        tonalElevation = 3.dp,
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = replyText,
                                onValueChange = { replyText = it },
                                placeholder = { Text("Escreva uma resposta...") },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("input_ticket_reply"),
                                shape = RoundedCornerShape(24.dp),
                                maxLines = 4,
                                enabled = !isSending
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            IconButton(
                                onClick = {
                                    if (replyText.isNotBlank() && !isSending) {
                                        val msg = replyText.trim()
                                        isSending = true
                                        viewModel.replyToTicket(ticket.id, msg) { success, err ->
                                            isSending = false
                                            if (success) {
                                                replyText = ""
                                            } else {
                                                Toast.makeText(context, err ?: "Falha ao enviar resposta", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    }
                                },
                                enabled = !isSending && replyText.isNotBlank(),
                                modifier = Modifier.testTag("btn_send_reply")
                            ) {
                                if (isSending) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                } else {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.Send,
                                        contentDescription = "Enviar",
                                        tint = if (replyText.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MessageBubble(
    message: TicketMessageDto,
    isFromUser: Boolean
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isFromUser) Alignment.End else Alignment.Start
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = if (isFromUser) Arrangement.End else Arrangement.Start,
            modifier = Modifier.padding(bottom = 4.dp, start = 4.dp, end = 4.dp)
        ) {
            if (!isFromUser) {
                Surface(
                    shape = CircleShape,
                    color = SagePrimary,
                    modifier = Modifier.size(18.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.SupportAgent,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(4.dp))
            }

            Text(
                text = if (isFromUser) "Você" else (message.senderName ?: "Equipe de Suporte"),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = if (isFromUser) MaterialTheme.colorScheme.primary else SagePrimary
            )
        }

        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isFromUser) 16.dp else 4.dp,
                bottomEnd = if (isFromUser) 4.dp else 16.dp
            ),
            color = if (isFromUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
            contentColor = if (isFromUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                Text(
                    text = message.message,
                    style = MaterialTheme.typography.bodyMedium,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

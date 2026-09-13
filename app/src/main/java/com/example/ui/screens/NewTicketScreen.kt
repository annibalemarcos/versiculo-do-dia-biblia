package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.MainViewModel

private val CATEGORIES = listOf(
    Pair("TECHNICAL", "Problema Técnico"),
    Pair("PREMIUM_PAYMENT", "Assinatura / Pagamento"),
    Pair("ACCOUNT", "Conta & Login"),
    Pair("CONTENT", "Conteúdo Bíblico"),
    Pair("SUGGESTION", "Sugestão"),
    Pair("OTHER", "Outro Assunto")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewTicketScreen(
    viewModel: MainViewModel,
    onBack: () -> Unit,
    onTicketCreated: () -> Unit,
    onViewTicket: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val userProfile by viewModel.userProfile.collectAsState()
    val (userName, userEmail, _) = userProfile
    val isLoggedIn = !userEmail.isNullOrBlank()

    var selectedCategory by remember { mutableStateOf("TECHNICAL") }
    var subject by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var relatedTicketNumber by remember { mutableStateOf("") }
    var guestName by remember { mutableStateOf(userName ?: "") }
    var guestEmail by remember { mutableStateOf(userEmail ?: "") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var createdTicket by remember { mutableStateOf<com.example.data.remote.TicketDetailDto?>(null) }

    if (createdTicket != null) {
        val tkt = createdTicket!!
        AlertDialog(
            onDismissRequest = { /* Require action button click */ },
            icon = {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(40.dp)
                )
            },
            title = {
                Text(
                    text = "Chamado Criado!",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleLarge
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Chamado ${tkt.ticketNumber} criado com sucesso.",
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Nossa equipe irá analisar sua mensagem e responder em breve. Você receberá uma notificação quando houver atualizações.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val ticketId = tkt.id
                        createdTicket = null
                        onViewTicket(ticketId)
                    },
                    modifier = Modifier.testTag("btn_view_created_ticket")
                ) {
                    Text("VER CHAMADO")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        createdTicket = null
                        onTicketCreated()
                    },
                    modifier = Modifier.testTag("btn_close_created_dialog")
                ) {
                    Text("MEUS CHAMADOS")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Abrir Novo Chamado",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("btn_back_new_ticket")) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Voltar"
                        )
                    }
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
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header Info Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.HelpOutline,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Descreva sua dúvida ou problema detalhadamente para podermos te ajudar mais rápido.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Error banner if any
            if (errorMessage != null) {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = errorMessage ?: "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            // Category Selection Chips
            Text(
                text = "Categoria do Chamado",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CATEGORIES.chunked(2).forEach { rowItems ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowItems.forEach { (catKey, catLabel) ->
                            FilterChip(
                                selected = selectedCategory == catKey,
                                onClick = { selectedCategory = catKey },
                                label = { Text(catLabel, fontSize = 12.sp) },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("chip_category_$catKey")
                            )
                        }
                    }
                }
            }

            // Subject Input
            OutlinedTextField(
                value = subject,
                onValueChange = { subject = it },
                label = { Text("Assunto") },
                placeholder = { Text("Ex: Dificuldade com o áudio do versículo") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("input_ticket_subject"),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
            )

            // Description Input
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Mensagem / Descrição detalhada") },
                placeholder = { Text("Conte o que aconteceu, qual versículo ou função você tentou usar...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .testTag("input_ticket_description"),
                shape = RoundedCornerShape(12.dp),
                maxLines = 8,
                supportingText = {
                    Text(
                        text = "${description.length} caracteres (mínimo 10)",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            )

            // Related Ticket Input (Optional)
            OutlinedTextField(
                value = relatedTicketNumber,
                onValueChange = { relatedTicketNumber = it.uppercase() },
                label = { Text("Chamado relacionado (opcional)") },
                placeholder = { Text("Ex: TKT-000006") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("input_related_ticket"),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
            )

            // Guest contact info if not logged in
            if (!isLoggedIn) {
                Text(
                    text = "Dados para Contato",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = guestName,
                    onValueChange = { guestName = it },
                    label = { Text("Seu Nome") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = guestEmail,
                    onValueChange = { guestEmail = it },
                    label = { Text("Seu E-mail") },
                    placeholder = { Text("Para receber a resposta da equipe") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Done)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Submit Button
            Button(
                onClick = {
                    errorMessage = null
                    if (subject.trim().length < 3) {
                        errorMessage = "Por favor, preencha um assunto descritivo."
                        return@Button
                    }
                    if (description.trim().length < 10) {
                        errorMessage = "Por favor, explique o problema em pelo menos 10 caracteres."
                        return@Button
                    }

                    val fullDescription = if (relatedTicketNumber.isNotBlank()) {
                        "${description.trim()}\n\n[Chamado Relacionado: ${relatedTicketNumber.trim()}]"
                    } else {
                        description.trim()
                    }

                    isLoading = true
                    viewModel.createSupportTicket(
                        subject = subject.trim(),
                        description = fullDescription,
                        category = selectedCategory,
                        priority = "NORMAL",
                        guestName = if (!isLoggedIn) guestName.ifBlank { null } else null,
                        guestEmail = if (!isLoggedIn) guestEmail.ifBlank { null } else null
                    ) { success, ticketDto, err ->
                        isLoading = false
                        if (success && ticketDto != null) {
                            createdTicket = ticketDto
                        } else if (success) {
                            Toast.makeText(context, "Chamado enviado com sucesso!", Toast.LENGTH_LONG).show()
                            onTicketCreated()
                        } else {
                            errorMessage = err ?: "Falha ao enviar chamado. Seus dados estão salvos nesta tela. Tente novamente."
                        }
                    }
                },
                enabled = !isLoading && subject.isNotBlank() && description.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("btn_submit_ticket"),
                shape = RoundedCornerShape(14.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Enviando chamado...")
                } else {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Enviar Chamado de Suporte")
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

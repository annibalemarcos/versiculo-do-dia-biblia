package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.BuildConfig
import com.example.core.config.AppConfig
import com.example.core.config.AppEnvironment
import com.example.core.datastore.AppThemeMode
import com.example.ui.MainViewModel
import com.example.ui.components.TestModeBanner
import com.example.ui.theme.Gold500
import com.example.ui.theme.Navy800
import com.example.ui.theme.Navy900
import com.example.ui.theme.SageLight
import com.example.ui.theme.SagePrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsProfileScreen(
    viewModel: MainViewModel,
    onNavigateToPaywall: () -> Unit,
    onNavigateToHelpSupport: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val userProfile by viewModel.userProfile.collectAsState()
    val remoteConfig by viewModel.remoteConfig.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()
    val isNotificationsEnabled by viewModel.preferencesManager.isNotificationsEnabled.collectAsState(initial = true)

    val (userName, userEmail, isPremium) = userProfile
    val isLoggedIn = !userEmail.isNullOrBlank()

    var showAuthDialog by remember { mutableStateOf(false) }
    var isRegisterMode by remember { mutableStateOf(false) }
    var authEmail by remember { mutableStateOf("") }
    var authPassword by remember { mutableStateOf("") }
    var authName by remember { mutableStateOf("") }
    var authLoading by remember { mutableStateOf(false) }
    var authErrorMessage by remember { mutableStateOf<String?>(null) }

    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var showPrivacyDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "ConfiguraÃ§Ãµes & Perfil",
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
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Visual Test Mode Banner
            TestModeBanner(appMode = remoteConfig.appMode)

            // User Profile Header Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(CircleShape)
                            .background(Gold500.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isLoggedIn) Icons.Default.Person else Icons.Outlined.PersonOutline,
                            contentDescription = null,
                            tint = Gold500,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = if (isLoggedIn) userName ?: "UsuÃ¡rio" else "Modo AnÃ´nimo",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (isPremium) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = Gold500,
                                    contentColor = Navy900
                                ) {
                                    Text(
                                        text = "PREMIUM",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                        Text(
                            text = if (isLoggedIn) userEmail ?: "" else "Favoritos salvos localmente",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (isLoggedIn) {
                        IconButton(onClick = { viewModel.logout() }) {
                            Icon(imageVector = Icons.Default.Logout, contentDescription = "Sair", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        Button(
                            onClick = { showAuthDialog = true },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Gold500, contentColor = Navy900),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("Entrar", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Monetization & Premium Section
            if (isPremium) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = SageLight),
                    border = BorderStroke(1.dp, SagePrimary.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = SagePrimary, modifier = Modifier.size(26.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Assinatura Ativa", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = SagePrimary)
                            Text("Acesso ilimitado sem anÃºncios e com todos os recursos", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            } else if (remoteConfig.premiumEnabled && remoteConfig.purchasesEnabled) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .clickable { onNavigateToPaywall() },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Gold500.copy(alpha = 0.15f)),
                    border = BorderStroke(1.dp, Gold500.copy(alpha = 0.4f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(imageVector = Icons.Default.Diamond, contentDescription = null, tint = Gold500, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Seja Premium", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Gold500)
                            Text("Remova anÃºncios e acesse todos os devocionais", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                        }
                        Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = Gold500)
                    }
                }
            }

            // Cloud Sync Section
            val syncState by viewModel.syncState.collectAsState()
            Text("SincronizaÃ§Ã£o na Nuvem", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudSync,
                            contentDescription = null,
                            tint = Gold500,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Nuvem & SincronizaÃ§Ã£o",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = syncState.getDisplayMessage(),
                                style = MaterialTheme.typography.bodySmall,
                                color = when (syncState) {
                                    is com.example.data.sync.SyncState.Success -> Gold500
                                    is com.example.data.sync.SyncState.Error -> MaterialTheme.colorScheme.error
                                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }
                    }

                    if (remoteConfig.cloudSyncEnabled) {
                        Button(
                            onClick = {
                                viewModel.triggerManualSync { success, msg ->
                                    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                }
                            },
                            enabled = syncState !is com.example.data.sync.SyncState.Syncing,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isLoggedIn) Gold500 else MaterialTheme.colorScheme.primary,
                                contentColor = if (isLoggedIn) Navy900 else MaterialTheme.colorScheme.onPrimary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (syncState is com.example.data.sync.SyncState.Syncing) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = if (isLoggedIn) Navy900 else MaterialTheme.colorScheme.onPrimary,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Sincronizando...")
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Sync,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Sincronizar Agora")
                            }
                        }
                    } else {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = "SincronizaÃ§Ã£o em nuvem temporariamente desativada pelo administrador.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
            }

            // Appearance & Preferences
            Text("PreferÃªncias", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Tema do Aplicativo", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = themeMode == AppThemeMode.SYSTEM,
                            onClick = { viewModel.setThemeMode(AppThemeMode.SYSTEM) },
                            label = { Text("Sistema") }
                        )
                        FilterChip(
                            selected = themeMode == AppThemeMode.LIGHT,
                            onClick = { viewModel.setThemeMode(AppThemeMode.LIGHT) },
                            label = { Text("Claro") }
                        )
                        FilterChip(
                            selected = themeMode == AppThemeMode.DARK,
                            onClick = { viewModel.setThemeMode(AppThemeMode.DARK) },
                            label = { Text("Escuro") }
                        )
                    }
                }
            }

            // Help & Support
            Text("Ajuda & NotificaÃ§Ãµes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
            ) {
                Column {
                    if (remoteConfig.notificationsEnabled) {
                        SettingsRowItem(
                            icon = Icons.Outlined.Notifications,
                            title = "Central de NotificaÃ§Ãµes",
                            subtitle = "Mensagens diÃ¡rias, devocionais e alertas",
                            onClick = onNavigateToNotifications
                        )
                        Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                    }
                    if (remoteConfig.supportEnabled) {
                        SettingsRowItem(
                            icon = Icons.Outlined.HelpOutline,
                            title = "Central de Ajuda & DÃºvidas (FAQ)",
                            subtitle = "Perguntas frequentes e canais de suporte",
                            onClick = onNavigateToHelpSupport
                        )
                        Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                        SettingsRowItem(
                            icon = Icons.Outlined.SupportAgent,
                            title = "Falar com o Suporte / Abrir Chamado",
                            subtitle = "Envie uma mensagem direta para nossa equipe",
                            onClick = onNavigateToHelpSupport
                        )
                    } else {
                        SettingsRowItem(
                            icon = Icons.Outlined.HelpOutline,
                            title = "Suporte Temporariamente IndisponÃ­vel",
                            subtitle = "Canal de atendimento em manutenÃ§Ã£o",
                            onClick = {
                                Toast.makeText(context, "O suporte estÃ¡ temporariamente em manutenÃ§Ã£o.", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            }

            // Privacy & Legal
            Text("Privacidade & Legal", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
            ) {
                Column {
                    SettingsRowItem(
                        icon = Icons.Outlined.Shield,
                        title = "PolÃ­tica de Privacidade & LGPD",
                        onClick = { showPrivacyDialog = true }
                    )
                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                    SettingsRowItem(
                        icon = Icons.Outlined.Info,
                        title = "Sobre o Aplicativo",
                        subtitle = "VersÃ£o ${AppConfig.VERSION_NAME} (Build ${AppConfig.VERSION_CODE})",
                        onClick = {
                            Toast.makeText(context, "VersÃ­culo do Dia v${AppConfig.VERSION_NAME}", Toast.LENGTH_SHORT).show()
                        }
                    )
                    if (isLoggedIn) {
                        Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                        SettingsRowItem(
                            icon = Icons.Outlined.DeleteForever,
                            title = "Excluir Minha Conta",
                            titleColor = Color(0xFFE11D48),
                            onClick = { showDeleteAccountDialog = true }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // Auth Dialog (Login / Register)
        if (showAuthDialog) {
            AlertDialog(
                onDismissRequest = {
                    if (!authLoading) {
                        showAuthDialog = false
                        authErrorMessage = null
                    }
                },
                title = {
                    Text(
                        text = if (isRegisterMode) "Criar Nova Conta" else "Entrar na Conta",
                        fontWeight = FontWeight.Bold
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (authErrorMessage != null) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFEF4444).copy(alpha = 0.15f),
                                border = BorderStroke(1.dp, Color(0xFFEF4444)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = authErrorMessage!!,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFFDC2626),
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }

                        if (isRegisterMode) {
                            OutlinedTextField(
                                value = authName,
                                onValueChange = {
                                    authName = it
                                    authErrorMessage = null
                                },
                                label = { Text("Nome completo") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth().testTag("auth_dialog_name_input")
                            )
                        }
                        OutlinedTextField(
                            value = authEmail,
                            onValueChange = {
                                authEmail = it
                                authErrorMessage = null
                            },
                            label = { Text("E-mail") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("auth_dialog_email_input")
                        )
                        OutlinedTextField(
                            value = authPassword,
                            onValueChange = {
                                authPassword = it
                                authErrorMessage = null
                            },
                            label = { Text("Senha") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("auth_dialog_password_input")
                        )
                        if (remoteConfig.registrationEnabled) {
                            TextButton(
                                onClick = {
                                    isRegisterMode = !isRegisterMode
                                    authErrorMessage = null
                                },
                                modifier = Modifier.align(Alignment.End)
                            ) {
                                Text(
                                    text = if (isRegisterMode) "JÃ¡ tem uma conta? Entrar" else "NÃ£o tem conta? Cadastre-se",
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        } else {
                            Text(
                                text = "Novos cadastros desativados pelo administrador.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (authEmail.isBlank() || authPassword.isBlank()) {
                                authErrorMessage = "Preencha todos os campos obrigatÃ³rios."
                                return@Button
                            }
                            if (isRegisterMode && !remoteConfig.registrationEnabled) {
                                authErrorMessage = "Novos cadastros estÃ£o desativados pelo administrador."
                                return@Button
                            }
                            if (isRegisterMode && authName.isBlank()) {
                                authErrorMessage = "Preencha seu nome completo."
                                return@Button
                            }
                            authLoading = true
                            authErrorMessage = null
                            if (isRegisterMode) {
                                viewModel.registerUser(authName, authEmail, authPassword) { success, err ->
                                    authLoading = false
                                    if (success) {
                                        Toast.makeText(context, "Conta criada com sucesso!", Toast.LENGTH_SHORT).show()
                                        showAuthDialog = false
                                    } else {
                                        authErrorMessage = err ?: "Erro ao cadastrar usuÃ¡rio."
                                    }
                                }
                            } else {
                                viewModel.loginUser(authEmail, authPassword) { success, err ->
                                    authLoading = false
                                    if (success) {
                                        Toast.makeText(context, "Login realizado com sucesso!", Toast.LENGTH_SHORT).show()
                                        showAuthDialog = false
                                    } else {
                                        authErrorMessage = err ?: "Erro ao realizar login."
                                    }
                                }
                            }
                        },
                        enabled = !authLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = Gold500, contentColor = Navy900),
                        modifier = Modifier.testTag("auth_dialog_submit_button")
                    ) {
                        if (authLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Navy900)
                            Spacer(modifier = Modifier.width(6.dp))
                        }
                        Text(if (isRegisterMode) "Cadastrar" else "Entrar")
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = {
                            showAuthDialog = false
                            authErrorMessage = null
                        },
                        enabled = !authLoading
                    ) {
                        Text("Cancelar")
                    }
                }
            )
        }

        // Delete Account Dialog
        if (showDeleteAccountDialog) {
            AlertDialog(
                onDismissRequest = { showDeleteAccountDialog = false },
                title = { Text("Excluir Conta Permanentemente") },
                text = {
                    Text("Tem certeza que deseja excluir sua conta? Todos os dados remotos e histÃ³ricos sincronizados serÃ£o apagados em conformidade com a LGPD.")
                },
                confirmButton = {
                    Button(
                        onClick = {
                            viewModel.deleteAccount {
                                Toast.makeText(context, "Conta excluÃ­da com sucesso.", Toast.LENGTH_SHORT).show()
                                showDeleteAccountDialog = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48))
                    ) {
                        Text("Excluir Definitivamente", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteAccountDialog = false }) {
                        Text("Cancelar")
                    }
                }
            )
        }

        // Privacy Policy Dialog
        if (showPrivacyDialog) {
            AlertDialog(
                onDismissRequest = { showPrivacyDialog = false },
                title = { Text("PolÃ­tica de Privacidade & LGPD", fontWeight = FontWeight.Bold) },
                text = {
                    Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                        Text(
                            text = "Compromisso com sua Privacidade:\n\n" +
                                    "1. O aplicativo funciona normalmente de forma offline e anÃ´nima.\n" +
                                    "2. Suas emoÃ§Ãµes selecionadas sÃ£o estritamente confidenciais e JAMAIS serÃ£o utilizadas para segmentaÃ§Ã£o de anÃºncios ou perfil comercial.\n" +
                                    "3. Dados sincronizados (favoritos e histÃ³rico) contam com criptografia padrÃ£o da indÃºstria.\n" +
                                    "4. VocÃª tem direito Ã  exclusÃ£o completa dos seus dados a qualquer momento pelo botÃ£o 'Excluir Minha Conta'.\n\n" +
                                    "Desenvolvido com respeito e Ã©tica espiritual.",
                            style = MaterialTheme.typography.bodyMedium,
                            lineHeight = 22.sp
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showPrivacyDialog = false }) {
                        Text("Entendi", color = Gold500, fontWeight = FontWeight.Bold)
                    }
                }
            )
        }
    }
}

@Composable
private fun SettingsRowItem(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    titleColor: Color = Color.Unspecified,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (titleColor != Color.Unspecified) titleColor else Gold500,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = if (titleColor != Color.Unspecified) titleColor else MaterialTheme.colorScheme.onSurface
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
        )
    }
}

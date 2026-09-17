package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.BuildConfig
import com.example.core.billing.PremiumPlan
import com.example.core.billing.PurchaseState
import com.example.core.config.AppConfig
import com.example.ui.MainViewModel
import com.example.ui.theme.Gold500
import com.example.ui.theme.Navy800
import com.example.ui.theme.Navy900
import com.example.ui.theme.SageLight
import com.example.ui.theme.SagePrimary
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PremiumPaywallScreen(
    viewModel: MainViewModel,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val billingProvider = viewModel.billingProvider
    val purchaseState by billingProvider.purchaseState.collectAsState()
    val plans by billingProvider.availablePlans.collectAsState()
    val remoteConfig by viewModel.remoteConfig.collectAsState()
    val isPremium by viewModel.isPremium.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val premiumDetails by viewModel.premiumDetails.collectAsState()

    val (userName, userEmail, _) = userProfile
    val (premiumStatus, premiumSource, premiumExpiresAt) = premiumDetails
    val isAnonymous = userEmail.isNullOrBlank()

    var selectedPlanId by remember { mutableStateOf("premium_yearly") }

    // Always fetch latest catalog products and test environment config when Paywall opens
    LaunchedEffect(Unit) {
        viewModel.refreshRemoteConfig()
    }

    LaunchedEffect(plans) {
        if (plans.isNotEmpty() && plans.none { it.productId == selectedPlanId }) {
            val defaultPlan = plans.firstOrNull { it.isPopular } ?: plans.first()
            selectedPlanId = defaultPlan.productId
        }
    }

    // Auth dialog state
    var showAuthDialog by remember { mutableStateOf(false) }
    var isRegisterMode by remember { mutableStateOf(false) }
    var authEmail by remember { mutableStateOf("") }
    var authPassword by remember { mutableStateOf("") }
    var authName by remember { mutableStateOf("") }
    var authLoading by remember { mutableStateOf(false) }
    var authErrorMessage by remember { mutableStateOf<String?>(null) }
    var passwordVisible by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Fechar")
                    }
                },
                actions = {
                    TextButton(onClick = {
                        if (isAnonymous) {
                            Toast.makeText(context, "Faça login com sua conta para restaurar assinaturas vinculadas.", Toast.LENGTH_LONG).show()
                            showAuthDialog = true
                        } else {
                            scope.launch {
                                val restored = billingProvider.restorePurchases()
                                if (restored) {
                                    Toast.makeText(context, "Assinatura restaurada com sucesso!", Toast.LENGTH_SHORT).show()
                                    onClose()
                                } else {
                                    Toast.makeText(context, "Nenhuma assinatura ativa encontrada para este usuário no Google Play.", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }) {
                        Text("Restaurar", color = Gold500, fontWeight = FontWeight.SemiBold)
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
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isPremium) {
                // ACTIVE PREMIUM SUBSCRIBER VIEW
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(
                            Brush.linearGradient(listOf(Gold500, SagePrimary)),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.background,
                        modifier = Modifier.size(44.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Sua Assinatura Premium está Ativa",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Você possui acesso completo a todos os recursos exclusivos sem nenhuma interrupção.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(24.dp))

                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    BenefitRow(
                        icon = Icons.Default.Block,
                        title = "100% Sem Anúncios (Ativo)",
                        description = "Foco total na leitura e oração, sem nenhuma distração."
                    )
                    BenefitRow(
                        icon = Icons.Default.MenuBook,
                        title = "Todos os Planos Devocionais",
                        description = "Acesso irrestrito a dezenas de jornadas guiadas e reflexões."
                    )
                    BenefitRow(
                        icon = Icons.Default.CloudDownload,
                        title = "Modo Offline Ilimitado",
                        description = "Toda a Bíblia e devocionais disponíveis sem internet."
                    )
                    BenefitRow(
                        icon = Icons.Default.Star,
                        title = "Temas e Cartões Exclusivos",
                        description = "Todos os designs de compartilhamento e categorias bíblicas especiais."
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Subscription Details Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Detalhes da Assinatura",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Status:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(premiumStatus, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = SagePrimary)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Origem:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                if (premiumSource == "GOOGLE_PLAY") "Google Play Store" else if (premiumSource == "DEVELOPMENT_SIMULATION") "Ambiente de Testes (Dev)" else premiumSource,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        if (!premiumExpiresAt.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Validade:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(premiumExpiresAt!!, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                OutlinedButton(
                    onClick = {
                        viewModel.refreshBillingStatus { isPrem ->
                            if (isPrem) {
                                Toast.makeText(context, "Assinatura validada e ativa!", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "Status atualizado.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("sync_subscription_button"),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Gold500)
                ) {
                    Icon(imageVector = Icons.Default.Refresh, contentDescription = null, tint = Gold500)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Sincronizar com Servidor", color = Gold500, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onClose,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("close_premium_button"),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("Continuar Leitura", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(32.dp))
            } else {
                // NON-PREMIUM USER VIEW
                val canPurchase = remoteConfig.premiumEnabled && remoteConfig.purchasesEnabled

                // Header icon
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(
                            Brush.linearGradient(listOf(Gold500, Navy800)),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Diamond,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.background,
                        modifier = Modifier.size(44.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Bíblia Diária Premium",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Aprofunde sua comunhão diária sem distrações e com recursos exclusivos.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Anonymous Warning Notice (if applicable)
                if (isAnonymous) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = Gold500.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, Gold500.copy(alpha = 0.4f))
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = Gold500,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Conta Necessária para Assinar",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Gold500
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Você está usando o app em modo anônimo. Para proteger sua compra e sincronizar em qualquer aparelho, é obrigatório criar uma conta ou fazer login.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Benefit Items
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    BenefitRow(
                        icon = Icons.Default.Block,
                        title = "100% Sem Anúncios",
                        description = "Foco total na leitura e oração, sem nenhuma interrupção."
                    )
                    BenefitRow(
                        icon = Icons.Default.MenuBook,
                        title = "Todos os Planos Devocionais",
                        description = "Acesso irrestrito a dezenas de jornadas guiadas e reflexões."
                    )
                    BenefitRow(
                        icon = Icons.Default.CloudDownload,
                        title = "Modo Offline Ilimitado",
                        description = "Acesse toda a Bíblia e devocionais sem conexão com internet."
                    )
                    BenefitRow(
                        icon = Icons.Default.Star,
                        title = "Temas e Cartões Exclusivos",
                        description = "Novos designs de compartilhamento e categorias bíblicas especiais."
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                if (canPurchase) {
                    // Plan Selectors
                    Text(
                        text = "Escolha o seu plano:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.Start)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        plans.forEach { plan ->
                            PlanCard(
                                plan = plan,
                                isSelected = selectedPlanId == plan.productId,
                                onClick = { selectedPlanId = plan.productId }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // CTA Button
                    Button(
                        onClick = {
                            if (isAnonymous) {
                                // Block anonymous users from proceeding: prompt auth immediately
                                showAuthDialog = true
                            } else {
                                scope.launch {
                                    viewModel.analyticsTracker.logPurchaseStarted(selectedPlanId)
                                    val success = billingProvider.purchasePlan(selectedPlanId)
                                    if (success) {
                                        viewModel.analyticsTracker.logPurchaseCompleted(selectedPlanId)
                                        Toast.makeText(context, "Plano Premium ativado com sucesso!", Toast.LENGTH_SHORT).show()
                                        onClose()
                                    } else {
                                        Toast.makeText(
                                            context,
                                            "Não foi possível validar a assinatura no Google Play. Nenhuma cobrança foi confirmada.",
                                            Toast.LENGTH_LONG
                                        ).show()
                                    }
                                }
                            }
                        },
                        enabled = purchaseState != PurchaseState.PENDING,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .testTag("subscribe_button"),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Gold500, contentColor = Navy900)
                    ) {
                        if (purchaseState == PurchaseState.PENDING) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Navy900)
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (isAnonymous) {
                                    Icon(imageVector = Icons.Default.AccountCircle, contentDescription = null, tint = Navy900)
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                Text(
                                    text = if (isAnonymous) "Entrar na Conta para Assinar" else "Assinar e Desbloquear",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Cobrado com segurança via Google Play. Assinaturas vinculadas com autoridade server-side.",
                        style = MaterialTheme.typography.labelSmall,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp
                    )
                } else {
                    // Purchases or Premium disabled via remote governance
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Novas assinaturas estão temporariamente pausadas para manutenção programada. Se você já assinou anteriormente, utilize a opção 'Restaurar' no topo da tela para recuperar seus benefícios.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    OutlinedButton(
                        onClick = {
                            if (isAnonymous) {
                                Toast.makeText(context, "Faça login com sua conta para restaurar assinaturas.", Toast.LENGTH_SHORT).show()
                                showAuthDialog = true
                            } else {
                                scope.launch {
                                    val restored = billingProvider.restorePurchases()
                                    if (restored) {
                                        Toast.makeText(context, "Compras restauradas com sucesso!", Toast.LENGTH_SHORT).show()
                                        onClose()
                                    } else {
                                        Toast.makeText(context, "Nenhuma assinatura ativa encontrada.", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag("restore_purchases_button"),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, Gold500)
                    ) {
                        Text("Restaurar Assinatura Existente", color = Gold500, fontWeight = FontWeight.SemiBold)
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }

            // DEV / TEST ENVIRONMENT BILLING SIMULATION (Remotely toggled and configured from Admin)
            val showTestEnv = remoteConfig.testEnvironmentEnabled && (
                BuildConfig.DEBUG || 
                AppConfig.isTestMode || 
                remoteConfig.testEnvironmentVisibleTo.equals("all", ignoreCase = true)
            )

            if (showTestEnv) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 24.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.25f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.tertiary.copy(alpha = 0.4f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.BugReport,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.tertiary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = remoteConfig.testEnvironmentTitle,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.tertiary
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = remoteConfig.testEnvironmentDescription,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    viewModel.devSimulateSubscription(
                                        action = "activate", 
                                        productId = selectedPlanId, 
                                        durationHours = remoteConfig.testEnvironmentDurationHours
                                    ) { ok, msg ->
                                        Toast.makeText(context, msg ?: "", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SagePrimary)
                            ) {
                                Text(remoteConfig.testEnvironmentActivateText, style = MaterialTheme.typography.labelSmall)
                            }

                            OutlinedButton(
                                onClick = {
                                    viewModel.devSimulateSubscription("expire", selectedPlanId) { ok, msg ->
                                        Toast.makeText(context, msg ?: "", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text(remoteConfig.testEnvironmentExpireText, style = MaterialTheme.typography.labelSmall)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedButton(
                            onClick = {
                                viewModel.devSimulateSubscription("reset") { ok, msg ->
                                    Toast.makeText(context, msg ?: "", Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(remoteConfig.testEnvironmentResetText, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }

    // Authentication Dialog for Anonymous Users
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
                    text = if (isRegisterMode) "Criar Conta para Assinar" else "Fazer Login para Assinar",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Vincule sua assinatura a um e-mail para restaurar em caso de troca de aparelho ou reinstalação.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    if (authErrorMessage != null) {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.errorContainer
                        ) {
                            Text(
                                text = authErrorMessage!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }

                    if (isRegisterMode) {
                        OutlinedTextField(
                            value = authName,
                            onValueChange = { authName = it },
                            label = { Text("Nome Completo") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    OutlinedTextField(
                        value = authEmail,
                        onValueChange = { authEmail = it },
                        label = { Text("E-mail") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = authPassword,
                        onValueChange = { authPassword = it },
                        label = { Text("Senha") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = if (passwordVisible) "Ocultar senha" else "Mostrar senha"
                                )
                            }
                        },
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth()
                    )

                    TextButton(
                        onClick = {
                            isRegisterMode = !isRegisterMode
                            authErrorMessage = null
                        },
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text(
                            text = if (isRegisterMode) "Já tem conta? Entrar" else "Não tem conta? Cadastrar",
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (authEmail.isBlank() || authPassword.isBlank()) {
                            authErrorMessage = "Preencha todos os campos obrigatórios."
                            return@Button
                        }
                        if (isRegisterMode && authName.isBlank()) {
                            authErrorMessage = "Preencha seu nome."
                            return@Button
                        }
                        authLoading = true
                        authErrorMessage = null
                        if (isRegisterMode) {
                            viewModel.registerUser(authName, authEmail, authPassword) { success, err ->
                                authLoading = false
                                if (success) {
                                    Toast.makeText(context, "Conta criada! Agora você pode assinar com segurança.", Toast.LENGTH_SHORT).show()
                                    showAuthDialog = false
                                } else {
                                    authErrorMessage = err ?: "Erro ao criar conta."
                                }
                            }
                        } else {
                            viewModel.loginUser(authEmail, authPassword) { success, err ->
                                authLoading = false
                                if (success) {
                                    Toast.makeText(context, "Login realizado com sucesso!", Toast.LENGTH_SHORT).show()
                                    showAuthDialog = false
                                } else {
                                    authErrorMessage = err ?: "Erro ao fazer login."
                                }
                            }
                        }
                    },
                    enabled = !authLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Gold500, contentColor = Navy900)
                ) {
                    if (authLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Navy900)
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(if (isRegisterMode) "Cadastrar e Continuar" else "Entrar e Continuar")
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
}

@Composable
private fun BenefitRow(
    icon: ImageVector,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(Gold500.copy(alpha = 0.15f), shape = RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Gold500,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun PlanCard(
    plan: PremiumPlan,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .testTag("plan_card_${plan.productId}"),
        shape = RoundedCornerShape(16.dp),
        color = if (isSelected) Gold500.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface,
        border = BorderStroke(
            if (isSelected) 2.dp else 1.dp,
            if (isSelected) Gold500 else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                RadioButton(
                    selected = isSelected,
                    onClick = onClick,
                    colors = RadioButtonDefaults.colors(selectedColor = Gold500)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = plan.title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        plan.discountBadge?.let { badge ->
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Gold500,
                                contentColor = Navy900
                            ) {
                                Text(
                                    text = badge,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = plan.priceFormatted,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Gold500
                )
                Text(
                    text = plan.period,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}


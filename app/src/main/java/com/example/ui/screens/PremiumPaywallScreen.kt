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
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.billing.PremiumPlan
import com.example.core.billing.PurchaseState
import com.example.ui.MainViewModel
import com.example.ui.theme.Gold500
import com.example.ui.theme.Navy800
import com.example.ui.theme.Navy900
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

    var selectedPlanId by remember { mutableStateOf("premium_yearly") }

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
                        scope.launch {
                            val restored = billingProvider.restorePurchases()
                            if (restored) {
                                Toast.makeText(context, "Compras restauradas com sucesso!", Toast.LENGTH_SHORT).show()
                                onClose()
                            } else {
                                Toast.makeText(context, "Nenhuma assinatura ativa encontrada.", Toast.LENGTH_SHORT).show()
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

            Spacer(modifier = Modifier.height(24.dp))

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

            Spacer(modifier = Modifier.height(28.dp))

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

            Spacer(modifier = Modifier.height(28.dp))

            // CTA Button
            Button(
                onClick = {
                    scope.launch {
                        viewModel.analyticsTracker.logPurchaseStarted(selectedPlanId)
                        val success = billingProvider.purchasePlan(selectedPlanId)
                        if (success) {
                            viewModel.analyticsTracker.logPurchaseCompleted(selectedPlanId)
                            Toast.makeText(context, "Plano Premium ativado com sucesso!", Toast.LENGTH_SHORT).show()
                            onClose()
                        } else {
                            Toast.makeText(context, "Não foi possível concluir a compra.", Toast.LENGTH_SHORT).show()
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
                    Text(
                        text = "Assinar e Desbloquear",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Cobrado via Google Play. Cancele a qualquer momento nas configurações da sua conta Google.",
                style = MaterialTheme.typography.labelSmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
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

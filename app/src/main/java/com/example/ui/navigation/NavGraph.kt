package com.example.ui.navigation

import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.example.ui.MainViewModel
import com.example.ui.components.TestModeBanner
import com.example.ui.screens.*
import com.example.ui.theme.ForestDark
import com.example.ui.theme.SageLight
import com.example.ui.theme.SagePrimary
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

sealed class Screen(val route: String, val title: String, val selectedIcon: ImageVector, val unselectedIcon: ImageVector) {
    object Home : Screen("home", "Início", Icons.Filled.Home, Icons.Outlined.Home)
    object Explore : Screen("explore", "Explorar", Icons.Filled.Explore, Icons.Outlined.Explore)
    object Search : Screen("search", "Buscar", Icons.Filled.Search, Icons.Outlined.Search)
    object Favorites : Screen("favorites", "Favoritos", Icons.Filled.Bookmark, Icons.Outlined.BookmarkBorder)
    object Profile : Screen("profile", "Perfil", Icons.Filled.Person, Icons.Outlined.Person)
}

val bottomNavItems = listOf(
    Screen.Home,
    Screen.Explore,
    Screen.Search,
    Screen.Favorites,
    Screen.Profile
)

@Composable
fun MainAppNavigation(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val navController = rememberNavController()
    val isOnboardingCompleted by viewModel.isOnboardingCompleted.collectAsState()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = bottomNavItems.any { it.route == currentRoute }

    Scaffold(
        topBar = {
            TestModeBanner(
                viewModel = viewModel,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
            )
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    tonalElevation = 0.dp,
                    modifier = Modifier.testTag("main_bottom_nav")
                ) {
                    bottomNavItems.forEach { screen ->
                        val selected = currentRoute == screen.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (selected) screen.selectedIcon else screen.unselectedIcon,
                                    contentDescription = screen.title
                                )
                            },
                            label = { Text(screen.title) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = SagePrimary,
                                selectedTextColor = SagePrimary,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                indicatorColor = SageLight
                            ),
                            modifier = Modifier.testTag("nav_item_${screen.route}")
                        )
                    }
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
        modifier = modifier
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = if (isOnboardingCompleted) Screen.Home.route else "onboarding",
            enterTransition = { fadeIn() },
            exitTransition = { fadeOut() },
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("onboarding") {
                OnboardingScreen(
                    onFinish = {
                        viewModel.completeOnboarding()
                        navController.navigate(Screen.Home.route) {
                            popUpTo("onboarding") { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Home.route) {
                HomeScreen(
                    viewModel = viewModel,
                    onNavigateToExplore = {
                        navController.navigate(Screen.Explore.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onNavigateToDevotionals = { devId ->
                        navController.navigate("devotional_detail/$devId")
                    },
                    onNavigateToPaywall = {
                        navController.navigate("paywall")
                    },
                    onNavigateToNotifications = {
                        navController.navigate("notifications")
                    },
                    onOpenVerseReader = { vId, vText, vRef ->
                        val encText = URLEncoder.encode(vText, StandardCharsets.UTF_8.toString())
                        val encRef = URLEncoder.encode(vRef, StandardCharsets.UTF_8.toString())
                        navController.navigate("verse_reader/$vId/$encText/$encRef")
                    }
                )
            }

            composable(Screen.Explore.route) {
                ExploreScreen(
                    viewModel = viewModel,
                    onOpenVerseReader = { vId, vText, vRef ->
                        val encText = URLEncoder.encode(vText, StandardCharsets.UTF_8.toString())
                        val encRef = URLEncoder.encode(vRef, StandardCharsets.UTF_8.toString())
                        navController.navigate("verse_reader/$vId/$encText/$encRef")
                    }
                )
            }

            composable(Screen.Search.route) {
                SearchScreen(
                    viewModel = viewModel,
                    onOpenVerseReader = { vId, vText, vRef ->
                        val encText = URLEncoder.encode(vText, StandardCharsets.UTF_8.toString())
                        val encRef = URLEncoder.encode(vRef, StandardCharsets.UTF_8.toString())
                        navController.navigate("verse_reader/$vId/$encText/$encRef")
                    }
                )
            }

            composable(Screen.Favorites.route) {
                FavoritesScreen(
                    viewModel = viewModel,
                    onOpenVerseReader = { vId, vText, vRef ->
                        val encText = URLEncoder.encode(vText, StandardCharsets.UTF_8.toString())
                        val encRef = URLEncoder.encode(vRef, StandardCharsets.UTF_8.toString())
                        navController.navigate("verse_reader/$vId/$encText/$encRef")
                    }
                )
            }

            composable(Screen.Profile.route) {
                SettingsProfileScreen(
                    viewModel = viewModel,
                    onNavigateToPaywall = { navController.navigate("paywall") },
                    onNavigateToHelpSupport = { navController.navigate("help_support") },
                    onNavigateToNotifications = { navController.navigate("notifications") }
                )
            }

            composable("notifications") {
                NotificationsScreen(
                    viewModel = viewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToHome = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                        }
                    },
                    onNavigateToDevotionals = { devId ->
                        navController.navigate("devotional_detail/$devId")
                    },
                    onNavigateToSupport = {
                        navController.navigate("help_support")
                    },
                    onNavigateToPaywall = {
                        navController.navigate("paywall")
                    }
                )
            }

            composable("help_support") {
                HelpSupportScreen(
                    viewModel = viewModel,
                    onNavigateToNewTicket = { navController.navigate("new_ticket") },
                    onNavigateToMyTickets = { navController.navigate("my_tickets") },
                    onBack = { navController.popBackStack() }
                )
            }

            composable("new_ticket") {
                NewTicketScreen(
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                    onTicketCreated = {
                        navController.popBackStack()
                        navController.navigate("my_tickets")
                    },
                    onViewTicket = { ticketId ->
                        navController.popBackStack()
                        navController.navigate("ticket_detail/$ticketId")
                    }
                )
            }

            composable("my_tickets") {
                MyTicketsScreen(
                    viewModel = viewModel,
                    onNavigateToDetail = { ticketId ->
                        navController.navigate("ticket_detail/$ticketId")
                    },
                    onNavigateToNewTicket = { navController.navigate("new_ticket") },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                route = "ticket_detail/{ticketId}",
                arguments = listOf(navArgument("ticketId") { type = NavType.StringType })
            ) { backStack ->
                val ticketId = backStack.arguments?.getString("ticketId") ?: ""
                TicketDetailScreen(
                    ticketId = ticketId,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                route = "devotional_detail/{devotionalId}",
                arguments = listOf(navArgument("devotionalId") { type = NavType.StringType })
            ) { backStack ->
                val devId = backStack.arguments?.getString("devotionalId") ?: ""
                DevotionalDetailScreen(
                    devotionalId = devId,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                route = "verse_reader/{verseId}/{verseText}/{reference}",
                arguments = listOf(
                    navArgument("verseId") { type = NavType.StringType },
                    navArgument("verseText") { type = NavType.StringType },
                    navArgument("reference") { type = NavType.StringType }
                )
            ) { backStack ->
                val vId = backStack.arguments?.getString("verseId") ?: ""
                val vText = URLDecoder.decode(backStack.arguments?.getString("verseText") ?: "", StandardCharsets.UTF_8.toString())
                val vRef = URLDecoder.decode(backStack.arguments?.getString("reference") ?: "", StandardCharsets.UTF_8.toString())

                VerseReaderScreen(
                    verseId = vId,
                    verseText = vText,
                    reference = vRef,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            composable("paywall") {
                PremiumPaywallScreen(
                    viewModel = viewModel,
                    onClose = { navController.popBackStack() }
                )
            }
        }
    }
}

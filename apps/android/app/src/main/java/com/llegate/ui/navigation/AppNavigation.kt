package com.llegate.ui.navigation

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.llegate.data.preferences.UserPreferencesRepository
import com.llegate.ui.screens.BookingScreen
import com.llegate.ui.screens.HomeScreen
import com.llegate.ui.screens.IntroVideoScreen
import com.llegate.ui.screens.LoginScreen
import com.llegate.ui.screens.OnboardingScreen
import com.llegate.ui.screens.ProfileScreen
import com.llegate.ui.screens.ReferralsScreen
import com.llegate.ui.screens.TripActiveScreen
import com.llegate.ui.screens.TripHistoryScreen
import com.llegate.ui.theme.NeonOrange500
import com.llegate.viewmodel.AppScreen
import com.llegate.viewmodel.LlegateViewModel
import kotlinx.coroutines.launch

object Screen {
    const val SplashIntro = "splash_intro"
    const val Onboarding = "onboarding"
    const val Login = "login"
    const val Home = "home"
}

@Composable
fun AppNavigation(viewModel: LlegateViewModel) {
    val navController = rememberNavController()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val userPreferences = remember { UserPreferencesRepository(context) }
    val isOnboardingCompleted by userPreferences.isOnboardingCompleted.collectAsState(initial = false)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    NavHost(
        navController = navController,
        startDestination = Screen.SplashIntro
    ) {
        composable(Screen.SplashIntro) {
            IntroVideoScreen(
                onIntroFinished = {
                    if (isOnboardingCompleted) {
                        navController.navigate(Screen.Home) {
                            popUpTo(Screen.SplashIntro) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Screen.Onboarding) {
                            popUpTo(Screen.SplashIntro) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable(Screen.Onboarding) {
            OnboardingScreen(
                onFinishOnboarding = {
                    scope.launch {
                        userPreferences.setOnboardingCompleted()
                        navController.navigate(Screen.Home) {
                            popUpTo(Screen.Onboarding) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable(Screen.Login) {
            if (uiState.revisandoSesion) {
                CargandoSesion()
            } else if (uiState.cuenta == null) {
                LoginScreen(uiState = uiState, viewModel = viewModel)
            } else {
                RedirectingTo(navController, Screen.Login, Screen.Home)
            }
        }

        composable(Screen.Home) {
            when {
                uiState.revisandoSesion -> CargandoSesion()
                uiState.cuenta == null -> RedirectingTo(navController, Screen.Home, Screen.Login)
                else -> AnimatedContent(
                    targetState = uiState.currentScreen,
                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                    label = "screen_transition"
                ) { screen ->
                    when (screen) {
                        AppScreen.HOME -> HomeScreen(uiState = uiState, viewModel = viewModel)
                        AppScreen.BOOKING_DETAILS -> BookingScreen(uiState = uiState, viewModel = viewModel)
                        AppScreen.TRIP_ACTIVE -> TripActiveScreen(uiState = uiState, viewModel = viewModel)
                        AppScreen.TRIP_HISTORY -> TripHistoryScreen(uiState = uiState, viewModel = viewModel)
                        AppScreen.PROFILE -> ProfileScreen(uiState = uiState, viewModel = viewModel)
                        AppScreen.REFERRALS -> ReferralsScreen(uiState = uiState, viewModel = viewModel)
                    }
                }
            }
        }
    }
}

@Composable
private fun RedirectingTo(
    navController: NavHostController,
    currentRoute: String,
    destination: String
) {
    LaunchedEffect(destination) {
        navController.navigate(destination) {
            popUpTo(currentRoute) { inclusive = true }
            launchSingleTop = true
        }
    }
    CargandoSesion()
}

@Composable
private fun CargandoSesion() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = NeonOrange500)
    }
}

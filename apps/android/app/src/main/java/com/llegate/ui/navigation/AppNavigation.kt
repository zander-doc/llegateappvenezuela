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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.llegate.data.preferences.UserPreferencesRepository
import com.llegate.model.LocationPoint
import com.llegate.ui.screens.BookingScreen
import com.llegate.ui.screens.HomeScreen
import com.llegate.ui.screens.IntroVideoScreen
import com.llegate.ui.screens.LoginScreen
import com.llegate.ui.screens.OnboardingScreen
import com.llegate.ui.screens.ProfileScreen
import com.llegate.ui.screens.ReferralsScreen
import com.llegate.ui.screens.RoleOnboardingScreen
import com.llegate.ui.screens.TripActiveScreen
import com.llegate.ui.screens.TripHistoryScreen
import com.llegate.ui.screens.WelcomeAuthScreen
import com.llegate.ui.theme.NeonOrange500
import com.llegate.model.TripStep
import com.llegate.viewmodel.AppScreen
import com.llegate.viewmodel.LlegateViewModel
import com.llegate.viewmodel.ServicioConductor
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

object Screen {
    const val SplashIntro = "splash_intro"
    const val Onboarding = "onboarding"
    const val WelcomeAuth = "welcome_auth"
    const val PhoneAuth = "phone_auth/{role}"
    const val RoleOnboarding = "role_onboarding/{role}"
    const val Home = "home"

    fun phoneAuth(role: String): String = "phone_auth/$role"
    fun roleOnboarding(role: String): String = "role_onboarding/$role"
}

@Composable
fun AppNavigation(viewModel: LlegateViewModel) {
    val navController = rememberNavController()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val userPreferences = remember { UserPreferencesRepository(context) }
    val isOnboardingCompleted by userPreferences.isOnboardingCompleted
        .map<Boolean, Boolean?> { it }
        .collectAsState(initial = null)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var introDone by rememberSaveable { mutableStateOf(false) }
    var bookingFlowState by remember {
        mutableStateOf<BookingFlowState>(BookingFlowState.SearchAddresses)
    }
    var isBookingFlowActive by remember { mutableStateOf(false) }
    var recentDestinations by remember { mutableStateOf(emptyList<LocationPoint>()) }

    LaunchedEffect(
        uiState.currentScreen,
        uiState.showFullMapExpanded,
        uiState.activeTrip?.currentStep,
        isBookingFlowActive
    ) {
        when {
            uiState.currentScreen == AppScreen.TRIP_ACTIVE &&
                uiState.activeTrip?.currentStep == TripStep.SEARCHING_DRIVER -> {
                bookingFlowState = BookingFlowState.SearchingDriver
            }
            uiState.currentScreen == AppScreen.HOME && uiState.showFullMapExpanded -> {
                if (bookingFlowState !is BookingFlowState.VehicleSelection) {
                    bookingFlowState = BookingFlowState.MapPinPicker
                }
            }
            uiState.currentScreen == AppScreen.HOME && !isBookingFlowActive -> {
                bookingFlowState = BookingFlowState.SearchAddresses
            }
            uiState.currentScreen == AppScreen.HOME &&
                bookingFlowState is BookingFlowState.SearchingDriver -> {
                bookingFlowState = BookingFlowState.SearchAddresses
                isBookingFlowActive = false
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = Screen.SplashIntro
    ) {
        composable(Screen.SplashIntro) {
            LaunchedEffect(introDone, isOnboardingCompleted) {
                val onboardingCompleted = isOnboardingCompleted
                if (introDone && onboardingCompleted != null) {
                    val destination = if (onboardingCompleted) Screen.WelcomeAuth else Screen.Onboarding
                    navController.navigate(destination) {
                        popUpTo(Screen.SplashIntro) { inclusive = true }
                    }
                }
            }

            IntroVideoScreen(onIntroFinished = { introDone = true })
        }

        composable(Screen.Onboarding) {
            OnboardingScreen(
                onFinishOnboarding = {
                    scope.launch {
                        userPreferences.setOnboardingCompleted()
                        navController.navigate(Screen.WelcomeAuth) {
                            popUpTo(Screen.Onboarding) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable(Screen.WelcomeAuth) {
            if (uiState.revisandoSesion) {
                CargandoSesion()
            } else if (uiState.cuenta == null) {
                WelcomeAuthScreen(
                    onCreateAccountClick = {
                        navController.navigate(Screen.phoneAuth(PASSENGER_ROLE))
                    },
                    onLoginClick = {
                        navController.navigate(Screen.phoneAuth(PASSENGER_ROLE))
                    },
                    onDriverRegisterClick = { selectedRole ->
                        navController.navigate(Screen.phoneAuth(selectedRole))
                    }
                )
            } else {
                RedirectingTo(navController, Screen.WelcomeAuth, Screen.Home)
            }
        }

        composable(
            route = Screen.PhoneAuth,
            arguments = listOf(navArgument("role") { type = NavType.StringType })
        ) { backStackEntry ->
            val role = backStackEntry.arguments?.getString("role").orEmpty()
            LaunchedEffect(role) {
                when (role) {
                    DRIVER_MOTO_ROLE -> viewModel.seleccionarServicioConductor(ServicioConductor.MOTO)
                    DRIVER_CAR_ROLE -> viewModel.seleccionarServicioConductor(ServicioConductor.CARRO)
                    DELIVERY_ROLE -> viewModel.seleccionarServicioConductor(ServicioConductor.DELIVERY)
                    else -> viewModel.continuarComoPasajero()
                }
            }

            when {
                uiState.revisandoSesion -> CargandoSesion()
                uiState.cuenta != null -> RedirectingAfterOtp(navController, role)
                else -> LoginScreen(uiState = uiState, viewModel = viewModel)
            }
        }

        composable(
            route = Screen.RoleOnboarding,
            arguments = listOf(navArgument("role") { type = NavType.StringType })
        ) { backStackEntry ->
            val role = backStackEntry.arguments?.getString("role").orEmpty()
            if (uiState.revisandoSesion) {
                CargandoSesion()
            } else if (uiState.cuenta == null) {
                RedirectingTo(navController, Screen.RoleOnboarding, Screen.WelcomeAuth)
            } else {
                RoleOnboardingScreen(
                    selectedRole = role,
                    onSubmitProfile = viewModel::registrarPerfilConductor,
                    onRegistrationComplete = {
                        navController.navigate(Screen.Home) {
                            popUpTo(Screen.RoleOnboarding) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                )
            }
        }

        composable(Screen.Home) {
            when {
                uiState.revisandoSesion -> CargandoSesion()
                uiState.cuenta == null -> RedirectingTo(navController, Screen.Home, Screen.WelcomeAuth)
                else -> AnimatedContent(
                    targetState = uiState.currentScreen,
                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                    label = "screen_transition"
                ) { screen ->
                    when (screen) {
                        AppScreen.HOME -> HomeScreen(
                            uiState = uiState,
                            viewModel = viewModel,
                            bookingFlowState = bookingFlowState,
                            onBookingFlowStateChange = { bookingFlowState = it },
                            isBookingFlowActive = isBookingFlowActive,
                            onBookingFlowActiveChange = { isBookingFlowActive = it },
                            recentDestinations = recentDestinations,
                            onRecentDestination = { point ->
                                recentDestinations = (listOf(point) + recentDestinations.filterNot {
                                    it.lat == point.lat && it.lng == point.lng
                                }).take(5)
                            }
                        )
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
private fun RedirectingAfterOtp(navController: NavHostController, role: String) {
    val destination = if (role in DRIVER_ROLES) Screen.roleOnboarding(role) else Screen.Home
    LaunchedEffect(destination) {
        navController.navigate(destination) {
            popUpTo(Screen.WelcomeAuth) { inclusive = true }
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

private const val PASSENGER_ROLE = "pasajero"
private const val DRIVER_MOTO_ROLE = "driver_moto"
private const val DRIVER_CAR_ROLE = "driver_car"
private const val DELIVERY_ROLE = "delivery"
private val DRIVER_ROLES = setOf(DRIVER_MOTO_ROLE, DRIVER_CAR_ROLE, DELIVERY_ROLE)

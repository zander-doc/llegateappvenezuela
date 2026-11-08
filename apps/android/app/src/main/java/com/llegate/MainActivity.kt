package com.llegate

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.llegate.data.SessionStore
import com.llegate.network.AuthRepository
import com.llegate.ui.screens.BookingScreen
import com.llegate.ui.screens.HomeScreen
import com.llegate.ui.screens.LoginScreen
import com.llegate.ui.screens.ProfileScreen
import com.llegate.ui.screens.ReferralsScreen
import com.llegate.ui.screens.TripActiveScreen
import com.llegate.ui.screens.TripHistoryScreen
import com.llegate.ui.theme.MyApplicationTheme
import com.llegate.ui.theme.NeonOrange500
import com.llegate.viewmodel.AppScreen
import com.llegate.viewmodel.LlegateViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: LlegateViewModel by viewModels { LlegateViewModelFactory(application) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                LlegateApp(viewModel = viewModel)
            }
        }
    }
}

class LlegateViewModelFactory(private val context: Context) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        LlegateViewModel(AuthRepository(store = SessionStore(context))) as T
}

@Composable
fun LlegateApp(viewModel: LlegateViewModel) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.statusMessage) {
        uiState.statusMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearStatusMessage()
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when {
                uiState.revisandoSesion -> CargandoSesion()
                uiState.cuenta == null -> LoginScreen(uiState = uiState, viewModel = viewModel)
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
private fun CargandoSesion() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = NeonOrange500)
    }
}

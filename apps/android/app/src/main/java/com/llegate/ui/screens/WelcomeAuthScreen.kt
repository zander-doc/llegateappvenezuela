package com.llegate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import com.llegate.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WelcomeAuthScreen(
    onCreateAccountClick: () -> Unit,
    onLoginClick: () -> Unit,
    onDriverRegisterClick: (String) -> Unit
) {
    var mostrarSelectorRoles by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07090C))
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.ic_llegate_welcome_logo),
            contentDescription = "Llégate - Tu carrera con panas",
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxWidth()
                .height(76.dp)
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "¡Hola, mi pana!",
            color = Color.White,
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Viaja o trabaja con Llégate. Verifica tu teléfono para continuar.",
            color = Color(0xFFB0B5BD),
            fontSize = 15.sp,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onCreateAccountClick,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFFFD200),
                contentColor = Color(0xFF07090C)
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
        ) {
            Text("Crear cuenta de pasajero", fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(10.dp))
        Button(
            onClick = onLoginClick,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF171B21),
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
        ) {
            Text("Ya tengo cuenta", fontWeight = FontWeight.SemiBold)
        }

        Spacer(modifier = Modifier.height(28.dp))
        Surface(
            onClick = { mostrarSelectorRoles = true },
            color = Color(0xFF11151A),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "¿Quieres trabajar con nosotros?",
                    color = Color.White,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Elige tu servicio para comenzar el registro.",
                    color = Color(0xFFB0B5BD),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Ver opciones",
                    color = Color(0xFFFFD200),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }

    if (mostrarSelectorRoles) {
        RoleSelectorBottomSheet(
            onDismissRequest = { mostrarSelectorRoles = false },
            onDriverRegisterClick = onDriverRegisterClick
        )
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun RoleSelectorBottomSheet(
    onDismissRequest: () -> Unit,
    onDriverRegisterClick: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val roles = remember {
        listOf(
            RoleOption(
                role = "driver_moto",
                title = "Piloto de Moto",
                description = "Mototaxi y traslados rápidos",
                icon = "🛵"
            ),
            RoleOption(
                role = "driver_car",
                title = "Conductor de Carro",
                description = "Servicio urbano y regional",
                icon = "🚗"
            ),
            RoleOption(
                role = "delivery",
                title = "Delivery / Encomiendas",
                description = "Gestión de paquetes y compras",
                icon = "📦"
            )
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        containerColor = Color(0xFF07090C),
        contentColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, bottom = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Elige tu rol",
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Selecciona el servicio con el que quieres comenzar.",
                color = Color(0xFFB0B5BD),
                fontSize = 14.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(20.dp))

            roles.forEach { role ->
                RoleOptionCard(
                    role = role,
                    onClick = {
                        scope.launch {
                            sheetState.hide()
                            onDismissRequest()
                            onDriverRegisterClick(role.role)
                        }
                    }
                ) {
                    Text(text = role.icon, fontSize = 28.sp)
                }
                if (role != roles.last()) {
                    Spacer(modifier = Modifier.height(10.dp))
                }
            }
        }
    }
}

private data class RoleOption(
    val role: String,
    val title: String,
    val description: String,
    val icon: String
)

@Composable
private fun RoleOptionCard(
    role: RoleOption,
    onClick: () -> Unit,
    iconContent: @Composable () -> Unit
) {
    Surface(
        onClick = onClick,
        color = Color(0xFF171B21),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(44.dp),
                contentAlignment = Alignment.Center
            ) {
                iconContent()
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = role.title,
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = role.description,
                    color = Color(0xFFB0B5BD),
                    fontSize = 13.sp
                )
            }
        }
    }
}

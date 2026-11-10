package com.llegate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

private val FondoAsfalto = Color(0xFF07090C)
private val AmarilloLlegate = Color(0xFFFFD200)
private val GrisCampo = Color(0xFF8A9099)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleOnboardingScreen(
    selectedRole: String,
    onSubmitProfile: suspend (Map<String, String>) -> Unit,
    onRegistrationComplete: () -> Unit
) {
    var cedula by rememberSaveable { mutableStateOf("") }
    var vehicleBrand by rememberSaveable { mutableStateOf("") }
    var vehicleModel by rememberSaveable { mutableStateOf("") }
    var vehiclePlate by rememberSaveable { mutableStateOf("") }
    var vehicleColor by rememberSaveable { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var submitting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val roleTitle = when (selectedRole) {
        DRIVER_MOTO_ROLE -> "Registro de Piloto (Moto)"
        DRIVER_CAR_ROLE -> "Registro de Conductor (Carro)"
        DELIVERY_ROLE -> "Registro de Delivery / Encomiendas"
        else -> "Registro de Socio"
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(FondoAsfalto)
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 32.dp)
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = roleTitle,
                color = AmarilloLlegate,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Completa tus datos legales y del vehículo para activar tu cuenta en la región.",
                color = GrisCampo,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
            )

            Text("Información Legal", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
            CampoRegistro(
                value = cedula,
                onValueChange = { cedula = it },
                label = "Cédula (ej. V-12345678)"
            )

            Spacer(modifier = Modifier.height(20.dp))
            Text("Datos del Vehículo", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                CampoRegistro(
                    value = vehicleBrand,
                    onValueChange = { vehicleBrand = it },
                    label = "Marca",
                    modifier = Modifier.weight(1f)
                )
                CampoRegistro(
                    value = vehicleModel,
                    onValueChange = { vehicleModel = it },
                    label = "Modelo",
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                CampoRegistro(
                    value = vehiclePlate,
                    onValueChange = { vehiclePlate = it },
                    label = "Placa",
                    modifier = Modifier.weight(1f)
                )
                CampoRegistro(
                    value = vehicleColor,
                    onValueChange = { vehicleColor = it },
                    label = "Color",
                    modifier = Modifier.weight(1f)
                )
            }

            errorMessage?.let { message ->
                Text(
                    text = message,
                    color = Color(0xFFFF7777),
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = {
                    val cedulaNormalizada = cedula.trim().uppercase().replace("-", "").replace(" ", "")
                    val placaNormalizada = vehiclePlate.trim().uppercase()
                    when {
                        selectedRole !in ROLES_SOCIO ->
                            errorMessage = "El rol seleccionado no permite completar este registro."
                        !cedulaNormalizada.matches(Regex("^[VE][0-9]{6,9}$")) ->
                            errorMessage = "Ingresa una cédula válida: V o E seguida de 6 a 9 dígitos."
                        !placaNormalizada.matches(Regex("^[A-Z0-9-]{5,10}$")) ->
                            errorMessage = "Ingresa una placa válida de 5 a 10 caracteres."
                        else -> {
                            errorMessage = null
                            submitting = true
                            scope.launch {
                                try {
                                    onSubmitProfile(
                                        mapOf(
                                            "role" to selectedRole,
                                            "cedula" to cedulaNormalizada,
                                            "brand" to vehicleBrand.trim(),
                                            "model" to vehicleModel.trim(),
                                            "plate" to placaNormalizada,
                                            "color" to vehicleColor.trim()
                                        )
                                    )
                                    onRegistrationComplete()
                                } catch (failure: CancellationException) {
                                    throw failure
                                } catch (failure: Exception) {
                                    errorMessage = failure.message
                                        ?: "No pudimos guardar tu registro. Intenta de nuevo."
                                } finally {
                                    submitting = false
                                }
                            }
                        }
                    }
                },
                enabled = !submitting,
                colors = ButtonDefaults.buttonColors(
                    containerColor = AmarilloLlegate,
                    contentColor = FondoAsfalto
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
            ) {
                if (submitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(22.dp),
                        color = FondoAsfalto,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Completar Registro",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun CampoRegistro(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = AmarilloLlegate,
            unfocusedBorderColor = GrisCampo,
            focusedLabelColor = AmarilloLlegate,
            unfocusedLabelColor = GrisCampo,
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White
        ),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier.fillMaxWidth()
    )
}

private const val DRIVER_MOTO_ROLE = "driver_moto"
private const val DRIVER_CAR_ROLE = "driver_car"
private const val DELIVERY_ROLE = "delivery"
private val ROLES_SOCIO = setOf(DRIVER_MOTO_ROLE, DRIVER_CAR_ROLE, DELIVERY_ROLE)

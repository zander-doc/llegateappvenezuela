package com.llegate.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.ui.components.LlegateOfficialBrandHeader
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone400
import com.llegate.util.enmascararTelefono
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel
import com.llegate.viewmodel.PasoInicio

@Composable
fun LoginScreen(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    Surface(color = Asphalt950, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 22.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            LlegateOfficialBrandHeader()
            Spacer(modifier = Modifier.height(18.dp))
            Text(
                text = if (uiState.pasoInicio == PasoInicio.DATOS) "Entra con tu número" else "Revisa tu WhatsApp",
                color = Stone100,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = if (uiState.pasoInicio == PasoInicio.DATOS)
                    "Sin contraseña: te enviamos un código de 6 dígitos."
                else
                    "Código enviado a ${enmascararTelefono(uiState.telefono)}. Dura unos minutos y sirve una sola vez.",
                color = Stone400,
                fontSize = 13.5.sp,
                modifier = Modifier.padding(top = 6.dp)
            )
            Spacer(modifier = Modifier.height(24.dp))

            if (uiState.pasoInicio == PasoInicio.DATOS) {
                PasoTelefono(uiState, viewModel)
            } else {
                PasoCodigo(uiState, viewModel)
            }
        }
    }
}

@Composable
private fun PasoTelefono(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Campo(
            valor = uiState.telefono,
            alCambiar = viewModel::onTelefono,
            etiqueta = "Teléfono venezolano",
            supporto = "Puedes escribir 0414 1234567 o +584141234567",
            tipoTeclado = KeyboardType.Phone,
            habilitado = !uiState.enviandoCodigo
        )
        Spacer(modifier = Modifier.height(12.dp))
        Campo(
            valor = uiState.nombre,
            alCambiar = viewModel::onNombre,
            etiqueta = "Nombre y apellido (opcional ahora)",
            supporto = "Con él te reconocerán los pilotos verificados",
            habilitado = !uiState.enviandoCodigo
        )
        FilaTerminos(uiState, viewModel)
        BotonPrimario(
            texto = "Enviar código",
            ocupado = uiState.enviandoCodigo,
            onClick = viewModel::enviarCodigo
        )
    }
}

@Composable
private fun PasoCodigo(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Campo(
            valor = uiState.codigo,
            alCambiar = viewModel::onCodigo,
            etiqueta = "Código de 6 dígitos",
            supporto = "Si no te llegó, revisa Spam o pide otro",
            tipoTeclado = KeyboardType.NumberPassword,
            habilitado = !uiState.verificandoCodigo
        )
        Spacer(modifier = Modifier.height(14.dp))
        BotonPrimario(
            texto = "Entrar",
            ocupado = uiState.verificandoCodigo,
            onClick = viewModel::verificarCodigo
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(
                onClick = viewModel::enviarCodigo,
                enabled = uiState.reenvioEn == 0 && !uiState.verificandoCodigo
            ) {
                Text(
                    text = if (uiState.reenvioEn > 0) "Reenviar en ${uiState.reenvioEn}s" else "Reenviar código",
                    fontSize = 13.sp
                )
            }
            TextButton(onClick = viewModel::volverAEditarTelefono, enabled = !uiState.verificandoCodigo) {
                Text(text = "Cambiar número", fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun Campo(
    valor: String,
    alCambiar: (String) -> Unit,
    etiqueta: String,
    supporto: String,
    habilitado: Boolean,
    tipoTeclado: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(
        value = valor,
        onValueChange = alCambiar,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(etiqueta, fontSize = 13.sp) },
        supportingText = { Text(supporto, fontSize = 11.5.sp, color = Stone400) },
        singleLine = true,
        enabled = habilitado,
        keyboardOptions = KeyboardOptions(keyboardType = tipoTeclado),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = NeonOrange500,
            unfocusedBorderColor = Asphalt800,
            focusedTextColor = Stone100,
            unfocusedTextColor = Stone100,
            cursorColor = NeonOrange500
        )
    )
}

@Composable
private fun FilaTerminos(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = uiState.aceptaTerminos,
            onCheckedChange = viewModel::setAceptaTerminos,
            enabled = !uiState.enviandoCodigo
        )
        Text(
            text = "Acepto los Términos de Uso y la Política de Privacidad de Llégate.",
            color = Stone400,
            fontSize = 12.sp,
            modifier = Modifier.padding(start = 4.dp)
        )
    }
}

@Composable
private fun BotonPrimario(texto: String, ocupado: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = !ocupado,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = NeonOrange500,
            contentColor = Asphalt950,
            disabledContainerColor = Asphalt800,
            disabledContentColor = Stone400
        )
    ) {
        if (ocupado) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                color = Emerald500,
                strokeWidth = 2.dp
            )
        } else {
            Text(text = texto, fontSize = 15.5.sp, fontWeight = FontWeight.Bold)
        }
    }
}

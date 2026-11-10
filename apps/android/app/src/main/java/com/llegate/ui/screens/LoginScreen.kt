package com.llegate.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.ui.components.LlegateOfficialBrandHeader
import com.llegate.ui.theme.Asphalt600
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.LlegateBody
import com.llegate.ui.theme.LlegateHeading
import com.llegate.ui.theme.LlegateMono
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingRed400
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.util.enmascararTelefono
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel
import com.llegate.viewmodel.PasoInicio
import com.llegate.viewmodel.ServicioConductor

/**
 * Ingreso por teléfono con código de WhatsApp — la identidad real de la cuenta.
 * Las dos hojas (número y código) se animan entre sí, el error se ve dentro de la
 * pantalla y el canal del código se lee tal como lo contesta `/auth/otp`.
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun LoginScreen(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    val sacudida = remember { Animatable(0f) }
    var mostrarRoles by remember { mutableStateOf(false) }
    LaunchedEffect(uiState.intentosInvalidos) {
        if (uiState.intentosInvalidos > 0) {
            listOf(-16f, 13f, -8f, 4f, 0f).forEach { punto ->
                sacudida.animateTo(punto, animationSpec = tween(48))
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        FondoPista()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(
                    start = 22.dp,
                    top = 30.dp,
                    end = 22.dp,
                    bottom = if (uiState.pasoInicio == PasoInicio.DATOS) 76.dp else 30.dp
                )
                .offset { IntOffset(sacudida.value.toInt(), 0) },
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            LlegateOfficialBrandHeader()
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = when {
                    uiState.pasoInicio == PasoInicio.CODIGO -> "Revisa tu\nWhatsApp"
                    uiState.servicioConductor != null -> "Únete como\nconductor"
                    else -> "Tu cola,\ntu tarifa"
                },
                color = Stone100,
                fontSize = 30.sp,
                lineHeight = 34.sp,
                fontWeight = FontWeight.Black,
                fontFamily = LlegateHeading,
                textAlign = TextAlign.Center
            )
            Text(
                text = when {
                    uiState.pasoInicio == PasoInicio.CODIGO ->
                        enmascararTelefono(uiState.telefono).let { "Código para $it. Sirve una sola vez." }
                    uiState.servicioConductor != null ->
                        "${uiState.servicioConductor.titulo}. Verifica tu teléfono para crear una cuenta de conductor."
                    else -> "Sin contraseña: te llega un código de 6 dígitos por WhatsApp."
                },
                color = Stone400,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp)
            )
            Spacer(modifier = Modifier.height(26.dp))

            AnimatedContent(
                targetState = uiState.pasoInicio,
                transitionSpec = {
                    val hacia = if (targetState == PasoInicio.CODIGO) 1 else -1
                    (slideInHorizontally(tween(260)) { w -> hacia * w } + fadeIn(tween(260)))
                        .togetherWith(slideOutHorizontally(tween(200)) { w -> -hacia * w } + fadeOut(tween(200)))
                },
                label = "pasoInicio"
            ) { paso ->
                when (paso) {
                    PasoInicio.DATOS -> PasoTelefono(uiState, viewModel)
                    PasoInicio.CODIGO -> PasoCodigo(uiState, viewModel)
                }
            }
        }

        if (uiState.pasoInicio == PasoInicio.DATOS) {
            TextButton(
                onClick = {
                    if (uiState.servicioConductor == null) {
                        mostrarRoles = true
                    } else {
                        viewModel.continuarComoPasajero()
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 12.dp)
            ) {
                Text(
                    text = if (uiState.servicioConductor == null) {
                        "Quiero ser conductor o piloto de Llégate"
                    } else {
                        "Continuar como pasajero"
                    },
                    color = RacingYellow500,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        if (mostrarRoles) {
            ModalBottomSheet(
                onDismissRequest = { mostrarRoles = false },
                containerColor = Asphalt950,
                contentColor = Stone100
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Únete a la familia Llégate",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Stone100
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Elige cómo quieres trabajar. El primer paso es verificar tu teléfono; " +
                            "el registro del vehículo y los documentos aún no se completa en esta pantalla.",
                        fontSize = 14.sp,
                        color = Stone400,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    OpcionServicioConductor(
                        titulo = ServicioConductor.MOTO.titulo,
                        descripcion = "Genera ingresos con traslados ágiles",
                        icono = "🛵",
                        onClick = {
                            mostrarRoles = false
                            viewModel.seleccionarServicioConductor(ServicioConductor.MOTO)
                        }
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OpcionServicioConductor(
                        titulo = ServicioConductor.CARRO.titulo,
                        descripcion = "Ofrece viajes urbanos seguros",
                        icono = "🚗",
                        onClick = {
                            mostrarRoles = false
                            viewModel.seleccionarServicioConductor(ServicioConductor.CARRO)
                        }
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OpcionServicioConductor(
                        titulo = ServicioConductor.DELIVERY.titulo,
                        descripcion = "Transporta paquetes y encomiendas",
                        icono = "📦",
                        onClick = {
                            mostrarRoles = false
                            viewModel.seleccionarServicioConductor(ServicioConductor.DELIVERY)
                        }
                    )
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }
}

@Composable
private fun OpcionServicioConductor(
    titulo: String,
    descripcion: String,
    icono: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = Asphalt900,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = icono, fontSize = 28.sp)
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = titulo, color = Stone100, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(text = descripcion, color = Stone400, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun PasoTelefono(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    Column(modifier = Modifier.fillMaxWidth()) {
        CampoPrefijo(
            valor = uiState.telefono,
            prefijo = "+58",
            placeholder = "414 123 4567",
            habilitado = !uiState.enviandoCodigo,
            alCambiar = viewModel::onTelefono
        )
        Text(
            text = "Sirve 0414 1234567 o +584141234567",
            fontSize = 11.sp,
            color = Stone400,
            modifier = Modifier.padding(top = 6.dp, start = 4.dp)
        )
        Spacer(modifier = Modifier.height(14.dp))
        CampoTexto(
            valor = uiState.nombre,
            placeholder = "Nombre y apellido (opcional)",
            habilitado = !uiState.enviandoCodigo,
            alCambiar = viewModel::onNombre
        )
        Spacer(modifier = Modifier.height(6.dp))
        FilaTerminos(uiState, viewModel)
        BotonNeon(
            texto = when {
                uiState.enviandoCodigo -> "Enviando…"
                uiState.servicioConductor != null -> "Continuar como conductor"
                else -> "Enviar código"
            },
            ocupado = uiState.enviandoCodigo,
            onClick = viewModel::enviarCodigo
        )
        Spacer(modifier = Modifier.height(18.dp))
        Beneficios()
        AvisoError(uiState.avisoInicio)
    }
}

@Composable
private fun PasoCodigo(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    var mostrarAyuda by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxWidth()) {
        uiState.mensajeCanal?.let { mensaje ->
            val entregado = uiState.canalOtp == "whatsapp" || uiState.canalOtp == "sms"
            val colorCanal = if (entregado) Emerald500 else RacingYellow500
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = colorCanal.copy(alpha = 0.10f),
                border = BorderStroke(1.dp, colorCanal.copy(alpha = 0.45f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (entregado) Icons.Default.CheckCircle else Icons.Default.Warning,
                        contentDescription = null,
                        tint = colorCanal,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = mensaje, fontSize = 11.5.sp, color = Stone300, fontFamily = LlegateBody)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        CasillasCodigo(
            valor = uiState.codigo,
            habilitado = !uiState.verificandoCodigo,
            alCambiar = viewModel::onCodigo,
            alTerminar = viewModel::verificarCodigo
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (uiState.reenvioEn > 0) {
                    val progreso = 1f - uiState.reenvioEn.toFloat() / LlegateViewModel.SEGUNDOS_REENVIO
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            progress = { progreso },
                            modifier = Modifier.size(18.dp),
                            color = RacingYellow500,
                            trackColor = Asphalt700,
                            strokeWidth = 2.dp
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "Reenviar en ${uiState.reenvioEn}s", fontSize = 12.sp, color = Stone400)
                } else {
                    Text(
                        text = "Reenviar código",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeonOrange400,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(enabled = !uiState.verificandoCodigo) { viewModel.enviarCodigo() }
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
            }
            Text(
                text = "Cambiar número",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = NeonOrange400,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(enabled = !uiState.verificandoCodigo) { viewModel.volverAEditarTelefono() }
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
        BotonNeon(
            texto = if (uiState.verificandoCodigo) "Entrando…" else "Entrar",
            ocupado = uiState.verificandoCodigo,
            onClick = viewModel::verificarCodigo
        )

        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = "¿No te llega el código?",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = Stone300,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable { mostrarAyuda = !mostrarAyuda }
                .padding(vertical = 4.dp)
        )
        AnimatedVisibility(
            visible = mostrarAyuda,
            enter = slideInVertically(tween(220)) { it } + fadeIn(tween(220)),
            exit = slideOutVertically(tween(160)) { it } + fadeOut(tween(160))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Asphalt900)
                    .border(1.dp, Asphalt700, RoundedCornerShape(12.dp))
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(7.dp)
            ) {
                Ayuda(
                    "El código llega por WhatsApp, no por SMS ni correo.",
                    "Revisa el chat de Llégate en WhatsApp (y la carpeta de mensajes de negocio)."
                )
                Ayuda(
                    "Confirma que el número tenga WhatsApp activo.",
                    "Si escribiste un número fijo o sin WhatsApp, Meta lo acepta pero no lo entrega."
                )
                Ayuda(
                    "La plantilla de autenticación está en revisión en Meta.",
                    "Mientras no esté aprobada, algunos números no reciben el código. Reenvía o escríbenos por WhatsApp."
                )
            }
        }

        AvisoError(uiState.avisoInicio)
    }
}

@Composable
private fun Ayuda(titulo: String, detalle: String) {
    Row(verticalAlignment = Alignment.Top) {
        Text(text = "•", color = NeonOrange400, fontSize = 12.sp, modifier = Modifier.padding(end = 6.dp, top = 1.dp))
        Column {
            Text(text = titulo, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Stone100)
            Text(text = detalle, fontSize = 11.sp, color = Stone400, lineHeight = 14.sp)
        }
    }
}

/** Las seis casillas: el texto real entra por un campo transparente encima. */
@Composable
private fun CasillasCodigo(
    valor: String,
    habilitado: Boolean,
    alCambiar: (String) -> Unit,
    alTerminar: () -> Unit
) {
    val foco = remember { FocusRequester() }
    var enfocado by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxWidth().height(58.dp)) {
        Row(
            modifier = Modifier.matchParentSize(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val activa = valor.length.coerceAtMost(5)
            for (i in 0..5) {
                val digito = valor.getOrNull(i)
                val esActiva = enfocado && i == activa
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Asphalt900,
                    border = BorderStroke(
                        1.5.dp,
                        when {
                            digito != null -> NeonOrange500
                            esActiva -> RacingYellow500
                            else -> Asphalt700
                        }
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .height(54.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = digito?.toString() ?: "",
                            fontFamily = LlegateMono,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100
                        )
                    }
                }
            }
        }
        BasicTextField(
            value = valor,
            onValueChange = { alCambiar(it) },
            modifier = Modifier
                .matchParentSize()
                .focusRequester(foco)
                .onFocusEvent { enfocado = it.isFocused },
            enabled = habilitado,
            singleLine = true,
            textStyle = TextStyle(color = Color.Transparent, fontSize = 20.sp),
            cursorBrush = SolidColor(Color.Transparent),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.NumberPassword,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = { alTerminar() })
        )
    }

    LaunchedEffect(Unit) {
        runCatching { foco.requestFocus() }
    }
}

@Composable
private fun CampoPrefijo(
    valor: String,
    prefijo: String,
    placeholder: String,
    habilitado: Boolean,
    alCambiar: (String) -> Unit
) {
    var enfocado by remember { mutableStateOf(false) }
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Asphalt900,
        border = BorderStroke(1.5.dp, if (enfocado) NeonOrange500 else Asphalt700),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = prefijo,
                fontFamily = LlegateMono,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = RacingYellow500
            )
            Box(
                modifier = Modifier
                    .padding(horizontal = 12.dp)
                    .width(1.dp)
                    .height(20.dp)
                    .background(Asphalt600)
            )
            BasicTextField(
                value = valor,
                onValueChange = alCambiar,
                modifier = Modifier
                    .weight(1f)
                    .onFocusEvent { enfocado = it.isFocused },
                enabled = habilitado,
                singleLine = true,
                textStyle = TextStyle(
                    fontFamily = LlegateMono,
                    fontSize = 16.sp,
                    color = Stone100
                ),
                cursorBrush = SolidColor(NeonOrange500),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                decorationBox = { campo ->
                    if (valor.isEmpty()) {
                        Box(contentAlignment = Alignment.CenterStart) {
                            Text(text = placeholder, fontSize = 15.sp, color = Stone400, fontFamily = LlegateMono)
                            campo()
                        }
                    } else campo()
                }
            )
        }
    }
}

@Composable
private fun CampoTexto(
    valor: String,
    placeholder: String,
    habilitado: Boolean,
    alCambiar: (String) -> Unit
) {
    var enfocado by remember { mutableStateOf(false) }
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Asphalt900,
        border = BorderStroke(1.5.dp, if (enfocado) NeonOrange500 else Asphalt700),
        modifier = Modifier.fillMaxWidth()
    ) {
        BasicTextField(
            value = valor,
            onValueChange = alCambiar,
            modifier = Modifier
                .fillMaxWidth()
                .onFocusEvent { enfocado = it.isFocused }
                .padding(horizontal = 14.dp, vertical = 16.dp),
            enabled = habilitado,
            singleLine = true,
            textStyle = TextStyle(fontSize = 15.sp, color = Stone100, fontFamily = LlegateBody),
            cursorBrush = SolidColor(NeonOrange500),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            decorationBox = { campo ->
                if (valor.isEmpty()) {
                    Box(contentAlignment = Alignment.CenterStart) {
                        Text(text = placeholder, fontSize = 15.sp, color = Stone400)
                        campo()
                    }
                } else campo()
            }
        )
    }
}

@Composable
private fun FilaTerminos(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable(enabled = !uiState.enviandoCodigo) { viewModel.setAceptaTerminos(!uiState.aceptaTerminos) }
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = uiState.aceptaTerminos,
            onCheckedChange = viewModel::setAceptaTerminos,
            enabled = !uiState.enviandoCodigo,
            colors = CheckboxDefaults.colors(
                checkedColor = RacingYellow500,
                checkmarkColor = Asphalt950,
                uncheckedColor = Stone400
            )
        )
        Text(
            text = "Acepto los Términos de Uso y la Política de Privacidad de Llégate.",
            color = Stone400,
            fontSize = 11.5.sp,
            lineHeight = 15.sp,
            modifier = Modifier.padding(start = 2.dp)
        )
    }
}

/** Botón de la marca: degradado amarillo→naranja con un brillo que barre y un pulso suave. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BotonNeon(texto: String, ocupado: Boolean, onClick: () -> Unit) {
    val transicion = rememberInfiniteTransition(label = "neon")
    val brillo by transicion.animateFloat(-0.5f, 1.5f, animationSpec = infiniteRepeatable(tween(2800, easing = LinearEasing)))

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 18.dp)
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
    ) {
        Surface(
            onClick = { if (!ocupado) onClick() },
            enabled = !ocupado,
            shape = RoundedCornerShape(16.dp),
            color = Color.Transparent,
            modifier = Modifier.matchParentSize()
        ) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.horizontalGradient(listOf(RacingYellow500, NeonOrange400, NeonOrange500))
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (ocupado) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Asphalt950,
                        strokeWidth = 2.5.dp
                    )
                } else {
                    Text(
                        text = texto,
                        fontSize = 15.5.sp,
                        fontWeight = FontWeight.Black,
                        color = Asphalt950
                    )
                }
            }
        }
        Canvas(modifier = Modifier.matchParentSize()) {
            val ancho = size.width * 0.45f
            drawRect(
                brush = Brush.horizontalGradient(
                    colors = listOf(Color.Transparent, Color.White.copy(alpha = 0.35f), Color.Transparent)
                ),
                topLeft = Offset(brillo * size.width - ancho / 2f, 0f),
                size = Size(ancho, size.height)
            )
        }
    }
}

@Composable
private fun Beneficios() {
    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
        Beneficio("Tarifa fija antes de subir: la misma que ves en la web.")
        Beneficio("Piloto verificado: nombre, placa y teléfono cuando acepta.")
        Beneficio("Saldo prepaga: recargas y pagas por viaje, sin mensualidad.")
    }
}

@Composable
private fun Beneficio(texto: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(18.dp)
                .clip(CircleShape)
                .background(Emerald500.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = Emerald500,
                modifier = Modifier.size(13.dp)
            )
        }
        Spacer(modifier = Modifier.width(9.dp))
        Text(text = texto, fontSize = 11.5.sp, color = Stone300, lineHeight = 15.sp)
    }
}

@Composable
private fun AvisoError(aviso: String?) {
    AnimatedVisibility(
        visible = aviso != null,
        enter = fadeIn(tween(180)) + slideInVertically(tween(180)) { it / 2 },
        exit = fadeOut(tween(140))
    ) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = RacingRed400.copy(alpha = 0.12f),
            border = BorderStroke(1.dp, RacingRed400.copy(alpha = 0.6f)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 14.dp)
        ) {
            Text(
                text = aviso.orEmpty(),
                fontSize = 12.sp,
                color = RacingRed400,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
            )
        }
    }
}

/** Fondo de asfalto con líneas de velocidad: la única animación decorativa de la hoja. */
@Composable
private fun FondoPista() {
    val transicion = rememberInfiniteTransition(label = "pista")
    val avance by transicion.animateFloat(0f, 1f, animationSpec = infiniteRepeatable(tween(3200, easing = LinearEasing)))

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Asphalt950, Color(0xFF0A0E16), Asphalt950)
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize().alpha(0.7f)) {
            val filas = listOf(0.14f to 0.55f, 0.24f to 0.35f, 0.78f to 0.45f)
            filas.forEachIndexed { indice, (fraccionY, opacidad) ->
                val x = avance * (size.width * 1.5f) - size.width * 0.4f - indice * 70f
                drawLine(
                    color = NeonOrange500.copy(alpha = opacidad),
                    start = Offset(x, size.height * fraccionY),
                    end = Offset(x + size.width * 0.5f, size.height * fraccionY),
                    strokeWidth = 3.dp.toPx(),
                    cap = StrokeCap.Round
                )
            }
        }
    }
}

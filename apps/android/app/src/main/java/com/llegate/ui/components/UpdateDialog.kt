package com.llegate.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone400

@Composable
fun UpdateDialog(
    versionName: String,
    isMandatory: Boolean,
    onUpdateClick: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = {
            if (!isMandatory) onDismiss()
        },
        containerColor = Asphalt950,
        title = {
            Text(
                text = "¡Nueva versión disponible!",
                color = Stone100,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Text(
                text = "Hemos lanzado la versión $versionName con mejoras de rendimiento y estabilidad para tus viajes en Maracay.",
                color = Stone400
            )
        },
        confirmButton = {
            Button(
                onClick = onUpdateClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = RacingYellow500,
                    contentColor = Color(0xFF07090C)
                )
            ) {
                Text("Actualizar ahora", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            if (!isMandatory) {
                TextButton(onClick = onDismiss) {
                    Text("Más tarde", color = Stone400)
                }
            }
        }
    )
}

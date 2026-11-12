package com.llegate.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import java.util.Locale

@Composable
fun MapDestinationCard(
    streetName: String,
    sectorName: String,
    distanceText: String,
    estimatedPriceUsd: Double,
    onConfirmClick: () -> Unit,
    confirmEnabled: Boolean = true,
    modifier: Modifier = Modifier
) {
    Surface(
        color = Asphalt900,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        shadowElevation = 16.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .background(Stone400.copy(alpha = 0.4f), RoundedCornerShape(2.dp))
                    .align(Alignment.CenterHorizontally)
            )

            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "DESTINO SELECCIONADO",
                color = RacingYellow500,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = streetName,
                color = Stone100,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = sectorName,
                color = Stone300,
                fontSize = 13.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = distanceText,
                color = Stone400.copy(alpha = 0.8f),
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (confirmEnabled) {
                        String.format(Locale.US, "\$%.2f", estimatedPriceUsd)
                    } else {
                        "Calculando tarifa…"
                    },
                    color = Stone100,
                    fontSize = if (confirmEnabled) 24.sp else 14.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Tarifa estimada",
                    color = Stone400,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            Button(
                onClick = onConfirmClick,
                enabled = confirmEnabled,
                colors = ButtonDefaults.buttonColors(
                    containerColor = RacingYellow500,
                    contentColor = Asphalt950,
                    disabledContainerColor = Asphalt700,
                    disabledContentColor = Stone400
                ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
            ) {
                Text(
                    text = "Continuar con este destino",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

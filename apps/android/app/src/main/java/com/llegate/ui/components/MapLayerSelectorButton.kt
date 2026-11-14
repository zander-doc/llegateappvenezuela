package com.llegate.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Stone100
import com.mapbox.maps.Style

enum class LlegateMapStyle(val label: String, val styleUri: String) {
    DARK("Oscuro", Style.DARK),
    STREETS("Calles", "mapbox://styles/mapbox/streets-v12"),
    SATELLITE("Satélite", "mapbox://styles/mapbox/satellite-streets-v12")
}

@Composable
fun MapLayerSelectorButton(
    currentMapStyle: LlegateMapStyle,
    onMapStyleSelected: (LlegateMapStyle) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    Surface(
        modifier = modifier.testTag("map_layer_selector_button"),
        shape = RoundedCornerShape(14.dp),
        color = Asphalt900.copy(alpha = 0.96f),
        border = BorderStroke(1.dp, Asphalt700),
        shadowElevation = 8.dp
    ) {
        TextButton(onClick = { expanded = true }) {
            Icon(
                imageVector = Icons.Filled.Layers,
                contentDescription = null,
                tint = Stone100
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(text = currentMapStyle.label, color = Stone100)
            Icon(
                imageVector = Icons.Filled.ArrowDropDown,
                contentDescription = "Elegir estilo del mapa",
                tint = Stone100
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                LlegateMapStyle.values().forEach { mapStyle ->
                    DropdownMenuItem(
                        text = { Text(mapStyle.label) },
                        onClick = {
                            expanded = false
                            onMapStyleSelected(mapStyle)
                        }
                    )
                }
            }
        }
    }
}

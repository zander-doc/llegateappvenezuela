package com.llegate.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun LlegateBottomNavigationBar(
    currentRoute: String,
    onTabSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val tabs = listOf(
        Triple("inicio", "Inicio", "🏠"),
        Triple("recargas", "Recargas", "💳"),
        Triple("historial", "Historial", "🕒"),
        Triple("perfil", "Perfil", "👤")
    )

    Surface(
        color = Color(0xFF0F131A),
        modifier = modifier
            .fillMaxWidth()
            .height(68.dp)
            .testTag("passenger_bottom_navigation"),
        shadowElevation = 12.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabs.forEach { (route, title, icon) ->
                val isSelected = currentRoute == route
                val contentColor = if (isSelected) Color(0xFFFFD200) else Color.Gray

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 4.dp)
                ) {
                    IconButton(
                        onClick = { onTabSelected(route) },
                        modifier = Modifier
                            .size(32.dp)
                            .testTag("passenger_tab_$route")
                    ) {
                        Text(text = icon, fontSize = 20.sp)
                    }
                    Text(
                        text = title,
                        color = contentColor,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }
    }
}

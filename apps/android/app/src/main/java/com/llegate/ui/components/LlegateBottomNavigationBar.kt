package com.llegate.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone400

sealed class BottomNavTab(
    val route: String,
    val title: String,
    val icon: ImageVector
) {
    data object Inicio : BottomNavTab("inicio", "Inicio", Icons.Default.Home)
    data object Recargas : BottomNavTab("recargas", "Recargas", Icons.Default.AccountBalanceWallet)
    data object Historial : BottomNavTab("historial", "Historial", Icons.Default.Schedule)
    data object Perfil : BottomNavTab("perfil", "Perfil", Icons.Default.Person)

    companion object {
        val all = listOf(Inicio, Recargas, Historial, Perfil)
    }
}

@Composable
fun LlegateBottomNavigationBar(
    currentRoute: String,
    onTabSelected: (BottomNavTab) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        modifier = modifier.testTag("passenger_bottom_navigation"),
        containerColor = Asphalt900
    ) {
        BottomNavTab.all.forEach { tab ->
            val selected = currentRoute == tab.route
            NavigationBarItem(
                selected = selected,
                onClick = { onTabSelected(tab) },
                icon = {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.title
                    )
                },
                label = {
                    Text(
                        text = tab.title,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = RacingYellow500,
                    selectedTextColor = RacingYellow500,
                    unselectedIconColor = Stone400,
                    unselectedTextColor = Stone400,
                    indicatorColor = RacingYellow500.copy(alpha = 0.12f)
                ),
                modifier = Modifier.testTag("passenger_tab_${tab.route}")
            )
        }
    }
}

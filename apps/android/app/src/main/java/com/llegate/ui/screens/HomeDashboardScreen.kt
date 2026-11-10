package com.llegate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAddAlt1
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.model.AutomotivePartner
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone400
import com.llegate.util.usd

@Composable
fun HomeDashboardScreen(
    userName: String,
    userBalance: Double,
    partners: List<AutomotivePartner>,
    showDriverMode: Boolean,
    onServiceClick: (String) -> Unit,
    onSearchClick: () -> Unit,
    onRechargeClick: () -> Unit,
    onAccountClick: () -> Unit,
    onDriverModeClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val firstName = userName.trim().substringBefore(' ').ifBlank { "mi pana" }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Asphalt950)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
    ) {
        Spacer(modifier = Modifier.height(20.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "¿Qué quieres hacer,\n$firstName?",
                    color = Stone100,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 28.sp
                )
                Text(
                    text = "Tu ciudad, más cerca.",
                    color = Stone400,
                    fontSize = 13.sp
                )
            }
            if (showDriverMode) {
                Surface(
                    onClick = onDriverModeClick,
                    shape = CircleShape,
                    color = Asphalt900,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier
                        .size(44.dp)
                        .testTag("dashboard_driver_mode")
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Cambiar a modo piloto",
                            tint = RacingYellow500,
                            modifier = Modifier.size(21.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Surface(
            onClick = onSearchClick,
            color = Asphalt900,
            shape = RoundedCornerShape(24.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Asphalt800),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("dashboard_search")
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 15.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = RacingYellow500,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "Recorre la ciudad",
                    color = Stone400,
                    fontSize = 15.sp,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "Abrir mapa",
                    color = RacingYellow500,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Nuestros servicios",
            color = Stone100,
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp
        )
        Spacer(modifier = Modifier.height(12.dp))

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ServiceGridCard(
                    title = "Viajes",
                    icon = Icons.Default.DirectionsCar,
                    modifier = Modifier.weight(1f),
                    testTag = "dashboard_service_car"
                ) { onServiceClick("car") }
                ServiceGridCard(
                    title = "Moto",
                    icon = Icons.Default.TwoWheeler,
                    modifier = Modifier.weight(1f),
                    testTag = "dashboard_service_moto"
                ) { onServiceClick("moto") }
                ServiceGridCard(
                    title = "Envíos",
                    icon = Icons.Default.Inventory2,
                    modifier = Modifier.weight(1f),
                    testTag = "dashboard_service_delivery"
                ) { onServiceClick("delivery") }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ServiceGridCard(
                    title = "Programar",
                    icon = Icons.Default.CalendarMonth,
                    modifier = Modifier.weight(1f),
                    testTag = "dashboard_service_schedule"
                ) { onServiceClick("schedule") }
                ServiceGridCard(
                    title = "Viaja otro",
                    icon = Icons.Default.PersonAddAlt1,
                    modifier = Modifier.weight(1f),
                    testTag = "dashboard_service_other"
                ) { onServiceClick("other") }
                ServiceGridCard(
                    title = "Ver todos",
                    icon = Icons.Default.Apps,
                    modifier = Modifier.weight(1f),
                    testTag = "dashboard_service_all"
                ) { onServiceClick("all") }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Surface(
            color = Asphalt900,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Asphalt800),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("dashboard_wallet")
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.AccountBalanceWallet,
                            contentDescription = null,
                            tint = Emerald500,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Saldo disponible", color = Stone400, fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = usd(userBalance),
                        color = Stone100,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp
                    )
                }
                Button(
                    onClick = onRechargeClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Emerald500,
                        contentColor = Asphalt950
                    ),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                    modifier = Modifier.testTag("dashboard_recharge")
                ) {
                    Text("Recargar", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Aliados comerciales",
                color = Stone100,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp
            )
            Surface(
                onClick = onAccountClick,
                color = Color.Transparent,
                modifier = Modifier.testTag("dashboard_account")
            ) {
                Text(
                    text = "Mi cuenta",
                    color = RacingYellow500,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(6.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            partners.forEachIndexed { index, partner ->
                AdBannerCard(partner = partner, accent = partnerAccents[index % partnerAccents.size])
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun ServiceGridCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    testTag: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = Asphalt900,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Asphalt800),
        modifier = modifier
            .height(96.dp)
            .testTag(testTag)
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = RacingYellow500, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = title,
                color = Stone100,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun AdBannerCard(partner: AutomotivePartner, accent: Color) {
    Surface(
        color = accent,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .width(240.dp)
            .height(140.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = partner.category.uppercase(),
                    color = Color.White.copy(alpha = 0.82f),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(5.dp))
                Text(
                    text = partner.name,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    lineHeight = 18.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(
                text = partner.benefit,
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = 11.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

private val partnerAccents = listOf(
    Color(0xFF0085FF),
    Color(0xFFBD3C35),
    Color(0xFF007D68)
)

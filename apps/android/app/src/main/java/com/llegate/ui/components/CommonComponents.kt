package com.llegate.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.R
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.CyanGlow
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.LlegateHeading
import com.llegate.ui.theme.LlegateMono
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingRed500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone400

@Composable
fun SpeedStripes(
    modifier: Modifier = Modifier,
    stripeWidth: Int = 14,
    stripeHeight: Int = 8
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(stripeWidth.dp)
                .height(stripeHeight.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(RacingYellow500)
        )
        Box(
            modifier = Modifier
                .width(stripeWidth.dp)
                .height(stripeHeight.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(NeonOrange500)
        )
        Box(
            modifier = Modifier
                .width(stripeWidth.dp)
                .height(stripeHeight.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(RacingRed500)
        )
    }
}

@Composable
fun LlegateOfficialBrandHeader(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Official Logo from user
        Image(
            painter = painterResource(id = R.drawable.ic_llegate_official_logo),
            contentDescription = "Llégate App - Tu Carrera con Panas",
            modifier = Modifier
                .height(72.dp)
                .fillMaxWidth(),
            contentScale = ContentScale.Fit
        )
    }
}

@Composable
fun VenezuelanPlateBadge(
    plate: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .border(2.dp, Color(0xFF334155), RoundedCornerShape(6.dp)),
        shape = RoundedCornerShape(6.dp),
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
        ) {
            // Venezuelan flag color bar at top
            Row(
                modifier = Modifier
                    .width(64.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(1.dp))
            ) {
                Box(modifier = Modifier.weight(1f).height(3.dp).background(Color(0xFFFFCC00)))
                Box(modifier = Modifier.weight(1f).height(3.dp).background(Color(0xFF00247D)))
                Box(modifier = Modifier.weight(1f).height(3.dp).background(Color(0xFFCF142B)))
            }
            Text(
                text = "VENEZUELA",
                fontSize = 7.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF475569),
                letterSpacing = 1.sp
            )
            Text(
                text = plate,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = LlegateMono,
                color = Color(0xFF0F172A),
                letterSpacing = 2.sp
            )
        }
    }
}

@Composable
fun DriverAvatarBadge(
    initials: String,
    isVerified: Boolean = true,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier, contentAlignment = Alignment.BottomEnd) {
        Box(
            modifier = Modifier
                .size(60.dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        listOf(NeonOrange400, NeonOrange500)
                    )
                )
                .border(2.dp, RacingYellow500, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = initials,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                fontFamily = LlegateHeading,
                color = Asphalt950
            )
        }
        if (isVerified) {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(Asphalt950)
                    .padding(1.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Conductor Verificado",
                    tint = Emerald500,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

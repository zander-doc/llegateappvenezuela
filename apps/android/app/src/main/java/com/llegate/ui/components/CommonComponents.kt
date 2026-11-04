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
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.ui.text.font.FontFamily
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
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF0F172A),
                letterSpacing = 2.sp
            )
        }
    }
}

@Composable
fun DriverAvatarBadge(
    initials: String,
    rating: Double,
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

@Composable
fun RouteCanvasMap(
    originTitle: String,
    destinationTitle: String,
    progressFraction: Float = 0f,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseRadius by infiniteTransition.animateFloat(
        initialValue = 6f,
        targetValue = 14f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseRadius"
    )

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(130.dp),
        shape = RoundedCornerShape(16.dp),
        color = Asphalt900,
        border = androidx.compose.foundation.BorderStroke(1.dp, Asphalt700),
        shadowElevation = 3.dp
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Canvas(modifier = Modifier.matchParentSize()) {
                val w = size.width
                val h = size.height

                // Draw map grid lines
                val gridColor = Asphalt800
                val strokeW = 1.dp.toPx()
                for (x in 0..(w.toInt()) step 50) {
                    drawLine(gridColor, Offset(x.toFloat(), 0f), Offset(x.toFloat(), h), strokeW)
                }
                for (y in 0..(h.toInt()) step 35) {
                    drawLine(gridColor, Offset(0f, y.toFloat()), Offset(w, y.toFloat()), strokeW)
                }

                val p0 = Offset(48f, h - 36f)
                val p1 = Offset(w * 0.45f, h * 0.35f)
                val p2 = Offset(w - 48f, 36f)

                val path = Path().apply {
                    moveTo(p0.x, p0.y)
                    quadraticTo(p1.x, p1.y, p2.x, p2.y)
                }

                // Background route path
                drawPath(
                    path = path,
                    color = Asphalt700,
                    style = Stroke(
                        width = 6.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(20f, 12f), 0f)
                    )
                )

                // Highlighted active path in Neon Orange
                drawPath(
                    path = path,
                    color = NeonOrange500,
                    style = Stroke(width = 4.dp.toPx())
                )

                // Origin marker (Emerald)
                drawCircle(
                    color = Emerald500.copy(alpha = 0.3f),
                    radius = 16f,
                    center = p0
                )
                drawCircle(
                    color = Emerald500,
                    radius = 8f,
                    center = p0
                )
                drawCircle(
                    color = Color.White,
                    radius = 3.5f,
                    center = p0
                )

                // Destination marker (Racing Yellow)
                drawCircle(
                    color = RacingYellow500.copy(alpha = 0.3f),
                    radius = 16f,
                    center = p2
                )
                drawCircle(
                    color = RacingYellow500,
                    radius = 8f,
                    center = p2
                )
                drawCircle(
                    color = Asphalt950,
                    radius = 3.5f,
                    center = p2
                )

                // Moving vehicle indicator along curve
                val t = progressFraction.coerceIn(0f, 1f)
                val invT = 1f - t
                val currentX = invT * invT * p0.x + 2 * invT * t * p1.x + t * t * p2.x
                val currentY = invT * invT * p0.y + 2 * invT * t * p1.y + t * t * p2.y
                val currentPos = Offset(currentX, currentY)

                drawCircle(
                    color = NeonOrange500.copy(alpha = 0.4f),
                    radius = pulseRadius * 1.5f,
                    center = currentPos
                )
                drawCircle(
                    color = RacingYellow500,
                    radius = 10f,
                    center = currentPos
                )
                drawCircle(
                    color = Asphalt950,
                    radius = 5f,
                    center = currentPos
                )
            }

            // Labels for Origin & Destination
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Surface(
                    color = Asphalt950.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Asphalt700)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(Emerald500)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = originTitle.take(18),
                            color = Stone100,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Surface(
                    color = Asphalt950.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Asphalt700)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(RacingYellow500)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = destinationTitle.take(18),
                            color = Stone100,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StarRatingBar(
    rating: Int,
    onRatingChanged: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (i in 1..5) {
            Surface(
                onClick = { onRatingChanged(i) },
                shape = CircleShape,
                color = Color.Transparent,
                modifier = Modifier.padding(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = "$i estrellas",
                    tint = if (i <= rating) RacingYellow500 else Asphalt700,
                    modifier = Modifier.size(36.dp)
                )
            }
        }
    }
}

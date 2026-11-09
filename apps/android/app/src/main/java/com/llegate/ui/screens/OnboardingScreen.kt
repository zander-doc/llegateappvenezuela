package com.llegate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import kotlinx.coroutines.launch

private data class OnboardingPage(
    val title: String,
    val description: String
)

private val onboardingPages = listOf(
    OnboardingPage(
        title = "Muévete por tu ciudad",
        description = "Encuentra una opción de transporte para llegar a donde quieras."
    ),
    OnboardingPage(
        title = "Elige tu viaje",
        description = "Revisa las alternativas disponibles y selecciona la que mejor te convenga."
    ),
    OnboardingPage(
        title = "Sigue tu recorrido",
        description = "Consulta los detalles de tu viaje mientras avanzas hacia tu destino."
    ),
    OnboardingPage(
        title = "Viaja con Llegate",
        description = "Todo está listo. Inicia sesión para comenzar a moverte."
    )
)

@Composable
fun OnboardingScreen(onFinishOnboarding: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { onboardingPages.size })
    val coroutineScope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Asphalt950)
    ) {
        TextButton(
            onClick = onFinishOnboarding,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
                .testTag("onboarding_skip"),
            colors = ButtonDefaults.textButtonColors(contentColor = RacingYellow500)
        ) {
            Text("Omitir")
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp, vertical = 84.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { page ->
                val onboardingPage = onboardingPages[page]
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(176.dp)
                            .clip(RoundedCornerShape(40.dp))
                            .background(Asphalt800),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "0${page + 1}",
                            color = RacingYellow500,
                            fontSize = 56.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Spacer(modifier = Modifier.height(36.dp))
                    Text(
                        text = onboardingPage.title,
                        color = Stone100,
                        fontSize = 28.sp,
                        lineHeight = 34.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = onboardingPage.description,
                        color = Stone300,
                        fontSize = 16.sp,
                        lineHeight = 24.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                onboardingPages.indices.forEach { index ->
                    Box(
                        modifier = Modifier
                            .size(if (index == pagerState.currentPage) 10.dp else 7.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == pagerState.currentPage) RacingYellow500
                                else Stone300.copy(alpha = 0.35f)
                            )
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = {
                    if (pagerState.currentPage == onboardingPages.lastIndex) {
                        onFinishOnboarding()
                    } else {
                        coroutineScope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .testTag(
                        if (pagerState.currentPage == onboardingPages.lastIndex) {
                            "onboarding_finish"
                        } else {
                            "onboarding_next"
                        }
                    ),
                colors = ButtonDefaults.buttonColors(
                    containerColor = NeonOrange500,
                    contentColor = Color.White
                )
            ) {
                Text(
                    text = if (pagerState.currentPage == onboardingPages.lastIndex) "Comenzar" else "Siguiente",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

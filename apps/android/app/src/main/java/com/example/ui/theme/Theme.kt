package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LlegateColorScheme = darkColorScheme(
    primary = NeonOrange500,
    onPrimary = Color.White,
    primaryContainer = NeonOrange500.copy(alpha = 0.2f),
    onPrimaryContainer = NeonOrange300,
    secondary = RacingYellow500,
    onSecondary = Asphalt950,
    secondaryContainer = RacingYellow500.copy(alpha = 0.15f),
    onSecondaryContainer = RacingYellow500,
    tertiary = Emerald500,
    onTertiary = Asphalt950,
    background = Asphalt950,
    onBackground = Stone100,
    surface = Asphalt900,
    onSurface = Stone100,
    surfaceVariant = Asphalt800,
    onSurfaceVariant = Stone400,
    outline = Asphalt700,
    outlineVariant = Asphalt600,
    error = RacingRed500,
    onError = Color.White
)

@Composable
fun MyApplicationTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LlegateColorScheme,
        typography = Typography,
        content = content
    )
}

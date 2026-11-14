package com.llegate.ui.screens

import android.net.Uri
import android.widget.VideoView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import java.util.concurrent.atomic.AtomicBoolean

private val AsphaltBackground = Color(0xFF07090C)
private val SkipYellow = Color(0xFFFFD200)

@Composable
fun IntroVideoScreen(onIntroFinished: () -> Unit) {
    val hasFinished = remember { AtomicBoolean(false) }
    val currentOnIntroFinished by rememberUpdatedState(onIntroFinished)

    fun finishIntro() {
        if (hasFinished.compareAndSet(false, true)) {
            currentOnIntroFinished()
        }
    }

    LaunchedEffect(Unit) {
        delay(5_000)
        finishIntro()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AsphaltBackground)
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                VideoView(context).apply {
                    setOnCompletionListener { finishIntro() }
                    setOnErrorListener { _, _, _ ->
                        finishIntro()
                        true
                    }
                    setOnPreparedListener { it.start() }
                    setVideoURI(
                        Uri.parse("android.resource://${context.packageName}/${com.llegate.R.raw.video_1}")
                    )
                }
            },
            onRelease = { videoView ->
                videoView.setOnCompletionListener(null)
                videoView.setOnErrorListener(null)
                videoView.setOnPreparedListener(null)
                videoView.stopPlayback()
            }
        )

        TextButton(
            onClick = ::finishIntro,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(
                    top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 8.dp,
                    end = 16.dp
                ),
            colors = ButtonDefaults.textButtonColors(contentColor = SkipYellow)
        ) {
            Text("Omitir")
        }
    }
}

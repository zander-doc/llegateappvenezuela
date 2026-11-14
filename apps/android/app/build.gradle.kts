import java.util.Properties

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.kotlin.compose)
}

val llegateVersionCode = (project.findProperty("LLEGATE_VERSION_CODE")
  ?: throw GradleException("Missing LLEGATE_VERSION_CODE in gradle.properties"))
  .toString()
  .toInt()
val llegateVersionName = project.findProperty("LLEGATE_VERSION_NAME")?.toString()
  ?: throw GradleException("Missing LLEGATE_VERSION_NAME in gradle.properties")
val localPropertiesText = providers.fileContents(
  rootProject.layout.projectDirectory.file("local.properties")
).asText.orNull
val localProperties = localPropertiesText?.let { text ->
  Properties().apply { text.reader().use { load(it) } }
}
val mapboxAccessToken = providers.gradleProperty("MAPBOX_ACCESS_TOKEN")
  .orElse(providers.environmentVariable("MAPBOX_ACCESS_TOKEN"))
  .orElse(localProperties?.getProperty("MAPBOX_ACCESS_TOKEN").orEmpty())

val keystorePropertiesText = providers.fileContents(
  rootProject.layout.projectDirectory.file("keystore.properties")
).asText.orNull
val keystoreProperties = keystorePropertiesText?.let { text ->
  Properties().apply {
    text.reader().use { load(it) }
  }
}

android {
  namespace = "com.llegate"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.llegate.app"
    minSdk = 24
    targetSdk = 36
    versionCode = llegateVersionCode
    versionName = llegateVersionName
    resValue("string", "mapbox_access_token", mapboxAccessToken.get())
  }

  if (keystoreProperties != null) {
    val requiredSigningProperties = listOf("storeFile", "storePassword", "keyAlias", "keyPassword")
    val missingSigningProperties = requiredSigningProperties.filter {
      keystoreProperties.getProperty(it).isNullOrBlank()
    }
    if (missingSigningProperties.isNotEmpty()) {
      throw GradleException(
        "Missing required value(s) in apps/android/keystore.properties: ${missingSigningProperties.joinToString()}"
      )
    }

    signingConfigs {
      create("llegate") {
        storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
        storePassword = keystoreProperties.getProperty("storePassword")
        keyAlias = keystoreProperties.getProperty("keyAlias")
        keyPassword = keystoreProperties.getProperty("keyPassword")
      }
    }
  }

  buildTypes {
    debug {
      if (keystoreProperties != null) {
        signingConfig = signingConfigs.getByName("llegate")
      }
    }
    release {
      isCrunchPngs = false
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      if (keystoreProperties != null) {
        signingConfig = signingConfigs.getByName("llegate")
      }
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
  }
  buildFeatures {
    compose = true
    buildConfig = true
    resValues = true
  }
  testOptions { unitTests { isIncludeAndroidResources = true } }
  dependenciesInfo {
    includeInApk = false
    includeInBundle = true
  }
}

if (keystoreProperties == null) {
  tasks.configureEach {
    if (name == "assembleRelease") {
      doFirst {
        logger.warn(
          "WARNING: apps/android/keystore.properties not found; release APK will be unsigned. " +
            "Debug APKs use the default local Android debug key."
        )
      }
    }
  }
}

dependencies {
  implementation(platform(libs.androidx.compose.bom))
  implementation(libs.androidx.activity.compose)
  implementation(libs.androidx.compose.material.icons.core)
  implementation(libs.androidx.compose.material.icons.extended)
  implementation(libs.androidx.compose.material3)
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.graphics)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.core.splashscreen)
  implementation(libs.androidx.datastore.preferences)
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.lifecycle.viewmodel.compose)
  implementation(libs.mapbox.maps)
  implementation(libs.androidx.navigation.compose)
  implementation(libs.kotlinx.coroutines.android)
  implementation(libs.kotlinx.coroutines.core)
  implementation(libs.okhttp)
  implementation(libs.play.services.location)
  testImplementation(libs.androidx.test.core)
  testImplementation(libs.junit)
  testImplementation(libs.robolectric)
  debugImplementation(libs.androidx.compose.ui.tooling)
}

# ── kotlinx.serialization ─────────────────────────────────────────────────────
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

-keep,includedescriptorclasses class org.unfpa.otg.**$$serializer { *; }
-keepclassmembers class org.unfpa.otg.** {
    *** Companion;
}
-keepclasseswithmembers class org.unfpa.otg.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# ── MediaPipe / LiteRT-LM ─────────────────────────────────────────────────────
-dontwarn com.google.auto.value.**
-keep class com.google.mediapipe.** { *; }
-keep class com.google.mlkit.** { *; }

# ── Apache POI / log4j annotations ───────────────────────────────────────────
-dontwarn aQute.bnd.**
-dontwarn org.apache.logging.log4j.**
-dontwarn org.slf4j.**
-keep class org.apache.poi.** { *; }
-keep class org.openxmlformats.** { *; }

# ── iText PDF ─────────────────────────────────────────────────────────────────
-dontwarn com.itextpdf.**
-keep class com.itextpdf.** { *; }

# ── OkHttp / Ktor ─────────────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# ── Room ──────────────────────────────────────────────────────────────────────
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keepclassmembers @androidx.room.Entity class * { *; }

# ── Supabase / Ktor ───────────────────────────────────────────────────────────
-dontwarn io.github.jan.tennert.**
-dontwarn io.ktor.**
-keep class io.ktor.** { *; }

# ── ONNX Runtime ──────────────────────────────────────────────────────────────
-dontwarn ai.onnxruntime.**
-keep class ai.onnxruntime.** { *; }

# ── General Android ───────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends androidx.work.Worker
-keep public class * extends androidx.work.CoroutineWorker

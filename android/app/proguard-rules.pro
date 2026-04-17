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

# ── Java AWT (not on Android — used by Apache POI desktop features) ───────────
-dontwarn java.awt.**
-dontwarn javax.swing.**
-dontwarn javax.imageio.**
-dontwarn sun.misc.**
-dontwarn sun.awt.**

# ── MediaPipe / LiteRT-LM ─────────────────────────────────────────────────────
-dontwarn com.google.auto.value.**
-dontwarn com.google.mediapipe.framework.image.**
-dontwarn com.google.protobuf.Internal$ProtoMethodMayReturnNull
-dontwarn com.google.protobuf.Internal$ProtoNonnullApi
-dontwarn com.google.protobuf.ProtoField
-dontwarn com.google.protobuf.ProtoPresenceBits
-dontwarn com.google.protobuf.ProtoPresenceCheckedField
-keep class com.google.mediapipe.** { *; }
-keep class com.google.mlkit.** { *; }

# ── PDFBox / rototor (Apache POI PDF helpers — desktop only) ──────────────────
-dontwarn de.rototor.**
-dontwarn org.apache.pdfbox.**
-dontwarn org.apache.fontbox.**
-dontwarn org.apache.batik.**

# ── Apache POI / log4j / XML signing (desktop-only, not on Android) ───────────
-dontwarn aQute.bnd.**
-dontwarn org.apache.logging.log4j.**
-dontwarn org.slf4j.**
-dontwarn javax.xml.crypto.**
-dontwarn javax.xml.dsig.**
-dontwarn org.apache.jcp.**
-dontwarn org.apache.xmlbeans.**
-dontwarn org.openxmlformats.**
-dontwarn com.microsoft.schemas.**
-dontwarn schemaorg_apache_xmlbeans.**
-dontwarn org.etsi.**
-dontwarn org.w3.**
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

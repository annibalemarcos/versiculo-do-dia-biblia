package com.example.core.sharing

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Shader
import android.graphics.Typeface
import android.net.Uri
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

object ShareManager {

    fun shareText(context: Context, verseText: String, reference: String) {
        val shareBody = "“$verseText”\n— $reference\n\nCompartilhado via Versículo do Dia"
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Versículo do Dia: $reference")
            putExtra(Intent.EXTRA_TEXT, shareBody)
        }
        context.startActivity(Intent.createChooser(intent, "Compartilhar Versículo"))
    }

    fun shareVerseImage(
        context: Context,
        verseText: String,
        reference: String,
        isStoryFormat: Boolean = false // 1:1 or 9:16 format
    ) {
        try {
            val width = if (isStoryFormat) 1080 else 1080
            val height = if (isStoryFormat) 1920 else 1080

            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)

            // Draw Spiritual Deep Gradient Background
            val bgPaint = Paint().apply {
                shader = LinearGradient(
                    0f, 0f, width.toFloat(), height.toFloat(),
                    intArrayOf(Color.parseColor("#0F172A"), Color.parseColor("#1E293B"), Color.parseColor("#090D16")),
                    null,
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), bgPaint)

            // Draw Decorative Gold Accents
            val goldPaint = Paint().apply {
                color = Color.parseColor("#D4AF37")
                isAntiAlias = true
                style = Paint.Style.STROKE
                strokeWidth = 4f
            }
            val margin = 80f
            canvas.drawRoundRect(margin, margin, width - margin, height - margin, 40f, 40f, goldPaint)

            // Draw App Branding Top Header
            val headerPaint = TextPaint().apply {
                color = Color.parseColor("#E2E8F0")
                textSize = 36f
                isAntiAlias = true
                typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
                textAlign = Paint.Align.CENTER
            }
            val headerY = if (isStoryFormat) 320f else 220f
            canvas.drawText("VERSÍCULO DO DIA", width / 2f, headerY, headerPaint)

            val linePaint = Paint().apply {
                color = Color.parseColor("#D4AF37")
                strokeWidth = 3f
                isAntiAlias = true
            }
            canvas.drawLine(width / 2f - 80f, headerY + 30f, width / 2f + 80f, headerY + 30f, linePaint)

            // Draw Verse Text Body
            val textPaint = TextPaint().apply {
                color = Color.parseColor("#FFFFFF")
                textSize = if (isStoryFormat) 54f else 48f
                isAntiAlias = true
                typeface = Typeface.create(Typeface.SERIF, Typeface.ITALIC)
            }

            val textWidth = (width - 240).toInt()
            val fullText = "“$verseText”"
            val staticLayout = StaticLayout.Builder.obtain(fullText, 0, fullText.length, textPaint, textWidth)
                .setAlignment(Layout.Alignment.ALIGN_CENTER)
                .setLineSpacing(16f, 1f)
                .build()

            val textHeight = staticLayout.height
            val centerY = if (isStoryFormat) (height / 2f) - (textHeight / 2f) else (height / 2f) - (textHeight / 2f) - 40f

            canvas.save()
            canvas.translate(120f, centerY)
            staticLayout.draw(canvas)
            canvas.restore()

            // Draw Reference
            val refPaint = TextPaint().apply {
                color = Color.parseColor("#F1C40F")
                textSize = 42f
                isAntiAlias = true
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                textAlign = Paint.Align.CENTER
            }
            val refY = centerY + textHeight + 80f
            canvas.drawText("— $reference —", width / 2f, refY, refPaint)

            // Draw Footer
            val footerPaint = TextPaint().apply {
                color = Color.parseColor("#94A3B8")
                textSize = 28f
                isAntiAlias = true
                textAlign = Paint.Align.CENTER
            }
            val footerY = if (isStoryFormat) height - 160f else height - 120f
            canvas.drawText("Bíblia Sagrada • NVI", width / 2f, footerY, footerPaint)

            // Save image to cache directory
            val cacheDir = File(context.cacheDir, "images")
            if (!cacheDir.exists()) cacheDir.mkdirs()
            val file = File(cacheDir, "versiculo_${System.currentTimeMillis()}.png")
            val outputStream = FileOutputStream(file)
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
            outputStream.flush()
            outputStream.close()

            // Get content Uri via FileProvider
            val contentUri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, "“$verseText” — $reference")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Compartilhar Imagem do Versículo"))
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback to text share
            shareText(context, verseText, reference)
        }
    }
}

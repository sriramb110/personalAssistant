package expo.modules.anbunotifications

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.speech.tts.TextToSpeech
import android.telecom.TelecomManager
import java.security.MessageDigest
import java.lang.ref.WeakReference
import org.json.JSONObject

class AnbuNotificationService : NotificationListenerService(), TextToSpeech.OnInitListener {
  private var engine: TextToSpeech? = null
  private var speechReady = false
  private val main = Handler(Looper.getMainLooper())
  private val priority = Regex("urgent|important|deadline|meeting|approval|call me|payment|அவசரம்|முக்கியம்|அழைக்க|கூட்டம்", RegexOption.IGNORE_CASE)

  companion object {
    private var current = WeakReference<AnbuNotificationService>(null)
    fun stopCurrentSpeech() { current.get()?.let { service -> service.main.post { service.engine?.stop() } } }
  }

  override fun onCreate() {
    super.onCreate()
    current = WeakReference(this)
    engine = TextToSpeech(this, this)
  }

  override fun onInit(status: Int) { speechReady = status == TextToSpeech.SUCCESS }

  override fun onDestroy() {
    engine?.stop(); engine?.shutdown(); speechReady = false
    super.onDestroy()
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    try {
      val prefs = NotificationStore.preferences(this)
      val pkg = sbn.packageName
      val defaultSms = Telephony.Sms.getDefaultSmsPackage(this)
      val defaultPhone = (getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)?.defaultDialerPackage
      val source = when {
        pkg in listOf("com.whatsapp", "com.whatsapp.w4b") && prefs.getBoolean("whatsapp", false) -> "WhatsApp"
        pkg == defaultSms && prefs.getBoolean("sms", false) -> "SMS"
        pkg == defaultPhone && prefs.getBoolean("calls", false) -> "Call alert"
        else -> return
      }
      val notification = sbn.notification
      if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
      val isCall = notification.category in listOf(Notification.CATEGORY_CALL, "missed_call")
      if (source == "Call alert" && !isCall) return
      if (source != "Call alert" && (isCall || notification.flags and Notification.FLAG_ONGOING_EVENT != 0)) return
      val extras = notification.extras
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
      @Suppress("DEPRECATION")
      val bundles = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
      val messages = bundles?.let { Notification.MessagingStyle.Message.getMessagesFromBundleArray(it) }.orEmpty()
      val sourceKey = when (source) { "WhatsApp" -> "whatsapp"; "SMS" -> "sms"; else -> "calls" }
      val enabledSince = prefs.getLong("${sourceKey}Since", System.currentTimeMillis())
      // A posted update can bundle several new messages. Capture each once, not old history.
      val candidates = if (messages.isNotEmpty()) messages.filter { it.timestamp >= enabledSince }.map { message ->
        @Suppress("DEPRECATION")
        val sender = message.sender?.toString()?.trim()?.takeIf { it.isNotBlank() } ?: title
        Triple(sender, message.text?.toString()?.trim().orEmpty(), message.timestamp)
      } else listOf(Triple(title, (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim().orEmpty(), notification.`when`.takeIf { it > 0 } ?: sbn.postTime))
      for ((sender, text, timestamp) in candidates) {
      if (text.isBlank()) continue
      val fingerprint = "$pkg|${sbn.key}|$sender|$text|$timestamp"
      val hash = MessageDigest.getInstance("SHA-256").digest(fingerprint.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it.toInt() and 0xff) }
      val id = "notification-$hash"
      val important = source == "Call alert" || priority.containsMatchIn(text)
      val item = JSONObject().put("id", id).put("source", "$source · ${sender.ifBlank { "Unknown sender" }}")
        .put("text", text).put("important", important).put("receivedAt", timestamp).put("origin", "notification")
      if (NotificationStore.enqueue(this, item) && prefs.getBoolean("readAloud", false) && (!prefs.getBoolean("importantOnly", true) || important)) {
        main.post { speakNotification(source, sender, text, id) }
      }
      }
    } catch (_: Exception) {
      NotificationStore.preferences(this).edit().putString("lastError", "A notification could not be captured. Check Anbu notification settings.").apply()
    }
  }

  private fun speakNotification(source: String, sender: String, text: String, id: String) {
    val prefs = NotificationStore.preferences(this)
    if (!prefs.getBoolean("readAloud", false)) return
    val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val notifications = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    // Do not interrupt calls or override silent / Do Not Disturb settings.
    if (audio.mode != AudioManager.MODE_NORMAL || audio.ringerMode != AudioManager.RINGER_MODE_NORMAL || notifications.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL) return
    val tts = engine
    if (!speechReady || tts == null) {
      prefs.edit().putString("lastError", "Text-to-speech is not ready. The notification is saved; you can listen in the inbox.").apply()
      return
    }
    val language = if (prefs.getBoolean("tamil", false)) "ta" else "en"
    val voice = tts.voices?.firstOrNull { it.locale.language == language && !it.isNetworkConnectionRequired }
    if (voice == null) {
      prefs.edit().putString("lastError", "Install an offline Tamil / English voice in Android text-to-speech settings.").apply()
      return
    }
    tts.voice = voice
    val result = tts.speak("$source. $sender. $text".take(TextToSpeech.getMaxSpeechInputLength()), TextToSpeech.QUEUE_ADD, null, id)
    if (result == TextToSpeech.ERROR) prefs.edit().putString("lastError", "Voice playback failed. Your notification is saved.").apply()
  }
}

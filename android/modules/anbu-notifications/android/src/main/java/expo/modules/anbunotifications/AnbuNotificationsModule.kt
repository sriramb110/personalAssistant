package expo.modules.anbunotifications

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class AnbuNotificationsModule : Module() {
  private fun context() = requireNotNull(appContext.reactContext) { "Android context is unavailable" }
  override fun definition() = ModuleDefinition {
    Name("AnbuNotifications")
    AsyncFunction("getStatus") {
      val ctx = context()
      val target = ComponentName(ctx, AnbuNotificationService::class.java)
      val allowed = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners") ?: ""
      val granted = allowed.split(':').any { ComponentName.unflattenFromString(it) == target }
      val prefs = NotificationStore.preferences(ctx)
      JSONObject().put("granted", granted).put("whatsapp", prefs.getBoolean("whatsapp", false))
        .put("sms", prefs.getBoolean("sms", false)).put("calls", prefs.getBoolean("calls", false))
        .put("readAloud", prefs.getBoolean("readAloud", false)).put("tamil", prefs.getBoolean("tamil", false))
        .put("importantOnly", prefs.getBoolean("importantOnly", true))
        .put("lastCapturedAt", prefs.getLong("lastCapturedAt", 0)).put("lastError", prefs.getString("lastError", "")).toString()
    }
    AsyncFunction("openAccessSettings") {
      context().startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("configure") { raw: String ->
      val settings = JSONObject(raw)
      val prefs = NotificationStore.preferences(context())
      val editor = prefs.edit()
      for (key in listOf("whatsapp", "sms", "calls", "readAloud", "tamil", "importantOnly")) {
        if (settings.has(key)) {
          val enabled = settings.getBoolean(key)
          editor.putBoolean(key, enabled)
          if (key in listOf("whatsapp", "sms", "calls") && enabled && !prefs.getBoolean(key, false)) {
            editor.putLong("${key}Since", System.currentTimeMillis())
          }
        }
      }
      editor.putString("lastError", "")
      check(editor.commit()) { "Could not save notification preferences" }
      AnbuNotificationService.stopCurrentSpeech()
    }
    AsyncFunction("peek") { NotificationStore.peek(context()) }
    AsyncFunction("acknowledge") { ids: List<String> -> NotificationStore.acknowledge(context(), ids) }
    AsyncFunction("openPhone") {
      context().startActivity(Intent(Intent.ACTION_DIAL).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }
}

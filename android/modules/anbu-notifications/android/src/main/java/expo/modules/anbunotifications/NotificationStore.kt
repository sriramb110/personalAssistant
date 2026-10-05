package expo.modules.anbunotifications

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Private durable queue. Acknowledge only after the app saves messages successfully. */
object NotificationStore {
  private const val PREFS = "anbu.notifications"
  fun preferences(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized fun enqueue(context: Context, item: JSONObject): Boolean {
    val prefs = preferences(context)
    val seen = JSONArray(prefs.getString("seen", "[]"))
    val id = item.getString("id")
    for (index in 0 until seen.length()) if (seen.optString(index) == id) return false
    val queue = JSONArray(prefs.getString("queue", "[]"))
    // Do not silently drop an unread message when storage is full.
    if (queue.length() >= 2000) {
      prefs.edit().putString("lastError", "Notification queue is full. Open Anbu to import saved notifications.").apply()
      return false
    }
    queue.put(item)
    seen.put(id)
    val retained = JSONArray()
    for (index in maxOf(0, seen.length() - 4000) until seen.length()) retained.put(seen.get(index))
    val saved = prefs.edit().putString("queue", queue.toString()).putString("seen", retained.toString()).putLong("lastCapturedAt", System.currentTimeMillis()).commit()
    return saved
  }

  @Synchronized fun peek(context: Context): String = preferences(context).getString("queue", "[]") ?: "[]"

  @Synchronized fun acknowledge(context: Context, ids: List<String>) {
    val prefs = preferences(context)
    val queue = JSONArray(prefs.getString("queue", "[]"))
    val remaining = JSONArray()
    val imported = ids.toSet()
    for (index in 0 until queue.length()) {
      val item = queue.getJSONObject(index)
      if (item.getString("id") !in imported) remaining.put(item)
    }
    check(prefs.edit().putString("queue", remaining.toString()).commit()) { "Could not acknowledge notifications" }
  }
}

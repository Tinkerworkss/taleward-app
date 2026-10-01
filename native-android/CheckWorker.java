package app.taleward;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Benachrichtigungen ohne Push-Dienst: Android startet diese Prüfung etwa alle 30 Minuten (nur mit Netz). Sie fragt
 * jeden angemeldeten Server nach der Kampagnenliste und meldet, was seit der letzten Prüfung dazugekommen ist –
 * neue Recaps, Kommentare, Terminabstimmungen, für die SL Kapitel zum Prüfen und mitgebrachte Welt.
 * Texte, Server und Einstellungen liefert die App (NotifierPlugin.configure); hier stehen keine Texte.
 */
public class CheckWorker extends Worker {

    static final String PREFS = "taleward.notifier";
    static final String WORK = "taleward-check";
    static final String CHANNEL = "taleward-news";

    public CheckWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void saveConfig(Context c, String json) {
        prefs(c).edit().putString("config", json).apply();
    }

    /** Regelmäßige Prüfung ein- oder ausschalten */
    static void schedule(Context c, boolean enabled) {
        WorkManager wm = WorkManager.getInstance(c);
        if (!enabled) {
            wm.cancelUniqueWork(WORK);
            return;
        }
        Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(CheckWorker.class, 30, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build();
        wm.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, req);
    }

    /** Einmal sofort prüfen (zum Ausprobieren) */
    static void runOnce(Context c) {
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(CheckWorker.class).build();
        WorkManager.getInstance(c).enqueueUniqueWork(WORK + "-now", ExistingWorkPolicy.REPLACE, req);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        try {
            SharedPreferences p = prefs(c);
            JSONObject cfg = new JSONObject(p.getString("config", "{}"));
            if (!cfg.optBoolean("enabled", false)) return Result.success();
            JSONObject kinds = cfg.optJSONObject("kinds");
            if (kinds == null) kinds = new JSONObject();
            JSONObject texts = cfg.optJSONObject("texts");
            if (texts == null) texts = new JSONObject();
            JSONArray servers = cfg.optJSONArray("servers");
            if (servers == null) servers = new JSONArray();

            // Beim allerersten Lauf nur den Stand merken, nichts melden
            boolean first = !p.contains("state");
            JSONObject before = new JSONObject(p.getString("state", "{}"));
            JSONObject next = new JSONObject();

            for (int i = 0; i < servers.length(); i++) {
                JSONObject s = servers.getJSONObject(i);
                String connId = s.optString("id");
                JSONArray list;
                try {
                    list = fetchCampaigns(s, cfg.optString("lang", "de"), cfg.optString("appVersion", ""));
                } catch (Exception e) {
                    // Server nicht erreichbar oder Anmeldung abgelaufen: alten Stand behalten
                    Iterator<String> keys = before.keys();
                    while (keys.hasNext()) {
                        String k = keys.next();
                        if (k.startsWith(connId + ":")) next.put(k, before.get(k));
                    }
                    continue;
                }
                for (int j = 0; j < list.length(); j++) {
                    JSONObject camp = list.getJSONObject(j);
                    if (!camp.isNull("archivedAt") && camp.optString("archivedAt").length() > 0) continue;
                    String id = camp.optString("id");
                    String key = connId + ":" + id;
                    JSONObject unread = camp.optJSONObject("unread");
                    JSONObject now = new JSONObject();
                    now.put("r", unread != null ? unread.optInt("recaps", 0) : 0);
                    now.put("c", unread != null ? unread.optInt("comments", 0) : 0);
                    now.put("p", camp.optBoolean("datePollNeedsMyVote", false) ? 1 : 0);
                    now.put("v", camp.optInt("pendingReviewCount", 0));
                    now.put("b", camp.optInt("openCharacterProposals", 0));
                    next.put(key, now);

                    JSONObject old = before.optJSONObject(key);
                    if (first || old == null) continue;
                    String title = camp.optString("title", "");
                    String base = "/v/" + connId + "/k/" + id;
                    int notifyId = key.hashCode();
                    if (kinds.optBoolean("recaps", true) && now.getInt("r") > old.optInt("r", 0)) {
                        int n = now.getInt("r");
                        notify(c, texts, notifyId + 1, fmt(texts, n == 1 ? "recapOne" : "recapMany", title, n),
                            fmt(texts, "recapBody", title, n), base + "/chronik");
                    }
                    if (kinds.optBoolean("comments", true) && now.getInt("c") > old.optInt("c", 0)) {
                        int n = now.getInt("c");
                        notify(c, texts, notifyId + 2, fmt(texts, n == 1 ? "commentOne" : "commentMany", title, n),
                            fmt(texts, "commentBody", title, n), base + "/chronik");
                    }
                    if (kinds.optBoolean("polls", true) && now.getInt("p") == 1 && old.optInt("p", 0) == 0) {
                        notify(c, texts, notifyId + 3, fmt(texts, "poll", title, 1), fmt(texts, "pollBody", title, 1),
                            base + "/termin");
                    }
                    if (kinds.optBoolean("gm", true) && now.getInt("v") > old.optInt("v", 0)) {
                        int n = now.getInt("v");
                        notify(c, texts, notifyId + 4, fmt(texts, "review", title, n), fmt(texts, "reviewBody", title, n), base);
                    }
                    if (kinds.optBoolean("gm", true) && now.getInt("b") > old.optInt("b", 0)) {
                        int n = now.getInt("b");
                        notify(c, texts, notifyId + 5, fmt(texts, "brought", title, n), fmt(texts, "broughtBody", title, n),
                            base + "/mitgebracht");
                    }
                }
            }
            p.edit().putString("state", next.toString()).apply();
        } catch (Exception e) {
            // Nie abstürzen – beim nächsten Mal wieder
        }
        return Result.success();
    }

    private static JSONArray fetchCampaigns(JSONObject server, String lang, String appVersion) throws Exception {
        URL url = new URL(server.getString("baseUrl") + "/campaigns");
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        try {
            con.setConnectTimeout(15000);
            con.setReadTimeout(20000);
            con.setRequestProperty("Accept", "application/json");
            con.setRequestProperty("Accept-Language", lang);
            String token = server.optString("token", "");
            if (token.length() > 0) con.setRequestProperty("Authorization", "Bearer " + token);
            if (server.optBoolean("sendAppVersion", false) && appVersion.length() > 0) {
                con.setRequestProperty("X-Taleward-App", appVersion);
            }
            if (con.getResponseCode() != 200) throw new Exception("HTTP " + con.getResponseCode());
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            return new JSONArray(sb.toString());
        } finally {
            con.disconnect();
        }
    }

    private static String fmt(JSONObject texts, String key, String title, int n) {
        return texts.optString(key, key).replace("{title}", title).replace("{n}", String.valueOf(n));
    }

    private static void notify(Context c, JSONObject texts, int id, String title, String body, String path) {
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, texts.optString("channel", "Taleward"),
                NotificationManager.IMPORTANCE_DEFAULT);
            nm.createNotificationChannel(ch);
        }
        String uri;
        try {
            uri = "taleward://oeffnen?pfad=" + URLEncoder.encode(path, "UTF-8");
        } catch (Exception e) {
            uri = "taleward://oeffnen";
        }
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(c.getPackageName())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, id, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        int icon = c.getResources().getIdentifier("taleward_icon_monochrome", "drawable", c.getPackageName());
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(icon != 0 ? icon : android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pi);
        nm.notify(id, b.build());
    }
}

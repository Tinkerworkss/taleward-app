package app.taleward;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Updates der APK-Fassung über den eigenen Server (nicht in der Play-Store-Fassung):
 * APK herunterladen, SHA-256 prüfen, System-Installationsdialog öffnen. Still installieren geht bei
 * Sideload nicht – ein Tipp auf „Installieren“ bleibt. Android prüft selbst Signatur und versionCode.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String DIR = "updates";
    private static final String FILE = "taleward-update.apk";

    private File apkFile() {
        File dir = new File(getContext().getCacheDir(), DIR);
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, FILE);
    }

    private boolean canInstall() {
        return Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject r = new JSObject();
        r.put("value", canInstall());
        call.resolve(r);
    }

    /** Einstellung „Unbekannte Apps installieren“ für Taleward öffnen */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 26) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    /** Heruntergeladene APK dem System zur Installation geben */
    @PluginMethod
    public void install(PluginCall call) {
        File f = apkFile();
        if (!f.exists()) { call.reject("Keine heruntergeladene Fassung gefunden.", "no_download"); return; }
        if (!canInstall()) { JSObject r = new JSObject(); r.put("status", "needs_permission"); call.resolve(r); return; }
        startInstall(f);
        JSObject r = new JSObject();
        r.put("status", "installing");
        call.resolve(r);
    }

    /** url, optional sha256 (hex) und sizeBytes; meldet „progress“ {loaded, total} */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        final String sha = call.getString("sha256");
        final Long size = call.getLong("sizeBytes");
        if (url == null) { call.reject("Download-Adresse fehlt.", "no_url"); return; }
        call.setKeepAlive(true);
        new Thread(() -> {
            File f = apkFile();
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(url).openConnection();
                con.setConnectTimeout(20000);
                con.setReadTimeout(60000);
                con.setInstanceFollowRedirects(true);
                int code = con.getResponseCode();
                if (code != 200) throw new Exception("HTTP " + code);
                long total = size != null ? size : con.getContentLengthLong();
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                long loaded = 0, lastReport = 0;
                try (InputStream in = con.getInputStream(); FileOutputStream out = new FileOutputStream(f)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        md.update(buf, 0, n);
                        loaded += n;
                        if (loaded - lastReport > 256 * 1024) {
                            lastReport = loaded;
                            JSObject p = new JSObject();
                            p.put("loaded", loaded);
                            p.put("total", total);
                            notifyListeners("progress", p);
                        }
                    }
                }
                if (sha != null && !sha.isEmpty()) {
                    StringBuilder hex = new StringBuilder();
                    for (byte b : md.digest()) hex.append(String.format("%02x", b));
                    if (!hex.toString().equalsIgnoreCase(sha)) {
                        f.delete();
                        call.reject("Die heruntergeladene Datei ist beschädigt (Prüfsumme stimmt nicht).", "checksum_mismatch");
                        call.setKeepAlive(false);
                        return;
                    }
                }
                JSObject r = new JSObject();
                if (!canInstall()) {
                    r.put("status", "needs_permission");
                } else {
                    startInstall(f);
                    r.put("status", "installing");
                }
                call.resolve(r);
            } catch (Exception e) {
                f.delete();
                call.reject("Download fehlgeschlagen: " + e.getMessage(), "download_failed");
            } finally {
                if (con != null) con.disconnect();
                call.setKeepAlive(false);
            }
        }).start();
    }

    private void startInstall(File f) {
        Context ctx = getContext();
        Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", f);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
    }
}

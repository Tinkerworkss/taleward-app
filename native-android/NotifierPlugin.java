package app.taleward;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Benachrichtigungen einrichten: Einstellungen und Server für CheckWorker ablegen, Erlaubnis einholen. */
@CapacitorPlugin(
    name = "Notifier",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class NotifierPlugin extends Plugin {

    @PluginMethod
    public void configure(PluginCall call) {
        JSObject data = call.getData();
        CheckWorker.saveConfig(getContext(), data.toString());
        CheckWorker.schedule(getContext(), data.optBoolean("enabled", false));
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(result());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "afterPermission");
            return;
        }
        call.resolve(result());
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        call.resolve(result());
    }

    @PluginMethod
    public void checkNow(PluginCall call) {
        CheckWorker.runOnce(getContext());
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i;
        if (Build.VERSION.SDK_INT >= 26) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    private JSObject result() {
        JSObject r = new JSObject();
        r.put("granted", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        return r;
    }
}

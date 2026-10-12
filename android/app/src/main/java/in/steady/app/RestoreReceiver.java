package in.steady.app;
import android.content.*;
public final class RestoreReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i) {
        String action=i.getAction();
        if(!Intent.ACTION_BOOT_COMPLETED.equals(action)&&!Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            &&!Intent.ACTION_TIME_CHANGED.equals(action)&&!Intent.ACTION_TIMEZONE_CHANGED.equals(action))return;
        Alarms.daily(c);Alarms.focus(c);
    }
}

package in.steady.app;
import android.content.*;
import android.os.SystemClock;
final class DeviceStore {
    static SharedPreferences get(Context c) { return c.getSharedPreferences("device-tools", Context.MODE_PRIVATE); }
    static void save(SharedPreferences.Editor editor) {
        if (!editor.commit()) throw new IllegalStateException("Could not save on this device. Try again.");
    }
    static long remaining(Context c) {
        SharedPreferences p=get(c);
        return TimeRules.timerRemaining(p.getBoolean("running",false),p.getLong("remaining",0),p.getInt("boot",-1),boot(c),p.getLong("elapsedEnd",0),SystemClock.elapsedRealtime(),p.getLong("wallEnd",0),System.currentTimeMillis());
    }
    static int boot(Context c) { return android.provider.Settings.Global.getInt(c.getContentResolver(), "boot_count", -1); }
    static void run(Context c, long remaining) {
        save(get(c).edit().putBoolean("running",true).putBoolean("finished",false)
            .putLong("remaining",remaining).putLong("elapsedEnd",SystemClock.elapsedRealtime()+remaining)
            .putLong("wallEnd",System.currentTimeMillis()+remaining).putInt("boot",boot(c)));
        Alarms.focus(c);
    }
    static void pause(Context c) {
        long left=remaining(c);
        save(get(c).edit().putBoolean("running",false).putLong("remaining",left).putBoolean("finished",left==0));
        Alarms.cancel(c,Alarms.FOCUS);
    }
    static boolean finish(Context c) {
        if(!get(c).getBoolean("running",false)||remaining(c)>0)return false;
        save(get(c).edit().putBoolean("running",false).putLong("remaining",0).putBoolean("finished",true));
        Alarms.cancel(c,Alarms.FOCUS);
        Alarms.notify(c,Alarms.FOCUS,"Focus timer finished","Take a moment to stretch. No points were added by this timer.");
        return true;
    }
    static void reset(Context c) {
        save(get(c).edit().putBoolean("running",false).putLong("remaining",0).putBoolean("finished",false));
        Alarms.cancel(c,Alarms.FOCUS);
        c.getSystemService(android.app.NotificationManager.class).cancel(Alarms.FOCUS);
    }
}

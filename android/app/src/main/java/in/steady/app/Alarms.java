package in.steady.app;
import android.app.*;
import android.content.*;
import android.os.SystemClock;
final class Alarms {
    static final int FOCUS=100, DAILY=200;
    static PendingIntent intent(Context c,int id) {
        return PendingIntent.getBroadcast(c,id,new Intent(c,AlarmReceiver.class).setAction("steady."+id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void cancel(Context c,int id) { c.getSystemService(AlarmManager.class).cancel(intent(c,id)); }
    static void daily(Context c) {
        var p=DeviceStore.get(c);
        if(!p.getBoolean("reminder",false)){cancel(c,DAILY);return;}
        long at=TimeRules.nextReminder(System.currentTimeMillis(),p.getInt("hour",9),p.getInt("minute",0));
        c.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,intent(c,DAILY));
    }
    static void focus(Context c) {
        if(!DeviceStore.get(c).getBoolean("running",false)){cancel(c,FOCUS);return;}
        c.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,SystemClock.elapsedRealtime()+Math.max(1,DeviceStore.remaining(c)),intent(c,FOCUS));
    }
    static void notify(Context c,int id,String title,String text) {
        NotificationManager manager=c.getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel("steady-reminders","Steady reminders",NotificationManager.IMPORTANCE_DEFAULT));
        if(android.os.Build.VERSION.SDK_INT>=33 && c.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
        PendingIntent open=PendingIntent.getActivity(c,id,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        manager.notify(id,new Notification.Builder(c,"steady-reminders").setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title).setContentText(text).setContentIntent(open).setAutoCancel(true)
            .setVisibility(Notification.VISIBILITY_PRIVATE).build());
    }
}

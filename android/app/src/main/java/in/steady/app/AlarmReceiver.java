package in.steady.app;
import android.content.*;
public final class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent intent) {
        if(("steady."+Alarms.DAILY).equals(intent.getAction())) {
            if(!DeviceStore.get(c).getBoolean("reminder",false))return;
            Alarms.notify(c,Alarms.DAILY,"A small step today","Open Steady and choose your next task.");Alarms.daily(c);
        } else if(("steady."+Alarms.FOCUS).equals(intent.getAction())) {
            if(!DeviceStore.finish(c))Alarms.focus(c);
        }
    }
}

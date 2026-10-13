package in.steady.app;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.widget.*;
import androidx.browser.customtabs.CustomTabsIntent;
import java.util.Locale;

/** Device tools only; browser-backed workspace preserves existing secure auth/storage. */
public final class MainActivity extends Activity {
    private final Handler handler=new Handler(Looper.getMainLooper());
    private TextView clock, reminderStatus, permissions;
    private Button primary, pause, cancel;
    private EditText minutes;
    private final Runnable tick=new Runnable(){public void run(){if(safe(()->refresh()))handler.postDelayed(this,1000);}};
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Alarms.channel(this);
        ScrollView scroll=new ScrollView(this);
        LinearLayout body=new LinearLayout(this);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(dp(24),dp(24),dp(24),dp(32));
        scroll.addView(body);scroll.setFillViewport(true);setContentView(scroll);
        scroll.setOnApplyWindowInsetsListener((view,insets)->{
            if(Build.VERSION.SDK_INT>=30){var b=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());view.setPadding(b.left,b.top,b.right,b.bottom);}
            else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        text(body,"STEADY · ANDROID PREVIEW",12,false);
        text(body,"One day at a time.",30,true);
        text(body,"Your workspace, with helpful tools for this phone.",16,false);
        button(body,"Open Steady",()->open(false));
        button(body,"Open offline tasks",()->open(true));
        text(body,"Sign in online first. In Steady, choose Offline → Enable offline on this device. Use the same browser for setup and offline use. A browser toolbar may remain visible.",14,false);
        space(body);
        text(body,"Focus timer",23,true);
        text(body,"A device-only timer. It does not log a session or award points in Steady. Use the workspace’s focus tracker for rewarded sessions.",14,false);
        TextView durationLabel=text(body,"Duration in minutes (1–180)",16,true);
        minutes=new EditText(this);minutes.setId(R.id.focus_minutes);durationLabel.setLabelFor(minutes.getId());minutes.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);minutes.setText(state==null?"25":state.getString("duration","25"));minutes.setSelectAllOnFocus(true);body.addView(minutes);
        clock=text(body,"25:00",42,true);clock.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_NONE);
        primary=button(body,"Start focus",()->{
            long left=DeviceStore.remaining(this);
            if(left<=0){try{left=TimeRules.duration(Integer.parseInt(minutes.getText().toString()));}catch(IllegalArgumentException e){minutes.setError("Enter 1 to 180 minutes.");return;}}
            DeviceStore.run(this,left);refresh();
        });
        pause=button(body,"Pause",()->{DeviceStore.pause(this);refresh();});
        cancel=button(body,"Cancel timer",()->new AlertDialog.Builder(this).setTitle("Cancel this timer?").setMessage("Only the timer on this phone will be cleared. Your work and points are unchanged.").setNegativeButton("Keep timer",null).setPositiveButton("Cancel timer",(d,w)->safe(()->{DeviceStore.reset(this);refresh();})).show());
        text(body,"The countdown survives closing the app. Android may delay its notification while asleep or saving battery.",14,false);
        space(body);
        text(body,"Daily reminder",23,true);
        text(body,"A gentle reminder to open your plan, at a time in Asia/Kolkata. It does not create or change a task.",14,false);
        Switch reminder=new Switch(this);reminder.setText(R.string.remind_daily);reminder.setMinHeight(dp(48));reminder.setChecked(DeviceStore.get(this).getBoolean("reminder",false));body.addView(reminder);
        reminder.setOnCheckedChangeListener((b,checked)->safe(()->{DeviceStore.save(DeviceStore.get(this).edit().putBoolean("reminder",checked));Alarms.daily(this);refresh();}));
        reminderStatus=text(body,"",16,true);
        button(body,"Choose reminder time",()->{
            var p=DeviceStore.get(this);
            new TimePickerDialog(this,(v,h,m)->safe(()->{DeviceStore.save(p.edit().putInt("hour",h).putInt("minute",m));Alarms.daily(this);refresh();}),p.getInt("hour",9),p.getInt("minute",0),true).show();
        });
        permissions=text(body,"",14,false);
        button(body,"Enable / manage notifications",()->{
            if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED
                && (!DeviceStore.get(this).getBoolean("notificationAsked",false) || shouldShowRequestPermissionRationale(android.Manifest.permission.POST_NOTIFICATIONS))) {
                DeviceStore.save(DeviceStore.get(this).edit().putBoolean("notificationAsked",true));
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},11);
            } else if(getSystemService(NotificationManager.class).areNotificationsEnabled()) {
                startActivity(new Intent(android.provider.Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                    .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName())
                    .putExtra(android.provider.Settings.EXTRA_CHANNEL_ID,Alarms.CHANNEL));
            } else startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName()));
        });
        space(body);
        text(body,"Private by default",20,true);
        text(body,"This Android app stores only reminder settings and timer state. It cannot read your browser’s account, tasks or history. Notifications use general wording. Your website and its records are unchanged.",14,false);
        text(body,"Preview 0.2 · Android 8 or later\nReopen after force-stopping to restore alarms. Phone-use measurement, widgets and biometric lock are not included.",13,false);
        safe(()->{Alarms.daily(this);Alarms.focus(this);});
    }
    private void open(boolean offline) {
        Uri uri=Uri.parse("https://steady-kappa-two.vercel.app/"+(offline?"offline":""));
        try {new CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(this,uri);}
        catch(ActivityNotFoundException e){showError("Install or enable a browser such as Chrome, then try again.");}
    }
    @Override protected void onResume(){super.onResume();handler.removeCallbacks(tick);handler.post(tick);}
    @Override protected void onPause(){handler.removeCallbacks(tick);super.onPause();}
    @Override protected void onSaveInstanceState(Bundle out){out.putString("duration",minutes.getText().toString());super.onSaveInstanceState(out);}
    private void refresh() {
        if(clock==null)return;
        DeviceStore.finish(this);
        var p=DeviceStore.get(this);long remaining=DeviceStore.remaining(this);boolean running=p.getBoolean("running",false);
        long seconds=(remaining+999)/1000;
        clock.setText(p.getBoolean("finished",false)?"Finished":remaining>0?String.format(Locale.ROOT,"%02d:%02d",seconds/60,seconds%60):"Ready");
        primary.setText(remaining>0?"Resume focus":"Start focus");primary.setEnabled(!running);
        pause.setEnabled(running);cancel.setEnabled(running||remaining>0||p.getBoolean("finished",false));minutes.setEnabled(!running&&remaining==0);
        reminderStatus.setText(String.format(Locale.ROOT,"%02d:%02d IST · %s",p.getInt("hour",9),p.getInt("minute",0),p.getBoolean("reminder",false)?"Enabled":"Off"));
        boolean appEnabled=getSystemService(NotificationManager.class).areNotificationsEnabled();
        permissions.setText(!appEnabled?"Notifications are off. Enable them to receive reminders and timer alerts.":!Alarms.channelEnabled(this)?"The Steady reminders category is off. Open notification settings below to enable timer alerts and reminders.":"Notifications are allowed. Battery settings may delay delivery.");
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView text(LinearLayout body,String s,int size,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(Color.rgb(32,42,50));t.setPadding(0,dp(6),0,dp(8));t.setLineSpacing(dp(3),1);if(bold)t.setTypeface(null,android.graphics.Typeface.BOLD);body.addView(t);return t;}
    private Button button(LinearLayout body,String s,Runnable r){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setMinHeight(dp(52));b.setPadding(dp(16),dp(12),dp(16),dp(12));b.setTextColor(Color.rgb(52,79,59));LinearLayout.LayoutParams layout=new LinearLayout.LayoutParams(-1,-2);layout.topMargin=dp(6);layout.bottomMargin=dp(6);body.addView(b,layout);b.setOnClickListener(v->safe(r));return b;}
    private void space(LinearLayout body){body.addView(new View(this),new LinearLayout.LayoutParams(1,dp(24)));}
    private boolean safe(Runnable action){try{action.run();return true;}catch(IllegalStateException|SecurityException e){handler.removeCallbacks(tick);showError("Could not save or schedule on this device. Check available storage and notification settings, then reopen Steady.");return false;}}
    private void showError(String message){new AlertDialog.Builder(this).setTitle("Please check").setMessage(message).setPositiveButton("OK",null).show();}
}

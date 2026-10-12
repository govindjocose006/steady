package in.steady.app;
import java.time.*;
/** Pure deadline calculations, independent of Android or any web account. */
public final class TimeRules {
    private TimeRules() {}
    public static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    public static long nextReminder(long now, int hour, int minute) {
        ZonedDateTime current = Instant.ofEpochMilli(now).atZone(INDIA);
        ZonedDateTime next = current.withHour(hour).withMinute(minute).withSecond(0).withNano(0);
        if (!next.isAfter(current)) next = next.plusDays(1);
        return next.toInstant().toEpochMilli();
    }
    public static long remaining(long deadline, long now) { return Math.max(0, deadline - now); }
    public static long duration(int minutes) {
        if (minutes < 1 || minutes > 180) throw new IllegalArgumentException("Choose 1 to 180 minutes.");
        return minutes * 60_000L;
    }
    public static long timerRemaining(boolean running, long paused, int storedBoot, int currentBoot, long elapsedEnd, long elapsedNow, long wallEnd, long wallNow) {
        if(!running) return paused;
        return storedBoot == currentBoot && storedBoot >= 0 ? remaining(elapsedEnd, elapsedNow) : remaining(wallEnd, wallNow);
    }
}

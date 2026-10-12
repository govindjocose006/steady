package in.steady.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.Instant;
public class TimeRulesTest {
 private long at(String s){return Instant.parse(s).toEpochMilli();}
 @Test public void reminderUsesIndiaNotDeviceTimezone(){assertEquals(at("2026-10-12T03:30:00Z"),TimeRules.nextReminder(at("2026-10-12T03:29:00Z"),9,0));}
 @Test public void exactReminderSchedulesTomorrow(){assertEquals(at("2026-10-13T03:30:00Z"),TimeRules.nextReminder(at("2026-10-12T03:30:00Z"),9,0));}
 @Test public void indiaYearRollover(){assertEquals(at("2026-12-31T18:30:00Z"),TimeRules.nextReminder(at("2026-12-31T18:29:59Z"),0,0));}
 @Test public void elapsedClampsToZero(){assertEquals(1000,TimeRules.remaining(5000,4000));assertEquals(0,TimeRules.remaining(5000,9000));}
 @Test public void validDurations(){assertEquals(60000,TimeRules.duration(1));assertEquals(10800000,TimeRules.duration(180));}
 @Test(expected=IllegalArgumentException.class) public void rejectsZero(){TimeRules.duration(0);}
 @Test(expected=IllegalArgumentException.class) public void rejectsTooLong(){TimeRules.duration(181);}
 @Test public void clockChangeCannotChangeSameBootTimer(){assertEquals(1000,TimeRules.timerRemaining(true,0,1,1,5000,4000,100000,200000));}
 @Test public void rebootUsesWallDeadline(){assertEquals(1000,TimeRules.timerRemaining(true,0,1,2,5000,9999,100000,99000));}
 @Test public void expiredAcrossRebootIsFinished(){assertEquals(0,TimeRules.timerRemaining(true,0,1,2,5000,0,100000,100001));}
 @Test public void pausedTimerDoesNotRun(){assertEquals(500,TimeRules.timerRemaining(false,500,1,1,5000,9999,100000,200000));}
}

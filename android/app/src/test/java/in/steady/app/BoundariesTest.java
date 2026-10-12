package in.steady.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.nio.file.*;
/** Guard the companion boundary: no web-account writes or invasive device access. */
public class BoundariesTest {
 private String read(String p) throws Exception {return new String(Files.readAllBytes(Paths.get(p)), java.nio.charset.StandardCharsets.UTF_8);}
 @Test public void manifestRequestsOnlyNeededPermissions() throws Exception {
  String xml=read("src/main/AndroidManifest.xml");
  assertTrue(xml.contains("android:allowBackup=\"false\""));
  assertFalse(xml.contains("SCHEDULE_EXACT_ALARM"));assertFalse(xml.contains("QUERY_ALL_PACKAGES"));
  assertFalse(xml.contains("PACKAGE_USAGE_STATS"));assertFalse(xml.contains("android.permission.INTERNET"));
 }
 @Test public void workspaceUsesExistingHttpsOrigin() throws Exception {
  String source=read("src/main/java/in/steady/app/MainActivity.java");
  assertTrue(source.contains("https://steady-kappa-two.vercel.app/"));
  assertFalse(source.contains("new WebView"));assertFalse(source.contains("/api/"));
 }
 @Test public void pendingIntentsAreImmutableAndReceiverPrivate() throws Exception {
  String alarms=read("src/main/java/in/steady/app/Alarms.java");
  String manifest=read("src/main/AndroidManifest.xml");
  assertFalse(alarms.contains("FLAG_MUTABLE"));
  assertTrue(alarms.contains("FLAG_IMMUTABLE"));
  assertTrue(manifest.contains("android:name=\".AlarmReceiver\" android:exported=\"false\""));
 }
}

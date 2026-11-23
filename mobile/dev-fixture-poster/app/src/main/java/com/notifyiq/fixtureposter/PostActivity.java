package com.notifyiq.fixtureposter;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Bundle;

/**
 * Posts or cancels one synthetic notification from intent extras, then finishes.
 *
 * adb shell "am start -n com.notifyiq.fixtureposter/.PostActivity --ei id 1 --es title 'Title' --es text 'Body text'"
 * adb shell "am start -n com.notifyiq.fixtureposter/.PostActivity --ei id 1 --ez cancel true"
 *
 * Use synthetic content only. Requires POST_NOTIFICATIONS (grant with `pm grant`).
 */
public final class PostActivity extends Activity {
  private static final String CHANNEL = "fixtures";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    NotificationManager manager = getSystemService(NotificationManager.class);
    manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Synthetic fixtures", NotificationManager.IMPORTANCE_DEFAULT));
    int id = getIntent().getIntExtra("id", 1);
    if (getIntent().getBooleanExtra("cancel", false)) {
      manager.cancel(id);
    } else {
      Notification notification = new Notification.Builder(this, CHANNEL)
          .setSmallIcon(android.R.drawable.ic_dialog_info)
          .setContentTitle(getIntent().getStringExtra("title"))
          .setContentText(getIntent().getStringExtra("text"))
          // Tapping opens OpenedActivity with the fixture id, so "Open in app" can be verified end to end.
          .setContentIntent(PendingIntent.getActivity(this, id,
              new Intent(this, OpenedActivity.class).putExtra("id", id), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT))
          .build();
      manager.notify(id, notification);
    }
    finish();
  }
}

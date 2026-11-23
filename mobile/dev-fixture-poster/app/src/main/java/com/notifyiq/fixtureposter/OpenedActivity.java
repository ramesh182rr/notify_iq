package com.notifyiq.fixtureposter;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;

/** Shown when a synthetic fixture notification's tap action runs ("Fixture opened N"). */
public final class OpenedActivity extends Activity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    TextView view = new TextView(this);
    view.setText("Fixture opened " + getIntent().getIntExtra("id", 0));
    view.setTextSize(24);
    setContentView(view);
  }
}

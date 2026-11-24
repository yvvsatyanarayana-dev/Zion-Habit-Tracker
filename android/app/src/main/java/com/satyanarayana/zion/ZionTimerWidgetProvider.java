package com.satyanarayana.zion;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class ZionTimerWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "zion_widget_prefs";
    public static final String ACTION_TIMER_PLAY_PAUSE = "com.satyanarayana.zion.ACTION_TIMER_PLAY_PAUSE";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, ZionTimerWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_zion_timer);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String habitName = prefs.getString("timer_habit_name", "Deep Focus Protocol");
        String clock = prefs.getString("timer_clock", "25:00");
        boolean isRunning = prefs.getBoolean("timer_running", false);

        views.setTextViewText(R.id.widget_timer_name, habitName);
        views.setTextViewText(R.id.widget_timer_clock, clock);
        views.setTextViewText(R.id.widget_timer_status, isRunning ? "ACTIVE FOCUS SESSION" : "FOCUS PROTOCOL");
        views.setTextViewText(R.id.widget_timer_btn_toggle, isRunning ? "Pause" : "Start");

        // Action: Open Focus Studio in Zion
        Intent openTimerIntent = new Intent(context, MainActivity.class);
        openTimerIntent.setAction(Intent.ACTION_MAIN);
        openTimerIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openTimerIntent.putExtra("zion_action", "focus");
        PendingIntent openPending = PendingIntent.getActivity(
                context, 201, openTimerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_timer_btn_open, openPending);
        views.setOnClickPendingIntent(R.id.widget_timer_root, openPending);
        views.setOnClickPendingIntent(R.id.widget_timer_btn_toggle, openPending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}

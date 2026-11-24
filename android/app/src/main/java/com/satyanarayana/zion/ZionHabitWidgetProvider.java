package com.satyanarayana.zion;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class ZionHabitWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "zion_widget_prefs";
    public static final String ACTION_TOGGLE_HABIT = "com.satyanarayana.zion.ACTION_TOGGLE_HABIT";
    public static final String ACTION_REFRESH_WIDGET = "com.satyanarayana.zion.ACTION_REFRESH_WIDGET";
    public static final String EXTRA_HABIT_ID = "extra_habit_id";
    public static final String KEY_PENDING_TOGGLES = "pending_toggles";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_TOGGLE_HABIT.equals(intent.getAction())) {
            String habitId = intent.getStringExtra(EXTRA_HABIT_ID);
            if (habitId != null && !habitId.isEmpty()) {
                toggleHabitInPrefs(context, habitId);
                updateAllWidgets(context);
            }
        } else if (ACTION_REFRESH_WIDGET.equals(intent.getAction())) {
            updateAllWidgets(context);
        }
    }

    private static void toggleHabitInPrefs(Context context, String habitId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String habitsRaw = prefs.getString("habits_json", "[]");
        try {
            JSONArray arr = new JSONArray(habitsRaw);
            int doneCount = 0;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject h = arr.getJSONObject(i);
                if (habitId.equals(h.optString("id"))) {
                    boolean current = h.optBoolean("completed", false);
                    h.put("completed", !current);
                }
                if (h.optBoolean("completed", false)) {
                    doneCount++;
                }
            }
            int total = arr.length();
            int pct = total > 0 ? (int) Math.round(((double) doneCount / total) * 100) : 0;

            // Track pending toggles for React app sync
            Set<String> pending = new HashSet<>(prefs.getStringSet(KEY_PENDING_TOGGLES, new HashSet<String>()));
            pending.add(habitId);

            prefs.edit()
                    .putString("habits_json", arr.toString())
                    .putInt("completion_pct", pct)
                    .putStringSet(KEY_PENDING_TOGGLES, pending)
                    .apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, ZionHabitWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_zion_habits);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Date Label
        SimpleDateFormat sdf = new SimpleDateFormat("EEEE, MMM d", Locale.getDefault());
        String dateFormatted = prefs.getString("current_date_str", sdf.format(new Date()));
        views.setTextViewText(R.id.widget_date, dateFormatted);

        // Streak & Progress Badges
        int streak = prefs.getInt("streak", 1);
        int completionPct = prefs.getInt("completion_pct", 0);
        views.setTextViewText(R.id.widget_streak_badge, "🔥 " + streak + " Day" + (streak == 1 ? "" : "s"));
        views.setTextViewText(R.id.widget_progress_badge, completionPct + "% Done");

        // Parse habits JSON
        String habitsRaw = prefs.getString("habits_json", "[]");
        int[] rowIds = { R.id.widget_habit_1, R.id.widget_habit_2, R.id.widget_habit_3, R.id.widget_habit_4 };
        int[] nameIds = { R.id.widget_habit_1_name, R.id.widget_habit_2_name, R.id.widget_habit_3_name, R.id.widget_habit_4_name };
        int[] checkIds = { R.id.widget_habit_1_check, R.id.widget_habit_2_check, R.id.widget_habit_3_check, R.id.widget_habit_4_check };

        try {
            JSONArray arr = new JSONArray(habitsRaw);
            int count = Math.min(arr.length(), 4);

            if (count == 0) {
                views.setViewVisibility(R.id.widget_empty_state, View.VISIBLE);
                for (int r : rowIds) {
                    views.setViewVisibility(r, View.GONE);
                }
            } else {
                views.setViewVisibility(R.id.widget_empty_state, View.GONE);
                for (int i = 0; i < 4; i++) {
                    if (i < count) {
                        JSONObject h = arr.getJSONObject(i);
                        String hId = h.optString("id");
                        String name = h.optString("name", "Habit");
                        boolean completed = h.optBoolean("completed", false);

                        views.setViewVisibility(rowIds[i], View.VISIBLE);
                        views.setTextViewText(nameIds[i], name);
                        views.setImageViewResource(checkIds[i], completed ? R.drawable.widget_check_done : R.drawable.widget_check_undone);

                        // Click to toggle habit directly on home screen!
                        Intent toggleIntent = new Intent(context, ZionHabitWidgetProvider.class);
                        toggleIntent.setAction(ACTION_TOGGLE_HABIT);
                        toggleIntent.putExtra(EXTRA_HABIT_ID, hId);
                        PendingIntent togglePending = PendingIntent.getBroadcast(
                                context,
                                i + 100,
                                toggleIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(rowIds[i], togglePending);
                    } else {
                        views.setViewVisibility(rowIds[i], View.GONE);
                    }
                }
            }
        } catch (Exception e) {
            views.setViewVisibility(R.id.widget_empty_state, View.VISIBLE);
        }

        // Actions: Open Zion
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setAction(Intent.ACTION_MAIN);
        openAppIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openAppIntent.putExtra("zion_action", "dashboard");
        PendingIntent openAppPending = PendingIntent.getActivity(
                context, 1, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_btn_open, openAppPending);
        views.setOnClickPendingIntent(R.id.widget_header, openAppPending);

        // Actions: Quick Add Habit
        Intent addHabitIntent = new Intent(context, MainActivity.class);
        addHabitIntent.putExtra("zion_action", "add_habit");
        PendingIntent addHabitPending = PendingIntent.getActivity(
                context, 2, addHabitIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_btn_add, addHabitPending);

        // Actions: Focus Studio
        Intent focusIntent = new Intent(context, MainActivity.class);
        focusIntent.putExtra("zion_action", "focus");
        PendingIntent focusPending = PendingIntent.getActivity(
                context, 3, focusIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_btn_focus, focusPending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}

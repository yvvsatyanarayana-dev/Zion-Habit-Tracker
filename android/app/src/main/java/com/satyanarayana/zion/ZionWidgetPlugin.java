package com.satyanarayana.zion;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "ZionWidget")
public class ZionWidgetPlugin extends Plugin {

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(ZionHabitWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            JSArray habits = call.getArray("habits");
            if (habits != null) {
                editor.putString("habits_json", habits.toString());
            }

            Integer streak = call.getInt("streak", 1);
            Integer completionPct = call.getInt("completionPct", 0);
            String currentDateStr = call.getString("currentDateStr", "");

            editor.putInt("streak", streak != null ? streak : 1);
            editor.putInt("completion_pct", completionPct != null ? completionPct : 0);
            if (currentDateStr != null && !currentDateStr.isEmpty()) {
                editor.putString("current_date_str", currentDateStr);
            }

            JSObject activeTimer = call.getObject("activeTimer");
            if (activeTimer != null) {
                editor.putString("timer_habit_name", activeTimer.optString("habitName", "Focus"));
                editor.putString("timer_clock", activeTimer.optString("clock", "25:00"));
                editor.putBoolean("timer_running", activeTimer.optBoolean("isRunning", false));
            }

            editor.apply();

            // Refresh all active home screen widgets immediately
            ZionHabitWidgetProvider.updateAllWidgets(context);
            ZionTimerWidgetProvider.updateAllWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to sync widget data: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getPendingToggles(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(ZionHabitWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            Set<String> pending = prefs.getStringSet(ZionHabitWidgetProvider.KEY_PENDING_TOGGLES, new HashSet<String>());

            JSArray resultArr = new JSArray();
            for (String habitId : pending) {
                resultArr.put(habitId);
            }

            // Clear pending after reading
            prefs.edit().putStringSet(ZionHabitWidgetProvider.KEY_PENDING_TOGGLES, new HashSet<String>()).apply();

            JSObject ret = new JSObject();
            ret.put("pendingToggles", resultArr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get pending toggles: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void pinWidget(PluginCall call) {
        try {
            Context context = getContext();
            String widgetType = call.getString("widgetType", "habits");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
                if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                    Class<?> providerClass = "timer".equalsIgnoreCase(widgetType)
                            ? ZionTimerWidgetProvider.class
                            : ZionHabitWidgetProvider.class;

                    ComponentName provider = new ComponentName(context, providerClass);
                    Intent successIntent = new Intent(context, providerClass);
                    PendingIntent successCallback = PendingIntent.getBroadcast(
                            context,
                            0,
                            successIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    boolean pinned = appWidgetManager.requestPinAppWidget(provider, null, successCallback);

                    JSObject ret = new JSObject();
                    ret.put("supported", true);
                    ret.put("pinned", pinned);
                    call.resolve(ret);
                    return;
                }
            }

            JSObject ret = new JSObject();
            ret.put("supported", false);
            ret.put("pinned", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Pin widget request failed: " + e.getMessage(), e);
        }
    }
}

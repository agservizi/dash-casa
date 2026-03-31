package com.casanostra.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod()
    public void updateWidget(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("CasaNostraWidget", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        Double speseMese = call.getDouble("speseMese", 0.0);
        Double budget = call.getDouble("budget", 0.0);
        editor.putFloat("speseMese", speseMese != null ? speseMese.floatValue() : 0f);
        editor.putFloat("budget", budget != null ? budget.floatValue() : 0f);
        editor.putString("scadenza1", call.getString("scadenza1", ""));
        editor.putString("scadenza2", call.getString("scadenza2", ""));
        editor.putString("scadenza3", call.getString("scadenza3", ""));
        editor.apply();

        // Trigger widget update
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, CasaNostraWidget.class);
        int[] widgetIds = widgetManager.getAppWidgetIds(widgetComponent);
        if (widgetIds.length > 0) {
            for (int id : widgetIds) {
                CasaNostraWidget.updateAppWidget(context, widgetManager, id);
            }
        }

        call.resolve(new JSObject().put("success", true));
    }
}

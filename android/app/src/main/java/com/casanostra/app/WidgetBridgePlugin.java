package com.casanostra.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
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
        editor.putString("ultimaSpesaDesc", call.getString("ultimaSpesaDesc", ""));
        editor.putString("ultimaSpesaImporto", call.getString("ultimaSpesaImporto", ""));
        editor.putString("budgetGiornaliero", call.getString("budgetGiornaliero", ""));
        editor.putString("attivita1", call.getString("attivita1", ""));
        editor.putString("attivita2", call.getString("attivita2", ""));
        editor.putString("attivita3", call.getString("attivita3", ""));
        Integer attivitaAperte = call.getInt("attivitaAperte", 0);
        editor.putInt("attivitaAperte", attivitaAperte != null ? attivitaAperte : 0);
        editor.commit(); // commit sincrono: i dati devono essere scritti PRIMA di aggiornare il widget

        // Trigger widget update via broadcast (forza refresh immediato)
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, CasaNostraWidget.class);
        int[] widgetIds = widgetManager.getAppWidgetIds(widgetComponent);
        if (widgetIds.length > 0) {
            // Aggiorna direttamente ogni widget
            for (int id : widgetIds) {
                CasaNostraWidget.updateAppWidget(context, widgetManager, id);
            }
            // Invia anche broadcast esplicito come fallback
            Intent updateIntent = new Intent(context, CasaNostraWidget.class);
            updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
            context.sendBroadcast(updateIntent);
        }

        call.resolve(new JSObject().put("success", true));
    }
}

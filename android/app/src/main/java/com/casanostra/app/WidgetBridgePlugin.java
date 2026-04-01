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
        editor.putString("attivita4", call.getString("attivita4", ""));
        editor.putString("attivita5", call.getString("attivita5", ""));
        editor.putString("scadenza4", call.getString("scadenza4", ""));
        editor.putString("scadenza5", call.getString("scadenza5", ""));
        Integer attivitaAperte = call.getInt("attivitaAperte", 0);
        editor.putInt("attivitaAperte", attivitaAperte != null ? attivitaAperte : 0);
        Double risparmio = call.getDouble("risparmio", 0.0);
        Double goalRisparmio = call.getDouble("goalRisparmio", 0.0);
        editor.putFloat("risparmio", risparmio != null ? risparmio.floatValue() : 0f);
        editor.putFloat("goalRisparmio", goalRisparmio != null ? goalRisparmio.floatValue() : 0f);
        editor.commit(); // commit sincrono: i dati devono essere scritti PRIMA di aggiornare il widget

        // Trigger widget update per TUTTI i formati
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);

        // Medium widget
        updateWidgetClass(context, widgetManager, CasaNostraWidget.class);
        // Small widget
        updateWidgetClass(context, widgetManager, CasaNostraWidgetSmall.class);
        // Large widget
        updateWidgetClass(context, widgetManager, CasaNostraWidgetLarge.class);

        call.resolve(new JSObject().put("success", true));
    }

    private void updateWidgetClass(Context context, AppWidgetManager mgr, Class<?> cls) {
        ComponentName cn = new ComponentName(context, cls);
        int[] ids = mgr.getAppWidgetIds(cn);
        if (ids != null && ids.length > 0) {
            if (cls == CasaNostraWidget.class) {
                for (int id : ids) CasaNostraWidget.updateAppWidget(context, mgr, id);
            } else if (cls == CasaNostraWidgetSmall.class) {
                for (int id : ids) CasaNostraWidgetSmall.updateAppWidget(context, mgr, id);
            } else if (cls == CasaNostraWidgetLarge.class) {
                for (int id : ids) CasaNostraWidgetLarge.updateAppWidget(context, mgr, id);
            }
        }
    }
}

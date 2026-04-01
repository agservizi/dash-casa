package com.casanostra.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class CasaNostraWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        // Gestisci broadcast espliciti per refresh forzato
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS);
            if (ids == null) {
                ComponentName cn = new ComponentName(context, CasaNostraWidget.class);
                ids = mgr.getAppWidgetIds(cn);
            }
            if (ids != null) {
                for (int id : ids) {
                    updateAppWidget(context, mgr, id);
                }
            }
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_casa_nostra);

        // Set current date
        SimpleDateFormat sdf = new SimpleDateFormat("EEE d MMM", Locale.ITALIAN);
        views.setTextViewText(R.id.widget_date, sdf.format(new Date()));

        // Read cached data from SharedPreferences (set by web app via Capacitor plugin or JS bridge)
        SharedPreferences prefs = context.getSharedPreferences("CasaNostraWidget", Context.MODE_PRIVATE);
        float spese = prefs.getFloat("speseMese", 0f);
        float budget = prefs.getFloat("budget", 0f);
        String scad1 = prefs.getString("scadenza1", "");
        String scad2 = prefs.getString("scadenza2", "");
        String scad3 = prefs.getString("scadenza3", "");
        String ultimaSpesaDesc = prefs.getString("ultimaSpesaDesc", "");
        String ultimaSpesaImporto = prefs.getString("ultimaSpesaImporto", "");
        String budgetGiornaliero = prefs.getString("budgetGiornaliero", "");
        String attivita1 = prefs.getString("attivita1", "");
        String attivita2 = prefs.getString("attivita2", "");
        String attivita3 = prefs.getString("attivita3", "");
        int attivitaAperte = prefs.getInt("attivitaAperte", 0);

        // Budget display
        if (budget > 0) {
            views.setTextViewText(R.id.widget_budget, String.format(Locale.ITALIAN, "€ %.0f / € %.0f", spese, budget));
            int pct = (int) Math.min((spese / budget) * 100, 100);
            views.setProgressBar(R.id.widget_budget_bar, 100, pct, false);
        } else {
            views.setTextViewText(R.id.widget_budget, "Apri l'app per configurare");
            views.setProgressBar(R.id.widget_budget_bar, 100, 0, false);
        }

        // Budget giornaliero residuo
        if (!budgetGiornaliero.isEmpty()) {
            views.setTextViewText(R.id.widget_budget_daily, budgetGiornaliero);
            views.setViewVisibility(R.id.widget_budget_daily, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_budget_daily, View.GONE);
        }

        // Ultima spesa
        if (!ultimaSpesaDesc.isEmpty()) {
            views.setTextViewText(R.id.widget_ultima_spesa, ultimaSpesaDesc);
            views.setTextViewText(R.id.widget_ultima_spesa_importo, ultimaSpesaImporto);
            views.setViewVisibility(R.id.widget_ultima_spesa_card, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_ultima_spesa_card, View.GONE);
        }

        // Attività aperte
        boolean hasAttivita = !attivita1.isEmpty() || !attivita2.isEmpty() || !attivita3.isEmpty();
        if (hasAttivita || attivitaAperte > 0) {
            views.setViewVisibility(R.id.widget_attivita_card, View.VISIBLE);
            views.setTextViewText(R.id.widget_attivita_header, "✅ Attività (" + attivitaAperte + " aperte)");
            if (!attivita1.isEmpty()) {
                views.setTextViewText(R.id.widget_attivita1, "• " + attivita1);
                views.setViewVisibility(R.id.widget_attivita1, View.VISIBLE);
            } else { views.setViewVisibility(R.id.widget_attivita1, View.GONE); }
            if (!attivita2.isEmpty()) {
                views.setTextViewText(R.id.widget_attivita2, "• " + attivita2);
                views.setViewVisibility(R.id.widget_attivita2, View.VISIBLE);
            } else { views.setViewVisibility(R.id.widget_attivita2, View.GONE); }
            if (!attivita3.isEmpty()) {
                views.setTextViewText(R.id.widget_attivita3, "• " + attivita3);
                views.setViewVisibility(R.id.widget_attivita3, View.VISIBLE);
            } else { views.setViewVisibility(R.id.widget_attivita3, View.GONE); }
        } else {
            views.setViewVisibility(R.id.widget_attivita_card, View.GONE);
        }

        // Scadenze display
        boolean hasScadenze = false;
        if (!scad1.isEmpty()) {
            views.setTextViewText(R.id.widget_scadenza1, scad1);
            views.setViewVisibility(R.id.widget_scadenza1, View.VISIBLE);
            hasScadenze = true;
        } else {
            views.setViewVisibility(R.id.widget_scadenza1, View.GONE);
        }
        if (!scad2.isEmpty()) {
            views.setTextViewText(R.id.widget_scadenza2, scad2);
            views.setViewVisibility(R.id.widget_scadenza2, View.VISIBLE);
            hasScadenze = true;
        } else {
            views.setViewVisibility(R.id.widget_scadenza2, View.GONE);
        }
        if (!scad3.isEmpty()) {
            views.setTextViewText(R.id.widget_scadenza3, scad3);
            views.setViewVisibility(R.id.widget_scadenza3, View.VISIBLE);
            hasScadenze = true;
        } else {
            views.setViewVisibility(R.id.widget_scadenza3, View.GONE);
        }
        views.setViewVisibility(R.id.widget_no_scadenze, hasScadenze ? View.GONE : View.VISIBLE);

        // Click to open app
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}

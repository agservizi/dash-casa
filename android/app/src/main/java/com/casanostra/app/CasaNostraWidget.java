package com.casanostra.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
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

        // Budget display
        if (budget > 0) {
            views.setTextViewText(R.id.widget_budget, String.format(Locale.ITALIAN, "€ %.0f / € %.0f", spese, budget));
            int pct = (int) Math.min((spese / budget) * 100, 100);
            views.setProgressBar(R.id.widget_budget_bar, 100, pct, false);
        } else {
            views.setTextViewText(R.id.widget_budget, "Apri l'app per configurare");
            views.setProgressBar(R.id.widget_budget_bar, 100, 0, false);
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

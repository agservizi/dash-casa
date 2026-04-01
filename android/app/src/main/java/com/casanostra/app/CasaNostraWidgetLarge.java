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

public class CasaNostraWidgetLarge extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS);
            if (ids == null) {
                ComponentName cn = new ComponentName(context, CasaNostraWidgetLarge.class);
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_large);

        SimpleDateFormat sdf = new SimpleDateFormat("EEE d MMM", Locale.ITALIAN);
        views.setTextViewText(R.id.widget_date, sdf.format(new Date()));

        SharedPreferences prefs = context.getSharedPreferences("CasaNostraWidget", Context.MODE_PRIVATE);
        float spese = prefs.getFloat("speseMese", 0f);
        float budget = prefs.getFloat("budget", 0f);
        String scad1 = prefs.getString("scadenza1", "");
        String scad2 = prefs.getString("scadenza2", "");
        String scad3 = prefs.getString("scadenza3", "");
        String scad4 = prefs.getString("scadenza4", "");
        String scad5 = prefs.getString("scadenza5", "");
        String ultimaSpesaDesc = prefs.getString("ultimaSpesaDesc", "");
        String ultimaSpesaImporto = prefs.getString("ultimaSpesaImporto", "");
        String budgetGiornaliero = prefs.getString("budgetGiornaliero", "");
        String attivita1 = prefs.getString("attivita1", "");
        String attivita2 = prefs.getString("attivita2", "");
        String attivita3 = prefs.getString("attivita3", "");
        String attivita4 = prefs.getString("attivita4", "");
        String attivita5 = prefs.getString("attivita5", "");
        int attivitaAperte = prefs.getInt("attivitaAperte", 0);
        float risparmio = prefs.getFloat("risparmio", 0f);
        float goalRisparmio = prefs.getFloat("goalRisparmio", 0f);

        // Budget
        if (budget > 0) {
            views.setTextViewText(R.id.widget_budget, String.format(Locale.ITALIAN, "€ %.0f / € %.0f", spese, budget));
            int pct = (int) Math.min((spese / budget) * 100, 100);
            views.setProgressBar(R.id.widget_budget_bar, 100, pct, false);
        } else {
            views.setTextViewText(R.id.widget_budget, "Apri l'app per configurare");
            views.setProgressBar(R.id.widget_budget_bar, 100, 0, false);
        }

        // Budget giornaliero
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

        // Scadenze (5 nel large)
        String[] scadenze = {scad1, scad2, scad3, scad4, scad5};
        int[] scadIds = {R.id.widget_scadenza1, R.id.widget_scadenza2, R.id.widget_scadenza3, R.id.widget_scadenza4, R.id.widget_scadenza5};
        boolean hasScadenze = false;
        for (int i = 0; i < 5; i++) {
            if (!scadenze[i].isEmpty()) {
                views.setTextViewText(scadIds[i], scadenze[i]);
                views.setViewVisibility(scadIds[i], View.VISIBLE);
                hasScadenze = true;
            } else {
                views.setViewVisibility(scadIds[i], View.GONE);
            }
        }
        views.setViewVisibility(R.id.widget_no_scadenze, hasScadenze ? View.GONE : View.VISIBLE);

        // Attività (5 nel large)
        String[] attivita = {attivita1, attivita2, attivita3, attivita4, attivita5};
        int[] attIds = {R.id.widget_attivita1, R.id.widget_attivita2, R.id.widget_attivita3, R.id.widget_attivita4, R.id.widget_attivita5};
        boolean hasAttivita = false;
        for (int i = 0; i < 5; i++) {
            if (!attivita[i].isEmpty()) {
                views.setTextViewText(attIds[i], "• " + attivita[i]);
                views.setViewVisibility(attIds[i], View.VISIBLE);
                hasAttivita = true;
            } else {
                views.setViewVisibility(attIds[i], View.GONE);
            }
        }
        views.setTextViewText(R.id.widget_attivita_header, "✅ Attività (" + attivitaAperte + " aperte)");
        views.setViewVisibility(R.id.widget_no_attivita, hasAttivita ? View.GONE : View.VISIBLE);

        // Risparmio
        if (risparmio > 0 || goalRisparmio > 0) {
            views.setViewVisibility(R.id.widget_risparmio_card, View.VISIBLE);
            views.setTextViewText(R.id.widget_risparmio, String.format(Locale.ITALIAN, "€ %.0f", risparmio));
            if (goalRisparmio > 0) {
                views.setTextViewText(R.id.widget_risparmio_goal, String.format(Locale.ITALIAN, "/ € %.0f", goalRisparmio));
            } else {
                views.setTextViewText(R.id.widget_risparmio_goal, "");
            }
        } else {
            views.setViewVisibility(R.id.widget_risparmio_card, View.GONE);
        }

        // Click to open app
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}

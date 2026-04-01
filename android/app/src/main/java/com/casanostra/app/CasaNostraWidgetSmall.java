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

public class CasaNostraWidgetSmall extends AppWidgetProvider {

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
                ComponentName cn = new ComponentName(context, CasaNostraWidgetSmall.class);
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_small);

        SimpleDateFormat sdf = new SimpleDateFormat("EEE d MMM", Locale.ITALIAN);
        views.setTextViewText(R.id.widget_date, sdf.format(new Date()));

        SharedPreferences prefs = context.getSharedPreferences("CasaNostraWidget", Context.MODE_PRIVATE);
        float spese = prefs.getFloat("speseMese", 0f);
        float budget = prefs.getFloat("budget", 0f);

        if (budget > 0) {
            views.setTextViewText(R.id.widget_budget, String.format(Locale.ITALIAN, "€ %.0f / € %.0f", spese, budget));
            int pct = (int) Math.min((spese / budget) * 100, 100);
            views.setProgressBar(R.id.widget_budget_bar, 100, pct, false);
            views.setTextViewText(R.id.widget_budget_pct, pct + "%");
        } else {
            views.setTextViewText(R.id.widget_budget, "Apri l'app");
            views.setProgressBar(R.id.widget_budget_bar, 100, 0, false);
            views.setTextViewText(R.id.widget_budget_pct, "");
        }

        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}

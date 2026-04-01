package com.casanostra.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod()
    public void getVersionInfo(PluginCall call) {
        try {
            Context ctx = getContext();
            PackageInfo pInfo = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            JSObject ret = new JSObject();
            ret.put("versionCode", pInfo.versionCode);
            ret.put("versionName", pInfo.versionName);
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Impossibile leggere la versione", e);
        }
    }

    @PluginMethod()
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("URL APK mancante");
            return;
        }

        new Thread(() -> {
            try {
                Context ctx = getContext();
                URL url = new URL(apkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.connect();

                int fileLength = conn.getContentLength();
                InputStream input = conn.getInputStream();

                // Salva nella cache interna dell'app (non serve permesso WRITE_EXTERNAL_STORAGE)
                File outputDir = new File(ctx.getExternalCacheDir(), "updates");
                if (!outputDir.exists()) outputDir.mkdirs();
                File outputFile = new File(outputDir, "app-update.apk");

                FileOutputStream output = new FileOutputStream(outputFile);
                byte[] buffer = new byte[8192];
                int total = 0;
                int count;
                int lastProgress = 0;

                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    output.write(buffer, 0, count);
                    if (fileLength > 0) {
                        int progress = (int) ((total * 100L) / fileLength);
                        // Notifica progresso ogni 5%
                        if (progress >= lastProgress + 5) {
                            lastProgress = progress;
                            JSObject ev = new JSObject();
                            ev.put("progress", progress);
                            notifyListeners("downloadProgress", ev);
                        }
                    }
                }

                output.flush();
                output.close();
                input.close();
                conn.disconnect();

                // Notifica completamento download
                JSObject ev = new JSObject();
                ev.put("progress", 100);
                notifyListeners("downloadProgress", ev);

                // Avvia installer
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                Uri apkUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    apkUri = FileProvider.getUriForFile(ctx,
                            ctx.getApplicationContext().getPackageName() + ".fileprovider",
                            outputFile);
                    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else {
                    apkUri = Uri.fromFile(outputFile);
                }
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(installIntent);

                JSObject result = new JSObject();
                result.put("installed", true);
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Download fallito: " + e.getMessage(), e);
            }
        }).start();
    }
}

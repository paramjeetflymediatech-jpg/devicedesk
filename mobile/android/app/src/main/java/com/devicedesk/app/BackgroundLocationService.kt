package com.devicedesk.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class BackgroundLocationService : Service(), LocationListener {

    companion object {
        const val TAG = "DD_BgLocationService"
        const val CHANNEL_ID = "devicedesk_tracking_channel"
        const val NOTIFICATION_ID = 8821

        const val ACTION_START = "com.devicedesk.app.ACTION_START_TRACKING"
        const val ACTION_STOP = "com.devicedesk.app.ACTION_STOP_TRACKING"
        const val ACTION_UPDATE = "com.devicedesk.app.ACTION_UPDATE_TRIP"

        const val EXTRA_EMPLOYEE_ID = "extra_employee_id"
        const val EXTRA_ATTENDANCE_ID = "extra_attendance_id"
        const val EXTRA_API_URL = "extra_api_url"

        const val PREFS_NAME = "DeviceDeskTrackingPrefs"
        const val KEY_EMPLOYEE_ID = "tracking_employee_id"
        const val KEY_ATTENDANCE_ID = "tracking_attendance_id"
        const val KEY_API_URL = "tracking_api_url"
        const val KEY_IS_RUNNING = "tracking_is_running"
    }

    private var locationManager: LocationManager? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val executor = Executors.newSingleThreadExecutor()

    private var employeeId: String = ""
    private var attendanceId: String = ""
    private var apiUrl: String = "https://devicedesk.flymediatech.com"

    private var lastSendTimestamp: Long = 0L
    private val minSendIntervalMs = 25000L // Send coordinates every 25 seconds

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "BackgroundLocationService onCreate")
        createNotificationChannel()

        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DeviceDesk::LocationWakeLock")
            wakeLock?.setReferenceCounted(false)
            wakeLock?.acquire(24 * 60 * 60 * 1000L) // 24h safety timeout
        } catch (e: Exception) {
            Log.w(TAG, "Could not acquire wake lock: ${e.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            Log.d(TAG, "Stopping tracking service per request")
            stopTracking()
            stopSelf()
            return START_NOT_STICKY
        }

        // Load intent extras or fallback to SharedPreferences
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val intentEmpId = intent?.getStringExtra(EXTRA_EMPLOYEE_ID)
        val intentAttId = intent?.getStringExtra(EXTRA_ATTENDANCE_ID)
        val intentApi = intent?.getStringExtra(EXTRA_API_URL)

        if (!intentEmpId.isNullOrBlank()) {
            employeeId = intentEmpId
            prefs.edit().putString(KEY_EMPLOYEE_ID, employeeId).apply()
        } else {
            employeeId = prefs.getString(KEY_EMPLOYEE_ID, "") ?: ""
        }

        if (!intentAttId.isNullOrBlank()) {
            attendanceId = intentAttId
            prefs.edit().putString(KEY_ATTENDANCE_ID, attendanceId).apply()
        } else {
            attendanceId = prefs.getString(KEY_ATTENDANCE_ID, "") ?: ""
        }

        if (!intentApi.isNullOrBlank()) {
            apiUrl = intentApi.trim().removeSuffix("/")
            prefs.edit().putString(KEY_API_URL, apiUrl).apply()
        } else {
            apiUrl = prefs.getString(KEY_API_URL, "https://devicedesk.flymediatech.com") ?: "https://devicedesk.flymediatech.com"
        }

        prefs.edit().putBoolean(KEY_IS_RUNNING, true).apply()

        startAsForegroundService()
        startLocationUpdates()

        return START_STICKY
    }

    private fun startAsForegroundService() {
        val notification = buildNotification("Live Field Route Tracking Active", "Recording coordinates in background")

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                    )
                } else {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                    )
                }
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground error: ${e.message}", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "DeviceDesk Field Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifies when background GPS tracking is recording marketing field trips"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, content: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )
        } else null

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent)
        }

        return builder.build()
    }

    private fun updateNotificationText(content: String) {
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            val notification = buildNotification("DeviceDesk Marketing Route Tracking", content)
            manager?.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.w(TAG, "updateNotificationText error: ${e.message}")
        }
    }

    private fun startLocationUpdates() {
        try {
            if (locationManager == null) {
                locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            }

            // Remove any existing listeners first
            locationManager?.removeUpdates(this)

            // Register GPS Provider (high accuracy)
            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    15000L, // 15 seconds
                    5f,     // 5 meters
                    this
                )
                Log.d(TAG, "GPS_PROVIDER registered")
            }

            // Register Network Provider (fast, coarse fallback)
            if (locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    20000L, // 20 seconds
                    10f,    // 10 meters
                    this
                )
                Log.d(TAG, "NETWORK_PROVIDER registered")
            }

            // Try getting last known location immediately
            val lastGps = locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            val lastNet = locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            val bestInitial = when {
                lastGps != null && lastNet != null -> if (lastGps.time > lastNet.time) lastGps else lastNet
                lastGps != null -> lastGps
                else -> lastNet
            }

            bestInitial?.let { loc ->
                sendLocationToServer(loc)
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "startLocationUpdates error: ${e.message}")
        }
    }

    override fun onLocationChanged(location: Location) {
        val now = System.currentTimeMillis()
        if (now - lastSendTimestamp >= minSendIntervalMs || lastSendTimestamp == 0L) {
            lastSendTimestamp = now
            sendLocationToServer(location)
        }
    }

    private fun sendLocationToServer(location: Location) {
        if (employeeId.isBlank() || attendanceId.isBlank()) {
            Log.d(TAG, "Skipping send: employeeId or attendanceId is blank")
            return
        }

        executor.execute {
            var conn: HttpURLConnection? = null
            try {
                val endpoint = "${apiUrl}/api/marketing/location"
                val url = URL(endpoint)
                conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; utf-8")
                conn.setRequestProperty("Accept", "application/json")
                conn.connectTimeout = 15000
                conn.readTimeout = 15000
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("employee_id", employeeId)
                    put("attendance_id", attendanceId)
                    put("latitude", location.latitude)
                    put("longitude", location.longitude)
                    put("accuracy", location.accuracy.toDouble())
                }

                OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val responseCode = conn.responseCode
                Log.d(TAG, "Location posted: (${location.latitude}, ${location.longitude}) -> Response Code $responseCode")

                if (responseCode in 200..299) {
                    val latStr = String.format("%.4f", location.latitude)
                    val lngStr = String.format("%.4f", location.longitude)
                    updateNotificationText("Live GPS locked: $latStr, $lngStr")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to post background location: ${e.message}")
            } finally {
                conn?.disconnect()
            }
        }
    }

    private fun stopTracking() {
        try {
            locationManager?.removeUpdates(this)
        } catch (e: Exception) {
            Log.w(TAG, "removeUpdates error: ${e.message}")
        }

        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {}

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_IS_RUNNING, false).apply()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (e: Exception) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.cancel(NOTIFICATION_ID)
        }
    }

    override fun onDestroy() {
        Log.d(TAG, "BackgroundLocationService onDestroy")
        stopTracking()
        executor.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
}

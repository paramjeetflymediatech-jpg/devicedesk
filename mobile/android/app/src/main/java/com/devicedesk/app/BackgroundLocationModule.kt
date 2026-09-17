package com.devicedesk.app

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BackgroundLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BackgroundLocationModule"

    @ReactMethod
    fun startTracking(employeeId: String, attendanceId: String, apiUrl: String?, promise: Promise) {
        try {
            val intent = Intent(reactContext, BackgroundLocationService::class.java).apply {
                action = BackgroundLocationService.ACTION_START
                putExtra(BackgroundLocationService.EXTRA_EMPLOYEE_ID, employeeId)
                putExtra(BackgroundLocationService.EXTRA_ATTENDANCE_ID, attendanceId)
                if (!apiUrl.isNullOrBlank()) {
                    putExtra(BackgroundLocationService.EXTRA_API_URL, apiUrl)
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(reactContext, intent)
            } else {
                reactContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_TRACKING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            val intent = Intent(reactContext, BackgroundLocationService::class.java).apply {
                action = BackgroundLocationService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_TRACKING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateTrip(attendanceId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(BackgroundLocationService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(BackgroundLocationService.KEY_ATTENDANCE_ID, attendanceId).apply()

            val intent = Intent(reactContext, BackgroundLocationService::class.java).apply {
                action = BackgroundLocationService.ACTION_UPDATE
                putExtra(BackgroundLocationService.EXTRA_ATTENDANCE_ID, attendanceId)
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_TRIP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isTracking(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(BackgroundLocationService.PREFS_NAME, Context.MODE_PRIVATE)
            val isRunning = prefs.getBoolean(BackgroundLocationService.KEY_IS_RUNNING, false)
            promise.resolve(isRunning)
        } catch (e: Exception) {
            promise.reject("IS_TRACKING_ERROR", e.message, e)
        }
    }
}

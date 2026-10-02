package com.devicedesk.app

import android.media.MediaRecorder
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class AudioRecorderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaRecorder: MediaRecorder? = null
    private var currentRecordingPath: String? = null
    private var isRecordingAudio: Boolean = false

    override fun getName(): String = "AudioRecorderModule"

    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecordingAudio) {
            promise.reject("ALREADY_RECORDING", "Voice recording is already in progress.")
            return
        }

        try {
            val cacheDir = reactContext.cacheDir
            val voiceDir = File(cacheDir, "audio_notes")
            if (!voiceDir.exists()) {
                voiceDir.mkdirs()
            }

            val outputFile = File(voiceDir, "voice_note_${System.currentTimeMillis()}.m4a")
            currentRecordingPath = outputFile.absolutePath

            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            recorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(128000)
                setAudioSamplingRate(44100)
                setOutputFile(outputFile.absolutePath)
                prepare()
                start()
            }

            mediaRecorder = recorder
            isRecordingAudio = true

            promise.resolve(outputFile.absolutePath)
        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("RECORD_START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (!isRecordingAudio || mediaRecorder == null) {
            promise.resolve(currentRecordingPath ?: "")
            cleanupRecorder()
            return
        }

        try {
            try {
                mediaRecorder?.stop()
            } catch (e: Exception) {
                // If stopped too soon, file might be empty but ignore stop exception
            }
            val path = currentRecordingPath ?: ""
            cleanupRecorder()
            promise.resolve(path)
        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("RECORD_STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelRecording(promise: Promise) {
        try {
            try {
                mediaRecorder?.stop()
            } catch (e: Exception) {}
            
            currentRecordingPath?.let { path ->
                val f = File(path)
                if (f.exists()) {
                    f.delete()
                }
            }
            cleanupRecorder()
            promise.resolve(true)
        } catch (e: Exception) {
            cleanupRecorder()
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isRecording(promise: Promise) {
        promise.resolve(isRecordingAudio)
    }

    private fun cleanupRecorder() {
        try {
            mediaRecorder?.reset()
            mediaRecorder?.release()
        } catch (e: Exception) {}
        mediaRecorder = null
        isRecordingAudio = false
    }
}

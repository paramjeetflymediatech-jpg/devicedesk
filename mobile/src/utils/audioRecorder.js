import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { AudioRecorderModule } = NativeModules;

export async function requestAudioPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission Required',
        message: 'DeviceDesk requires microphone access to record and send voice notes in chat.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Microphone permission request error:', err);
    return false;
  }
}

export async function startAudioRecording() {
  const hasPermission = await requestAudioPermission();
  if (!hasPermission) {
    throw new Error('Microphone permission denied.');
  }

  if (AudioRecorderModule && AudioRecorderModule.startRecording) {
    return await AudioRecorderModule.startRecording();
  }
  return null;
}

export async function stopAudioRecording() {
  if (AudioRecorderModule && AudioRecorderModule.stopRecording) {
    return await AudioRecorderModule.stopRecording();
  }
  return null;
}

export async function cancelAudioRecording() {
  if (AudioRecorderModule && AudioRecorderModule.cancelRecording) {
    return await AudioRecorderModule.cancelRecording();
  }
  return true;
}

export async function isAudioRecording() {
  if (AudioRecorderModule && AudioRecorderModule.isRecording) {
    return await AudioRecorderModule.isRecording();
  }
  return false;
}

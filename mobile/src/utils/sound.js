import { Vibration, Platform } from 'react-native';

let SoundPlayer = null;
try {
  SoundPlayer = require('react-native-sound-player').default;
} catch (e) {
  console.warn('react-native-sound-player is not linked or available.');
}

/**
 * Play sound and trigger vibration alert on mobile device when a ticket event occurs.
 * 
 * @param {'ticket_raised' | 'ticket_resolved' | 'notification'} type 
 */
export function playTicketSound(type = 'notification') {
  // 1. Trigger vibration pattern
  try {
    if (type === 'ticket_raised') {
      // Urgent dual-pulse vibration pattern for new ticket
      Vibration.vibrate([0, 500, 200, 500]);
    } else if (type === 'ticket_resolved') {
      // Confirmation double vibration pattern for completed ticket
      Vibration.vibrate([0, 250, 150, 250]);
    } else {
      // Standard notification vibration
      Vibration.vibrate([0, 400]);
    }
  } catch (err) {
    console.warn('Vibration failed:', err);
  }

  // 2. Play audio sound tone if sound player is available
  if (SoundPlayer) {
    try {
      // Use qt.mp3 for notification ring and ticket raise/resolve events
      SoundPlayer.playSoundFile('qt', 'mp3');
    } catch (e) {
      // Fallback to system sound or catch if sound file not bundled yet
      try {
        SoundPlayer.playUrl('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      } catch (urlErr) {
        console.warn('Could not play notification sound audio:', e.message);
      }
    }
  }
}

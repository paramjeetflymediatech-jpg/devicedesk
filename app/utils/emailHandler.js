/**
 * DeviceDesk Client-Side Email Handler Utility
 */
export async function sendEmail({ to, subject, body }) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, body })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Email Handler Network Error:', error);
    return { success: false, error: error.message };
  }
}

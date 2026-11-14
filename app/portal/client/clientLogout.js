export async function handleClientSignOut() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // Network or server error on logout is non-fatal
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('devicedesk_auth_user');
      localStorage.removeItem('devicedesk_google_profile');
      localStorage.removeItem('devicedesk_client_has_smo');
      sessionStorage.clear();
    } catch (e) {}

    const expiredCookie = "; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax";
    document.cookie = `devicedesk_token=${expiredCookie}`;
    document.cookie = `devicedesk_token_exp=${expiredCookie}`;
    document.cookie = `devicedesk_auth_user=${expiredCookie}`;
    document.cookie = `devicedesk_user_role=${expiredCookie}`;
    document.cookie = `devicedesk_browser_profile=${expiredCookie}`;
    document.cookie = `devicedesk_google_profile=${expiredCookie}`;
    document.cookie = `devicedesk_client_has_smo=${expiredCookie}`;

    window.location.href = '/login?logout=1';
  }
}


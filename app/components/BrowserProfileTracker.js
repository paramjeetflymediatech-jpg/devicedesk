'use client';

import { useEffect } from 'react';
import { trackSiteArrival } from '../utils/browserProfile';

/**
 * Global component mounted in RootLayout.
 * As soon as any visitor or employee arrives on any page of DeviceDesk,
 * this component automatically analyzes the browser, persistent profile sandbox,
 * hardware environment, and syncs the browser profile cookie and fetch interceptor.
 */
export default function BrowserProfileTracker() {
  useEffect(() => {
    trackSiteArrival();
  }, []);

  return null;
}

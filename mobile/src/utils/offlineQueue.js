import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './api';

const QUEUE_STORAGE_KEY = '@devicedesk_offline_queue';
let listeners = [];
let isProcessing = false;

export function subscribeOfflineQueue(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

function notifyListeners(queue) {
  listeners.forEach(cb => {
    try {
      cb(queue);
    } catch (e) {
      console.warn('Queue listener error:', e);
    }
  });
}

/**
 * Get all queued offline actions
 */
export async function getQueuedActions() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to get offline queue:', err);
    return [];
  }
}

/**
 * Enqueue an action to be executed when back online
 */
export async function enqueueAction({ type, endpoint, method = 'POST', headers = {}, payload = {}, description = '' }) {
  try {
    const queue = await getQueuedActions();
    const actionItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      endpoint,
      method,
      headers,
      payload,
      description: description || `Pending ${type || 'Action'}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    const updatedQueue = [...queue, actionItem];
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
    notifyListeners(updatedQueue);
    console.log('[OfflineQueue] Enqueued item:', actionItem.description, actionItem.id);
    return actionItem;
  } catch (err) {
    console.error('[OfflineQueue] Failed to enqueue action:', err);
    throw err;
  }
}

/**
 * Remove an item from the queue by ID
 */
export async function removeQueuedAction(id) {
  try {
    const queue = await getQueuedActions();
    const updatedQueue = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
    notifyListeners(updatedQueue);
  } catch (err) {
    console.error('[OfflineQueue] Failed to remove item:', err);
  }
}

/**
 * Process and flush the offline queue
 */
export async function processOfflineQueue() {
  if (isProcessing) return { processed: 0, remaining: 0 };
  isProcessing = true;

  try {
    const queue = await getQueuedActions();
    if (queue.length === 0) {
      isProcessing = false;
      return { processed: 0, remaining: 0 };
    }

    console.log(`[OfflineQueue] Processing ${queue.length} pending offline actions...`);
    const baseUrl = getApiUrl();
    const remainingItems = [];
    let processedCount = 0;

    for (const item of queue) {
      const url = item.endpoint.startsWith('http') ? item.endpoint : `${baseUrl}${item.endpoint}`;
      try {
        const response = await fetch(url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...item.headers,
          },
          body: item.method !== 'GET' ? JSON.stringify(item.payload) : undefined,
        });

        if (response.ok) {
          console.log(`[OfflineQueue] Successfully synced: ${item.description} (${item.id})`);
          processedCount++;
        } else if (response.status >= 400 && response.status < 500) {
          // Client error (e.g. duplicate or invalid data) - discard to not block queue forever
          console.warn(`[OfflineQueue] Server rejected item with ${response.status}. Discarding: ${item.description}`);
        } else {
          // Server error 5xx or temporary issue - retain in queue
          item.attempts = (item.attempts || 0) + 1;
          remainingItems.push(item);
        }
      } catch (networkErr) {
        // Still offline or network drop - keep item and stop processing further
        console.warn(`[OfflineQueue] Network error executing ${item.description}. Halting sync batch.`);
        item.attempts = (item.attempts || 0) + 1;
        remainingItems.push(item);
        // Add rest of unprocessed items
        const currentIndex = queue.indexOf(item);
        const rest = queue.slice(currentIndex + 1);
        remainingItems.push(...rest);
        break;
      }
    }

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingItems));
    notifyListeners(remainingItems);
    isProcessing = false;
    return { processed: processedCount, remaining: remainingItems.length };
  } catch (err) {
    console.error('[OfflineQueue] Unexpected queue processing error:', err);
    isProcessing = false;
    return { processed: 0, remaining: 0 };
  }
}

/**
 * Clear the entire queue (utility)
 */
export async function clearOfflineQueue() {
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    notifyListeners([]);
  } catch (e) {}
}

"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Fetch initial notifications
  useEffect(() => {
    if (user && user.id) {
      fetch(`/api/notifications?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.notifications.filter(n => !n.is_read).length);
          }
        })
        .catch(err => console.error('Error fetching notifications:', err));
    }
  }, [user]);

  // 2. Setup Web Push Service Worker
  useEffect(() => {
    if (user && user.id && 'serviceWorker' in navigator && 'PushManager' in window) {
      const initPush = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js');
          const register = await navigator.serviceWorker.ready;
          
          let subscription = await register.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }

          subscription = await register.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          });

          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              subscription
            })
          });
        } catch (error) {
          console.error('Service Worker or Web Push subscription failed:', error);
        }
      };

      // Request permission
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            initPush();
          }
        });
      } else if (Notification.permission === 'granted') {
        initPush();
      }
    }
  }, [user]);

  // 3. Setup Socket for in-app popup
  useEffect(() => {
    if (user && user.id) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
      const socket = io(socketUrl, { path: "/socket.io" });

      socket.emit('register-user', user.id);

      socket.on('receive-notification', (data) => {
        setNotifications(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);

        // In-app popup
        Swal.fire({
          title: data.title,
          text: data.message,
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: true,
          confirmButtonText: 'View',
          timer: 10000,
          timerProgressBar: true
        }).then((result) => {
          if (result.isConfirmed && data.link) {
            window.location.href = data.link;
          }
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  const markAsRead = async (notificationId = null) => {
    if (!user) return;
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, notificationId })
      });

      if (notificationId) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);

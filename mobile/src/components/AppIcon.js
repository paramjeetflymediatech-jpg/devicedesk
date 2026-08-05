import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';

export default function AppIcon({ name, size = 20, color = '#2563eb', style }) {
  const iconKey = String(name).toLowerCase();

  switch (iconKey) {
    case 'overview':
    case 'dashboard':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Rect x="3" y="3" width="7" height="7" />
          <Rect x="14" y="3" width="7" height="7" />
          <Rect x="14" y="14" width="7" height="7" />
          <Rect x="3" y="14" width="7" height="7" />
        </Svg>
      );

    case 'alert':
    case 'complaint':
    case 'warning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
        </Svg>
      );

    case 'ticket':
    case 'records':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <Line x1="9" y1="12" x2="15" y2="12" />
          <Line x1="9" y1="16" x2="15" y2="16" />
        </Svg>
      );

    case 'clock':
    case 'attendance':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Circle cx="12" cy="12" r="10" />
          <Polyline points="12 6 12 12 16 14" />
        </Svg>
      );

    case 'tasks':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Polyline points="9 11 12 14 22 4" />
          <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </Svg>
      );

    case 'chat':
    case 'message':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
      );

    case 'user':
    case 'profile':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      );

    case 'group':
    case 'users':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M17 21v-2a4 4 0 0 0-3-3.87" />
          <Path d="M9 21v-2a4 4 0 0 1 3-3.87" />
          <Circle cx="9" cy="7" r="4" />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        </Svg>
      );

    case 'logout':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Polyline points="16 17 21 12 16 7" />
          <Line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
      );

    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Line x1="3" y1="12" x2="21" y2="12" />
          <Line x1="3" y1="6" x2="21" y2="6" />
          <Line x1="3" y1="18" x2="21" y2="18" />
        </Svg>
      );

    case 'monitor':
    case 'hardware':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <Line x1="8" y1="21" x2="16" y2="21" />
          <Line x1="12" y1="17" x2="12" y2="21" />
        </Svg>
      );

    case 'wrench':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </Svg>
      );

    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
      );

    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      );

    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Polyline points="3 6 5 6 21 6" />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </Svg>
      );

    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Circle cx="11" cy="11" r="8" />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
      );

    case 'back':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Line x1="19" y1="12" x2="5" y2="12" />
          <Polyline points="12 19 5 12 12 5" />
        </Svg>
      );

    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );

    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Polyline points="20 6 9 17 4 12" />
        </Svg>
      );

    case 'paperclip':
    case 'attachment':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </Svg>
      );

    case 'send':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Line x1="22" y1="2" x2="11" y2="13" />
          <Polygon points="22 2 15 22 11 13 2 9 22 2" />
        </Svg>
      );

    case 'mic':
    case 'microphone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <Line x1="12" y1="19" x2="12" y2="23" />
          <Line x1="8" y1="23" x2="16" y2="23" />
        </Svg>
      );

    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <Circle cx="12" cy="13" r="4" />
        </Svg>
      );

    case 'pin':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Line x1="12" y1="17" x2="12" y2="22" />
          <Path d="M5 17h14l-1.5-6H6.5L5 17zM9 4h6v7H9V4z" />
        </Svg>
      );

    case 'reply':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Polyline points="9 17 4 12 9 7" />
          <Path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </Svg>
      );

    case 'forward':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Polyline points="15 17 20 12 15 7" />
          <Path d="M4 18v-2a4 4 0 0 1 4-4h12" />
        </Svg>
      );

    case 'edit':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Svg>
      );

    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="16" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12.01" y2="8" />
        </Svg>
      );

    case 'more':
    case 'dots':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Circle cx="12" cy="12" r="1" />
          <Circle cx="12" cy="5" r="1" />
          <Circle cx="12" cy="19" r="1" />
        </Svg>
      );

    case 'file':
    case 'document':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <Polyline points="13 2 13 9 20 9" />
        </Svg>
      );

    case 'image':
    case 'photo':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <Circle cx="8.5" cy="8.5" r="1.5" />
          <Polyline points="21 15 16 10 5 21" />
        </Svg>
      );

    case 'video':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Polygon points="23 7 16 12 23 17 23 7" />
          <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </Svg>
      );

    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Polygon points="5 3 19 12 5 21 5 3" />
        </Svg>
      );

    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Rect x="6" y="4" width="4" height="16" />
          <Rect x="14" y="4" width="4" height="16" />
        </Svg>
      );

    case 'close':
    case 'x':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );

    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Circle cx="12" cy="12" r="5" />
          <Line x1="12" y1="1" x2="12" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="23" />
          <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <Line x1="1" y1="12" x2="3" y2="12" />
          <Line x1="21" y1="12" x2="23" y2="12" />
          <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </Svg>
      );

    case 'moon':
    case 'theme':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      );

    case 'leave':
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <Line x1="16" y1="2" x2="16" y2="6" />
          <Line x1="8" y1="2" x2="8" y2="6" />
          <Line x1="3" y1="10" x2="21" y2="10" />
        </Svg>
      );

    case 'eye':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <Circle cx="12" cy="12" r="3" />
        </Svg>
      );

    case 'eye-off':
    case 'eyeoff':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <Line x1="1" y1="1" x2="23" y2="23" />
        </Svg>
      );

    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
          <Rect x="3" y="3" width="7" height="7" />
          <Rect x="14" y="3" width="7" height="7" />
          <Rect x="14" y="14" width="7" height="7" />
          <Rect x="3" y="14" width="7" height="7" />
        </Svg>
      );
  }
}

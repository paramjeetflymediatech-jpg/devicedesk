import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AppIcon from './AppIcon';
import { extractDriveLinks, openDriveLink } from '../utils/driveHelper';

/**
 * Reusable component that detects and renders sleek Google Drive links
 */
export default function GoogleDriveBadge({ source, url, themeColors, isDark, style, compact = false }) {
  const links = url ? [{ url, type: 'folder', label: 'Google Drive Folder' }] : extractDriveLinks(source);

  if (!links || links.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      {links.map((item, index) => {
        const isDoc = item.type === 'doc';
        const isSheet = item.type === 'sheet';

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.driveCard,
              compact && styles.driveCardCompact,
              {
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#eff6ff',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe',
              }
            ]}
            onPress={() => openDriveLink(item.url)}
            activeOpacity={0.8}
          >
            <View style={styles.leftRow}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                <AppIcon name="google-drive" size={compact ? 14 : 16} />
              </View>

              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.title, compact && styles.titleCompact, { color: isDark ? '#93c5fd' : '#1d4ed8' }]} numberOfLines={1}>
                  {item.label}
                </Text>
                {!compact && (
                  <Text style={[styles.subText, { color: isDark ? '#94a3b8' : '#64748b' }]} numberOfLines={1}>
                    Tap to open client requirements in Google Drive ↗
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.openPill, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#dbeafe' }]}>
              <Text style={[styles.openPillText, { color: '#2563eb' }]}>
                {compact ? 'Drive ↗' : 'View Folder ↗'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 6,
  },
  driveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  driveCardCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  titleCompact: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  subText: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '500',
  },
  openPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  openPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
});

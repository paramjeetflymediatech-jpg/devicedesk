import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
  Platform,
  Share,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../utils/ThemeContext';
import { getApiUrl } from '../utils/api';

export function resolveDocumentUrl(url) {
  if (!url) return '';
  if (typeof url !== 'string') {
    if (url.uri) return resolveDocumentUrl(url.uri);
    if (url.url) return resolveDocumentUrl(url.url);
    if (url.path) return resolveDocumentUrl(url.path);
    if (url.fileUrl) return resolveDocumentUrl(url.fileUrl);
    return '';
  }
  let trimmed = `${url}`.trim().replace(/^["']+|["']+$/g, '');
  if (!trimmed) return '';

  let finalUrl = trimmed;
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('data:') &&
    !trimmed.startsWith('file://')
  ) {
    const apiBase = (getApiUrl() || 'https://devicedesk.flymediatech.com').replace(/\/+$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    finalUrl = `${apiBase}${cleanPath}`;
  }

  // Ensure URI is properly encoded for Android Uri.parse() while preserving protocol & query params
  try {
    return encodeURI(decodeURI(finalUrl));
  } catch (e) {
    return finalUrl;
  }
}

export default function DocumentViewerModal({
  visible,
  onClose,
  fileUrl,
  fileName = 'Document',
  fileType = '',
  inline = false,
}) {
  const { width, height } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const { themeColors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const webViewRef = useRef(null);

  // Safe Insets calculation for iOS Dynamic Island / Notch and Android Status Bar / Home Bar
  const topInset = Math.max(
    safeAreaInsets.top || 0,
    Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24)
  );
  const bottomInset = Math.max(
    safeAreaInsets.bottom || 0,
    Platform.OS === 'ios' ? 28 : 12
  );

  const resolvedUrl = resolveDocumentUrl(fileUrl);

  const urlLower = String(resolvedUrl || '').toLowerCase();
  const nameLower = String(fileName || '').toLowerCase();
  const typeLower = String(fileType || '').toLowerCase();

  const isImage =
    urlLower.match(/\.(jpeg|jpg|png|webp|gif|svg|bmp)$/i) ||
    nameLower.match(/\.(jpeg|jpg|png|webp|gif|svg|bmp)$/i) ||
    typeLower.includes('image') ||
    typeLower.includes('photo');

  const isPdf =
    urlLower.endsWith('.pdf') ||
    nameLower.endsWith('.pdf') ||
    typeLower.includes('pdf');

  useEffect(() => {
    setLoading(true);
    setHasError(false);
    setZoomScale(1);
  }, [resolvedUrl, visible]);

  // Auto-dismiss loading indicator as soon as image is cached or after brief 1s timeout
  useEffect(() => {
    if (visible && loading && isImage && resolvedUrl) {
      Image.getSize(
        resolvedUrl,
        () => setLoading(false),
        () => {}
      );
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, loading, isImage, resolvedUrl]);

  if (!visible || !resolvedUrl) return null;

  // Determine the viewer URL for WebView
  let webViewUrl = resolvedUrl;
  if (isPdf) {
    if (Platform.OS === 'android') {
      webViewUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resolvedUrl)}`;
    } else {
      webViewUrl = resolvedUrl; // iOS WebKit renders PDFs natively
    }
  } else if (!isImage) {
    // Word, Excel, PowerPoint, Text, etc.
    webViewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;
  }

  const handleOpenExternally = () => {
    if (resolvedUrl) {
      Linking.openURL(resolvedUrl).catch(() => {});
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: fileName || 'Document',
        message: `${fileName || 'Document'}: ${resolvedUrl}`,
        url: resolvedUrl,
      });
    } catch (e) {
      // Ignored
    }
  };

  const handleZoomIn = () => {
    if (isImage) {
      setZoomScale(prev => Math.min(Number((prev + 0.4).toFixed(1)), 4.0));
    } else if (webViewRef.current) {
      const next = Math.min(Number((zoomScale + 0.25).toFixed(2)), 3.0);
      webViewRef.current.injectJavaScript(`
        document.body.style.zoom = "${next}";
        true;
      `);
      setZoomScale(next);
    }
  };

  const handleZoomOut = () => {
    if (isImage) {
      setZoomScale(prev => Math.max(Number((prev - 0.4).toFixed(1)), 0.5));
    } else if (webViewRef.current) {
      const next = Math.max(Number((zoomScale - 0.25).toFixed(2)), 0.6);
      webViewRef.current.injectJavaScript(`
        document.body.style.zoom = "${next}";
        true;
      `);
      setZoomScale(next);
    }
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    if (!isImage && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        document.body.style.zoom = "1.0";
        true;
      `);
    }
  };

  const viewerContent = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#0b0f17' : '#ffffff',
          paddingTop: topInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {/* Top Responsive Header Bar (Cleanly clear of Dynamic Island) */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: themeColors.border,
            backgroundColor: isDark ? '#161b22' : '#f8fafc',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
          ]}
          onPress={onClose}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.backBtnText, { color: themeColors.textPrimary }]}>✕</Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, { color: themeColors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {fileName || 'Document Viewer'}
          </Text>
          {fileType ? (
            <Text
              style={[styles.subtitle, { color: themeColors.accent }]}
              numberOfLines={1}
            >
              {fileType}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
            ]}
            onPress={handleShare}
            title="Share"
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 15 }}>🔗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.doneBtn,
              { backgroundColor: themeColors.accent },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Responsive Body Content */}
      <View style={styles.content}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>⚠️</Text>
            <Text style={[styles.errorTitle, { color: themeColors.textPrimary }]}>
              Cannot Preview File
            </Text>
            <Text style={[styles.errorDesc, { color: themeColors.textSecondary }]}>
              This document could not be previewed directly in the app. You can still open or download it using your device’s default application.
            </Text>
            <TouchableOpacity
              style={[styles.externalBtn, { backgroundColor: themeColors.accent }]}
              onPress={handleOpenExternally}
              activeOpacity={0.8}
            >
              <Text style={styles.externalBtnText}>Open with External App ↗</Text>
            </TouchableOpacity>
          </View>
        ) : isImage ? (
          <ScrollView
            style={styles.imageOuterScroll}
            contentContainerStyle={styles.imageOuterContainer}
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={true}
          >
            <ScrollView
              style={styles.imageInnerScroll}
              contentContainerStyle={styles.imageInnerContainer}
              maximumZoomScale={Platform.OS === 'ios' ? 5 : undefined}
              minimumZoomScale={Platform.OS === 'ios' ? 1 : undefined}
              showsVerticalScrollIndicator={false}
              centerContent={true}
              bounces={true}
            >
              <Image
                source={{ uri: resolvedUrl }}
                alt={fileName || 'Document preview'}
                style={{
                  width: Math.max(Math.round(width * zoomScale), 200),
                  height: Math.max(Math.round((height * 0.68) * zoomScale), 200),
                }}
                resizeMode="contain"
                onLoad={() => setLoading(false)}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setHasError(true);
                }}
              />
            </ScrollView>
          </ScrollView>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={styles.webView}
            startInLoadingState={true}
            scalesPageToFit={true}
            setBuiltInZoomControls={true}
            setDisplayZoomControls={false}
            supportZoom={true}
            useWideViewPort={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            injectedJavaScript={`
              const meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes';
              document.getElementsByTagName('head')[0].appendChild(meta);
              true;
            `}
            renderLoading={() => (
              <View style={styles.loadingContainer} pointerEvents="none">
                <View style={[styles.loadingPill, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)' }]}>
                  <ActivityIndicator size="small" color={themeColors.accent} />
                  <Text style={[styles.loadingText, { color: themeColors.textPrimary }]}>
                    Loading document preview...
                  </Text>
                </View>
              </View>
            )}
            onLoad={() => setLoading(false)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
        )}

        {/* Floating Non-Blocking Loading Pill */}
        {loading && isImage && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <View style={[styles.loadingPill, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.92)' }]}>
              <ActivityIndicator size="small" color={themeColors.accent} />
              <Text style={[styles.loadingText, { color: themeColors.textPrimary }]}>
                Loading image...
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Responsive Controls Bar (Cleanly clear of Home Indicator) */}
      <View
        style={[
          styles.bottomControlsBar,
          {
            backgroundColor: isDark ? '#161b22' : '#ffffff',
            borderTopColor: themeColors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.zoomBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' },
          ]}
          onPress={handleZoomOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.zoomBtnIcon, { color: themeColors.textPrimary }]}>🔍−</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.zoomBtn,
            styles.resetBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' },
          ]}
          onPress={handleResetZoom}
          activeOpacity={0.7}
        >
          <Text style={[styles.zoomScaleText, { color: themeColors.accent }]}>
            {Math.round(zoomScale * 100)}%
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.zoomBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' },
          ]}
          onPress={handleZoomIn}
          activeOpacity={0.7}
        >
          <Text style={[styles.zoomBtnIcon, { color: themeColors.textPrimary }]}>🔍+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.externalActionBtn,
            { backgroundColor: themeColors.accent },
          ]}
          onPress={handleOpenExternally}
          activeOpacity={0.8}
        >
          <Text style={styles.externalActionText}>Open in Device App ↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (inline) {
    return (
      <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: isDark ? '#0b0f17' : '#ffffff' }}>
        {viewerContent}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      {viewerContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  webView: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  imageOuterScroll: {
    flex: 1,
    width: '100%',
  },
  imageOuterContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInnerScroll: {
    flex: 1,
    width: '100%',
  },
  imageInnerContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 320,
  },
  externalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  externalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  zoomBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  resetBtn: {
    minWidth: 54,
  },
  zoomBtnIcon: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  zoomScaleText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  externalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  externalActionText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
});

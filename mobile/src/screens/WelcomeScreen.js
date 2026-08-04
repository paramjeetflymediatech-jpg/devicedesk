import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import AppIcon from '../components/AppIcon';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ onGetStarted }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Visual entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Company Brand Logo Image */}
          <Image
            source={require('../assets/flymedia-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.brandTitle}>DeviceDesk</Text>
          <Text style={styles.subtitle}>
            Your central portal for corporate inventory, asset management, and IT helpdesk support.
          </Text>
        </Animated.View>

        {/* Feature Cards Grid */}
        <Animated.View style={[styles.featuresContainer, { opacity: fadeAnim }]}>
          {/* Card 1 */}
          <View style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
              <AppIcon name="monitor" size={22} color="#2563eb" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Asset Inventory</Text>
              <Text style={styles.cardDescription}>
                View hardware specifications, assigned serial numbers, and remarks on company devices.
              </Text>
            </View>
          </View>

          {/* Card 2 */}
          <View style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: '#f3e8ff' }]}>
              <AppIcon name="wrench" size={22} color="#7e22ce" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>IT Support Desk</Text>
              <Text style={styles.cardDescription}>
                File support tickets for system issues, track resolutions, and request hardware upgrades.
              </Text>
            </View>
          </View>

          {/* Card 3 */}
          <View style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ecfdf5' }]}>
              <AppIcon name="bell" size={22} color="#059669" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Push Notifications</Text>
              <Text style={styles.cardDescription}>
                Get real-time notifications on your device regarding system status and ticket updates.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Call to Action Button */}
        <Animated.View style={[styles.actionContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            onPress={onGetStarted}
          >
            <Animated.View style={[styles.btnPrimary, { transform: [{ scale: buttonScale }] }]}>
              <Text style={styles.btnPrimaryText}>Get Started ➔</Text>
            </Animated.View>
          </TouchableOpacity>

          <Text style={styles.footerNote}>Secured by DeviceDesk Enterprise</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 45,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 180,
    height: 64,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    marginVertical: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDescription: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 4,
    lineHeight: 17,
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  btnPrimary: {
    width: width - 48,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  footerNote: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 14,
    fontWeight: '500',
  },
});

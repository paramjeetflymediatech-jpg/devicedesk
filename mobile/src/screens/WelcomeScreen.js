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
} from 'react-native';

export default function WelcomeScreen({ onGetStarted }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Trigger visual entry animations
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Top Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>DD</Text>
          </View>
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
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 240, 255, 0.1)' }]}>
              <Text style={styles.cardIcon}>🖥️</Text>
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
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(171, 112, 255, 0.1)' }]}>
              <Text style={styles.cardIcon}>🛠️</Text>
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
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(57, 219, 109, 0.1)' }]}>
              <Text style={styles.cardIcon}>🔔</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Push Notifications</Text>
              <Text style={styles.cardDescription}>
                Get real-time notifications on your device regarding system status and ticket updates.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Call to Actions */}
        <Animated.View style={[styles.actionContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            onPress={onGetStarted}
          >
            <Animated.View style={[styles.btnPrimary, { transform: [{ scale: buttonScale }] }]}>
              <Text style={styles.btnPrimaryText}>Get Started</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 45,
    paddingBottom: 35,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#161b22',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00f0ff',
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: '#8b949e',
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b949e',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    marginVertical: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDescription: {
    fontSize: 12.5,
    color: '#8b949e',
    marginTop: 4,
    lineHeight: 17,
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  btnPrimary: {
    width: width - 48,
    backgroundColor: '#1f6feb',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f6feb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});

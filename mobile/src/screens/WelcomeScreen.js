import React, { useEffect, useRef, useState } from 'react';
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

const FEATURES = [
  { label: 'Track Hardware & Asset Inventory', icon: 'monitor' },
  { label: 'Submit & Track Support Tickets', icon: 'wrench' },
  { label: 'Log Daily Attendance & Breaks', icon: 'attendance' },
  { label: 'Receive Real-Time Updates', icon: 'bell' },
];

export default function WelcomeScreen({ onGetStarted }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Text ticker animation values
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(15)).current;

  // State values
  const [featureIndex, setFeatureIndex] = useState(0);

  // Initial screen load animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Dynamic text carousel animation loop
  useEffect(() => {
    let isMounted = true;

    const animateNext = (index) => {
      if (!isMounted) return;
      setFeatureIndex(index);
      textFade.setValue(0);
      textSlide.setValue(15);

      Animated.parallel([
        Animated.timing(textFade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          if (!isMounted) return;
          Animated.parallel([
            Animated.timing(textFade, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(textSlide, {
              toValue: -12,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (!isMounted) return;
            animateNext((index + 1) % FEATURES.length);
          });
        }, 2200);
      });
    };

    animateNext(0);

    return () => {
      isMounted = false;
    };
  }, []);

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

  const activeFeature = FEATURES[featureIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Top Branding Section */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Image
            source={require('../assets/flymedia_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.brandTitle}>DeviceDesk</Text>
          <Text style={styles.subtitle}>System Tracking & Support Portal</Text>
        </Animated.View>

        {/* Cardless Animated Text Section */}
        <View style={styles.animatedTextContainer}>
          <Animated.View
            style={[
              styles.animatedTextWrapper,
              {
                opacity: textFade,
                transform: [{ translateY: textSlide }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <AppIcon name={activeFeature.icon} size={22} color="#0f172a" />
            </View>
            <Text style={styles.animatedText}>{activeFeature.label}</Text>
          </Animated.View>

          {/* Minimal Animated Dots Indicator */}
          <View style={styles.dotsRow}>
            {FEATURES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === featureIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Action Button Section */}
        <Animated.View style={[styles.actionContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            onPress={onGetStarted}
          >
            <Animated.View style={[styles.btnPrimary, { transform: [{ scale: buttonScale }] }]}>
              <Text style={styles.btnPrimaryText}>Get Started →</Text>
            </Animated.View>
          </TouchableOpacity>

          <Text style={styles.footerNote}>Secured by DeviceDesk</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 210,
    height: 68,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  animatedTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    minHeight: 85,
  },
  animatedTextWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  animatedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    width: 22,
    backgroundColor: '#0f172a',
  },
  inactiveDot: {
    width: 5,
    backgroundColor: '#cbd5e1',
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  btnPrimary: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  footerNote: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
});

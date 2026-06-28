import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import Logo from './Logo';

interface WelcomeScreenProps {
  onStart: () => void;
}

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
        Animated.timing(logoScale, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      ]),
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(buttonTranslateY, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1.0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glowPulse, { toValue: 0.5, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Animated.View style={[styles.logoWrapper, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Animated.View style={[styles.ambientGlow, { opacity: Animated.multiply(glowPulse, 0.2) }]} />
          <Logo size={90} />
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }], alignItems: 'center' }}>
          <Text style={styles.brandTitle}>KYYS</Text>
          <Text style={styles.brandSubtitle}>TRACK YOUR PROGRESS, BE BETTER</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity, transform: [{ translateY: buttonTranslateY }] }]}>
        <TouchableOpacity style={styles.startBtn} activeOpacity={0.8} onPress={onStart}>
          <Text style={styles.startBtnText}>Mulai Aktivitas</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>v1.0.0 Stable</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  logoWrapper: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  ambientGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2e4a62',
  },
  brandTitle: {
    color: '#fafafa',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 12,
    marginTop: 16,
    paddingLeft: 12,
  },
  brandSubtitle: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 10,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  startBtn: {
    width: width * 0.78,
    backgroundColor: '#2e4a62',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  versionText: {
    color: '#3f3f46',
    fontSize: 11,
    fontWeight: '600',
  },
});
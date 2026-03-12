import { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Easing, Image } from 'react-native';

const FRAME_SIZE = 200;
const CORNER     = 30;
const C_W        = 3.5;

export default function AppSplash({ onFinish }) {
  const logoScale    = useRef(new Animated.Value(0)).current;
  const frameOp      = useRef(new Animated.Value(0)).current;
  const scanLine     = useRef(new Animated.Value(0)).current;
  const wordmarkOp   = useRef(new Animated.Value(0)).current;
  const wordmarkY    = useRef(new Animated.Value(14)).current;
  const screenOp     = useRef(new Animated.Value(1)).current;
  const scanLoopRef  = useRef(null);

  useEffect(() => {
    scanLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence([
      // Step 1: Logo bounces in
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      // Step 2: Scanner frame fades in
      Animated.timing(frameOp, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step 3: Scan line sweeps for ~1.9s
      scanLoopRef.current.start();

      setTimeout(() => {
        scanLoopRef.current.stop();

        Animated.sequence([
          Animated.parallel([
            Animated.timing(wordmarkOp, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(wordmarkY, { toValue: 0, duration: 320, useNativeDriver: true }),
          ]),
          Animated.delay(600),
          Animated.timing(screenOp, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => onFinish());
      }, 1900);
    });
  }, []);

  const scanLineY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOp }]} pointerEvents="none">

      {/* Logo + scanner */}
      <View style={styles.frameWrap}>
        {/* App icon */}
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Scanner overlay (positioned over the logo) */}
        <Animated.View style={[styles.scannerOverlay, { opacity: frameOp }]}>
          {/* Corner brackets */}
          <View style={[styles.corner, { top: 0,    left: 0,  borderTopWidth: C_W,    borderLeftWidth: C_W  }]} />
          <View style={[styles.corner, { top: 0,    right: 0, borderTopWidth: C_W,    borderRightWidth: C_W }]} />
          <View style={[styles.corner, { bottom: 0, left: 0,  borderBottomWidth: C_W, borderLeftWidth: C_W  }]} />
          <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: C_W, borderRightWidth: C_W }]} />

          {/* Glowing scan line */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}>
            <View style={styles.scanGlow} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Wordmark */}
      <Animated.View
        style={[styles.wordmarkWrap, { opacity: wordmarkOp, transform: [{ translateY: wordmarkY }] }]}
      >
        <Text style={styles.wordmark}>SnapCalorie</Text>
        <Text style={styles.tagline}>AI-powered nutrition tracking</Text>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  frameWrap: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 34,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#FF6B35',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  scanGlow: {
    position: 'absolute',
    top: 2.5,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(255,107,53,0.15)',
  },
  wordmarkWrap: {
    alignItems: 'center',
    marginTop: 48,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    marginTop: 5,
  },
});

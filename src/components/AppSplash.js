import { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Ellipse, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';

const BOX_SIZE     = 196;
const APPLE_SIZE   = 90;
const SCANNER_SIZE = 90;
const CORNER_SIZE  = 22;
const C_W          = 3;

export default function AppSplash({ onFinish }) {
  const boxScale   = useRef(new Animated.Value(0)).current;
  const appleOp    = useRef(new Animated.Value(0)).current;
  const appleY     = useRef(new Animated.Value(30)).current;
  const appleScale = useRef(new Animated.Value(0.1)).current;
  const frameOp    = useRef(new Animated.Value(0)).current;
  const scanLine   = useRef(new Animated.Value(0)).current;
  const wordmarkOp = useRef(new Animated.Value(0)).current;
  const wordmarkY  = useRef(new Animated.Value(14)).current;
  const screenOp   = useRef(new Animated.Value(1)).current;
  const scanLoopRef = useRef(null);

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
      // Step 1: Orange box bounces in
      Animated.spring(boxScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      // Step 2: Apple pops up
      Animated.parallel([
        Animated.spring(appleScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(appleY, {
          toValue: 0,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(appleOp, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Step 3: Scanner brackets fade in
      Animated.timing(frameOp, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step 4: Scan line sweeps for ~1.9s
      scanLoopRef.current.start();

      setTimeout(() => {
        scanLoopRef.current.stop();

        Animated.sequence([
          // Step 5: Wordmark slides up
          Animated.parallel([
            Animated.timing(wordmarkOp, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(wordmarkY,  { toValue: 0, duration: 320, useNativeDriver: true }),
          ]),
          Animated.delay(600),
          // Step 6: Whole screen fades out
          Animated.timing(screenOp, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => onFinish());
      }, 1900);
    });
  }, []);

  const scanLineY = scanLine.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, SCANNER_SIZE - 4],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOp }]} pointerEvents="none">

      <View style={styles.frameWrap}>

        {/* Step 1: Orange box */}
        <Animated.View style={[styles.logoBox, { transform: [{ scale: boxScale }] }]} />

        {/* Step 2: Apple SVG */}
        <Animated.View style={[styles.appleWrap, {
          opacity: appleOp,
          transform: [{ scale: appleScale }, { translateY: appleY }],
        }]}>
          <Svg viewBox="0 0 100 110" width={APPLE_SIZE} height={APPLE_SIZE}>
            <Defs>
              <RadialGradient id="appleGrad" cx="40%" cy="32%" r="60%">
                <Stop offset="0%" stopColor="#FF7F7F" />
                <Stop offset="45%" stopColor="#E8273A" />
                <Stop offset="100%" stopColor="#B01020" />
              </RadialGradient>
              <LinearGradient id="shineGrad" x1="0%" y1="0%" x2="60%" y2="100%">
                <Stop offset="0%" stopColor="white" stopOpacity="0.45" />
                <Stop offset="100%" stopColor="white" stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Apple body */}
            <Path
              d="M50 20 C36 20, 18 33, 18 52 C18 73, 32 86, 44 86 C47 86, 49 84.5, 50 84.5 C51 84.5, 53 86, 56 86 C68 86, 82 73, 82 52 C82 33, 64 20, 50 20 Z"
              fill="url(#appleGrad)"
            />
            {/* Shine */}
            <Ellipse cx="38" cy="34" rx="10" ry="7" fill="url(#shineGrad)" rotation="-25" originX="38" originY="34" />
            {/* Leaf */}
            <Path d="M53 18 C53 8, 65 3, 68 0 C63 9, 57 14, 53 18 Z" fill="#3DD16A" />
            {/* Stem */}
            <Path d="M50 20 C50 13, 52 8, 54 5" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        {/* Step 3: Scanner brackets */}
        <Animated.View style={[styles.scannerOverlay, { opacity: frameOp }]}>
          <View style={[styles.corner, { top: 0,    left: 0,  borderTopWidth: C_W,    borderLeftWidth: C_W  }]} />
          <View style={[styles.corner, { top: 0,    right: 0, borderTopWidth: C_W,    borderRightWidth: C_W }]} />
          <View style={[styles.corner, { bottom: 0, left: 0,  borderBottomWidth: C_W, borderLeftWidth: C_W  }]} />
          <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: C_W, borderRightWidth: C_W }]} />

          {/* Step 4: Scan line */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}>
            <View style={styles.scanGlow} />
          </Animated.View>
        </Animated.View>

      </View>

      {/* Wordmark */}
      <Animated.View style={[styles.wordmarkWrap, { opacity: wordmarkOp, transform: [{ translateY: wordmarkY }] }]}>
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
    width: BOX_SIZE + 24,
    height: BOX_SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    position: 'absolute',
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 44,
    backgroundColor: '#FF7840',
  },
  appleWrap: {
    position: 'absolute',
    width: APPLE_SIZE,
    height: APPLE_SIZE,
  },
  scannerOverlay: {
    position: 'absolute',
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  scanLine: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  scanGlow: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
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

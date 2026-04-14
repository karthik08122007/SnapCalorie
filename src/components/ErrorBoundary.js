import { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || 'Unknown error';
      const errStack = this.state.error?.stack || '';
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.errorMsg}>{errMsg}</Text>
          <Text style={styles.errorStack} numberOfLines={8}>{errStack}</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  errorMsg: { fontSize: 13, color: '#cc3300', textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  errorStack: { fontSize: 10, color: '#999', textAlign: 'left', marginBottom: 20, lineHeight: 15, width: '100%' },
  btn: { backgroundColor: '#FF6B35', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

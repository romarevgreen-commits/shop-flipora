import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const FLIPORA_URL = 'https://shop-flipora.netlify.app';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const allowNavigation = (request) => {
    const url = request.url || '';
    if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('sms:')) {
      Linking.openURL(url);
      return false;
    }
    return true;
  };

  if (failed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.error}>
          <Text style={styles.logo}>F</Text>
          <Text style={styles.title}>Flipora could not connect</Text>
          <Text style={styles.message}>Check your internet connection and try again.</Text>
          <TouchableOpacity style={styles.button} onPress={() => setFailed(false)}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: FLIPORA_URL }}
        originWhitelist={['https://*', 'http://*', 'tel:*', 'mailto:*', 'sms:*']}
        onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
        onShouldStartLoadWithRequest={allowNavigation}
        onError={() => setFailed(true)}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setFailed(true);
        }}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#5b35f5" />
            <Text style={styles.loadingText}>Opening Flipora…</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: { marginTop: 12, color: '#241d3b', fontSize: 16, fontWeight: '600' },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#5b35f5',
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 64,
    overflow: 'hidden',
  },
  title: { marginTop: 22, color: '#1d1730', fontSize: 24, fontWeight: '800' },
  message: { marginTop: 10, color: '#706b7d', fontSize: 16, textAlign: 'center' },
  button: {
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: '#5b35f5',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});

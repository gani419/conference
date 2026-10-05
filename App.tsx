import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { AppProviders } from './src/app/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { bootstrapApp } from './src/app/bootstrap';
import { useAppDispatch } from './src/store/hooks';
import { useResolvedTheme } from './src/hooks/useResolvedTheme';

function ConferenceApp() {
  const dispatch = useAppDispatch();
  const { resolved, tokens } = useResolvedTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    bootstrapApp(dispatch)
      .finally(() => {
        setIsReady(true);
      });
  }, [dispatch]);

  if (!isReady) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: tokens.surface }]}>
        <View style={[styles.splashIconWrap, { backgroundColor: tokens.primarySurface }]}>
          <Text style={styles.splashIcon}>🎥</Text>
        </View>
        <Text style={[styles.splashTitle, { color: tokens.textMain }]}>Conference</Text>
        <Text style={[styles.splashSub, { color: tokens.textMuted }]}>
          Host-Controlled Meetings & Live-Streaming
        </Text>
        <ActivityIndicator size="small" color={tokens.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'}
      />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <ConferenceApp />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  splashIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  splashIcon: {
    fontSize: 36,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  splashSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  loader: {
    marginTop: 10,
  },
});

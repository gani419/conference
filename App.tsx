import { FeedbackHost } from './src/components/feedback/FeedbackHost';
import { AppIcon } from './src/components/icons/AppIcon';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { AppProviders } from './src/app/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { bootstrapApp } from './src/app/bootstrap';
import { useAppDispatch } from './src/store/hooks';
import { useResolvedTheme } from './src/hooks/useResolvedTheme';
import { supabase } from './src/backend/supabaseClient';
import { appSession } from './src/backend/supabaseModels';
import { setSession } from './src/store/slices/authSlice';
import { appApi } from './src/api/appApi';
import { useBackendSync } from './src/hooks/useBackendSync';

function ConferenceApp() {
  const dispatch = useAppDispatch();
  const { resolved, tokens } = useResolvedTheme();
  const [isReady, setIsReady] = useState(false);
  useBackendSync();
  usePushNotifications(isReady);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') dispatch(appApi.util.resetApiState());
      dispatch(setSession(session ? appSession(session) : null));
    });
    return () => data.subscription.unsubscribe();
  }, [dispatch]);

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
          <AppIcon style={styles.splashIcon} name="video" />
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
      <FeedbackHost />
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

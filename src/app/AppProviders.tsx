import React from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { store } from '../store';
import { linking } from '../navigation/linking';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          {children}
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
};

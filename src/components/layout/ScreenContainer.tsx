import React from 'react';
import { View, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean | undefined;
  padded?: boolean | undefined;
  contentContainerStyle?: object | undefined;
  testID?: string | undefined;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  padded = true,
  contentContainerStyle,
  testID,
}) => {
  const { isDark, tokens } = useResolvedTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: tokens.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: padded ? Math.max(insets.left, 16) : insets.left,
          paddingRight: padded ? Math.max(insets.right, 16) : insets.right,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.innerContent, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContent: {
    flex: 1,
  },
});

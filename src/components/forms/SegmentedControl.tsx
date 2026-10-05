import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onSelect: (val: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onSelect,
}: SegmentedControlProps<T>): React.ReactElement {
  const { tokens } = useResolvedTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.surfaceSubtle,
          borderColor: tokens.border,
        },
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.segmentButton,
              isSelected && {
                backgroundColor: tokens.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: isSelected ? '#FFFFFF' : tokens.textMuted,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    width: '100%',
  },
  segmentButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
  },
});

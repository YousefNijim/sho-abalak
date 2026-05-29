import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, radius, components, fontSizes, fontFamily, spacing } from '../tokens';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props {
  title?: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, icon, children }: Props) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getTextColor = () => {
    if (variant === 'secondary') return colors.primary;
    if (variant === 'danger') return '#fff';
    return '#fff';
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={[
          styles.base,
          styles[variant],
          isDisabled && styles.disabled,
          variant === 'primary' && styles.primaryShadow,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
        ) : children ? (
          children
        ) : (
          <React.Fragment>
            {title && (
              <Text style={[styles.text, { color: getTextColor() }]}>
                {title}
              </Text>
            )}
            {icon && icon}
          </React.Fragment>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52, // From design spec
    borderRadius: radius.md, // 12px
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: spacing[2],
  },
  primary: { backgroundColor: colors.primary },
  primaryShadow: Platform.select({
    ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    android: { elevation: 4 },
    web: { boxShadow: `0 4px 12px ${colors.primary}40` },
    default: {},
  }),
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary, // From design spec
  },
  danger: { backgroundColor: colors.error },
  disabled: { opacity: 0.6 },
  text: {
    fontSize: 16, // From design spec
    fontFamily: fontFamily.bold,
  },
});

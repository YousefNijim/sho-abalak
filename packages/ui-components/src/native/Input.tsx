import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, Platform } from 'react-native';
import { colors, radius, components, fontSizes, fontFamily, spacing } from '../tokens';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, leftIcon, rightIcon, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputContainer}>
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        <TextInput
          placeholderTextColor={colors.textMuted}
          textAlign="right"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            focused && styles.focused,
            !!error && styles.errored,
            {
              paddingRight: rightIcon ? 40 : 16,
              paddingLeft: leftIcon ? 40 : 16,
            },
            style,
          ]}
          {...rest}
        />
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
    textAlign: 'right',
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 52, // From design spec
    backgroundColor: '#FFFFFF', // From design spec (surface-white)
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    borderRadius: radius.md, // 12px
    paddingHorizontal: spacing[4],
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
    }),
  },
  focused: { borderColor: colors.primary, borderWidth: 1.5 },
  errored: { borderColor: colors.error, borderWidth: 1.5 },
  error: { fontSize: fontSizes.xs, color: colors.error, fontFamily: fontFamily.regular, textAlign: 'right' },
  iconRight: {
    position: 'absolute',
    right: spacing[3],
    zIndex: 1,
  },
  iconLeft: {
    position: 'absolute',
    left: spacing[3],
    zIndex: 1,
  },
});

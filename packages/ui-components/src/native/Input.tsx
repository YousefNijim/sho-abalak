import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, components, fontSizes, fontFamily, spacing } from '../tokens';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        textAlign="right"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.focused,
          !!error && styles.errored,
          style,
        ]}
        {...rest}
      />
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
  },
  input: {
    height: components.inputHeight,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing[4],
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  focused: { borderColor: colors.primary, borderWidth: 2 },
  errored: { borderColor: colors.error, borderWidth: 2 },
  error: { fontSize: fontSizes.xs, color: colors.error, fontFamily: fontFamily.regular },
});

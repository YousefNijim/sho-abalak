import { View, StyleSheet, ViewProps, Platform } from 'react-native';
import { colors, radius, spacing } from '../tokens';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', // From design spec
    borderRadius: radius.lg, // 16px usually
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border || 'rgba(229, 224, 213, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 20,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      },
    }),
  },
});

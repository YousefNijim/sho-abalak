import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import type { ProductCategory } from '@shu/api-client';
import { colors, radius, fontSizes, fontFamily, spacing } from '../../src/theme';

interface Props {
  subCategories: ProductCategory[];
  selected: ProductCategory | null;
  onSelect: (cat: ProductCategory | null) => void;
}

export function SubCategoryBar({ subCategories, selected, onSelect }: Props) {
  if (!subCategories || subCategories.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          style={[styles.chip, !selected && styles.chipSelected]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.text, !selected && styles.textSelected]}>الكل</Text>
        </Pressable>
        {subCategories.map((cat) => {
          const isSelected = selected?.id === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelect(cat)}
            >
              <Text style={[styles.text, isSelected && styles.textSelected]}>{cat.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing[2],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: '#2D3748', // Dark gray/black for selected sub
    borderColor: '#2D3748',
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  textSelected: {
    color: colors.white,
    fontFamily: fontFamily.medium,
  },
});

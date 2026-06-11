import React, { useRef, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import type { ProductCategory } from '@shu/api-client';
import { colors, radius, fontSizes, fontFamily, spacing } from '../../../src/theme';

interface Props {
  categories: ProductCategory[];
  selected: ProductCategory | null;
  onSelect: (cat: ProductCategory | null) => void;
}

export function MainCategoryBar({ categories, selected, onSelect }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Focus selected item
  useEffect(() => {
    if (selected) {
      const idx = categories.findIndex((c) => c.id === selected.id);
      if (idx !== -1) {
        scrollViewRef.current?.scrollTo({ x: idx * 80, animated: true }); // approximate width
      }
    }
  }, [selected, categories]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          style={[styles.chip, !selected && styles.chipSelected]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.text, !selected && styles.textSelected]}>الرئيسية</Text>
        </Pressable>
        {categories.map((cat) => {
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  text: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  textSelected: {
    color: colors.white,
    fontFamily: fontFamily.bold,
  },
});

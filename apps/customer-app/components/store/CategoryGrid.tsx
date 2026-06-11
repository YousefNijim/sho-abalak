import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import type { ProductCategory } from '@shu/api-client';
import { colors, radius, fontSizes, fontFamily, spacing } from '../../../src/theme';
import { BASE_URL } from '@shu/api-client';
import { Layers } from 'lucide-react-native';

interface Props {
  categories: ProductCategory[];
  onSelect: (cat: ProductCategory) => void;
}

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

export function CategoryGrid({ categories, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const numColumns = width > 500 ? 5 : 4;
  const padding = spacing.md * 2;
  const gap = spacing.sm;
  const availableWidth = width - padding - gap * (numColumns - 1);
  const itemWidth = Math.floor(availableWidth / numColumns);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>اختر القسم</Text>
      <FlatList
        data={categories}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const img = mediaUrl(item.imageUrl);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { width: itemWidth }, pressed && { opacity: 0.8 }]}
              onPress={() => onSelect(item)}
            >
              <View style={styles.imageContainer}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.image} contentFit="cover" />
                ) : (
                  <Layers size={24} color={colors.secondary} />
                )}
              </View>
              <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'left',
  },
  row: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

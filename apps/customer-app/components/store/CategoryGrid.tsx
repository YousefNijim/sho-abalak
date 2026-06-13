import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import type { ProductCategory } from '@shu/api-client';
import { colors, radius, fontSizes, fontFamily, spacing } from '../../src/theme';
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
  const numColumns = width > 768 ? 5 : 3;
  const padding = spacing.md * 2;
  const gap = spacing.md;
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
              style={({ pressed }) => [styles.card, { width: itemWidth }, pressed && styles.cardPressed]}
              onPress={() => onSelect(item)}
            >
              <View style={styles.imageContainer}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.image} contentFit="cover" transition={300} />
                ) : (
                  <Layers size={28} color={colors.primary} />
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
    paddingBottom: spacing.lg,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'right',
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
    justifyContent: 'flex-start',
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
});

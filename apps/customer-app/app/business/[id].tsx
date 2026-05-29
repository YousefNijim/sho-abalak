import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { BUSINESSES, PRODUCTS } from '../../src/mock';

const TABS = ['الكل', 'وجبات', 'مشروبات'];

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const business = BUSINESSES.find((b) => b.id === id) ?? BUSINESSES[0];
  const [tab, setTab] = useState(0);
  const [count, setCount] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: count > 0 ? 100 : 24 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={{ fontSize: 80 }}>{business.emoji}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{business.name}</Text>
          <Text style={styles.metaLine}>⭐ {business.rating} (120 تقييم)  ·  🕐 {business.time}</Text>
          <Text style={styles.metaLine}>📍 نابلس - المركز  ·  🛵 رسوم توصيل: {business.fee}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t, i) => (
            <Pressable key={t} onPress={() => setTab(i)}>
              <Text style={[styles.tabText, tab === i && styles.tabActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {/* Products */}
        <View style={{ paddingHorizontal: spacing[4], gap: spacing[3] }}>
          {PRODUCTS.map((p) => (
            <View key={p.id} style={styles.product}>
              <View style={styles.productImg}>
                <Text style={{ fontSize: 32 }}>🍽️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.muted}>{p.desc}</Text>
                <Text style={styles.price}>{p.price} ₪</Text>
              </View>
              <Pressable style={styles.add} onPress={() => setCount((c) => c + 1)}>
                <Text style={styles.addText}>+</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Cart bar */}
      {count > 0 ? (
        <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
          <Text style={styles.cartBarText}>{count} عناصر — عرض السلة</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  info: { padding: spacing[4], gap: 6 },
  name: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.textPrimary },
  metaLine: { color: colors.textMuted, fontSize: fontSizes.sm },
  tabs: { flexDirection: 'row', gap: spacing[6], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing[3] },
  tabText: { color: colors.textMuted, fontSize: fontSizes.base, fontWeight: '600' },
  tabActive: { color: colors.primary },
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  productImg: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  price: { color: colors.primary, fontWeight: '700', marginTop: 4 },
  add: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  cartBar: { position: 'absolute', bottom: 24, left: 16, right: 16, height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cartBarText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.base },
});

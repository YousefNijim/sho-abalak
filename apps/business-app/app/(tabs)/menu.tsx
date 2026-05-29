import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { MENU } from '../../src/mock';

export default function Menu() {
  const [items, setItems] = useState(MENU);

  const toggle = (id: string) =>
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, available: !it.available } : it)));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.head}>
        <Text style={styles.title}>قائمتي</Text>
        <Pressable style={styles.addBtn}>
          <Text style={styles.addText}>+ إضافة</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
        {items.map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={styles.img}><Text style={{ fontSize: 28 }}>🍽️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{it.name}</Text>
              <Text style={styles.muted}>{it.category}</Text>
              <Text style={styles.price}>{it.price} ₪</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing[2] }}>
              <Switch value={it.available} onValueChange={() => toggle(it.id)} trackColor={{ true: colors.primary }} />
              <View style={styles.actions}>
                <Text style={styles.actionIcon}>✏️</Text>
                <Text style={styles.actionIcon}>🗑️</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4] },
  title: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  addText: { color: '#fff', fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  img: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  price: { color: colors.primary, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing[3] },
  actionIcon: { fontSize: 18 },
});

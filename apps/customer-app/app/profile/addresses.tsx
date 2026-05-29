import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MapPin, Plus } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';

export default function Addresses() {
  const user = useAuthStore((s) => s.user);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MapPin size={24} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>المنطقة الحالية</Text>
            <Text style={styles.address}>{'المصيون، رام الله'}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.btn}>
          <Plus size={20} color="#fff" />
          <Text style={styles.btnText}>إضافة عنوان جديد</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing[4], gap: spacing[4] },
  card: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing[3] },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  address: { fontSize: fontSizes.sm, color: colors.textMuted, fontFamily: fontFamily.regular, textAlign: 'right', marginTop: 4 },
  footer: { padding: spacing[4], borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: colors.primary, paddingVertical: spacing[3], borderRadius: radius.md },
  btnText: { color: '#fff', fontSize: fontSizes.base, fontFamily: fontFamily.bold },
});

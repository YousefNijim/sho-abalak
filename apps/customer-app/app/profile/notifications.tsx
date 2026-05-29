import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';

export default function Notifications() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.emptyWrap}>
          <View style={styles.iconWrap}>
            <Bell size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
          <Text style={styles.emptyDesc}>سنقوم بإعلامك بأحدث العروض وحالة طلباتك هنا.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyWrap: { alignItems: 'center' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border + '50', alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
  emptyTitle: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, marginBottom: spacing[2] },
  emptyDesc: { fontSize: fontSizes.sm, color: colors.textMuted, fontFamily: fontFamily.regular, textAlign: 'center' },
});

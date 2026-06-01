import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { colors, fontFamily } from '../theme';
import { useNotificationsStore } from '../stores/notifications.store';

/**
 * Header bell that opens the in-app notifications list and shows an unread
 * indicator when there are new notifications. Used on the section landing,
 * home, and profile headers.
 */
export function NotificationBell({ size = 26 }: { size?: number }) {
  const router = useRouter();
  // Subscribe to items so the badge re-renders when notifications arrive.
  const items = useNotificationsStore((s) => s.items);
  const unread = items.filter((i) => !i.read).length;

  return (
    <Pressable
      style={styles.iconBtn}
      onPress={() => router.push('/profile/notifications')}
      accessibilityLabel="الإشعارات"
    >
      <Bell size={size} color={colors.primary} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: { padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: fontFamily.bold,
  },
});

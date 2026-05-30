import { Tabs } from 'expo-router';
import { ClipboardList, UtensilsCrossed, BarChart2, UserCircle } from 'lucide-react-native';
import { colors, fontFamily } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fontFamily.bold, fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الطلبات',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'القائمة',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <UtensilsCrossed size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'الإحصائيات',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'الحساب',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <UserCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

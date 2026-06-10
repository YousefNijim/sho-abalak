import { Tabs } from 'expo-router';
import { Home, Search, ShoppingBag, ClipboardList, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily, spacing } from '../../src/theme';
import { useCartStore } from '../../src/stores/cart.store';

// We use slightly different colors from FOOD section to distinguish STORES.
// FOOD uses #FCF3DC for background, stores uses #fbf8ff (Surface) from heritage_pulse
// But wait, the DESIGN.md of heritage pulse says:
// background-cream: '#FCF3DC'
// primary: '#974800'
// primary-container: '#e6781e'
// secondary: '#296a43'

export default function StoresTabsLayout() {
  const insets = useSafeAreaInsets();
  
  // We can still use the cart store, but the cart badge should match the Stores colors.
  const cartItems = useCartStore((s) => s.items);
  const cartQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#974800', // Saffron primary
        tabBarInactiveTintColor: '#8a7265', // Outline color
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e4e1eb', // surface-variant
          height: 64 + Math.max(insets.bottom, 16),
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: spacing[2],
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.medium,
          fontSize: 11,
          marginTop: 2,
        },
        headerStyle: { backgroundColor: '#FCF3DC' },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fontFamily.bold, fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="all"
        options={{
          title: 'المتاجر',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          href: '/cart', // navigates to global cart
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <View>
              <ShoppingBag size={size} color={color} />
              {cartQty > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartQty}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'الطلبات',
          href: '/(tabs)/orders', // global orders but might need specific store orders if requested
          headerShown: false,
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="business/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ba1a1a', // error color
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: fontFamily.bold,
  },
});

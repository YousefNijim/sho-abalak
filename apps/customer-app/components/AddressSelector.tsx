import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { ChevronDown, MapPin, Check, Plus, HomeIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { addressesApi } from '@shu/api-client';
import { useSavedAddressesStore } from '../src/stores/saved-addresses.store';
import { useAuthStore } from '../src/stores/auth.store';
import { colors, fontFamily, radius, spacing } from '../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export function AddressSelector() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pickerVisible, setPickerVisible] = useState(false);
  
  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);
  const selectAddress = useSavedAddressesStore((s) => s.select);

  const token = useAuthStore((s) => s.token);

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
    enabled: !!token,
  });

  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  return (
    <>
      <Pressable style={styles.headerAddressBtn} onPress={() => setPickerVisible(true)}>
        <View style={styles.addressLabelRow}>
          <Text style={styles.addressLabel}>التوصيل إلى</Text>
          <ChevronDown size={12} color={colors.primary} style={{ marginTop: 2 }} />
        </View>
        <Text style={styles.addressName} numberOfLines={1}>
          {selectedAddress 
            ? `${selectedAddress.label}، ${selectedAddress.area?.city || ''}` 
            : 'اختر عنوان التوصيل'}
        </Text>
      </Pressable>

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>اختر عنوان التوصيل</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {addresses.length === 0 ? (
              <View style={styles.emptyAddresses}>
                <MapPin size={40} color={colors.border} />
                <Text style={styles.emptyAddressesText}>لا توجد عناوين محفوظة</Text>
                <Text style={styles.emptyAddressesHint}>أضف عنواناً لتسريع عملية الطلب</Text>
              </View>
            ) : (
              addresses.map((a: any) => {
                const isActive = (selectedAddress?.id ?? null) === a.id || (selectedAddressId === null && addresses[0]?.id === a.id);
                return (
                  <Pressable
                    key={a.id}
                    style={[styles.addrRow, isActive && styles.addrRowActive]}
                    onPress={() => { selectAddress(a.id); setPickerVisible(false); }}
                  >
                    <View style={[styles.addrIconCircle, isActive && styles.addrIconCircleActive]}>
                      <HomeIcon size={18} color={isActive ? colors.primary : colors.textMuted} />
                    </View>
                    <View style={styles.addrRowText}>
                      <Text style={[styles.addrLabel, isActive && styles.addrLabelActive]}>{a.label}</Text>
                      <Text style={styles.addrDetail} numberOfLines={1}>{a.detail}</Text>
                    </View>
                    {isActive && <Check size={18} color={colors.primary} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <Pressable
            style={styles.addAddressBtn}
            onPress={() => { setPickerVisible(false); router.push('/profile/addresses' as any); }}
          >
            <Plus size={18} color={colors.white} />
            <Text style={styles.addAddressBtnText}>إضافة عنوان جديد</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerAddressBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  addressLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.primary,
  },
  addressName: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 16 },
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing[4],
    textAlign: 'right',
  },
  modalScroll: {
    maxHeight: 400,
  },
  emptyAddresses: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyAddressesText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing[3],
  },
  emptyAddressesHint: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing[3],
    backgroundColor: '#F9FAFB',
  },
  addrRowActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  addrIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing[3],
  },
  addrIconCircleActive: {
    backgroundColor: '#FFEDD5',
  },
  addrRowText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  addrLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
    textAlign: 'right',
  },
  addrLabelActive: {
    color: colors.primary,
  },
  addrDetail: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    marginTop: spacing[4],
    gap: spacing[2],
  },
  addAddressBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.white,
  },
});

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X, ScanLine } from 'lucide-react-native';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';

// CameraView is only imported on native — safe because Metro tree-shakes
// the dynamic require on web.
let CameraView: any = null;
let useCameraPermissions: any = null;
if (Platform.OS !== 'web') {
  const camera = require('expo-camera');
  CameraView = camera.CameraView;
  useCameraPermissions = camera.useCameraPermissions;
}

interface Props {
  visible: boolean;
  onScanned: (barcode: string) => void;
  onClose: () => void;
}

// ── Web implementation (USB scanner = keyboard input) ─────────────────────────
function WebScanner({ onScanned, onClose }: Omit<Props, 'visible'>) {
  const [manualInput, setManualInput] = useState('');
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      // If gap > 100ms, USB scanner finished — reset buffer
      if (now - lastKeyTimeRef.current > 100 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          onScanned(bufferRef.current);
          bufferRef.current = '';
        }
        return;
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScanned]);

  return (
    <View style={styles.webContainer}>
      <View style={styles.webHeader}>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.webTitle}>مسح الباركود</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.webBody}>
        <View style={styles.webIconCircle}>
          <ScanLine size={56} color={colors.primary} />
        </View>
        <Text style={styles.webHint}>وجّه الماسح الضوئي (USB) نحو الباركود</Text>
        <Text style={styles.webHintSub}>أو أدخله يدوياً أدناه</Text>

        <View style={styles.webInputRow}>
          <Pressable
            style={styles.webSubmitBtn}
            onPress={() => {
              const v = manualInput.trim();
              if (v.length >= 3) { onScanned(v); setManualInput(''); }
            }}
          >
            <Text style={styles.webSubmitText}>بحث</Text>
          </Pressable>
          <TextInput
            style={styles.webInput}
            value={manualInput}
            onChangeText={setManualInput}
            placeholder="أدخل الباركود..."
            placeholderTextColor={colors.textMuted}
            
            textAlign="left"
            keyboardType="default"
            returnKeyType="search"
            onSubmitEditing={() => {
              const v = manualInput.trim();
              if (v.length >= 3) { onScanned(v); setManualInput(''); }
            }}
            autoFocus
          />
        </View>
      </View>
    </View>
  );
}

// ── Native implementation (expo-camera) ───────────────────────────────────────
function NativeScanner({ onScanned, onClose }: Omit<Props, 'visible'>) {
  const [permissions, requestPermission] = useCameraPermissions
    ? useCameraPermissions()
    : [null, () => {}];
  const cooldownRef = useRef(false);

  const handleBarcode = ({ data }: { data: string }) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    onScanned(data);
    setTimeout(() => { cooldownRef.current = false; }, 1500);
  };

  if (!permissions) {
    return (
      <View style={styles.nativeLoading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permissions.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>يحتاج التطبيق إذن الكاميرا لمسح الباركود</Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>منح الإذن</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ marginTop: spacing[3] }}>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.medium }}>إلغاء</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {CameraView && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39'] }}
          onBarcodeScanned={handleBarcode}
        />
      )}

      {/* Dark overlay with scan frame */}
      <View style={styles.overlay}>
        {/* Top dark area */}
        <View style={styles.overlaySection} />

        {/* Middle row */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySection} />
          {/* Scan frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySection} />
        </View>

        {/* Bottom dark area */}
        <View style={[styles.overlaySection, { flex: 1.5 }]}>
          <Text style={styles.scanHint}>وجّه الكاميرا نحو الباركود</Text>
        </View>
      </View>

      {/* Close button */}
      <Pressable
        style={[styles.closeBtn, styles.nativeCloseBtn]}
        onPress={onClose}
        hitSlop={8}
      >
        <X size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.webModal}>
          <WebScanner onScanned={onScanned} onClose={onClose} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <NativeScanner onScanned={onScanned} onClose={onClose} />
    </Modal>
  );
}

const FRAME_SIZE = 240;
const CORNER = 24;
const BORDER = 3;

const styles = StyleSheet.create({
  // Web modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  webModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -200 }, { translateY: -200 }],
    width: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' } as any,
    }),
  },
  webContainer: {
    backgroundColor: colors.surface,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  webBody: {
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[4],
  },
  webIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHint: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  webHintSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -spacing[2],
  },
  webInputRow: {
    flexDirection: 'row',
    gap: spacing[2],
    width: '100%',
    alignItems: 'center',
  },
  webInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  webSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webSubmitText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: '#fff',
  },

  // Native
  nativeLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
    gap: spacing[4],
    backgroundColor: colors.background,
  },
  permissionText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
  },
  permissionBtnText: {
    fontFamily: fontFamily.bold,
    color: '#fff',
    fontSize: fontSizes.base,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  scanHint: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: '#fff',
    marginTop: spacing[4],
    textAlign: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : spacing[4],
    right: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

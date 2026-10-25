import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';

export interface BillPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageUri: string, fileName?: string) => void;
}

export const BillPickerModal: React.FC<BillPickerModalProps> = ({
  visible,
  onClose,
  onImageSelected,
}) => {
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleLaunchGallery = async () => {
    setPermissionError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onClose();
        onImageSelected(asset.uri, asset.fileName || 'bill_photo.jpg');
      }
    } catch {
      setPermissionError(
        'Photo gallery permission was denied or unavailable. Please grant photo library access in your settings.'
      );
    }
  };

  const handleLaunchCamera = async () => {
    setPermissionError(null);

    // Web camera handling
    if (Platform.OS === 'web') {
      // In web, browser camera access via WebRTC can be finicky; fallback to file picker or try camera
      try {
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          onClose();
          onImageSelected(asset.uri, asset.fileName || 'camera_bill.jpg');
          return;
        }
      } catch {
        // Fallback to gallery file picker
        handleLaunchGallery();
        return;
      }
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError(
          'Camera permission is required to photograph physical bills. Please enable camera access in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onClose();
        onImageSelected(asset.uri, asset.fileName || 'camera_bill.jpg');
      }
    } catch {
      setPermissionError(
        'Could not open camera. Please use the gallery picker instead.'
      );
    }
  };

  const handleUseDemoSample = () => {
    onClose();
    // High quality demo bill URI
    onImageSelected('https://picsum.photos/800/1200?random=42', 'sample_grocery_bill.jpg');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Scan Bill or Receipt</Text>
                  <Text style={styles.subtitle}>Select photo source for automated AI parsing</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {permissionError ? (
                <View style={styles.errorCard}>
                  <Ionicons name="alert-circle-outline" size={24} color={colors.debit} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorTitle}>Permission Needed</Text>
                    <Text style={styles.errorDesc}>{permissionError}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.optionsList}>
                {/* On Web: Gallery / File Picker is the primary choice */}
                <TouchableOpacity
                  style={[styles.optionBtn, Platform.OS === 'web' && styles.primaryOption]}
                  activeOpacity={0.7}
                  onPress={handleLaunchGallery}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.creditSubtle }]}>
                    <Ionicons name="images-outline" size={24} color={colors.primaryGreen} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Choose from Gallery / Files</Text>
                    <Text style={styles.optionDesc}>Select an existing bill image, receipt PDF, or snapshot</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Camera Option */}
                <TouchableOpacity
                  style={[styles.optionBtn, Platform.OS !== 'web' && styles.primaryOption]}
                  activeOpacity={0.7}
                  onPress={handleLaunchCamera}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.goldLight, borderWidth: 1, borderColor: colors.goldBorder }]}>
                    <Ionicons name="camera-outline" size={24} color={colors.goldFab} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Take Photo with Camera</Text>
                    <Text style={styles.optionDesc}>Snap receipt paper directly on your shop counter</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Mentor / Demo Sample */}
                <TouchableOpacity
                  style={styles.demoOptionBtn}
                  activeOpacity={0.7}
                  onPress={handleUseDemoSample}
                >
                  <Ionicons name="sparkles" size={18} color={colors.info} style={{ marginRight: 8 }} />
                  <Text style={styles.demoOptionText}>Use Pre-Loaded Demo Bill Receipt</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.7}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.debitSubtle,
    borderWidth: 1,
    borderColor: colors.debitBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.debit,
    marginBottom: 2,
  },
  errorDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  primaryOption: {
    borderColor: colors.primaryGreen,
    backgroundColor: colors.creamBackground,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  demoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoLight,
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  demoOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.infoText,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceNeutral,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});

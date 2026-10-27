import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { PrimaryButton } from '../../components/PrimaryButton';

export interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Success Checkmark Circle inspired by reference screen */}
          <View style={styles.checkCircleWrapper}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={36} color={colors.textWhite} />
            </View>
          </View>

          <Text style={styles.title}>Successful!</Text>
          <Text style={styles.subtitle}>
            Your BillBook digital Khata is connected and ready for merchant transactions.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryGreen} />
              <Text style={styles.featureText}>Integer-precision paise accounting</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="cloud-done-outline" size={18} color={colors.primaryGreen} />
              <Text style={styles.featureText}>Offline resilience with auto cloud sync</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={18} color={colors.primaryGreen} />
              <Text style={styles.featureText}>Customer credit limits and risk reports</Text>
            </View>
          </View>

          <PrimaryButton
            title="Browse Home"
            onPress={onClose}
            variant="primary"
            size="lg"
            style={styles.browseButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  checkCircleWrapper: {
    marginTop: -48,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 48,
    padding: 6,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  featuresList: {
    width: '100%',
    backgroundColor: colors.creamBackground,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  browseButton: {
    width: '100%',
  },
});

import React from 'react';
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
import { colors } from '../../theme/colors';

export interface AddActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (option: 'manual' | 'photo' | 'voice') => void;
}

export const AddActionModal: React.FC<AddActionModalProps> = ({
  visible,
  onClose,
  onSelectOption,
}) => {
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
                  <Text style={styles.title}>New Ledger Entry</Text>
                  <Text style={styles.subtitle}>Choose how you want to record this transaction</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {/* 1. Manual Entry */}
                <TouchableOpacity
                  style={styles.optionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onSelectOption('manual');
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.creditSubtle }]}>
                    <Ionicons name="create-outline" size={24} color={colors.primaryGreen} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Manual Entry</Text>
                    <Text style={styles.optionDesc}>Type transaction particulars, party & amount</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* 2. Scan Bill */}
                <TouchableOpacity
                  style={styles.optionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onSelectOption('photo');
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.goldLight, borderColor: colors.goldBorder, borderWidth: 1 }]}>
                    <Ionicons name="camera-outline" size={24} color={colors.goldFab} />
                  </View>
                  <View style={styles.optionContent}>
                    <View style={styles.tagRow}>
                      <Text style={styles.optionTitle}>Scan Bill / Invoice</Text>
                      <View style={styles.aiTag}>
                        <Text style={styles.aiTagText}>Gemini AI</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>Capture photo or pick receipt image for auto-extraction</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* 3. Voice Entry */}
                <TouchableOpacity
                  style={styles.optionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onSelectOption('voice');
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.debitLight }]}>
                    <Ionicons name="mic-outline" size={24} color={colors.debit} />
                  </View>
                  <View style={styles.optionContent}>
                    <View style={styles.tagRow}>
                      <Text style={styles.optionTitle}>Voice Note</Text>
                      <View style={[styles.aiTag, { backgroundColor: colors.debitSubtle }]}>
                        <Text style={[styles.aiTagText, { color: colors.debit }]}>Voice AI</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>
                      {'Hold to record in Hindi or English (e.g. "Rahul ko 500 diya")'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  aiTag: {
    backgroundColor: colors.creditLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryGreen,
    textTransform: 'uppercase',
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
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

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppHeader, PrimaryButton, Card } from '../../../src/components';
import { colors } from '../../../src/theme/colors';
import { dataService } from '../../../src/services/dataService';
import { Party, PartyType, UpdatePartyInput } from '../../../src/types';
import { parseINRToPaise } from '../../../src/utils/format';

export default function EditPartyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [party, setParty] = useState<Party | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<PartyType>('customer');
  const [openingBalance, setOpeningBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDays, setDueDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    dataService
      .getParty(id)
      .then((p) => {
        setParty(p);
        setName(p.name);
        setPhone(p.phone || '');
        setType(p.type);
        setOpeningBalance((p.opening_balance / 100).toString());
        setCreditLimit((p.credit_limit / 100).toString());
        setDueDays(p.due_days.toString());
        setLoading(false);
      })
      .catch((err) => {
        Alert.alert('Error', err?.message || 'Could not load party.');
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!id || !name.trim()) {
      Alert.alert('Required', 'Please enter a valid party name.');
      return;
    }

    setSubmitting(true);
    try {
      const input: UpdatePartyInput = {
        name: name.trim(),
        phone: phone.trim() || null,
        type,
        opening_balance: openingBalance ? parseINRToPaise(openingBalance) : 0,
        credit_limit: creditLimit ? parseINRToPaise(creditLimit) : 0,
        due_days: parseInt(dueDays, 10) || 30,
      };

      await dataService.updateParty(id, input);
      Alert.alert('Success', 'Party updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update party.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = () => {
    if (!id || !party) return;
    Alert.alert(
      'Archive Party',
      `Archive ${party.name}? Party will be hidden from active lists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.archiveParty(id);
              router.replace('/(tabs)/parties');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not archive party.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!id || !party) return;
    Alert.alert(
      'Delete Party',
      `Delete ${party.name}? This removes the party permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteParty(id);
              router.replace('/(tabs)/parties');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete party.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Edit Party" subtitle={party?.name} showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card variant="default" style={styles.card}>
            <Text style={styles.label}>Party Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91..."
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Opening Balance (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={openingBalance}
                  onChangeText={setOpeningBalance}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.half}>
                <Text style={styles.label}>Credit Limit (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Due Terms (Days)</Text>
            <TextInput
              style={styles.input}
              value={dueDays}
              onChangeText={setDueDays}
              keyboardType="number-pad"
            />

            <PrimaryButton
              title="Save Changes"
              onPress={handleSave}
              loading={submitting || loading}
              variant="primary"
              size="lg"
              style={{ marginTop: 20 }}
            />
          </Card>

          {/* Destructive Actions */}
          <Card variant="outline" style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Account Actions</Text>
            <View style={styles.dangerButtons}>
              <PrimaryButton
                title="Archive Party"
                onPress={handleArchive}
                variant="outline"
                size="sm"
                style={styles.archiveBtn}
              />
              <PrimaryButton
                title="Delete Party"
                onPress={handleDelete}
                variant="danger"
                size="sm"
                style={styles.deleteBtn}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.creamBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  dangerCard: {
    padding: 16,
    borderRadius: 16,
    borderColor: colors.debitBorder,
    backgroundColor: colors.debitSubtle,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.debit,
    marginBottom: 12,
  },
  dangerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  archiveBtn: {
    flex: 1,
  },
  deleteBtn: {
    flex: 1,
  },
});

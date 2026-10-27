import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../src/components/AppHeader';
import { AlertsView } from '../src/features/alerts/AlertsView';
import { colors } from '../src/theme/colors';

export default function AlertsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader
        title="Business Alerts"
        subtitle="Overdue & Credit Risk Radar"
        showBack={true}
        onBack={() => router.back()}
      />
      <AlertsView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
});

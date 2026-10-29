import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../src/components/AppHeader';
import { KhataChatView } from '../src/features/assistant/KhataChatView';
import { colors } from '../src/theme/colors';

export default function AssistantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();

  return (
    <View style={styles.container}>
      <AppHeader
        title="KhataAI Assistant"
        subtitle="Digital Accounting Copilot"
        showBack={true}
        showLogo={true}
        onBack={() => router.back()}
      />
      <KhataChatView initialQuestion={params.q} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
});

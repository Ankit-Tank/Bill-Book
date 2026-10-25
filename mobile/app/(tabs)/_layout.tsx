import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { AddActionModal } from '../../src/features/capture/AddActionModal';

export default function TabLayout() {
  const router = useRouter();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleSelectOption = (option: 'manual' | 'photo' | 'voice') => {
    if (option === 'manual') {
      router.push('/transaction/new');
    } else {
      router.push({
        pathname: '/transaction/capture',
        params: { mode: option },
      });
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryGreen,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={22}
                color={color as string}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="parties"
          options={{
            title: 'Parties',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={22}
                color={color as string}
              />
            ),
          }}
        />

        {/* Center Gold FAB Button */}
        <Tabs.Screen
          name="center-fab"
          options={{
            title: '',
            tabBarButton: () => (
              <View style={styles.fabWrapper}>
                <TouchableOpacity
                  onPress={() => setShowAddMenu(true)}
                  style={styles.fabButton}
                  activeOpacity={0.85}
                  accessibilityLabel="Add New Entry"
                >
                  <Ionicons name="add" size={32} color={colors.onboardingDarkGreen} />
                </TouchableOpacity>
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowAddMenu(true);
            },
          }}
        />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>

      <AddActionModal
        visible={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        onSelectOption={handleSelectOption}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  fabWrapper: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.goldFab,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.goldFab,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: colors.surface,
  },
});

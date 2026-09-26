/**
 * App navigation.
 *
 * A bottom tab bar (Home / Medicines / Memories / People / My Day) is the patient's primary,
 * always-visible way to move around — consistent placement matters more than screen
 * depth for this audience. Each tab owns a small native stack so utility screens
 * (Ask, Who is this?, Why am I here?, the full day's routine) can still push with a
 * normal back gesture without cluttering the tab bar itself.
 */
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AskScreen } from '../screens/AskScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { JournalEntryScreen } from '../screens/JournalEntryScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { MedicinesScreen } from '../screens/MedicinesScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { RoutineScreen } from '../screens/RoutineScreen';
import { WhoCanHelpScreen } from '../screens/WhoCanHelpScreen';
import { WhoIsThisScreen } from '../screens/WhoIsThisScreen';
import { WhyAmIHereScreen } from '../screens/WhyAmIHereScreen';
import { theme } from '../theme';

export type HomeStackParamList = {
  Home: undefined;
  WhoIsThis: undefined;
  Ask: undefined;
  WhyAmIHere: undefined;
  WhoCanHelp: undefined;
};
export type MedicinesStackParamList = {
  MedicinesHome: undefined;
  Routine: undefined;
};
export type MemoriesStackParamList = {
  MemoriesHome: undefined;
};
export type PeopleStackParamList = {
  PeopleHome: undefined;
  WhoIsThis: undefined;
};
export type JournalStackParamList = {
  JournalHome: undefined;
  JournalEntry: { entryDate: string; initialText: string };
};
export type TabParamList = {
  HomeTab: undefined;
  MedicinesTab: undefined;
  MemoriesTab: undefined;
  PeopleTab: undefined;
  JournalTab: undefined;
};

const stackOptions = {
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.text,
  headerTitleStyle: { fontFamily: theme.font.bold, fontSize: theme.fontSize.body },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.colors.background },
} as const;

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="WhoIsThis" component={WhoIsThisScreen} options={{ title: 'Who is this?' }} />
      <HomeStack.Screen name="Ask" component={AskScreen} options={{ title: 'Ask a question' }} />
      <HomeStack.Screen name="WhyAmIHere" component={WhyAmIHereScreen} options={{ title: 'Why am I here?' }} />
      <HomeStack.Screen name="WhoCanHelp" component={WhoCanHelpScreen} options={{ title: 'Who can help me?' }} />
    </HomeStack.Navigator>
  );
}

const MedicinesStack = createNativeStackNavigator<MedicinesStackParamList>();
function MedicinesStackNavigator() {
  return (
    <MedicinesStack.Navigator screenOptions={stackOptions}>
      <MedicinesStack.Screen name="MedicinesHome" component={MedicinesScreen} options={{ headerShown: false }} />
      <MedicinesStack.Screen name="Routine" component={RoutineScreen} options={{ title: 'Today' }} />
    </MedicinesStack.Navigator>
  );
}

const MemoriesStack = createNativeStackNavigator<MemoriesStackParamList>();
function MemoriesStackNavigator() {
  return (
    <MemoriesStack.Navigator screenOptions={stackOptions}>
      <MemoriesStack.Screen name="MemoriesHome" component={MemoriesScreen} options={{ headerShown: false }} />
    </MemoriesStack.Navigator>
  );
}

const PeopleStack = createNativeStackNavigator<PeopleStackParamList>();
function PeopleStackNavigator() {
  return (
    <PeopleStack.Navigator screenOptions={stackOptions}>
      <PeopleStack.Screen name="PeopleHome" component={PeopleScreen} options={{ headerShown: false }} />
      <PeopleStack.Screen name="WhoIsThis" component={WhoIsThisScreen} options={{ title: 'Who is this?' }} />
    </PeopleStack.Navigator>
  );
}

const JournalStack = createNativeStackNavigator<JournalStackParamList>();
function JournalStackNavigator() {
  return (
    <JournalStack.Navigator screenOptions={stackOptions}>
      <JournalStack.Screen name="JournalHome" component={JournalScreen} options={{ headerShown: false }} />
      <JournalStack.Screen name="JournalEntry" component={JournalEntryScreen} options={{ title: 'My Day' }} />
    </JournalStack.Navigator>
  );
}

const TAB_ICON: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home',
  MedicinesTab: 'medkit',
  MemoriesTab: 'images',
  PeopleTab: 'people',
  JournalTab: 'sunny',
};
const TAB_ICON_OUTLINE: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home-outline',
  MedicinesTab: 'medkit-outline',
  MemoriesTab: 'images-outline',
  PeopleTab: 'people-outline',
  JournalTab: 'sunny-outline',
};

const Tab = createBottomTabNavigator<TabParamList>();

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primaryDark,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surfaceWarm,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 72 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 10),
          },
          // Active tab: darker, bolder label + tinted pill behind the icon; inactive stays quiet.
          tabBarLabel: ({ focused, color, children }) => (
            <Text style={[styles.label, { color }, focused && styles.labelActive]} numberOfLines={1}>
              {children}
            </Text>
          ),
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <Ionicons name={focused ? TAB_ICON[route.name] : TAB_ICON_OUTLINE[route.name]} size={24} color={color} />
            </View>
          ),
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Home' }} />
        <Tab.Screen name="MedicinesTab" component={MedicinesStackNavigator} options={{ title: 'Medicines' }} />
        <Tab.Screen name="MemoriesTab" component={MemoriesStackNavigator} options={{ title: 'Memories' }} />
        <Tab.Screen name="PeopleTab" component={PeopleStackNavigator} options={{ title: 'People' }} />
        <Tab.Screen name="JournalTab" component={JournalStackNavigator} options={{ title: 'My Day' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // A soft pill behind the active icon makes "where am I" obvious without relying on colour alone.
  iconPill: { width: 60, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  iconPillActive: { backgroundColor: theme.colors.primaryTint },
  label: { fontFamily: theme.font.regular, fontSize: 13, lineHeight: 16 },
  labelActive: { fontFamily: theme.font.bold },
});

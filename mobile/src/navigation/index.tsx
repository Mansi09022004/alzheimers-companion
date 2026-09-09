/**
 * App navigation (React Navigation, native stack).
 *
 * A native stack is a simple mental model: screens are pushed on top of each other
 * and popped with the back gesture / button.
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AskScreen } from '../screens/AskScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MedicinesScreen } from '../screens/MedicinesScreen';
import { WhoIsThisScreen } from '../screens/WhoIsThisScreen';
import { WhyAmIHereScreen } from '../screens/WhyAmIHereScreen';
import { theme } from '../theme';

export type RootStackParamList = {
  Home: undefined;
  WhoIsThis: undefined;
  Ask: undefined;
  WhyAmIHere: undefined;
  Medicines: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontSize: theme.fontSize.body },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="WhoIsThis"
          component={WhoIsThisScreen}
          options={{ title: 'Who is this?' }}
        />
        <Stack.Screen name="Ask" component={AskScreen} options={{ title: 'Ask a question' }} />
        <Stack.Screen
          name="WhyAmIHere"
          component={WhyAmIHereScreen}
          options={{ title: 'Why am I here?' }}
        />
        <Stack.Screen name="Medicines" component={MedicinesScreen} options={{ title: 'My medicines' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

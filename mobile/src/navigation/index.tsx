/**
 * App navigation (React Navigation, native stack).
 *
 * Introduced in Phase 5 now that we have more than two screens. A native stack is
 * a simple mental model: screens are pushed on top of each other and popped with
 * the back gesture / button.
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { WhoIsThisScreen } from '../screens/WhoIsThisScreen';
import { theme } from '../theme';

export type RootStackParamList = {
  Home: undefined;
  WhoIsThis: undefined;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

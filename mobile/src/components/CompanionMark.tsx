/** The app's brand mark — the Alzheimer's Companion logo, used wherever the app identifies itself. */
import { Image, StyleSheet, View } from 'react-native';

export function CompanionMark({ size = 96 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={require('../../assets/branding/logo-icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Alzheimer's Companion"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

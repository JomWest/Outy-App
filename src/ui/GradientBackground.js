import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { colors } from '../theme';

export default function GradientBackground({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgEnd }}>
      <LinearGradient
        colors={[colors.bgStart, colors.bgEnd]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      {children}
    </View>
  );
}
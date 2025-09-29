import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled} style={{ borderRadius: radius.lg }}>
      <LinearGradient
        colors={[colors.purpleStart, colors.purpleEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ borderRadius: radius.lg, paddingVertical: 16 }}
      >
        <Text style={{ textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '600' }}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
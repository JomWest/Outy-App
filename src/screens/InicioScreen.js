import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import GradientBackground from '../ui/GradientBackground';
import PrimaryButton from '../ui/PrimaryButton';
import { colors, spacing, typography, radius } from '../theme';

export default function InicioScreen({ navigation }) {
  return (
    <GradientBackground>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 64 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../../assets/logo_outy.png')} style={{ width: 64, height: 64, marginBottom: spacing.md }} />
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Bienvenido a Outy</Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
            Este es OUTY la oportunidad que miles de profesionales Nicaragüenses necesitan
          </Text>
        </View>

        <PrimaryButton title="Iniciar Sesión" onPress={() => navigation.navigate('Login')} />

        <TouchableOpacity
          style={{ backgroundColor: colors.card, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.sm }}
          onPress={() => {}}
        >
          <Text style={{ textAlign: 'center', color: '#111', fontSize: 16, fontWeight: '600' }}>Crear Cuenta</Text>
        </TouchableOpacity>
      </View>
    </GradientBackground>
  );
}
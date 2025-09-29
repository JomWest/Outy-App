import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../ui/GradientBackground';
import PrimaryButton from '../ui/PrimaryButton';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@outy.local');
  const [password, setPassword] = useState('Outy123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Email y password son requeridos');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: 'Bienvenida' }] });
    } catch (e) {
      setError(e.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 64 }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <Image source={require('../../assets/logo_outy.png')} style={{ width: 56, height: 56, marginBottom: spacing.sm }} />
          <Text style={[typography.h1, { color: colors.textPrimary, fontSize: 30 }]}>Iniciar Sesión</Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            Este es OUTY la oportunidad que miles de profesionales Nicaragüenses necesitan
          </Text>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Correo</Text>
          <View style={{ position: 'relative' }}>
            <Ionicons name="mail-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="jomwest@gmail.com"
              placeholderTextColor="#9CA3AF"
              style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
            />
          </View>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Contraseña</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingRight: 44, paddingLeft: 36 }}
            />
            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 10, top: 16 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => setRemember(r => !r)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: remember ? colors.purpleEnd : 'transparent' }} />
            <Text style={{ color: colors.textSecondary }}>Recordar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Text style={{ color: colors.link }}>Recuperar Contraseña</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text>
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton title={loading ? 'Ingresando...' : 'Ingresar'} onPress={onSubmit} disabled={loading} />
        </View>

        <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: spacing.sm }}>
            <View style={{ height: 1, backgroundColor: colors.border, flex: 1 }} />
            <Text style={{ color: colors.textSecondary }}>Ingresar con:</Text>
            <View style={{ height: 1, backgroundColor: colors.border, flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md }}>
              <Ionicons name="logo-google" size={18} color="#DB4437" style={{ marginRight: 6 }} />
              <Text style={{ color: '#111', fontWeight: '600' }}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md }}>
              <Ionicons name="logo-facebook" size={18} color="#1877F2" style={{ marginRight: 6 }} />
              <Text style={{ color: '#111', fontWeight: '600' }}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}
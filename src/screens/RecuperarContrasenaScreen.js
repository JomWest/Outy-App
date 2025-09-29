import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import GradientBackground from '../ui/GradientBackground';
import PrimaryButton from '../ui/PrimaryButton';
import { colors, spacing, typography, radius } from '../theme';

export default function RecuperarContrasenaScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) return 'El nombre es requerido';
    if (!formData.email.trim()) return 'El email es requerido';
    if (!formData.email.includes('@')) return 'Email inválido';
    return null;
  };

  const onSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call password recovery API
      const response = await fetch('http://localhost:4000/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          nombre: formData.nombre.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el código');
      }
      
      Alert.alert(
        'Código enviado',
        'Se ha enviado un código de verificación a tu email.',
        [
          {
            text: 'Continuar',
            onPress: () => navigation.navigate('VerificarEmail', {
              email: formData.email,
              nombre: formData.nombre
            })
          }
        ]
      );

    } catch (err) {
      console.error('Error sending recovery code:', err);
      setError(err.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 20, 
            backgroundColor: colors.purpleStart,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <Ionicons name="key" size={40} color="white" />
          </View>
          
          <Text style={[typography.h1, { color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
            Recuperar{'\n'}Contraseña
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginBottom: spacing.lg }}>
          {/* Name Input */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Nombre</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={formData.nombre}
                onChangeText={(text) => setFormData(prev => ({ ...prev, nombre: text }))}
                placeholder="Jonar de Jesús Díaz"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
              />
              <Ionicons name="person-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
            </View>
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Correo Electrónico</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="jornar@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
              />
              <Ionicons name="mail-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <Text style={{ color: colors.danger, fontSize: 14, textAlign: 'center', marginBottom: spacing.md }}>
              {error}
            </Text>
          )}

          {/* Submit Button */}
          <PrimaryButton
            title="Enviar Código"
            onPress={onSubmit}
            disabled={loading}
          />
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />
      </View>
    </GradientBackground>
  );
}
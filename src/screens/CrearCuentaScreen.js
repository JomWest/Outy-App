import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import GradientBackground from '../ui/GradientBackground';
import PrimaryButton from '../ui/PrimaryButton';
import LoadingModal from '../ui/LoadingModal';
import SuccessModal from '../ui/SuccessModal';
import ErrorModal from '../ui/ErrorModal';
import { colors, spacing, typography, radius } from '../theme';
import { api } from '../api/client';

export default function CrearCuentaScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    fechaNacimiento: '',
    telefono: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const formatDate = (text) => {
    // Auto-format date as DD/MM/YYYY
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const formatPhone = (text) => {
    // Auto-format phone as XXXX-XXXX
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) return 'El nombre es requerido';
    if (!formData.email.trim()) return 'El email es requerido';
    if (!formData.email.includes('@')) return 'Email inválido';
    if (!formData.fechaNacimiento) return 'La fecha de nacimiento es requerida';
    if (formData.fechaNacimiento.length !== 10) return 'Fecha inválida (DD/MM/YYYY)';
    if (!formData.telefono) return 'El teléfono es requerido';
    if (formData.telefono.length < 8) return 'Teléfono inválido';
    if (!formData.password) return 'La contraseña es requerida';
    if (formData.password.length < 10) return 'La contraseña debe tener al menos 10 caracteres';
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
      // Prepare data for API
      const userData = {
        email: formData.email.trim().toLowerCase(),
        password_hash: formData.password, // The API will hash it
        role: 'candidato', // Default role
        phone_number: formData.telefono.replace('-', '')
      };

      // Create user via API
      const response = await fetch('http://localhost:4000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la cuenta');
      }

      const newUser = await response.json();
      
      // Mostrar modal de éxito
      setShowSuccessModal(true);

    } catch (err) {
      console.error('Error creating account:', err);
      setErrorMessage(err.message || 'Error al crear la cuenta');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalNavigate = () => {
    setShowSuccessModal(false);
    navigation.navigate('Login');
  };

  const handleErrorModalRetry = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    // El usuario puede intentar nuevamente
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60 }}
          showsVerticalScrollIndicator={false}
        >
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
               <Ionicons name="person-add" size={40} color="white" />
             </View>
            
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: 8
            }}>
              Crear Cuenta
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              lineHeight: 22
            }}>
              Esta es OUTY la oportunidad que miles de{'\n'}profesionales Nicaragüenses esperaban
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: 32 }}>
            {/* Name Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Nombre</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.nombre}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, nombre: text }))}
                  placeholder="Jonar de Jesús Díaz"
                  placeholderTextColor="#9CA3AF"
                  style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                />
                <Ionicons name="person-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
              </View>
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: spacing.md }}>
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

            {/* Birth Date Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Fecha de Nacimiento</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.fechaNacimiento}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fechaNacimiento: formatDate(text) }))}
                  placeholder="18/03/2001"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                  style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                />
                <Ionicons name="calendar-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
              </View>
            </View>

            {/* Phone Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Número de Teléfono</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.telefono}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, telefono: formatPhone(text) }))}
                  placeholder="5815-5967"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={9}
                  style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                />
                <Ionicons name="call-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
              </View>
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Contraseña</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36, paddingRight: 44 }}
                />
                <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 10, top: 16 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <Text style={{
                color: '#FF6B6B',
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 16,
                backgroundColor: 'rgba(255,107,107,0.1)',
                padding: 12,
                borderRadius: 8
              }}>
                {error}
              </Text>
            )}

            {/* Submit Button */}
            <PrimaryButton
              title="Crear Cuenta"
              onPress={onSubmit}
              loading={loading}
            />
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Loading Modal */}
      <LoadingModal 
        visible={loading} 
        message="Creando cuenta..." 
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        message="Usuario creado exitosamente"
        onNavigateToLogin={handleSuccessModalNavigate}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onRetry={handleErrorModalRetry}
        onClose={handleErrorModalClose}
      />
    </GradientBackground>
  );
}
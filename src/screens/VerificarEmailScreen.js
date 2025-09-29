import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import GradientBackground from '../ui/GradientBackground';
import PrimaryButton from '../ui/PrimaryButton';
import { colors, spacing, typography, radius } from '../theme';

export default function VerificarEmailScreen({ navigation, route }) {
  const { email, nombre } = route.params || {};
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRefs = useRef([]);

  const updateCode = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    if (error) setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Por favor ingresa el código completo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call verification API
      const response = await fetch('http://localhost:4000/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: fullCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al verificar el código');
      }
      
      Alert.alert(
        'Verificación exitosa',
        'Tu código ha sido verificado correctamente.',
        [
          {
            text: 'Continuar',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );

    } catch (err) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    try {
      setLoading(true);
      
      // Call resend code API
      const response = await fetch('http://localhost:4000/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          nombre: nombre
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al reenviar el código');
      }
      
      Alert.alert('Código reenviado', 'Se ha enviado un nuevo código a tu email.');
      
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo reenviar el código');
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
            <Ionicons name="mail" size={40} color="white" />
          </View>
          
          <Text style={[typography.h1, { color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
            Verifica tu email
          </Text>
        </View>

        {/* Code Input Card */}
        <View style={{ 
          backgroundColor: colors.card, 
          borderRadius: radius.lg, 
          padding: spacing.lg, 
          marginBottom: spacing.lg 
        }}>
          <Text style={[typography.h2, { color: '#111', textAlign: 'center', marginBottom: 8 }]}>
            Ingresa el Código
          </Text>
          <Text style={{ color: '#666', textAlign: 'center', marginBottom: spacing.lg }}>
            Hemos enviado un código de verificación. Por favor,{'\n'}revisa tu bandeja de entrada.
          </Text>

          {/* Code Input Boxes */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  textAlign: 'center',
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#111'
                }}
                value={code[index] || ''}
                onChangeText={(text) => updateCode(index, text)}
                 onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Error Message */}
          {error && (
            <Text style={{ color: colors.danger, fontSize: 14, textAlign: 'center', marginBottom: spacing.md }}>
              {error}
            </Text>
          )}

          {/* Verify Button */}
          <PrimaryButton
            title="Verificar"
            onPress={onVerify}
            disabled={loading || code.join('').length !== 6}
          />
        </View>

        {/* Resend Code */}
        <TouchableOpacity 
          onPress={onResendCode}
          disabled={loading}
          style={{ 
            backgroundColor: colors.card, 
            paddingVertical: 14, 
            borderRadius: radius.md 
          }}
        >
          <Text style={{ textAlign: 'center', color: '#111', fontSize: 16, fontWeight: '600' }}>
            Reenviar Código
          </Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ flex: 1 }} />
      </View>
    </GradientBackground>
  );
}
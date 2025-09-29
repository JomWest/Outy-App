import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function ErrorModal({ visible, message, onRetry, onClose }) {
  const handleContactSupport = () => {
    // Abrir email para contactar soporte
    const email = 'jomwestt@gmail.com';
    const subject = 'Error en creación de cuenta';
    const body = `Hola, tuve un problema al crear mi cuenta:\n\n${message}\n\nPor favor, ayúdenme a resolverlo.`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(err => {
      console.error('Error opening email client:', err);
      // Fallback: mostrar información de contacto
      alert('Contacta a soporte en: soporte@outy.com');
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: radius.lg,
          padding: 32,
          alignItems: 'center',
          maxWidth: 320,
          width: '100%'
        }}>
          {/* Error Icon */}
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#EF4444',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <Ionicons name="close" size={40} color="white" />
          </View>

          {/* Error Title */}
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#1F2937',
            textAlign: 'center',
            marginBottom: 12
          }}>
            Error al crear cuenta
          </Text>

          {/* Error Message */}
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 32
          }}>
            {message || 'Ocurrió un error inesperado. Por favor, inténtalo nuevamente.'}
          </Text>

          {/* Action Buttons */}
          <View style={{ width: '100%', gap: 12 }}>
            {/* Retry Button */}
            <TouchableOpacity 
              onPress={onRetry}
              activeOpacity={0.9}
              style={{ width: '100%' }}
            >
              <LinearGradient
                colors={[colors.purpleStart, colors.purpleEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  borderRadius: radius.md,
                  paddingVertical: 16,
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600'
                }}>
                  Intentar Nuevamente
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Contact Support Button */}
            <TouchableOpacity 
              onPress={handleContactSupport}
              activeOpacity={0.9}
              style={{
                width: '100%',
                borderWidth: 2,
                borderColor: colors.purpleStart,
                borderRadius: radius.md,
                paddingVertical: 14,
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: colors.purpleStart,
                fontSize: 16,
                fontWeight: '600'
              }}>
                Contactar Soporte
              </Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity 
              onPress={onClose}
              activeOpacity={0.9}
              style={{
                width: '100%',
                paddingVertical: 12,
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: '#6B7280',
                fontSize: 14,
                fontWeight: '500'
              }}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function SuccessModal({ visible, message, onNavigateToLogin, onClose, title }) {
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
          {/* Success Icon */}
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#10B981',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <Ionicons name="checkmark" size={40} color="white" />
          </View>

          {/* Success Message */}
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#1F2937',
            textAlign: 'center',
            marginBottom: 12
          }}>
            {title || '¡Operación exitosa!'}
          </Text>

          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 32
          }}>
            {message || 'La acción se ha completado correctamente.'}
          </Text>

          {/* Action Button - Single Accept */}
          <TouchableOpacity 
            onPress={onClose || onNavigateToLogin}
            style={{ width: '100%' }}
            activeOpacity={0.9}
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
                Aceptar
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
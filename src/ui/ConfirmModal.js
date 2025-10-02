import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function ConfirmModal({ visible, title, message, confirmText = 'Eliminar', cancelText = 'Cancelar', onConfirm, onClose }) {
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
          maxWidth: 340,
          width: '100%'
        }}>
          {/* Warning Icon */}
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#F59E0B',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <Ionicons name="alert" size={40} color="white" />
          </View>

          {/* Title */}
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#1F2937',
            textAlign: 'center',
            marginBottom: 12
          }}>
            {title || 'Confirmar acción'}
          </Text>

          {/* Message */}
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24
          }}>
            {message || '¿Estás seguro de continuar?'}
          </Text>

          {/* Action Buttons */}
          <View style={{ width: '100%', gap: 12 }}>
            {/* Confirm Button */}
            <TouchableOpacity 
              onPress={onConfirm}
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
                  {confirmText}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity 
              onPress={onClose}
              activeOpacity={0.9}
              style={{
                width: '100%',
                borderWidth: 2,
                borderColor: '#D1D5DB',
                borderRadius: radius.md,
                paddingVertical: 14,
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: '#6B7280',
                fontSize: 16,
                fontWeight: '600'
              }}>
                {cancelText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
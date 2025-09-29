import React from 'react';
import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { colors, typography } from '../theme';

export default function LoadingModal({ visible, message = 'Creando cuenta...' }) {
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
        paddingHorizontal: 40
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 40,
          alignItems: 'center',
          minWidth: 280,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 10,
        }}>
          {/* Loading Spinner */}
          <ActivityIndicator 
            size="large" 
            color={colors.purpleStart} 
            style={{ marginBottom: 20 }}
          />
          
          {/* Loading Message */}
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: 8
          }}>
            {message}
          </Text>
          
          {/* Subtitle */}
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20
          }}>
            Por favor espera mientras procesamos tu solicitud
          </Text>
        </View>
      </View>
    </Modal>
  );
}
import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

export default function PrimaryButton({ title, onPress, disabled, loading }) {
  const isDisabled = disabled || loading;
  
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress} 
      disabled={isDisabled} 
      style={{ 
        borderRadius: radius.lg,
        opacity: isDisabled ? 0.6 : 1
      }}
    >
      <LinearGradient
        colors={[colors.purpleStart, colors.purpleEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ 
          borderRadius: radius.lg, 
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {loading && (
          <ActivityIndicator 
            size="small" 
            color="#fff" 
            style={{ marginRight: 8 }} 
          />
        )}
        <Text style={{ 
          textAlign: 'center', 
          color: '#fff', 
          fontSize: 16, 
          fontWeight: '600' 
        }}>
          {loading ? 'Procesando...' : title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
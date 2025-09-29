import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function BienvenidaScreen({ navigation }) {
  const { user, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Inicio' }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#111' }}>¡Bienvenido!</Text>
      <Text style={{ marginTop: 8, fontSize: 16, color: '#555' }}>{user?.email}</Text>
      <Text style={{ marginTop: 2, fontSize: 14, color: '#777' }}>Rol: {user?.role}</Text>

      <TouchableOpacity
        style={{ backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10, marginTop: 24 }}
        onPress={() => {}}
      >
        <Text style={{ textAlign: 'center', color: 'white', fontSize: 16, fontWeight: '600' }}>Continuar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 10, marginTop: 12 }}
        onPress={onLogout}
      >
        <Text style={{ textAlign: 'center', color: 'white', fontSize: 16, fontWeight: '600' }}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
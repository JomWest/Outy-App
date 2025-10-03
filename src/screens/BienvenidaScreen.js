import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, radius } from '../theme';

export default function BienvenidaScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState((user?.full_name?.trim()) || (user?.name?.trim()) || 'Usuario');

  useEffect(() => {
    let mounted = true;
    const loadAvatar = async () => {
      try {
        if (!user?.id || !token) return;
        const url = await api.getFileFromDatabase(user.id, 'profile_image', token);
        if (mounted) setAvatarUrl(url || null);
      } catch (e) {
        console.log('Bienvenida avatar load error', e?.message || e);
      }
    };
    const loadProfileName = async () => {
      try {
        if (!user?.id || !token) return;
        const profile = await api.getCandidateProfile(user.id, token);
        const name = (profile?.full_name?.trim()) || null;
        if (mounted && name) setDisplayName(name);
      } catch (e) {
        console.log('Bienvenida profile name load error', e?.message || e);
      }
    };
    loadAvatar();
    loadProfileName();
    return () => { mounted = false; };
  }, [user?.id, token, user?.profile_image_updated_at]);

  const onContinue = () => navigation.replace('Home');
  const onLogout = async () => { await logout(); navigation.reset({ index: 0, routes: [{ name: 'Inicio' }] }); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#EDE9FE',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          overflow: 'hidden'
        }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <Ionicons name="person" size={40} color={colors.purpleStart} />
          )}
        </View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937' }}>¡Hola, {displayName}!</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>{user?.email}</Text>
        {!!user?.role && (
          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Rol: {user.role}</Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={onContinue} style={{ backgroundColor: colors.purpleStart, paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.md }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Continuar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={{ backgroundColor: '#E5E7EB', paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.md }}>
          <Text style={{ color: '#111827', fontWeight: '600' }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
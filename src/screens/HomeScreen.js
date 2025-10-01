import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius } from '../theme';
import { api } from '../api/client';

export default function HomeScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const headerTitleSize = isSmall ? 22 : 24;
  const subTitleSize = isSmall ? 14 : 16;
  const numColumns = width < 360 ? 1 : 2;
  const menuCardWidth = numColumns === 2 ? '48%' : '100%';
  const avatarSize = isSmall ? 40 : 44;
  // Helpers para mostrar nombre y rol con mejor formato
  const toTitleCase = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
  const displayName = (user?.full_name?.trim()) || toTitleCase(user?.email?.split('@')[0]) || 'Usuario';
  const roleMap = { admin: 'Admin', employee: 'Empleado', candidate: 'Candidato', company: 'Empresa' };
  const roleLabel = roleMap[user?.role] || 'Usuario';

  useEffect(() => {
    let mounted = true;
    const loadAvatar = async () => {
      try {
        if (!user?.id || !token) return;
        const url = await api.getFileFromDatabase(user.id, 'profile_image', token);
        if (mounted) setAvatarUrl(url || null);
      } catch (e) {
        console.log('Avatar load error', e?.message || e);
      }
    };
    loadAvatar();
    return () => { mounted = false; };
  }, [user?.id, token, user?.profile_image_updated_at]);

  const onLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Inicio' }] });
  };

  const menuItems = [
    {
      id: 'chats',
      title: 'Mensajes',
      subtitle: 'Chatea con otros usuarios',
      icon: 'chatbubbles',
      color: colors.purpleStart,
      onPress: () => navigation.navigate('Chats')
    },
    {
      id: 'jobs',
      title: 'Trabajos',
      subtitle: 'Encuentra oportunidades',
      icon: 'briefcase',
      color: '#10B981',
      onPress: () => navigation.navigate('Jobs')
    },
    {
      id: 'profile',
      title: 'Mi Perfil',
      subtitle: 'Gestiona tu información',
      icon: 'person',
      color: '#F59E0B',
      onPress: () => navigation.navigate('Profile')
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      subtitle: 'Mantente al día',
      icon: 'notifications',
      color: '#EF4444',
      onPress: () => {}
    }
  ];

  const recentJobs = [
    {
      id: 1,
      title: 'Desarrollador Frontend',
      company: 'Tech Solutions',
      location: 'Managua',
      type: 'Tiempo completo'
    },
    {
      id: 2,
      title: 'Diseñador UX/UI',
      company: 'Creative Agency',
      location: 'León',
      type: 'Medio tiempo'
    },
    {
      id: 3,
      title: 'Analista de Datos',
      company: 'Data Corp',
      location: 'Granada',
      type: 'Remoto'
    }
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.purpleStart, colors.purpleEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 24,
          paddingVertical: 20,
          paddingTop: Platform.OS === 'ios' ? 40 : 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24
        }}
      >
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.6)'
            }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
              ) : (
                <Ionicons name="person" size={isSmall ? 20 : 22} color="white" />
              )}
            </View>
            <View style={{ maxWidth: width - 160 }}>
              <Text style={{
                fontSize: headerTitleSize,
                fontWeight: 'bold',
                color: 'white'
              }} numberOfLines={1}>
                ¡Hola, {displayName}!
              </Text>
              <Text style={{
                fontSize: subTitleSize,
                color: 'rgba(255,255,255,0.85)',
                marginTop: 4
              }}>
                {roleLabel} • Bienvenido a OUTY
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)'
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onLogout}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
                marginLeft: 12
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu Principal */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: 16
          }}>
            Menú Principal
          </Text>
          
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: numColumns === 2 ? 'space-between' : 'flex-start'
          }}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={item.onPress}
                style={{
                  backgroundColor: 'white',
                  borderRadius: radius.lg,
                  padding: 20,
                  width: menuCardWidth,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                  borderWidth: Platform.OS === 'web' ? 1 : 0,
                  borderColor: '#EEF2FF'
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: `${item.color}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12
                }}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 4
                }}>
                  {item.title}
                </Text>
                
                <Text style={{
                  fontSize: 14,
                  color: '#6B7280',
                  lineHeight: 18
                }}>
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trabajos Recientes */}
        <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#1F2937'
            }}>
              Trabajos Recientes
            </Text>
            
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={{
                fontSize: 14,
                color: colors.purpleStart,
                fontWeight: '600'
              }}>
                Ver todos
              </Text>
            </TouchableOpacity>
          </View>

          {recentJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={{
                backgroundColor: 'white',
                borderRadius: radius.lg,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: Platform.OS === 'web' ? 1 : 0,
                borderColor: '#EEF2FF'
              }}
              activeOpacity={0.8}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: 4
                  }}>
                    {job.title}
                  </Text>
                  
                  <Text style={{
                    fontSize: 14,
                    color: '#6B7280',
                    marginBottom: 8
                  }}>
                    {job.company} • {job.location}
                  </Text>
                  
                  <View style={{
                    backgroundColor: `${colors.purpleStart}15`,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: radius.sm,
                    alignSelf: 'flex-start'
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: colors.purpleStart,
                      fontWeight: '500'
                    }}>
                      {job.type}
                    </Text>
                  </View>
                </View>
                
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB'
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
          <TouchableOpacity style={{ alignItems: 'center' }} activeOpacity={0.8}>
            <Ionicons name="home" size={24} color={colors.purpleStart} />
            <Text style={{ fontSize: 12, color: colors.purpleStart, marginTop: 4, fontWeight: '500' }}>
              Inicio
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ alignItems: 'center' }}
            onPress={() => navigation.navigate('Chats')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Mensajes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }} activeOpacity={0.8}>
            <Ionicons name="briefcase-outline" size={24} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Trabajos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ alignItems: 'center' }}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={24} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Perfil
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
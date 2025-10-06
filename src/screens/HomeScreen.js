import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, useWindowDimensions, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius } from '../theme';
import { api } from '../api/client';
import { normalizeTextSafe } from '../services/text';

export default function HomeScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const numColumns = width < 360 ? 1 : 2;
  const menuCardWidth = numColumns === 2 ? '48%' : '100%';
  // Tamaños adaptativos para mantener todo en una sola línea
  const avatarSize = width < 420 ? 32 : (width < 560 ? 36 : 44);
  const headerTitleSize = width < 420 ? 18 : (width < 560 ? 20 : 24);
  const subTitleSize = width < 560 ? 12 : 14;
  const headerPaddingX = width < 420 ? 12 : 24;
  const headerMaxWidth = 1080; // contenedor centrado
  const iconButtonSize = width < 420 ? 34 : (width < 560 ? 36 : 44);
  const iconSize = width < 420 ? 18 : (width < 560 ? 20 : 24);
  const inlineSpacing = width < 420 ? 8 : 12;
  // Helpers para mostrar nombre y rol con mejor formato
  const toTitleCase = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
  // Mostrar siempre el nombre desde la BD; si no hay, usar 'Usuario'
  const [displayName, setDisplayName] = useState(normalizeTextSafe((user?.full_name?.trim()) || (user?.name?.trim()) || 'Usuario'));
  const roleMap = { admin: 'Admin', employee: 'Empleado', candidate: 'Candidato', company: 'Empresa' };
  const roleLabel = roleMap[user?.role] || 'Usuario';
  const [stats, setStats] = useState({ total: 0, byRole: { admin: 0, employee: 0, candidate: 0, company: 0 } });
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // Destacados
  const [featuredWorkers, setFeaturedWorkers] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  // Lists memoizados para rendimiento
  const candidatesList = useMemo(() => directoryUsers.filter(u => u.role === 'candidate'), [directoryUsers]);
  const employersList = useMemo(() => directoryUsers.filter(u => u.role === 'company'), [directoryUsers]);
  
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
    const loadProfileName = async () => {
      try {
        if (!user?.id || !token) return;
        const profile = await api.getCandidateProfile(user.id, token);
        const name = (profile?.full_name?.trim()) || null;
        if (mounted && name) setDisplayName(normalizeTextSafe(name));
      } catch (e) {
        console.log('Home profile name load error', e?.message || e);
      }
    };
    const loadStats = async () => {
      try {
        if (!token) return;
        const users = await api.getAllUsers(token);
        const total = users.length;
        const byRole = users.reduce((acc, u) => {
          const r = u.role || 'usuario';
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        }, {});
        if (mounted) {
          setStats({ total, byRole });
          setDirectoryUsers(users);
        }
      } catch (err) {
        console.log('Stats load error', err?.message || err);
      }
    };
    loadAvatar();
    loadStats();
    loadProfileName();
    const loadFeatured = async () => {
      try {
        if (!token) return;
        setLoadingFeatured(true);
        // Usuarios destacados: verificados y disponibles. Filtrar por rating mínimo y ordenar por mejor rating y reseñas.
        const workers = await api.searchWorkers({ verified_only: true, available_only: true, min_rating: 4.2 }, token);
        const sorted = Array.isArray(workers)
          ? [...workers].sort((a, b) => {
              const ar = a?.average_rating ?? 0;
              const br = b?.average_rating ?? 0;
              if (br !== ar) return br - ar;
              const at = a?.total_reviews ?? 0;
              const bt = b?.total_reviews ?? 0;
              return bt - at;
            })
          : [];
        setFeaturedWorkers(sorted.slice(0, 6));

        // Trabajos destacados: abiertos, ordenados por urgencia y fecha
        const jobs = await api.searchExpressJobs({ status: 'abierto' }, token);
        setFeaturedJobs(Array.isArray(jobs) ? jobs.slice(0, 6) : []);
      } catch (e) {
        console.log('Featured load error', e?.message || e);
      } finally {
        setLoadingFeatured(false);
      }
    };
    loadFeatured();
    return () => { mounted = false; };
  }, [user?.id, token, user?.profile_image_updated_at]);

  const getInitials = (text) => {
    const str = (text || '').trim();
    if (!str) return 'U';
    const parts = str.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

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
      id: 'express_jobs',
      title: 'Trabajos Exprés',
      subtitle: 'Servicios rápidos y oficios',
      icon: 'flash',
      color: colors.purpleEnd,
      onPress: () => navigation.navigate('ExpressJobs')
    },
    {
      id: 'pending_express_jobs',
      title: 'Trabajos pendientes',
      subtitle: 'Marca y califica tus trabajos',
      icon: 'checkmark-done',
      color: '#10B981',
      onPress: () => navigation.navigate('PendingExpressJobs')
    },
    {
      id: 'my_express_ads',
      title: 'Mis Anuncios Exprés',
      subtitle: 'Gestiona tus anuncios publicados',
      icon: 'hammer',
      color: colors.purpleStart,
      onPress: () => navigation.navigate('MyExpressAds')
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
      onPress: () => navigation.navigate('NotificationsCenter')
    }
  ];

  // Añadir opción de Moderación para admin y super_admin
  if (user?.role === 'super_admin' || user?.role === 'admin') {
    menuItems.push({
      id: 'admin_reports',
      title: 'Moderación',
      subtitle: 'Ver reportes y bloqueos',
      icon: 'shield-checkmark',
      color: colors.purpleEnd,
      onPress: () => navigation.navigate('AdminReports')
    });
  }

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
          paddingHorizontal: headerPaddingX,
          paddingVertical: 20,
          paddingTop: Platform.OS === 'ios' ? 40 : 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24
        }}
      >
        <View style={{ width: '100%', maxWidth: headerMaxWidth, alignSelf: 'center' }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <View style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: inlineSpacing,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.6)'
            }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
              ) : (
                <Ionicons name="person" size={iconSize} color="white" />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{
                fontSize: headerTitleSize,
                fontWeight: 'bold',
                color: 'white'
              }} numberOfLines={1} ellipsizeMode="tail">
                ¡Hola, {displayName}!
              </Text>
              {width >= 560 && (
                <Text style={{
                  fontSize: subTitleSize,
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: 2
                }} numberOfLines={1} ellipsizeMode="tail">
                  {roleLabel} • Bienvenido a OUTY
                </Text>
              )}
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationsCenter')}
              style={{
                width: iconButtonSize,
                height: iconButtonSize,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
                marginRight: inlineSpacing
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={iconSize} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{
                width: iconButtonSize,
                height: iconButtonSize,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)'
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={iconSize} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onLogout}
              style={{
                width: iconButtonSize,
                height: iconButtonSize,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
                marginLeft: inlineSpacing
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={iconSize} color="white" />
            </TouchableOpacity>
          </View>
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

          {/* Directorio: Candidatos y Empleadores (web eliminado) */}
          {Platform.OS === 'web' ? null : (
            <View style={{
              backgroundColor: 'white',
              borderRadius: radius.lg,
              padding: 16,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
              borderWidth: 0
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>Candidatos</Text>
              {candidatesList.map((u) => (
                <View key={u.id} style={{ backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{normalizeTextSafe(u.full_name) || u.email}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => handleViewProfile(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#EEF2FF', marginRight: 8 }}><Text>Ver perfil</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleMessage(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#DBEAFE', marginRight: 8 }}><Text>Mensajes</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleHire(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#D1FAE5', marginRight: 8 }}><Text>Contratar</Text></TouchableOpacity>
                    {user?.role === 'admin' && (
                      <TouchableOpacity onPress={() => handleDeleteUser(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#FEE2E2' }}>
                        <Text style={{ color: '#B91C1C' }}>Eliminar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginTop: 12, marginBottom: 8 }}>Empleadores</Text>
              {employersList.map((u) => (
                <View key={u.id} style={{ backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{normalizeTextSafe(u.full_name) || u.email}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => handleViewProfile(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#EEF2FF', marginRight: 8 }}><Text>Ver perfil</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleMessage(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#DBEAFE', marginRight: 8 }}><Text>Mensajes</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleHire(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#FDE68A', marginRight: 8 }}><Text>Contratar</Text></TouchableOpacity>
                    {user?.role === 'admin' && (
                      <TouchableOpacity onPress={() => handleDeleteUser(u)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: '#FEE2E2' }}>
                        <Text style={{ color: '#B91C1C' }}>Eliminar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
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

        {/* Usuarios destacados */}
        <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>Usuarios destacados</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ExpressJobs')}>
              <Text style={{ fontSize: 14, color: colors.purpleStart, fontWeight: '600' }}>Ver más</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
            {(loadingFeatured && featuredWorkers.length === 0) ? (
              <Text style={{ color: '#6B7280' }}>Cargando…</Text>
            ) : (
              featuredWorkers.map((w) => (
                <TouchableOpacity key={w.id} onPress={() => handleViewWorker(w)} activeOpacity={0.85} style={{
                  backgroundColor: 'white', borderRadius: radius.lg, padding: 12, width: 220, marginRight: 12,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                  borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: '#EEF2FF'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 10 }}>
                      {w.profile_picture_url ? (
                        <Image source={{ uri: w.profile_picture_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151' }}>{getInitials(normalizeTextSafe(w.full_name || w.specialty || 'Usuario'))}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{normalizeTextSafe(w.full_name || 'Trabajador')}</Text>
                      <Text numberOfLines={1} style={{ fontSize: 12, color: '#6B7280' }}>{normalizeTextSafe(w.specialty || w.trade_category_name || 'Oficio')}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={{ marginLeft: 4, fontSize: 12, color: '#6B7280' }}>{(w.average_rating ?? 0).toFixed(1)} ({w.total_reviews ?? 0})</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Trabajos destacados */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>Trabajos destacados</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ExpressJobs')}>
              <Text style={{ fontSize: 14, color: colors.purpleStart, fontWeight: '600' }}>Ver más</Text>
            </TouchableOpacity>
          </View>
          {(loadingFeatured && featuredJobs.length === 0) ? (
            <Text style={{ color: '#6B7280' }}>Cargando…</Text>
          ) : (
            featuredJobs.map((job) => (
              <View key={job.id} style={{
                backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: '#EEF2FF'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 }}>{job.title}</Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
                      {(job.trade_category_name || 'Oficio')} • {(job.department || '')}{job.municipality ? `, ${job.municipality}` : ''}
                    </Text>
                    {job.urgency && (
                      <View style={{ backgroundColor: `${colors.purpleStart}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 12, color: colors.purpleStart, fontWeight: '500' }}>{toTitleCase(job.urgency)}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </View>
            ))
          )}
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
          
          <TouchableOpacity 
            style={{ alignItems: 'center' }} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Jobs')}
          >
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
  const handleViewWorker = (w) => {
    try {
      const candidateId = w?.user_id;
      if (!candidateId) {
        Alert.alert('Perfil no disponible', 'No se pudo abrir el perfil de este usuario.');
        return;
      }
      navigation.navigate('CandidateProfile', {
        candidateId,
        candidateName: normalizeTextSafe(w?.full_name || 'Candidato')
      });
    } catch (e) {
      console.log('Error al abrir perfil de destacado', e?.message || e);
    }
  };
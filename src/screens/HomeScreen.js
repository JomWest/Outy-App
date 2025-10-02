import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, useWindowDimensions, Platform, Alert } from 'react-native';
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
  const [stats, setStats] = useState({ total: 0, byRole: { admin: 0, employee: 0, candidate: 0, company: 0 } });
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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
      id: 'express_jobs',
      title: 'Trabajos Exprés',
      subtitle: 'Servicios rápidos y oficios',
      icon: 'flash',
      color: colors.purpleEnd,
      onPress: () => navigation.navigate('ExpressJobs')
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

          {/* Estadísticas de Usuarios */}
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
            borderWidth: Platform.OS === 'web' ? 1 : 0,
            borderColor: '#EEF2FF'
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
              Estadísticas de usuarios
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ width: '50%', paddingRight: 8, marginBottom: 12 }}>
                <View style={{ backgroundColor: `${colors.purpleStart}10`, padding: 12, borderRadius: radius.md }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Total</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.purpleStart }}>{stats.total}</Text>
                </View>
              </View>
              {Object.entries(stats.byRole).map(([role, count]) => (
                <View key={role} style={{ width: '50%', paddingRight: 8, marginBottom: 12 }}>
                  <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: radius.md }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{role}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Directorio: Candidatos y Empleadores */}
          {Platform.OS === 'web' ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #EEF2FF'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: '48%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: '#1F2937', fontSize: 16 }}>Candidatos</span>
                  </div>
                  <div>
                    {candidatesList.map((u) => (
                      <div key={u.id} style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{u.full_name || u.email}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleViewProfile(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#EEF2FF', color: '#1F2937', border: 'none' }}>Ver perfil</button>
                          <button onClick={() => handleMessage(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#DBEAFE', color: '#1F2937', border: 'none' }}>Mensajes</button>
                          <button onClick={() => handleHire(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#D1FAE5', color: '#065F46', border: 'none' }}>Contratar</button>
                          {user?.role === 'admin' && (
                            <button onClick={() => handleDeleteUser(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#FEE2E2', color: '#B91C1C', border: 'none' }}>Eliminar</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ width: '48%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: '#1F2937', fontSize: 16 }}>Empleadores</span>
                  </div>
                  <div>
                    {employersList.map((u) => (
                      <div key={u.id} style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{u.full_name || u.email}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleViewProfile(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#EEF2FF', color: '#1F2937', border: 'none' }}>Ver perfil</button>
                          <button onClick={() => handleMessage(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#DBEAFE', color: '#1F2937', border: 'none' }}>Mensajes</button>
                          <button onClick={() => handleHire(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#FDE68A', color: '#92400E', border: 'none' }}>Contratar</button>
                          {user?.role === 'admin' && (
                            <button onClick={() => handleDeleteUser(u)} style={{ padding: '8px 10px', borderRadius: 8, background: '#FEE2E2', color: '#B91C1C', border: 'none' }}>Eliminar</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Detalles (web) */}
              {showDetails && selectedUser && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', borderRadius: 12, padding: 20, width: 420, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Detalles del usuario</span>
                      <button onClick={() => setShowDetails(false)} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, padding: '6px 10px' }}>Cerrar</button>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{selectedUser.full_name || selectedUser.email}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{selectedUser.email}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Rol: {selectedUser.role}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { handleMessage(selectedUser); setShowDetails(false); }} style={{ padding: '8px 10px', borderRadius: 8, background: '#DBEAFE', color: '#1F2937', border: 'none' }}>Mensajes</button>
                      <button onClick={() => { handleHire(selectedUser); setShowDetails(false); }} style={{ padding: '8px 10px', borderRadius: 8, background: '#D1FAE5', color: '#065F46', border: 'none' }}>Contratar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{u.full_name || u.email}</Text>
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
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{u.full_name || u.email}</Text>
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
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

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
          paddingTop: 40
        }}
      >
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <View>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: 'white'
            }}>
              ¡Hola, {user?.email?.split('@')[0]}!
            </Text>
            <Text style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.8)',
              marginTop: 4
            }}>
              {user?.role === 'employee' ? 'Empleado' : 'Candidato'} • Bienvenido a OUTY
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 12,
                borderRadius: radius.md
              }}
            >
              <Ionicons name="person-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onLogout}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 12,
                borderRadius: radius.md
              }}
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
            justifyContent: 'space-between'
          }}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={item.onPress}
                style={{
                  backgroundColor: 'white',
                  borderRadius: radius.lg,
                  padding: 20,
                  width: '48%',
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3
                }}
                activeOpacity={0.7}
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
            
            <TouchableOpacity>
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
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2
              }}
              activeOpacity={0.7}
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
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB'
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
          <TouchableOpacity style={{ alignItems: 'center' }}>
            <Ionicons name="home" size={24} color={colors.purpleStart} />
            <Text style={{ fontSize: 12, color: colors.purpleStart, marginTop: 4, fontWeight: '500' }}>
              Inicio
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ alignItems: 'center' }}
            onPress={() => navigation.navigate('Chats')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Mensajes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }}>
            <Ionicons name="briefcase-outline" size={24} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Trabajos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ alignItems: 'center' }}
            onPress={() => navigation.navigate('Profile')}
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
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius } from '../theme';
import { CONFIG } from '../config';

export default function JobsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    loadJobs();
    loadCategories();
    loadLocations();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${CONFIG.API_URL}/api/jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // La API CRUD devuelve un objeto con estructura paginada: { page, pageSize, total, items }
        const jobsArray = data.items || data || [];
        setJobs(Array.isArray(jobsArray) ? jobsArray.filter(job => job.status === 'active') : []);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Error', 'No se pudieron cargar los trabajos');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/job_categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // La API CRUD devuelve un objeto con estructura paginada: { page, pageSize, total, items }
        const categoriesArray = data.items || data || [];
        setCategories(Array.isArray(categoriesArray) ? categoriesArray : []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/locations_nicaragua`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // La API CRUD devuelve un objeto con estructura paginada: { page, pageSize, total, items }
        const locationsArray = data.items || data || [];
        setLocations(Array.isArray(locationsArray) ? locationsArray : []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sin categoría';
  };

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? `${location.municipality}, ${location.department}` : 'Ubicación no especificada';
  };

  const formatSalary = (min, max, currency = 'NIO') => {
    if (!min && !max) return 'Salario a convenir';
    if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `Desde ${currency} ${min.toLocaleString()}`;
    if (max) return `Hasta ${currency} ${max.toLocaleString()}`;
  };

  const getEmploymentTypeText = (type) => {
    const types = {
      'tiempo_completo': 'Tiempo completo',
      'medio_tiempo': 'Medio tiempo',
      'contrato': 'Por contrato',
      'pasantia': 'Pasantía'
    };
    return types[type] || type;
  };

  const handleJobPress = (job) => {
    navigation.navigate('JobDetail', { job });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
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
            alignItems: 'center',
            marginBottom: 10
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: 'white'
            }}>
              Trabajos Disponibles
            </Text>
          </View>
        </LinearGradient>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{ marginTop: 16, color: '#666' }}>Cargando trabajos...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          alignItems: 'center',
          marginBottom: 10
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white'
          }}>
            Trabajos Disponibles
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MyApplications')}
            style={{ marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={18} color="white" />
              <Text style={{ color: 'white', marginLeft: 6, fontWeight: '600' }}>Mis postulaciones</Text>
            </View>
          </TouchableOpacity>
        </View>
        
          <Text style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.8)',
            marginTop: 4
          }}>
          {jobs.length} oportunidades encontradas
          </Text>
      </LinearGradient>

      {/* Jobs List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {jobs.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60
          }}>
            <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#64748B',
              marginTop: 16,
              textAlign: 'center'
            }}>
              No hay trabajos disponibles
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#94A3B8',
              marginTop: 8,
              textAlign: 'center'
            }}>
              Vuelve más tarde para ver nuevas oportunidades
            </Text>
          </View>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              onPress={() => handleJobPress(job)}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#1E293B',
                    marginBottom: 4
                  }}>
                    {job.title}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#64748B',
                    marginBottom: 8
                  }}>
                    {getCategoryName(job.job_category_id)}
                  </Text>
                </View>
                
                <View style={{
                  backgroundColor: job.employment_type === 'tiempo_completo' ? '#10B981' : 
                                 job.employment_type === 'medio_tiempo' ? '#F59E0B' : 
                                 job.employment_type === 'contrato' ? '#8B5CF6' : '#06B6D4',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 12,
                    fontWeight: '600'
                  }}>
                    {getEmploymentTypeText(job.employment_type)}
                  </Text>
                </View>
              </View>

              <Text style={{
                fontSize: 14,
                color: '#475569',
                lineHeight: 20,
                marginBottom: 12
              }} numberOfLines={3}>
                {job.description}
              </Text>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8
              }}>
                <Ionicons name="location-outline" size={16} color="#64748B" />
                <Text style={{
                  fontSize: 14,
                  color: '#64748B',
                  marginLeft: 6
                }}>
                  {getLocationName(job.location_id)}
                </Text>
              </View>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <Ionicons name="cash-outline" size={16} color="#64748B" />
                <Text style={{
                  fontSize: 14,
                  color: '#64748B',
                  marginLeft: 6
                }}>
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                </Text>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#94A3B8'
                }}>
                  Publicado {new Date(job.created_at).toLocaleDateString()}
                </Text>
                
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: colors.purpleStart,
                    fontWeight: '600',
                    marginRight: 4
                  }}>
                    Ver detalles
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.purpleStart} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
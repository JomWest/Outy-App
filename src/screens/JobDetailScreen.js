import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius } from '../theme';
import { CONFIG } from '../config';

export default function JobDetailScreen({ route, navigation }) {
  const { job } = route.params;
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    loadCompanyProfile();
    loadCategories();
    loadLocations();
    checkIfApplied();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/company_profiles/${job.company_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanyProfile(data);
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
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

  const checkIfApplied = async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/job_applications?job_id=${job.id}&candidate_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const applications = await response.json();
        setHasApplied(applications.length > 0);
      }
    } catch (error) {
      console.error('Error checking application status:', error);
    }
  };

  const handleApply = async () => {
    if (hasApplied) {
      Alert.alert('Ya aplicaste', 'Ya has aplicado a este trabajo anteriormente.');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/job_applications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_id: job.id,
          candidate_id: user.id,
          cover_letter: coverLetter,
          status: 'enviada'
        })
      });

      if (response.ok) {
        setHasApplied(true);
        setShowApplicationModal(false);
        setCoverLetter('');
        Alert.alert(
          '¡Aplicación enviada!', 
          'Tu aplicación ha sido enviada exitosamente. El empleador podrá contactarte pronto.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Error al enviar la aplicación');
      }
    } catch (error) {
      console.error('Error applying to job:', error);
      Alert.alert('Error', 'No se pudo enviar la aplicación. Inténtalo de nuevo.');
    } finally {
      setApplying(false);
    }
  };

  const handleContactEmployer = async () => {
    try {
      // Crear conversación con el empleador
      const response = await fetch(`${CONFIG.API_URL}/api/conversations/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user1Id: user.id,
          user2Id: job.company_id
        })
      });

      if (response.ok) {
        const conversation = await response.json();
        navigation.navigate('Chat', { 
          conversationId: conversation.id,
          otherUserName: companyProfile?.company_name || 'Empleador'
        });
      } else {
        throw new Error('Error al crear la conversación');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'No se pudo iniciar la conversación. Inténtalo de nuevo.');
    }
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
            fontSize: 20,
            fontWeight: 'bold',
            color: 'white',
            flex: 1
          }} numberOfLines={1}>
            {job.title}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Job Header */}
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1E293B',
            marginBottom: 8
          }}>
            {job.title}
          </Text>
          
          <Text style={{
            fontSize: 18,
            color: '#64748B',
            marginBottom: 16
          }}>
            {companyProfile?.company_name || 'Cargando...'}
          </Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: 16
          }}>
            <View style={{
              backgroundColor: job.employment_type === 'tiempo_completo' ? '#10B981' : 
                             job.employment_type === 'medio_tiempo' ? '#F59E0B' : 
                             job.employment_type === 'contrato' ? '#8B5CF6' : '#06B6D4',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginRight: 8,
              marginBottom: 8
            }}>
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontWeight: '600'
              }}>
                {getEmploymentTypeText(job.employment_type)}
              </Text>
            </View>

            <View style={{
              backgroundColor: '#E2E8F0',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginBottom: 8
            }}>
              <Text style={{
                color: '#475569',
                fontSize: 12,
                fontWeight: '600'
              }}>
                {getCategoryName(job.job_category_id)}
              </Text>
            </View>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <Ionicons name="location-outline" size={18} color="#64748B" />
            <Text style={{
              fontSize: 16,
              color: '#64748B',
              marginLeft: 8
            }}>
              {getLocationName(job.location_id)}
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Ionicons name="cash-outline" size={18} color="#64748B" />
            <Text style={{
              fontSize: 16,
              color: '#64748B',
              marginLeft: 8,
              fontWeight: '600'
            }}>
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </Text>
          </View>

          <Text style={{
            fontSize: 14,
            color: '#94A3B8'
          }}>
            Publicado el {new Date(job.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Job Description */}
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#1E293B',
            marginBottom: 12
          }}>
            Descripción del trabajo
          </Text>
          
          <Text style={{
            fontSize: 16,
            color: '#475569',
            lineHeight: 24
          }}>
            {job.description}
          </Text>
        </View>

        {/* Requirements */}
        {job.requirements && (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#1E293B',
              marginBottom: 12
            }}>
              Requisitos
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: '#475569',
              lineHeight: 24
            }}>
              {job.requirements}
            </Text>
          </View>
        )}

        {/* Company Info */}
        {companyProfile && (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#1E293B',
              marginBottom: 12
            }}>
              Sobre la empresa
            </Text>
            
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#1E293B',
              marginBottom: 8
            }}>
              {companyProfile.company_name}
            </Text>

            {companyProfile.industry && (
              <Text style={{
                fontSize: 14,
                color: '#64748B',
                marginBottom: 8
              }}>
                Industria: {companyProfile.industry}
              </Text>
            )}

            {companyProfile.description && (
              <Text style={{
                fontSize: 16,
                color: '#475569',
                lineHeight: 24,
                marginBottom: 12
              }}>
                {companyProfile.description}
              </Text>
            )}

            {companyProfile.website_url && (
              <TouchableOpacity style={{
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Ionicons name="globe-outline" size={16} color={colors.purpleStart} />
                <Text style={{
                  fontSize: 14,
                  color: colors.purpleStart,
                  marginLeft: 6
                }}>
                  {companyProfile.website_url}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={{
        backgroundColor: 'white',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0'
      }}>
        <View style={{
          flexDirection: 'row',
          gap: 12
        }}>
          <TouchableOpacity
            onPress={handleContactEmployer}
            style={{
              flex: 1,
              backgroundColor: '#F1F5F9',
              paddingVertical: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.purpleStart} />
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.purpleStart,
              marginLeft: 8
            }}>
              Contactar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowApplicationModal(true)}
            disabled={hasApplied}
            style={{
              flex: 2,
              backgroundColor: hasApplied ? '#94A3B8' : colors.purpleStart,
              paddingVertical: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons 
              name={hasApplied ? "checkmark-circle" : "paper-plane"} 
              size={20} 
              color="white" 
            />
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: 'white',
              marginLeft: 8
            }}>
              {hasApplied ? 'Ya aplicaste' : 'Aplicar ahora'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Application Modal */}
      <Modal
        visible={showApplicationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0'
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#1E293B'
            }}>
              Aplicar al trabajo
            </Text>
            <TouchableOpacity onPress={() => setShowApplicationModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1E293B',
              marginBottom: 8
            }}>
              Carta de presentación (opcional)
            </Text>
            
            <Text style={{
              fontSize: 14,
              color: '#64748B',
              marginBottom: 16
            }}>
              Cuéntale al empleador por qué eres el candidato ideal para este puesto.
            </Text>

            <TextInput
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#1E293B',
                textAlignVertical: 'top',
                minHeight: 120,
                borderWidth: 1,
                borderColor: '#E2E8F0'
              }}
              placeholder="Escribe tu carta de presentación aquí..."
              placeholderTextColor="#94A3B8"
              multiline
              value={coverLetter}
              onChangeText={setCoverLetter}
            />
          </ScrollView>

          <View style={{
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0'
          }}>
            <TouchableOpacity
              onPress={handleApply}
              disabled={applying}
              style={{
                backgroundColor: applying ? '#94A3B8' : colors.purpleStart,
                paddingVertical: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {applying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="white" />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: 'white',
                    marginLeft: 8
                  }}>
                    Enviar aplicación
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
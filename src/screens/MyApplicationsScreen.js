import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors } from '../theme';
import { CONFIG } from '../config';

export default function MyApplicationsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobsById, setJobsById] = useState({});

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const resp = await api.getJobApplications({ candidate_id: user.id, page: 1, pageSize: 200 }, token);
      const items = Array.isArray(resp) ? resp : (resp.items || []);
      setApplications(items);
      // Fetch related jobs details in parallel (unique job_ids)
      const uniqueJobIds = [...new Set(items.map(a => a.job_id).filter(Boolean))];
      const jobsEntries = await Promise.all(uniqueJobIds.map(async (id) => {
        try {
          const job = await fetch(`${CONFIG.API_URL}/api/jobs/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }).then(r => r.ok ? r.json() : null).catch(() => null);
          return job ? [id, job] : null;
        } catch (e) {
          return null;
        }
      }));
      const jobsMap = Object.fromEntries(jobsEntries.filter(Boolean));
      setJobsById(jobsMap);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudieron cargar tus postulaciones');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const statusLabel = (s) => {
    const map = { enviada: 'Enviada', revisada: 'Revisada', aceptada: 'Aceptada', rechazada: 'Rechazada' };
    return map[s] || s || 'Desconocido';
  };

  const openChatWithCompany = async (job) => {
    try {
      const companyId = job?.company_id;
      if (!companyId) throw new Error('Empresa no disponible');
      const conv = await api.createConversation(user.id, companyId, token);
      navigation.navigate('Chat', { conversationId: conv.id, otherUserName: job?.company_name || 'Empleador' });
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo iniciar la conversación');
    }
  };

  const openJobDetail = (job) => {
    if (!job) return;
    navigation.navigate('JobDetail', { job });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Mis Postulaciones</Text>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{ marginTop: 16, color: '#666' }}>Cargando postulaciones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Mis Postulaciones</Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {applications.length} postulaciones
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {applications.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#64748B', marginTop: 16, textAlign: 'center' }}>No has enviado postulaciones</Text>
            <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>Explora trabajos y aplica a nuevas oportunidades</Text>
          </View>
        ) : (
          applications.map(app => {
            const job = jobsById[app.job_id];
            return (
              <View key={app.id} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>{job?.title || 'Trabajo'}</Text>
                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Estado: {statusLabel(app.status)}</Text>
                    {app.cover_letter ? (
                      <Text style={{ fontSize: 13, color: '#475569', marginTop: 8 }} numberOfLines={3}>{app.cover_letter}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>{new Date(app.applied_at || app.created_at || Date.now()).toLocaleDateString()}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 }}>
                  <TouchableOpacity onPress={() => openJobDetail(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name="eye" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openChatWithCompany(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name="chatbubbles-outline" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Contactar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
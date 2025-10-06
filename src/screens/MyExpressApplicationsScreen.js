import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, radius } from '../theme';
import { normalizeTextSafe } from '../services/text';

export default function MyExpressApplicationsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [workerId, setWorkerId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') { window.alert(`${title ? title + ': ' : ''}${msg}`); }
    else { Alert.alert(title || '', msg); }
  };

  const resolveWorkerId = async () => {
    try {
      const resp = await api.getWorkerProfilesPaged(1, 1000, token);
      const items = resp.items || resp || [];
      const mine = items.find(wp => wp.user_id === user?.id);
      if (mine) setWorkerId(mine.id);
    } catch (e) {
      console.warn('resolveWorkerId failed', e);
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      // Obtener todas las postulaciones y filtrar por mi workerId
      const resp = await api.getExpressJobApplicationsPaged(1, 200, token);
      const items = Array.isArray(resp) ? resp : (resp.items || []);
      const mine = workerId ? items.filter(a => a.worker_id === workerId) : [];
      setApplications(mine);
      // Cargar detalles de los trabajos vinculados
      const jobsMap = {};
      for (const app of mine) {
        try {
          const job = await api.getExpressJobById(app.express_job_id, token);
          jobsMap[app.express_job_id] = job;
        } catch (e) { /* ignorar */ }
      }
      setJobsById(jobsMap);
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudieron cargar tus postulaciones exprés');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { resolveWorkerId(); }, [user?.id]);
  useEffect(() => { if (workerId) loadApplications(); }, [workerId]);
  const onRefresh = async () => { setRefreshing(true); await loadApplications(); setRefreshing(false); };

  const openJob = (jobId) => {
    const job = jobsById[jobId];
    if (job) {
      navigation.navigate('ExpressJobDetail', { job });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Mis Postulaciones Exprés</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="heart-circle" size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Mis Postulaciones Exprés</Text>
          </View>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{applications.length} postulaciones</Text>
      </LinearGradient>

      {applications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="flash-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>Aún no tienes postulaciones exprés</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}> 
          {applications.map(app => {
            const job = jobsById[app.express_job_id];
            return (
              <TouchableOpacity key={app.id} onPress={() => openJob(app.express_job_id)} style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.purpleStart}20`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="construct-outline" size={22} color={colors.purpleStart} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(job?.title || 'Anuncio exprés')}</Text>
                    {app.proposed_price ? (
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Mi oferta: {normalizeTextSafe(app.proposed_price)}</Text>
                    ) : null}
                    {app.estimated_time ? (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Tiempo: {normalizeTextSafe(app.estimated_time)}</Text>
                    ) : null}
                    {app.message ? (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Mensaje: {normalizeTextSafe(app.message)}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="ribbon-outline" size={14} color={colors.purpleStart} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, color: colors.purpleStart, fontWeight: '600' }}>{normalizeTextSafe(app.status || 'enviada')}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
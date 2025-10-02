import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, radius } from '../theme';
import { normalizeTextSafe } from '../services/text';
import { useFocusEffect } from '@react-navigation/native';
import ConfirmModal from '../ui/ConfirmModal';

function MyExpressAdsScreenLegacy({ navigation }) {
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobApps, setJobApps] = useState({});
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [loadingAppsId, setLoadingAppsId] = useState(null);

  const loadMyJobs = async () => {
    try {
      setLoading(true);
      const r = await api.searchExpressJobs({ client_id: user?.id, status: null }, token);
      const items = Array.isArray(r) ? r : (r.items || []);
      setJobs(items);
    } catch (e) {
      console.error('loadMyJobs', e);
      Alert.alert('Error', e.message || 'No se pudieron cargar tus anuncios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMyJobs(); }, [user?.id]);
  useFocusEffect(React.useCallback(() => {
    loadMyJobs();
    return () => {};
  }, [user?.id]));
  const onRefresh = async () => { setRefreshing(true); await loadMyJobs(); setRefreshing(false); };

  const statusLabel = (s) => ({
    'abierto': 'Disponible',
    'en_proceso': 'Ya contratado',
    'completado': 'Completado',
    'cancelado': 'Cancelado'
  })[s] || s;

  const toggleApplicants = async (job) => {
    if (expandedJobId === job.id) { setExpandedJobId(null); return; }
    setExpandedJobId(job.id);
    if (!jobApps[job.id]) {
      try {
        setLoadingAppsId(job.id);
        const list = await api.getExpressJobApplications(job.id, token);
        const items = Array.isArray(list) ? list : (list.items || []);
        setJobApps(prev => ({ ...prev, [job.id]: items }));
      } catch (e) {
        Alert.alert('Error', e.message || 'No se pudieron cargar los postulados');
      } finally {
        setLoadingAppsId(null);
      }
    }
  };

  const markHired = async (job) => {
    try {
      const updated = await api.updateExpressJob(job.id, { status: 'en_proceso' }, token);
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      if (Platform.OS === 'web') {
        window.alert('Estado actualizado: Ya contratado');
      } else {
        Alert.alert('Estado actualizado', 'El anuncio fue marcado como "Ya contratado".');
      }
    } catch (e) {
      console.error('updateExpressJob status error', e);
      const msg = e?.data?.message || e?.message || 'No se pudo marcar como contratado';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);

  const deleteJob = async (job) => {
    const ok = await confirmDelete('Eliminar anuncio', '¿Seguro que deseas eliminar este anuncio?');
    if (!ok) return;
    try {
      await api.deleteExpressJob(job.id, token);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      // limpiar aplicaciones en memoria para este job eliminado
      setJobApps(prev => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
      // cerrar sección expandida si corresponde
      setExpandedJobId(prev => prev === job.id ? null : prev);
    } catch (e) {
      console.error('deleteExpressJob error', e);
      const msg = e?.data?.error || e?.data?.message || e?.message || 'No se pudo eliminar';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setPendingDeleteJob(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Mis Anuncios Exprés</Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {jobs.length} anuncios publicados
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>        
          {jobs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="flash-outline" size={64} color="#CBD5E1" />
              <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>Aún no has publicado anuncios.</Text>
            </View>
          ) : jobs.map(job => (
            <View key={job.id} style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="hammer" size={22} color={colors.purpleStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(job.title)}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{normalizeTextSafe(job.trade_category_name)}</Text>
                  {job.department && job.municipality ? (
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{normalizeTextSafe(`${job.department} • ${job.municipality}`)}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {(job.budget_min || job.budget_max) && (
                    <Text style={{ fontSize: 12, color: colors.purpleStart, fontWeight: '600' }}>
                      {job.budget_min ? `$${job.budget_min}` : ''}{job.budget_min && job.budget_max ? ' - ' : ''}{job.budget_max ? `$${job.budget_max}` : ''}
                    </Text>
                  )}
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{(job.application_count ?? 0)} interesados</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', flexShrink: 1 }}>Estado: {normalizeTextSafe(statusLabel(job.status))}</Text>
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => navigation.navigate('ExpressJobDetail', { job })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name="eye" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleApplicants(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name={expandedJobId === job.id ? 'people' : 'people-outline'} size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>{expandedJobId === job.id ? 'Ocultar postulados' : 'Ver postulados'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => markHired(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#10B981', fontWeight: '600' }}>Contratado</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => requestDeleteJob(job)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#EF4444', fontWeight: '600' }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
 
              {expandedJobId === job.id && (
                <View style={{ backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 }}>
                    Postulados ({(jobApps[job.id]?.length || 0)})
                  </Text>
                  {loadingAppsId === job.id ? (
                    <ActivityIndicator size="small" color={colors.purpleStart} />
                  ) : (jobApps[job.id] && jobApps[job.id].length > 0) ? (
                    jobApps[job.id].map(app => (
                      <View key={app.id} style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingVertical: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Ionicons name="person" size={16} color={colors.purpleStart} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#111' }}>{normalizeTextSafe(app.full_name || 'Trabajador')}</Text>
                            {app.specialty ? (
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>{normalizeTextSafe(app.specialty)}</Text>
                            ) : null}
                            {app.proposed_price ? (
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>Precio: {normalizeTextSafe(app.proposed_price)}</Text>
                            ) : null}
                            {app.estimated_time ? (
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>Tiempo: {normalizeTextSafe(app.estimated_time)}</Text>
                            ) : null}
                            {app.message ? (
                              <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>Comentario: {normalizeTextSafe(app.message)}</Text>
                            ) : null}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            {typeof app.average_rating === 'number' && (
                              <Text style={{ fontSize: 12, color: colors.purpleStart }}>★ {Number(app.average_rating).toFixed(1)} ({app.total_reviews || 0})</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>Aún no hay postulaciones.</Text>
                  )}
                </View>
              )}
 
            </View>
          ))}
        </ScrollView>
      )}
      
      {/* Confirmación gráfica para eliminación */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar anuncio"
        message="¿Seguro que deseas eliminar este anuncio?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={performDeleteJob}
        onClose={() => { setShowDeleteModal(false); setPendingDeleteJob(null); }}
      />
    </SafeAreaView>
  );
}


export default function MyExpressAdsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobApps, setJobApps] = useState({});
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [loadingAppsId, setLoadingAppsId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);

  const loadMyJobs = async () => {
    try {
      setLoading(true);
      const r = await api.searchExpressJobs({ client_id: user?.id, status: null }, token);
      const items = Array.isArray(r) ? r : (r.items || []);
      setJobs(items);
    } catch (e) {
      console.error('loadMyJobs', e);
      Alert.alert('Error', e.message || 'No se pudieron cargar tus anuncios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMyJobs(); }, [user?.id]);
  useFocusEffect(React.useCallback(() => {
    loadMyJobs();
    return () => {};
  }, [user?.id]));
  const onRefresh = async () => { setRefreshing(true); await loadMyJobs(); setRefreshing(false); };

  const statusLabel = (s) => ({
    'abierto': 'Disponible',
    'en_proceso': 'Ya contratado',
    'completado': 'Completado',
    'cancelado': 'Cancelado'
  })[s] || s;

  const toggleApplicants = async (job) => {
    if (expandedJobId === job.id) { setExpandedJobId(null); return; }
    setExpandedJobId(job.id);
    if (!jobApps[job.id]) {
      try {
        setLoadingAppsId(job.id);
        const list = await api.getExpressJobApplications(job.id, token);
        const items = Array.isArray(list) ? list : (list.items || []);
        setJobApps(prev => ({ ...prev, [job.id]: items }));
      } catch (e) {
        Alert.alert('Error', e.message || 'No se pudieron cargar los postulados');
      } finally {
        setLoadingAppsId(null);
      }
    }
  };

  const markHired = async (job) => {
    try {
      const updated = await api.updateExpressJob(job.id, { status: 'en_proceso' }, token);
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      if (Platform.OS === 'web') {
        window.alert('Estado actualizado: Ya contratado');
      } else {
        Alert.alert('Estado actualizado', 'El anuncio fue marcado como "Ya contratado".');
      }
    } catch (e) {
      console.error('updateExpressJob status error', e);
      const msg = e?.data?.message || e?.message || 'No se pudo marcar como contratado';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const requestDeleteJob = (job) => {
    setPendingDeleteJob(job);
    setShowDeleteModal(true);
  };

  const performDeleteJob = async () => {
    const job = pendingDeleteJob;
    setShowDeleteModal(false);
    if (!job) return;
    try {
      await api.deleteExpressJob(job.id, token);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      setJobApps(prev => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
      setExpandedJobId(prev => prev === job.id ? null : prev);
    } catch (e) {
      console.error('deleteExpressJob error', e);
      const msg = e?.data?.error || e?.data?.message || e?.message || 'No se pudo eliminar';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setPendingDeleteJob(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Mis Anuncios Exprés</Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {jobs.length} anuncios publicados
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>        
          {jobs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="flash-outline" size={64} color="#CBD5E1" />
              <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>Aún no has publicado anuncios.</Text>
            </View>
          ) : jobs.map(job => (
            <View key={job.id} style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="hammer" size={22} color={colors.purpleStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(job.title)}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{normalizeTextSafe(job.trade_category_name)}</Text>
                  {job.department && job.municipality ? (
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{normalizeTextSafe(`${job.department} • ${job.municipality}`)}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {(job.budget_min || job.budget_max) && (
                    <Text style={{ fontSize: 12, color: colors.purpleStart, fontWeight: '600' }}>
                      {job.budget_min ? `$${job.budget_min}` : ''}{job.budget_min && job.budget_max ? ' - ' : ''}{job.budget_max ? `$${job.budget_max}` : ''}
                    </Text>
                  )}
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{(job.application_count ?? 0)} interesados</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', flexShrink: 1 }}>Estado: {normalizeTextSafe(statusLabel(job.status))}</Text>
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => navigation.navigate('ExpressJobDetail', { job })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name="eye" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleApplicants(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name={expandedJobId === job.id ? 'people' : 'people-outline'} size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>{expandedJobId === job.id ? 'Ocultar postulados' : 'Ver postulados'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => markHired(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#10B981', fontWeight: '600' }}>Contratado</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => requestDeleteJob(job)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#EF4444', fontWeight: '600' }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
 
              {expandedJobId === job.id && (
                <View style={{ backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 }}>
                    Postulados ({(jobApps[job.id]?.length || 0)})
                  </Text>
                  {loadingAppsId === job.id ? (
                    <ActivityIndicator size="small" color={colors.purpleStart} />
                  ) : (jobApps[job.id] && jobApps[job.id].length > 0) ? (
                    jobApps[job.id].map(app => (
                      <View key={app.id} style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingVertical: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Ionicons name="person" size={16} color={colors.purpleStart} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#111' }}>{normalizeTextSafe(app.full_name || 'Trabajador')}</Text>
                            {app.specialty ? (
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>{normalizeTextSafe(app.specialty)}</Text>
                            ) : null}
                            {app.proposed_price ? (
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>Precio: {normalizeTextSafe(app.proposed_price)}</Text>
                            ) : null}
                            {app.estimated_time ? (
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>Tiempo: {normalizeTextSafe(app.estimated_time)}</Text>
                            ) : null}
                            {app.message ? (
                              <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>Comentario: {normalizeTextSafe(app.message)}</Text>
                            ) : null}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            {typeof app.average_rating === 'number' && (
                              <Text style={{ fontSize: 12, color: colors.purpleStart }}>★ {Number(app.average_rating).toFixed(1)} ({app.total_reviews || 0})</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>Aún no hay postulaciones.</Text>
                  )}
                </View>
              )}
 
            </View>
          ))}
        </ScrollView>
      )}
      
      {/* Confirmación gráfica para eliminación */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar anuncio"
        message="¿Seguro que deseas eliminar este anuncio?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={performDeleteJob}
        onClose={() => { setShowDeleteModal(false); setPendingDeleteJob(null); }}
      />
    </SafeAreaView>
  );
}
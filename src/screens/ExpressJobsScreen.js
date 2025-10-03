import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, spacing, typography, radius } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { normalizeTextSafe, labelUrgency } from '../services/text';

export default function ExpressJobsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({ trade_category_id: null, location_id: null, urgency: null });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [workerId, setWorkerId] = useState(null);

  const loadCategories = async () => {
    try { const r = await api.getTradeCategories(1, 200, token); setCategories(r.items || r || []); } catch (e) { console.error('loadCategories', e); }
  };
  const loadLocations = async () => {
    try { const r = await api.getLocationsNicaragua(1, 500, token); setLocations(r.items || r || []); } catch (e) { console.error('loadLocations', e); }
  };
  const loadJobs = async () => {
    try {
      setLoading(true);
      const r = await api.searchExpressJobs(filters, token);
      setJobs(Array.isArray(r) ? r : (r.items || []));
    } catch (e) {
      console.error('loadJobs', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); loadLocations(); loadJobs(); }, []);
  useEffect(() => { loadJobs(); }, [filters.trade_category_id, filters.location_id, filters.urgency]);

  // Resolver el perfil de trabajador del usuario actual
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

  useEffect(() => { resolveWorkerId(); }, [user?.id]);

  const handleInterestQuick = async (job) => {
    if (!job?.id || user?.id === job.client_id) return;
    try {
      if (!workerId) await resolveWorkerId();
      if (!workerId) {
        Alert.alert('No disponible', 'No se pudo identificar tu perfil de trabajador.');
        return;
      }
      const payload = {
        express_job_id: job.id,
        worker_id: workerId,
        proposed_price: job?.budget_min || 1,
        message: 'Estoy interesado',
      };
      try { await api.createExpressJobApplication(payload, token); } catch (e) { /* puede existir ya */ }
      const conv = await api.createConversation(user.id, job.client_id, token);
      const conversationId = conv?.id || conv?.conversation_id || conv?.data?.id;
      const text = `Hola, estoy interesado en tu anuncio exprés: ${job.title}`;
      if (conversationId) {
        await api.sendMessage(conversationId, text, token);
      }
      Alert.alert('Interés enviado', 'Se notificó al publicador y se envió un mensaje.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo registrar el interés.');
    }
  };

  // Refrescar al volver a enfocar la pantalla (por ejemplo, tras crear/editar un anuncio)
  useFocusEffect(React.useCallback(() => {
    loadJobs();
    return () => {};
  }, [filters.trade_category_id, filters.location_id, filters.urgency]));

  const onRefresh = async () => { setRefreshing(true); await loadJobs(); setRefreshing(false); };

  const categoryName = (id) => {
    const n = categories.find(c => c.id === id)?.name;
    return normalizeTextSafe(n);
  };
  const locationName = (id) => {
    const l = locations.find(x => x.id === id);
    return l ? normalizeTextSafe(`${l.department} • ${l.municipality}`) : undefined;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Trabajos Exprés</Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {jobs.length} anuncios encontrados
        </Text>
      </LinearGradient>

      {/* Filtros */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setShowCategoryModal(true)} style={{ flex: 1, backgroundColor: 'white', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Categoría</Text>
            <Text style={{ fontSize: 14, color: '#111', marginTop: 4 }}>{categoryName(filters.trade_category_id) || 'Todas'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowLocationModal(true)} style={{ flex: 1, backgroundColor: 'white', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Ubicación</Text>
            <Text style={{ fontSize: 14, color: '#111', marginTop: 4 }}>{locationName(filters.location_id) || 'Todas'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {['inmediato','hoy','esta_semana','flexible'].map(u => (
            <TouchableOpacity key={u} onPress={() => setFilters(f => ({ ...f, urgency: f.urgency === u ? null : u }))}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: filters.urgency === u ? colors.purpleStart : '#E5E7EB', backgroundColor: filters.urgency === u ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: filters.urgency === u ? colors.purpleStart : '#374151' }}>{labelUrgency(u)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('ExpressJobForm')} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="add-circle" size={22} color={colors.purpleStart} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Publicar anuncio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadJobs} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="refresh" size={20} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={{ color: '#6B7280' }}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {jobs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="flash-outline" size={64} color="#CBD5E1" />
              <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>No hay anuncios exprés con estos filtros</Text>
            </View>
          ) : jobs.map(job => (
            <TouchableOpacity key={job.id} onPress={() => navigation.navigate('ExpressJobDetail', { job })}
              style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="hammer" size={22} color={colors.purpleStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(job.title)}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{normalizeTextSafe(job.trade_category_name || categoryName(job.trade_category_id))}</Text>
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
              {/* Acciones rápidas */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => navigation.navigate('ExpressJobDetail', { job })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="eye" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Ver</Text>
                </TouchableOpacity>
                {user?.id !== job.client_id && (
                  <TouchableOpacity onPress={() => handleInterestQuick(job)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="heart" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Interesado</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Handler de interés rápido */}
      

      {/* Modal categorías */}
      <Modal visible={showCategoryModal} animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={{ marginRight: 12 }}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Selecciona una categoría</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            <TouchableOpacity onPress={() => { setFilters(f => ({ ...f, trade_category_id: null })); setShowCategoryModal(false); }} style={{ padding: 12 }}>
              <Text style={{ fontSize: 14, color: '#111' }}>Todas</Text>
            </TouchableOpacity>
            {categories.map(c => (
              <TouchableOpacity key={c.id} onPress={() => { setFilters(f => ({ ...f, trade_category_id: c.id })); setShowCategoryModal(false); }} style={{ padding: 12 }}>
                <Text style={{ fontSize: 14 }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal ubicaciones */}
      <Modal visible={showLocationModal} animationType="slide" onRequestClose={() => setShowLocationModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowLocationModal(false)} style={{ marginRight: 12 }}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Selecciona una ubicación</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            <TouchableOpacity onPress={() => { setFilters(f => ({ ...f, location_id: null })); setShowLocationModal(false); }} style={{ padding: 12 }}>
              <Text style={{ fontSize: 14, color: '#111' }}>Todas</Text>
            </TouchableOpacity>
            {locations.map(l => (
              <TouchableOpacity key={l.id} onPress={() => { setFilters(f => ({ ...f, location_id: l.id })); setShowLocationModal(false); }} style={{ padding: 12 }}>
                <Text style={{ fontSize: 14 }}>{l.department} • {l.municipality}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
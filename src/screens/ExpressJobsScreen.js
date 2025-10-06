import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Modal, Alert, Platform, TextInput } from 'react-native';
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
      const id = mine?.id || null;
      if (id) setWorkerId(id);
      return id;
    } catch (e) {
      console.warn('resolveWorkerId failed', e);
      return null;
    }
  };

  // Asegura que exista un perfil de trabajador, creándolo automáticamente si falta
  const ensureWorkerProfileExists = async (job) => {
    // Primero intenta resolver el existente
    const existingId = await resolveWorkerId();
    if (existingId) return existingId;

    // Intentar construir datos mínimos a partir del perfil del candidato y del anuncio
    let candidate = null;
    try { candidate = await api.getCandidateProfile(user.id, token); } catch (e) { console.warn('getCandidateProfile failed', e?.message || e); }

    const profilePayload = {
      user_id: user.id,
      full_name: candidate?.full_name || user?.email || 'Usuario',
      trade_category_id: job?.trade_category_id || 1,
      specialty: candidate?.specialty || candidate?.profession || job?.trade_category_name || job?.title || 'General',
      years_experience: candidate?.years_experience !== undefined ? Number(candidate?.years_experience) : undefined,
      // Solo incluir campos opcionales si existen; zod no acepta null
      ...(candidate?.description ? { description: candidate.description } : {}),
      ...(candidate?.profile_picture_url ? { profile_picture_url: candidate.profile_picture_url } : {}),
      phone_number: candidate?.phone_number || candidate?.whatsapp_number || '00000000',
      ...(candidate?.whatsapp_number ? { whatsapp_number: candidate.whatsapp_number } : {}),
      ...(candidate?.location_id ? { location_id: Number(candidate.location_id) } : {}),
      ...(candidate?.address_details ? { address_details: candidate.address_details } : {}),
      available: true,
      ...(candidate?.currency ? { currency: candidate.currency } : { currency: 'NIO' }),
    };

    try {
      const created = await api.createWorkerProfile(profilePayload, token);
      const id = created?.id || created?.data?.id;
      if (id) {
        setWorkerId(id);
        return id;
      }
      return null;
    } catch (e) {
      console.warn('createWorkerProfile failed', e);
      const msg = e?.data?.message || e?.message || 'No se pudo crear tu perfil automáticamente.';
      showAlert('Error de perfil', msg);
      return null;
    }
  };

  useEffect(() => { resolveWorkerId(); }, [user?.id]);

  const [interestedMap, setInterestedMap] = useState({});
  const [interestSendingMap, setInterestSendingMap] = useState({});
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [proposedPrice, setProposedPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [message, setMessage] = useState('');

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') {
      window.alert(`${title ? title + ': ' : ''}${msg}`);
    } else {
      Alert.alert(title || '', msg);
    }
  };

  const handleInterestQuick = async (job) => {
    if (!job?.id || user?.id === job.client_id) return;
    try {
      // Bloquear si el anuncio no está abierto
      if (job.status !== 'abierto') {
        showAlert('No disponible', 'Este anuncio ya no acepta nuevas postulaciones.');
        return;
      }
      setInterestSendingMap(prev => ({ ...prev, [job.id]: true }));
      // Asegurar perfil; si falta, lo creamos automáticamente con datos mínimos
      const wid = await ensureWorkerProfileExists(job);
      if (!wid) return;

      // Evitar postular dos veces: consultar postulaciones existentes
      try {
        const existingList = await api.getExpressJobApplications(job.id, token);
        const existingApps = Array.isArray(existingList) ? existingList : (existingList.items || []);
        const alreadyApplied = existingApps.some(a => (a.worker_id === wid) || (a.user_id === user.id));
        if (alreadyApplied) {
          setInterestedMap(prev => ({ ...prev, [job.id]: true }));
          showAlert('Ya postulaste', 'Solo puedes enviar una postulación por anuncio.');
          return;
        }
      } catch (_) { /* si falla, continuamos y dejamos que el backend valide */ }

      // Primero registrar postulación; si falla, no continuar con el flujo
      const payload = {
        express_job_id: job.id,
        worker_id: wid,
        proposed_price: job?.budget_min || 1,
        message: 'Estoy interesado',
        status: 'enviada',
      };
      try {
        await api.createExpressJobApplication(payload, token);
        // Actualizar UI localmente: contador
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, application_count: (j.application_count ?? 0) + 1 } : j));
      } catch (e) {
        const msg = e?.data?.message || e?.data?.error || e?.message || 'No se pudo registrar tu interés.';
        showAlert('Error', msg);
        return;
      }

      // Desactivar botón para este anuncio
      setInterestedMap(prev => ({ ...prev, [job.id]: true }));

      // Crear conversación y notificar por chat
      const conv = await api.createConversation(user.id, job.client_id, token);
      const conversationId = conv?.id || conv?.conversation_id || conv?.data?.id;
      const text = `Hola, estoy interesado en tu anuncio exprés: ${job.title}`;
      if (conversationId) {
        await api.sendMessage(conversationId, text, token);
        // Navegar al chat para continuar la conversación
        navigation.navigate('Chat', {
          conversationId,
          userId: job.client_id,
          userName: (job.client_full_name?.trim()) || (job.client_name?.trim()) || 'Cliente',
          userRole: 'cliente'
        });
      }
      showAlert('Postulación enviada', 'Se registró tu interés y se notificó al publicador.');
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudo registrar el interés.');
    } finally {
      setInterestSendingMap(prev => ({ ...prev, [job.id]: false }));
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

  const openApplyModal = (job) => {
    setSelectedJob(job);
    setProposedPrice(job?.budget_min ? String(job.budget_min) : '');
    setEstimatedTime('');
    setMessage('');
    setShowApplyModal(true);
  };

  const submitApplication = async () => {
    const job = selectedJob;
    if (!job?.id || user?.id === job.client_id) return;
    try {
      // Bloquear si el anuncio no está abierto
      if (job.status !== 'abierto') {
        showAlert('No disponible', 'Este anuncio ya no acepta nuevas postulaciones.');
        return;
      }
      setInterestSendingMap(prev => ({ ...prev, [job.id]: true }));
      // Asegurar perfil; si falta, lo creamos automáticamente con datos mínimos
      const wid = await ensureWorkerProfileExists(job);
      if (!wid) {
        // Si no se pudo crear el perfil, no continuamos
        return;
      }

      // Evitar postular dos veces: consultar postulaciones existentes
      try {
        const existingList = await api.getExpressJobApplications(job.id, token);
        const existingApps = Array.isArray(existingList) ? existingList : (existingList.items || []);
        const alreadyApplied = existingApps.some(a => (a.worker_id === wid) || (a.user_id === user.id));
        if (alreadyApplied) {
          setInterestedMap(prev => ({ ...prev, [job.id]: true }));
          showAlert('Ya postulaste', 'Solo puedes enviar una postulación por anuncio.');
          setShowApplyModal(false);
          return;
        }
      } catch (_) { /* si falla, continuamos y dejamos que el backend valide */ }
      // Crear conversación con el dueño
      const conv = await api.createConversation(user.id, job.client_id, token);
      const conversationId = conv?.id || conv?.conversation_id || conv?.data?.id;
      let applicationCreated = false;
      // Registrar postulación si existe perfil de trabajador
      if (wid) {
        const payload = {
          express_job_id: job.id,
          worker_id: wid,
          proposed_price: proposedPrice ? Number(proposedPrice) : (job?.budget_min || 1),
          estimated_time: estimatedTime || undefined,
          message: message || 'Estoy interesado',
          status: 'enviada',
        };
        try {
          await api.createExpressJobApplication(payload, token);
          applicationCreated = true;
          // Actualizar contador localmente
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, application_count: (j.application_count ?? 0) + 1 } : j));
        } catch (e) {
          console.warn('createExpressJobApplication failed', e?.message || e);
        }
      } else {
        showAlert('Perfil requerido', 'Para registrar tu postulación en la lista, crea tu perfil de trabajador. Te enviaré al chat para coordinar.');
      }

      // Enviar mensaje con detalles al dueño
      if (conversationId) {
        const text = `Hola, estoy interesado en tu anuncio exprés: ${job.title}.\nOferta: ${proposedPrice ? `$${proposedPrice}` : (job.budget_min ? `$${job.budget_min}` : 'N/A')}\nTiempo estimado: ${estimatedTime || 'No especificado'}${message ? `\nMensaje: ${message}` : ''}`;
        await api.sendMessage(conversationId, text, token);
        navigation.navigate('Chat', {
          conversationId,
          userId: job.client_id,
          userName: (job.client_full_name?.trim()) || (job.client_name?.trim()) || 'Cliente',
          userRole: 'cliente'
        });
      }
      // Desactivar botón para este anuncio
      setInterestedMap(prev => ({ ...prev, [job.id]: true }));
      setShowApplyModal(false);
      showAlert(applicationCreated ? 'Postulación enviada' : 'Interés enviado', applicationCreated ? 'Se registró tu postulación y se notificó al publicador.' : 'Se notificó al publicador por chat.');
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudo registrar la postulación.');
    } finally {
      setInterestSendingMap(prev => ({ ...prev, [job.id]: false }));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Trabajos Exprés</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('PendingExpressJobs')} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="briefcase" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={{ color: 'white', fontWeight: '600' }}>Mis trabajos</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {jobs.filter(j => j.status !== 'en_revision' && j.status !== 'eliminado').length} anuncios encontrados
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('ExpressJobForm')} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Ionicons name="megaphone" size={22} color={colors.purpleStart} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Publicar anuncio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadJobs} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Ionicons name="refresh-circle" size={20} color="#6B7280" style={{ marginRight: 6 }} />
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
          {jobs.filter(j => j.status !== 'en_revision' && j.status !== 'eliminado').length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="flash-outline" size={64} color="#CBD5E1" />
              <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>No hay anuncios exprés con estos filtros</Text>
            </View>
          ) : jobs.filter(j => j.status !== 'en_revision' && j.status !== 'eliminado').map(job => (
            <TouchableOpacity key={job.id} onPress={() => navigation.navigate('ExpressJobDetail', { job })}
              style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.purpleStart}20`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="construct-outline" size={22} color={colors.purpleStart} />
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
                  <Ionicons name="eye-outline" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Ver</Text>
                </TouchableOpacity>
                {user?.id !== job.client_id && (
                  <TouchableOpacity onPress={() => openApplyModal(job)} disabled={!!interestedMap[job.id] || !!interestSendingMap[job.id]} style={{ flexDirection: 'row', alignItems: 'center', opacity: (interestedMap[job.id] || interestSendingMap[job.id]) ? 0.6 : 1 }}>
                    <Ionicons name="heart-circle" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>{interestSendingMap[job.id] ? 'Enviando…' : (interestedMap[job.id] ? 'Ya interesado' : 'Interesado')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal de postulación exprés */}
      <Modal visible={showApplyModal} transparent animationType="slide" onRequestClose={() => setShowApplyModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: radius.md, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 }}>Postular al anuncio exprés</Text>
            {selectedJob ? (
              <Text style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>{normalizeTextSafe(selectedJob.title)}</Text>
            ) : null}
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Oferta (USD o NIO)</Text>
            <TextInput value={proposedPrice} onChangeText={setProposedPrice} placeholder="Ej. 25" keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6, marginBottom: 12 }} />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Tiempo estimado</Text>
            <TextInput value={estimatedTime} onChangeText={setEstimatedTime} placeholder="Ej. 2 días" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6, marginBottom: 12 }} />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Mensaje al dueño</Text>
            <TextInput value={message} onChangeText={setMessage} placeholder="Cuéntale tu experiencia y disponibilidad" multiline style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6, height: 90 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowApplyModal(false)} style={{ paddingVertical: 10, paddingHorizontal: 14, marginRight: 10 }}>
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitApplication} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.purpleStart }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Enviar postulación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      

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
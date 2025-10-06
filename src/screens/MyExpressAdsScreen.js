import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Alert, Platform, Modal, TextInput, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, radius } from '../theme';
import { normalizeTextSafe, labelUrgency } from '../services/text';
import { useFocusEffect } from '@react-navigation/native';
import ConfirmModal from '../ui/ConfirmModal';
import ErrorModal from '../ui/ErrorModal';
import SuccessModal from '../ui/SuccessModal';

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
            <View key={job.id} style={{ backgroundColor: job.status === 'en_proceso' ? '#ECFDF5' : 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: job.status === 'en_proceso' ? '#A7F3D0' : '#E5E7EB' }}>
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
                  {job.status === 'en_proceso' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#D1FAE5' }}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#065F46', fontWeight: '600' }}>Contratado</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => markHired(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#10B981', fontWeight: '600' }}>Contratado</Text>
                    </TouchableOpacity>
                  )}
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
                            {renderRatingText(app)}
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
  const { width } = useWindowDimensions();
  const isNarrow = width < 420;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobApps, setJobApps] = useState({});
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [loadingAppsId, setLoadingAppsId] = useState(null);
  // Cache de fotos (url o blob) por usuario
  const [photoUrls, setPhotoUrls] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBudgetMin, setEditBudgetMin] = useState('');
  const [editBudgetMax, setEditBudgetMax] = useState('');
  // Campos adicionales para edición completa
  const [editDescription, setEditDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editTradeCategoryId, setEditTradeCategoryId] = useState(null);
  const [editLocationId, setEditLocationId] = useState(null);
  const [editAddressDetails, setEditAddressDetails] = useState('');
  const [editUrgency, setEditUrgency] = useState('flexible');
  const [editPreferredDate, setEditPreferredDate] = useState('');
  const [editEstimatedDuration, setEditEstimatedDuration] = useState('');
  const [editCurrency, setEditCurrency] = useState('NIO');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  // Modales de error/éxito
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  // Estadísticas de reseñas por trabajador (avg, count, percentage)
  const [reviewStatsByWorker, setReviewStatsByWorker] = useState({});

  const showErrorModal = (msg) => { setErrorModalMessage(msg); setErrorModalVisible(true); };
  const showSuccessModal = (msg) => { setSuccessModalMessage(msg); setSuccessModalVisible(true); };

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

  // Helpers para etiquetas
  const categoryName = (id) => categories.find(c => c.id === id)?.name;
  const locationLabel = (id) => {
    const l = locations.find(x => x.id === id);
    return l ? `${l.department} • ${l.municipality}` : undefined;
  };

  const toggleApplicants = async (job) => {
    if (expandedJobId === job.id) { setExpandedJobId(null); return; }
    setExpandedJobId(job.id);
    if (!jobApps[job.id]) {
      try {
        setLoadingAppsId(job.id);
        const list = await api.getExpressJobApplications(job.id, token);
        const items = Array.isArray(list) ? list : (list.items || []);
        setJobApps(prev => ({ ...prev, [job.id]: items }));
        // Prefetch fotos para los postulados
        const batch = {};
        await Promise.all(items.map(async (app) => {
          const uid = app.user_id;
          if (!uid) return;
          try {
            if (app.profile_picture_url) {
              batch[uid] = app.profile_picture_url;
            } else if (!photoUrls[uid]) {
              const url = await api.getFileFromDatabase(uid, 'profile_image', token);
              if (url) batch[uid] = url;
            }
          } catch (_) { /* sin foto */ }
        }));
        if (Object.keys(batch).length > 0) {
          setPhotoUrls(prev => ({ ...prev, ...batch }));
        }
        // Cargar estadísticas de reseñas por worker
        const statsBatch = {};
        await Promise.all(items.map(async (app) => {
          const wid = app.worker_id;
          if (!wid) return;
          try {
            const list = await api.getWorkerReviews(wid, token);
            const reviews = Array.isArray(list) ? list : [];
            const ratings = reviews.map(r => Number(r?.overall_rating ?? r?.rating)).filter(n => !isNaN(n));
            const count = ratings.length;
            const avg = count > 0
              ? ratings.reduce((a, b) => a + b, 0) / count
              : (typeof app.average_rating === 'number' ? Number(app.average_rating) : 0);
            const percentage = Math.round((avg / 5) * 100);
            statsBatch[wid] = { avg, count, percentage };
          } catch (_) { /* ignorar errores de reseñas */ }
        }));
        if (Object.keys(statsBatch).length > 0) {
          setReviewStatsByWorker(prev => ({ ...prev, ...statsBatch }));
        }
      } catch (e) {
        Alert.alert('Error', e.message || 'No se pudieron cargar los postulados');
      } finally {
        setLoadingAppsId(null);
      }
    }
  };

  const handleHire = async (app, job) => {
    try {
      // Evitar contratar más de una vez: si el anuncio ya está en proceso o existe una postulación aceptada
      try {
        if (job?.status === 'en_proceso') {
          showErrorModal('Este anuncio ya tiene una contratación registrada.');
          return;
        }
        const existingList = await api.getExpressJobApplications(job.id, token);
        const existingApps = Array.isArray(existingList) ? existingList : (existingList.items || []);
        const alreadyHired = existingApps.some(a => a.status === 'aceptada');
        if (alreadyHired) {
          showErrorModal('Este anuncio ya tiene una contratación registrada.');
          return;
        }
      } catch (_) { /* si la verificación falla, el backend igual limitará */ }
      const price = typeof app.proposed_price === 'number' ? app.proposed_price
        : (app.proposed_price ? Number(app.proposed_price) : (job?.budget_min || 1));
      await api.updateExpressJobApplication(app.id, {
        status: 'aceptada',
        express_job_id: job.id,
        worker_id: app.worker_id,
        proposed_price: price,
        estimated_time: app.estimated_time || undefined,
        message: app.message || undefined,
      }, token);
      const updatedJob = await api.updateExpressJob(job.id, { status: 'en_proceso' }, token);
      setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
      // Mensaje por chat (detallado)
      const conv = await api.createConversation(user.id, app.user_id, token);
      const conversationId = conv?.id || conv?.conversation_id || conv?.data?.id;
      const locationText = job?.department && job?.municipality ? `${normalizeTextSafe(job.department)} • ${normalizeTextSafe(job.municipality)}` : 'Ubicación por coordinar';
      const timeText = app?.estimated_time ? normalizeTextSafe(app.estimated_time) : 'Tiempo por definir';
      const offerText = typeof price === 'number' ? `$${price}` : normalizeTextSafe(String(price));
      const text = `Hola ${normalizeTextSafe(app.full_name || 'trabajador')}, has sido contratado para "${normalizeTextSafe(job.title)}".\nDetalles de la contratación:\n- Oferta: ${offerText}\n- Tiempo estimado: ${timeText}\n- Ubicación: ${locationText}\nMensaje: ${normalizeTextSafe(app.message || 'Sin mensaje adicional')}\nTe escribiré por este chat para coordinar fecha y lugar.`;
      if (conversationId) await api.sendMessage(conversationId, text, token);
      showSuccessModal('Contratación registrada y mensaje enviado.');
    } catch (e) {
      const data = e?.data;
      const msg = Array.isArray(data) && data[0]?.message ? data[0].message : (data?.error || data?.message || e?.message || 'No se pudo contratar.');
      showErrorModal(msg);
    }
  };

  const handleMessage = async (app) => {
    try {
      const conv = await api.createConversation(user.id, app.user_id, token);
      const conversationId = conv?.id || conv?.conversation_id || conv?.data?.id;
      const displayName = normalizeTextSafe(app.full_name || 'Trabajador');
      if (conversationId) {
        const text = `Hola ${displayName}, quisiera conversar sobre tu postulación.`;
        await api.sendMessage(conversationId, text, token);
      }
      navigation.navigate('Chat', { userId: app.user_id, userName: displayName, userRole: 'trabajador' });
    } catch (e) {
      const msg = e?.data?.message || e?.message || 'No se pudo iniciar el chat.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Error', msg);
    }
  };

  // Eliminado duplicado de handleHire: la versión correcta está más arriba y usa modales y proposed_price

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

  const openEdit = (job) => {
    setEditingJob(job);
    setEditTitle(job.title || '');
    setEditBudgetMin(job.budget_min != null ? String(job.budget_min) : '');
    setEditBudgetMax(job.budget_max != null ? String(job.budget_max) : '');
    // Prefill campos adicionales
    setEditDescription(job.description || '');
    setEditTradeCategoryId(job.trade_category_id || null);
    setEditLocationId(job.location_id ?? null);
    setEditAddressDetails(job.address_details || '');
    setEditUrgency(job.urgency || 'flexible');
    setEditPreferredDate(job.preferred_date || '');
    setEditEstimatedDuration(job.estimated_duration || '');
    setEditCurrency(job.currency || 'NIO');
    setEditPaymentMethod(job.payment_method || '');
    // Cargar cat/loc para los selectores
    (async () => {
      try {
        const cats = await api.getTradeCategories(1, 200, token);
        setCategories(cats.items || cats || []);
        const locs = await api.getLocationsNicaragua(1, 500, token);
        setLocations(locs.items || locs || []);
      } catch (e) {
        console.error('Edit modal load error', e);
      }
    })();
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingJob(null);
    setEditTitle('');
    setEditBudgetMin('');
    setEditBudgetMax('');
    setEditDescription('');
    setEditTradeCategoryId(null);
    setEditLocationId(null);
    setEditAddressDetails('');
    setEditUrgency('flexible');
    setEditPreferredDate('');
    setEditEstimatedDuration('');
    setEditCurrency('NIO');
    setEditPaymentMethod('');
  };

  const saveEdit = async () => {
    if (!editingJob) return;
    // Validaciones básicas
    if (!editTitle.trim() || !editDescription.trim() || !(editTradeCategoryId || editingJob.trade_category_id)) {
      const msg = 'Título, descripción y categoría son obligatorios.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Campos requeridos', msg);
      }
      return;
    }
    const payload = {
      title: editTitle?.trim() || editingJob.title,
      description: editDescription?.trim() || editingJob.description,
      trade_category_id: editTradeCategoryId || editingJob.trade_category_id,
      location_id: editLocationId ?? editingJob.location_id ?? null,
      address_details: editAddressDetails?.trim() || undefined,
      urgency: editUrgency || 'flexible',
      preferred_date: editPreferredDate || undefined,
      estimated_duration: editEstimatedDuration || undefined,
      budget_min: editBudgetMin ? parseFloat(editBudgetMin) : undefined,
      budget_max: editBudgetMax ? parseFloat(editBudgetMax) : undefined,
      currency: editCurrency || editingJob.currency || 'NIO',
      payment_method: editPaymentMethod || undefined,
      status: editingJob.status || 'abierto'
    };
    try {
      const updated = await api.updateExpressJob(editingJob.id, payload, token);
      setJobs(prev => prev.map(j => j.id === editingJob.id ? updated : j));
      cancelEdit();
    } catch (e) {
      console.error('updateExpressJob edit error', e);
      const msg = e?.data?.message || e?.message || 'No se pudo actualizar el anuncio';
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

  // Renderiza texto de calificación usando stats de reseñas
  const renderRatingText = (app) => {
    const stat = reviewStatsByWorker[app.worker_id];
    const avg = typeof stat?.avg === 'number' ? stat.avg : (typeof app.average_rating === 'number' ? Number(app.average_rating) : null);
    const count = typeof stat?.count === 'number' ? stat.count : (app.total_reviews || 0);
    const pct = avg != null ? Math.round((avg / 5) * 100) : null;
    if (avg == null) return null;
    return (
      <Text style={{ fontSize: 12, color: colors.purpleStart, marginTop: 4 }}>★ {avg.toFixed(1)} ({count}){pct != null ? ` • ${pct}%` : ''}</Text>
    );
  };

  // Detectar anuncios completados (para precargar datos dentro de la tarjeta)
  const completedJobs = jobs.filter(j => j.status === 'completado');
  // Detectar anuncios activos (todos menos completados)
  const activeJobs = jobs.filter(j => j.status !== 'completado');

  // Obtener postulación contratada (aceptada) para un anuncio
  const hiredAppFor = (job) => {
    const apps = jobApps[job.id] || [];
    return apps.find(a => a.status === 'aceptada');
  };

  // Prefetch de postulaciones y calificación para anuncios completados (mostrar quién lo hizo y rating real)
  useEffect(() => {
    (async () => {
      const toLoad = completedJobs.filter(j => !jobApps[j.id]);
      if (!token || toLoad.length === 0) return;
      const nextApps = {};
      const nextPhotos = {};
      const statsBatch = {};
      for (const job of toLoad) {
        try {
          const list = await api.getExpressJobApplications(job.id, token);
          const items = Array.isArray(list) ? list : (list.items || []);
          nextApps[job.id] = items;
          const hired = items.find(a => a.status === 'aceptada');
          if (hired?.user_id) {
            if (hired.profile_picture_url) {
              nextPhotos[hired.user_id] = hired.profile_picture_url;
            } else {
              try {
                const url = await api.getFileFromDatabase(hired.user_id, 'profile_image', token);
                if (url) nextPhotos[hired.user_id] = url;
              } catch (_) { /* ignorar */ }
            }
            // Calcular rating real desde la base de datos
            try {
              const wid = hired.worker_id;
              if (wid) {
                const listReviews = await api.getWorkerReviews(wid, token);
                const reviews = Array.isArray(listReviews) ? listReviews : [];
                const ratings = reviews.map(r => Number(r?.overall_rating ?? r?.rating)).filter(n => !isNaN(n));
                const count = ratings.length;
                const avg = count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : 0;
                const percentage = Math.round((avg / 5) * 100);
                statsBatch[wid] = { avg, count, percentage };
              }
            } catch (_) { /* ignorar errores */ }
          }
        } catch (_) { /* ignorar errores de carga */ }
      }
      if (Object.keys(nextApps).length > 0) setJobApps(prev => ({ ...prev, ...nextApps }));
      if (Object.keys(nextPhotos).length > 0) setPhotoUrls(prev => ({ ...prev, ...nextPhotos }));
      if (Object.keys(statsBatch).length > 0) setReviewStatsByWorker(prev => ({ ...prev, ...statsBatch }));
    })();
  }, [jobs, token]);

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
          ) : (
            <React.Fragment>
              {activeJobs.map(job => (
                <View key={job.id} style={{ backgroundColor: job.status === 'en_proceso' ? '#ECFDF5' : 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: job.status === 'en_proceso' ? '#A7F3D0' : '#E5E7EB' }}>
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

                  <View style={{ flexDirection: isNarrow ? 'column' : 'row', alignItems: isNarrow ? 'flex-start' : 'center', marginTop: 12 }}>
                    <Text style={{ fontSize: 12, lineHeight: 18, color: '#6B7280', flexShrink: 1, marginBottom: isNarrow ? 8 : 0 }}>Estado: {normalizeTextSafe(statusLabel(job.status))}</Text>
                    <View style={{ flex: 1, flexDirection: isNarrow ? 'column' : 'row', flexWrap: 'wrap', justifyContent: isNarrow ? 'flex-start' : 'flex-end' }}>
                  
                      <TouchableOpacity onPress={() => navigation.navigate('ExpressJobDetail', { job })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: isNarrow ? 0 : 12, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#EEF2FF' }}>
                        <Ionicons name="eye" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                        <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Ver</Text>
                      </TouchableOpacity>
                      {job.status !== 'completado' && (
                        <React.Fragment>
                          <TouchableOpacity onPress={() => toggleApplicants(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: isNarrow ? 0 : 12, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#EEF2FF' }}>
                            <Ionicons name={expandedJobId === job.id ? 'people' : 'people-outline'} size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                            <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>{expandedJobId === job.id ? 'Ocultar postulados' : 'Ver postulados'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openEdit(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: isNarrow ? 0 : 12, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#DBEAFE' }}>
                            <Ionicons name="create" size={18} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#2563EB', fontWeight: '600' }}>Editar</Text>
                          </TouchableOpacity>
                          {job.status === 'en_proceso' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: isNarrow ? 0 : 12, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#D1FAE5' }}>
                              <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                              <Text style={{ color: '#065F46', fontWeight: '600' }}>Contratado</Text>
                            </View>
                          ) : (
                            <TouchableOpacity onPress={() => markHired(job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: isNarrow ? 0 : 12, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#D1FAE5' }}>
                              <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                              <Text style={{ color: '#10B981', fontWeight: '600' }}>Contratado</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => requestDeleteJob(job)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FEE2E2' }}>
                            <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#EF4444', fontWeight: '600' }}>Eliminar</Text>
                          </TouchableOpacity>
                        </React.Fragment>
                      )}
                    </View>
                  </View>

                  {job.status !== 'completado' && expandedJobId === job.id && (
                    <View style={{ backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 }}>
                        Postulados ({(jobApps[job.id]?.length || 0)})
                      </Text>
                      {loadingAppsId === job.id ? (
                        <ActivityIndicator size="small" color={colors.purpleStart} />
                      ) : (jobApps[job.id] && jobApps[job.id].length > 0) ? (
                        jobApps[job.id].map(app => (
                          <View key={app.id} style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingVertical: 12 }}>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                              {(() => {
                                const uri = photoUrls[app.user_id] || app.profile_picture_url;
                                if (uri) {
                                  return (<Image source={{ uri }} style={{ width: 36, height: 36, borderRadius: 8, marginRight: 10 }} />);
                                }
                                return (
                                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                    <Ionicons name="person" size={18} color={colors.purpleStart} />
                                  </View>
                                );
                              })()}
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(app.full_name || 'Trabajador')}</Text>
                                {app.specialty ? (
                                  <Text style={{ fontSize: 12, lineHeight: 18, color: '#6B7280' }}>{normalizeTextSafe(app.specialty)}</Text>
                                ) : null}
                                {renderRatingText(app)}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                                  {app.proposed_price ? (
                                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#EEF2FF', marginRight: 8, marginBottom: 6 }}>
                                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.purpleStart }}>Precio: {normalizeTextSafe(app.proposed_price)}</Text>
                                    </View>
                                  ) : null}
                                  {app.estimated_time ? (
                                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#F0FDFA', marginRight: 8, marginBottom: 6 }}>
                                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F766E' }}>Tiempo: {normalizeTextSafe(app.estimated_time)}</Text>
                                    </View>
                                  ) : null}
                                </View>
                                {app.message ? (
                                  <Text style={{ fontSize: 12, lineHeight: 18, color: '#374151', marginTop: 4 }}>Comentario: {normalizeTextSafe(app.message)}</Text>
                                ) : null}
                              </View>
                            </View>

                            
                            {app.user_id && (
                              <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => navigation.navigate('CandidateProfile', { candidateId: app.user_id, candidateName: app.full_name, expressJobId: job.id, applicationId: app.id, jobStatus: job.status })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6, marginBottom: 6, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, backgroundColor: '#EEF2FF' }}>
                                  <Ionicons name="eye" size={14} color={colors.purpleStart} style={{ marginRight: 4 }} />
                                  <Text style={{ fontSize: 11, color: colors.purpleStart, fontWeight: '600' }}>Ver perfil</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleMessage(app)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6, marginBottom: 6, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, backgroundColor: '#DBEAFE' }}>
                                  <Ionicons name="chatbubble-ellipses" size={14} color="#2563EB" style={{ marginRight: 4 }} />
                                  <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '600' }}>Escribir</Text>
                                </TouchableOpacity>
                                {(job.status === 'abierto' && !(jobApps[job.id]?.some(a => a.status === 'aceptada'))) && (
                                  <TouchableOpacity onPress={() => handleHire(app, job)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6, marginBottom: 6, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, backgroundColor: '#D1FAE5' }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600' }}>Contratar</Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => navigation.navigate('CandidateProfile', { candidateId: app.user_id, candidateName: app.full_name, expressJobId: job.id, applicationId: app.id, jobStatus: job.status })} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, backgroundColor: '#FEF3C7' }}>
                                  <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                                  <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }}>Reseñar</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>Aún no hay postulaciones.</Text>
                      )}
                    </View>
                  )}

                  
                  {job.status === 'completado' && (
                    <View style={{ backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 }}>Realizado por</Text>
                      {(() => {
                        const apps = jobApps[job.id] || [];
                        const hired = apps.find(a => a.status === 'aceptada');
                        const photoUri = hired?.user_id ? (photoUrls[hired.user_id] || hired?.profile_picture_url) : null;
                        if (hired) {
                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {photoUri ? (
                                <Image source={{ uri: photoUri }} style={{ width: 36, height: 36, borderRadius: 8, marginRight: 10 }} />
                              ) : (
                                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                  <Ionicons name="person" size={18} color={colors.purpleStart} />
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(hired.full_name || 'Trabajador')}</Text>
                                {hired.specialty ? (
                                  <Text style={{ fontSize: 12, lineHeight: 18, color: '#6B7280' }}>{normalizeTextSafe(hired.specialty)}</Text>
                                ) : null}
                                {renderRatingText(hired)}
                              </View>
                            </View>
                          );
                        }
                        return (<Text style={{ fontSize: 13, color: '#6B7280' }}>Información del trabajador contratado no disponible.</Text>);
                      })()}
                    </View>
                  )}

                </View>
              ))}

              {completedJobs.length > 0 && (
                <View style={{ marginTop: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>Trabajos completados</Text>
                </View>
              )}

              {completedJobs.map(job => (
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

                  <View style={{ flexDirection: isNarrow ? 'column' : 'row', alignItems: isNarrow ? 'flex-start' : 'center', marginTop: 12 }}>
                    <Text style={{ fontSize: 12, lineHeight: 18, color: '#6B7280', flexShrink: 1, marginBottom: isNarrow ? 8 : 0 }}>Estado: {normalizeTextSafe(statusLabel(job.status))}</Text>
                    <View style={{ flex: 1, flexDirection: isNarrow ? 'column' : 'row', flexWrap: 'wrap', justifyContent: isNarrow ? 'flex-start' : 'flex-end' }}>
                      <TouchableOpacity onPress={() => navigation.navigate('ExpressJobDetail', { job })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: isNarrow ? 0 : 12, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#EEF2FF' }}>
                        <Ionicons name="eye" size={18} color={colors.purpleStart} style={{ marginRight: 6 }} />
                        <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Ver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => requestDeleteJob(job)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FEE2E2' }}>
                        <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#EF4444', fontWeight: '600' }}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 }}>Realizado por</Text>
                    {(() => {
                      const apps = jobApps[job.id] || [];
                      const hired = apps.find(a => a.status === 'aceptada');
                      const photoUri = hired?.user_id ? (photoUrls[hired.user_id] || hired?.profile_picture_url) : null;
                      if (hired) {
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {photoUri ? (
                              <Image source={{ uri: photoUri }} style={{ width: 36, height: 36, borderRadius: 8, marginRight: 10 }} />
                            ) : (
                              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                <Ionicons name="person" size={18} color={colors.purpleStart} />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(hired.full_name || 'Trabajador')}</Text>
                              {hired.specialty ? (
                                <Text style={{ fontSize: 12, lineHeight: 18, color: '#6B7280' }}>{normalizeTextSafe(hired.specialty)}</Text>
                              ) : null}
                              {renderRatingText(hired)}
                            </View>
                          </View>
                        );
                      }
                      return (<Text style={{ fontSize: 13, color: '#6B7280' }}>Información del trabajador contratado no disponible.</Text>);
                    })()}
                  </View>
                </View>
              ))}
            </React.Fragment>
          )}
        </ScrollView>
      )}
      
      
      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar anuncio"
        message="¿Seguro que deseas eliminar este anuncio?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={performDeleteJob}
        onClose={() => { setShowDeleteModal(false); setPendingDeleteJob(null); }}
      />

      
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B' }}>Editar anuncio exprés</Text>
            <TouchableOpacity onPress={cancelEdit}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Título</Text>
            <TextInput value={editTitle} onChangeText={setEditTitle} placeholder="Ej: Reparación de plomería" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 }} />

            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Descripción</Text>
            <TextInput value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={4} placeholder="Describe lo que necesitas..." style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, textAlignVertical: 'top' }} />

            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categories.map(c => (
                <TouchableOpacity key={c.id} onPress={() => setEditTradeCategoryId(c.id)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: editTradeCategoryId === c.id ? colors.purpleStart : '#E5E7EB', backgroundColor: editTradeCategoryId === c.id ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
                  <Text style={{ fontSize: 12, color: editTradeCategoryId === c.id ? colors.purpleStart : '#374151' }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Ubicación</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[null, ...locations.map(l => l.id)].map(id => (
                <TouchableOpacity key={id === null ? 'all' : id} onPress={() => setEditLocationId(id)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: editLocationId === id ? colors.purpleStart : '#E5E7EB', backgroundColor: editLocationId === id ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
                  <Text style={{ fontSize: 12, color: editLocationId === id ? colors.purpleStart : '#374151' }}>{id === null ? 'Sin ubicación' : locationLabel(id)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Urgencia</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['inmediato','hoy','esta_semana','flexible'].map(u => (
                <TouchableOpacity key={u} onPress={() => setEditUrgency(u)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: editUrgency === u ? colors.purpleStart : '#E5E7EB', backgroundColor: editUrgency === u ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
                  <Text style={{ fontSize: 12, color: editUrgency === u ? colors.purpleStart : '#374151' }}>{labelUrgency(u)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Presupuesto mínimo</Text>
                <TextInput value={editBudgetMin} onChangeText={setEditBudgetMin} keyboardType="numeric" placeholder="Ej: 100" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Presupuesto máximo</Text>
                <TextInput value={editBudgetMax} onChangeText={setEditBudgetMax} keyboardType="numeric" placeholder="Ej: 300" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
              </View>
            </View>

            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Dirección (opcional)</Text>
            <TextInput value={editAddressDetails} onChangeText={setEditAddressDetails} placeholder="Ej: Barrio X, casa azul" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }} />

            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Fecha preferida (YYYY-MM-DD, opcional)</Text>
            <TextInput value={editPreferredDate} onChangeText={setEditPreferredDate} placeholder="2025-10-05" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }} />

            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Duración estimada (opcional)</Text>
            <TextInput value={editEstimatedDuration} onChangeText={setEditEstimatedDuration} placeholder="Ej: 2-3 horas" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }} />

            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Moneda</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['NIO','USD'].map(cur => (
                <TouchableOpacity key={cur} onPress={() => setEditCurrency(cur)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: editCurrency === cur ? colors.purpleStart : '#E5E7EB', backgroundColor: editCurrency === cur ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
                  <Text style={{ fontSize: 12, color: editCurrency === cur ? colors.purpleStart : '#374151' }}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Método de pago (opcional)</Text>
            <TextInput value={editPaymentMethod} onChangeText={setEditPaymentMethod} placeholder="Ej: efectivo, transferencia" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
          </ScrollView>

          <View style={{ backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={cancelEdit} style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={{ flex: 1, backgroundColor: colors.purpleStart, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: 'white' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
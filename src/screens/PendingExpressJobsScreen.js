import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Alert, Platform, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, radius } from '../theme';
import { normalizeTextSafe } from '../services/text';

export default function PendingExpressJobsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [workerId, setWorkerId] = useState(null);
  const [pendingItems, setPendingItems] = useState([]); // [{ job, app }]
  const [completedItems, setCompletedItems] = useState([]); // [{ job, app }]
  const [clientNames, setClientNames] = useState({}); // cache de nombres de jefes por user_id
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingValue, setRatingValue] = useState('5');
  const [ratingComment, setRatingComment] = useState('');
  const [selectedItem, setSelectedItem] = useState(null); // { job, app }

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') { window.alert(`${title ? title + ': ' : ''}${msg}`); }
    else { Alert.alert(title || '', msg); }
  };

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

  // Resolver nombre del jefe (cliente) desde distintas fuentes
  const resolveClientName = async (userId) => {
    if (!userId) return 'Cliente';
    const cached = clientNames[userId];
    if (cached) return cached;
    let name = 'Cliente';
    try {
      // Intentar candidato (algunos clientes pueden tener perfil de candidato con full_name)
      const cand = await api.getCandidateProfile(userId, token).catch(() => null);
      if (cand?.full_name) name = cand.full_name;
      // Intentar empresa (empleador)
      if (name === 'Cliente') {
        const company = await api.getCompanyProfile(userId, token).catch(() => null);
        if (company?.company_name) name = company.company_name;
      }
      // Fallback: email del usuario
      if (name === 'Cliente') {
        const u = await api.getUserById(userId, token).catch(() => null);
        if (u?.email) name = u.email;
      }
    } catch (_) { /* noop */ }
    setClientNames(prev => ({ ...prev, [userId]: name }));
    return name;
  };

  const loadPending = async () => {
    try {
      setLoading(true);
      const resp = await api.getExpressJobApplicationsPaged(1, 500, token);
      const apps = Array.isArray(resp) ? resp : (resp.items || []);
      const mineAccepted = workerId ? apps.filter(a => a.worker_id === workerId && a.status === 'aceptada') : [];
      const results = [];
      for (const app of mineAccepted) {
        try {
          const job = await api.getExpressJobById(app.express_job_id, token);
          if (job && job.status === 'en_proceso') {
            const client_display_name = await resolveClientName(job.client_id);
            results.push({ job: { ...job, client_display_name }, app });
          }
        } catch (_) { /* ignore job fetch errors */ }
      }
      setPendingItems(results);
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudieron cargar tus trabajos pendientes');
    } finally {
      setLoading(false);
    }
  };

  // Historial: cargar trabajos ya completados por el trabajador
  const loadCompleted = async () => {
    try {
      const resp = await api.getExpressJobApplicationsPaged(1, 500, token);
      const apps = Array.isArray(resp) ? resp : (resp.items || []);
      // Para historial, consideramos todas mis postulaciones (aceptadas o terminadas)
      const mineApps = workerId ? apps.filter(a => a.worker_id === workerId) : [];
      const results = [];
      for (const app of mineApps) {
        try {
          const job = await api.getExpressJobById(app.express_job_id, token);
          if (job && job.status === 'completado') {
            const client_display_name = await resolveClientName(job.client_id);
            results.push({ job: { ...job, client_display_name }, app });
          }
        } catch (_) { /* ignore job fetch errors */ }
      }
      setCompletedItems(results);
    } catch (e) {
      console.warn('No se pudo cargar el historial de trabajos completados', e?.message || e);
    }
  };

  useEffect(() => { resolveWorkerId(); }, [user?.id]);
  useEffect(() => { if (workerId) { loadPending(); loadCompleted(); } }, [workerId]);

  const onRefresh = async () => { setRefreshing(true); await loadPending(); await loadCompleted(); setRefreshing(false); };

  const openRatingModal = (item) => {
    setSelectedItem(item);
    setRatingValue('5');
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const markJobCompleted = async (item) => {
    const { job, app } = item || {};
    if (!job?.id || !app?.id) return;
    try {
      await api.updateExpressJob(job.id, { status: 'completado' }, token);
      // Actualizar estado de la postulación (PUT requiere cuerpo completo, usamos status y campos mínimos)
      try {
        await api.updateExpressJobApplication(app.id, {
          status: 'terminada',
          express_job_id: app.express_job_id,
          worker_id: app.worker_id,
          proposed_price: app.proposed_price || 1,
          estimated_time: app.estimated_time || undefined,
          message: app.message || undefined,
        }, token);
      } catch (_) { /* si falla, no bloquear el flujo principal */ }
      // Notificar al dueño por chat
      try {
        const conv = await api.createConversation(user.id, job.client_id, token);
        const convId = conv?.id || conv?.conversation_id || conv?.data?.id;
        const title = normalizeTextSafe(job?.title || 'trabajo exprés');
        const text = `Hola, el trabajo "${title}" fue marcado como terminado. Por favor revisa y califica tu experiencia.`;
        if (convId) { await api.sendMessage(convId, text, token); }
      } catch (_) { /* ignorar errores de notificación */ }

      // Quitar de la lista local y abrir reseña
      setPendingItems(prev => prev.filter(x => x.app.id !== app.id));
      openRatingModal(item);
      showAlert('Trabajo completado', 'El anuncio fue marcado como completado. Ahora puedes calificar al jefe.');
    } catch (e) {
      const data = e?.data;
      const msg = Array.isArray(data) && data[0]?.message ? data[0].message : (data?.error || data?.message || e?.message || 'No se pudo marcar como completado');
      showAlert('Error', msg);
    }
  };

  const submitEmployerReview = async () => {
    const item = selectedItem;
    const { job, app } = item || {};
    if (!job?.id || !app?.id) return;
    try {
      // Para trabajos exprés no existe job_application_id clásico; omitimos el campo
      const payload = {
        author_id: user.id,
        author_role: 'candidato',
        subject_id: job.client_id,
        subject_role: 'empleador',
        rating: Number(ratingValue) || 5,
        comment: ratingComment || undefined,
      };
      await api.createReview(payload, token);
      setRatingModalVisible(false);
      setSelectedItem(null);
      showAlert('Reseña enviada', 'Tu calificación al jefe fue registrada. ¡Gracias!');
    } catch (e) {
      const data = e?.data;
      const msg = Array.isArray(data) && data[0]?.message ? data[0].message : (data?.error || data?.message || e?.message || 'No se pudo enviar la reseña');
      showAlert('Error', msg);
    }
  };

  const openJobDetail = (job) => {
    if (job) navigation.navigate('ExpressJobDetail', { job });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Trabajos pendientes exprés</Text>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{ marginTop: 16, color: '#666' }}>Cargando trabajos pendientes...</Text>
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
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Trabajos pendientes exprés</Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{pendingItems.length} trabajos en proceso</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}> 
        {/* Pendientes */}
        {pendingItems.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="checkmark-done-outline" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>No tienes trabajos en proceso ahora</Text>
          </View>
        ) : (
          pendingItems.map(({ job, app }) => (
            <View key={app.id} style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="hammer" size={22} color={colors.purpleStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(job?.title || 'Anuncio exprés')}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Jefe: {normalizeTextSafe(job?.client_display_name || job?.client_full_name || job?.client_name || 'Cliente')}</Text>
                  {app.proposed_price ? (
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Mi oferta: {normalizeTextSafe(app.proposed_price)}</Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <TouchableOpacity onPress={() => openJobDetail(job)} style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: radius.md, padding: 10, alignItems: 'center', marginRight: 10 }}>
                  <Text style={{ color: '#111' }}>Ver detalle</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => markJobCompleted({ job, app })} style={{ flex: 1, backgroundColor: colors.purpleStart, borderRadius: radius.md, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>Trabajo terminado</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Historial */}
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>Historial de trabajos realizados</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{completedItems.length} completados</Text>
        </View>
        {completedItems.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="time-outline" size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>Aún no tienes trabajos completados</Text>
          </View>
        ) : (
          completedItems.map(({ job, app }) => (
            <View key={`completed-${app.id}`} style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.purpleEnd}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.purpleEnd} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(job?.title || 'Anuncio exprés')}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Jefe: {normalizeTextSafe(job?.client_display_name || job?.client_full_name || job?.client_name || 'Cliente')}</Text>
                  {app.proposed_price ? (
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Mi oferta: {normalizeTextSafe(app.proposed_price)}</Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <TouchableOpacity onPress={() => openJobDetail(job)} style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: radius.md, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#111' }}>Ver detalle</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={ratingModalVisible} transparent animationType="fade" onRequestClose={() => setRatingModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 480, backgroundColor: 'white', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>Calificar al jefe</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Tu reseña ayuda a mejorar la comunidad</Text>
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: '#111', marginBottom: 6 }}>Puntuación:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRatingValue(String(n))} style={{ paddingHorizontal: 4 }}>
                    <Ionicons name={Number(ratingValue) >= n ? 'star' : 'star-outline'} size={24} color={Number(ratingValue) >= n ? '#F59E0B' : '#9CA3AF'} />
                  </TouchableOpacity>
                ))}
                <Text style={{ marginLeft: 8, color: '#111' }}>{Number(ratingValue) || 0}/5</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: '#111', marginBottom: 6 }}>Comentario (opcional):</Text>
              <TextInput value={ratingComment} onChangeText={setRatingComment} multiline numberOfLines={3} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 10, minHeight: 80 }} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)} style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: radius.md, padding: 10, alignItems: 'center', marginRight: 10 }}>
                <Text style={{ color: '#111' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitEmployerReview} style={{ flex: 1, backgroundColor: colors.purpleStart, borderRadius: radius.md, padding: 10, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Enviar reseña</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
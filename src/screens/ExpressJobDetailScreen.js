import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { normalizeTextSafe } from '../services/text';
import ConfirmModal from '../ui/ConfirmModal';

export default function ExpressJobDetailScreen({ route, navigation }) {
  const { user, token } = useAuth();
  const job = route.params?.job;
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [sendingApp, setSendingApp] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [message, setMessage] = useState('');
  const [workerId, setWorkerId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isOwner = useMemo(() => {
    return user && job && user.id === job.client_id;
  }, [user, job]);

  const canApply = useMemo(() => {
    return !isOwner && !!workerId && (job?.status === 'abierto'); // Solo aplican trabajadores y si está abierto
  }, [isOwner, workerId, job?.status]);

  const loadApplications = async () => {
    if (!job?.id) return;
    try {
      setLoadingApps(true);
      const list = await api.getExpressJobApplications(job.id, token);
      setApplications(Array.isArray(list) ? list : (list.items || []));
    } catch (e) {
      console.error('getExpressJobApplications error', e);
    } finally {
      setLoadingApps(false);
    }
  };

  const resolveWorkerId = async () => {
    try {
      // As we don't have an endpoint to get worker_profile by user, fetch a page and try to match
      const resp = await api.getWorkerProfilesPaged(1, 1000, token);
      const items = resp.items || resp || [];
      const mine = items.find(wp => wp.user_id === user?.id);
      if (mine) setWorkerId(mine.id);
    } catch (e) {
      console.warn('resolveWorkerId failed', e);
    }
  };

  useEffect(() => {
    loadApplications();
    resolveWorkerId();
  }, [job?.id]);

  const submitApplication = async () => {
    if (!canApply) return;
    const priceNum = parseFloat(proposedPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio propuesto válido.');
      return;
    }
    try {
      setSendingApp(true);
      const payload = {
        express_job_id: job.id,
        worker_id: workerId,
        proposed_price: priceNum,
        estimated_time: estimatedTime || undefined,
        message: message || undefined,
      };
      const created = await api.createExpressJobApplication(payload, token);
      if (created?.id) {
        Alert.alert('Postulación enviada', 'Tu postulación se envió correctamente.');
        setProposedPrice('');
        setEstimatedTime('');
        setMessage('');
        loadApplications();
      }
    } catch (e) {
      console.error('createExpressJobApplication error', e);
      Alert.alert('Error al postularse', e.message || 'No se pudo enviar la postulación.');
    } finally {
      setSendingApp(false);
    }
  };

  // Navegar al chat con el propietario del anuncio
  const contactOwner = async () => {
    try {
      // Registrar interés automático si corresponde
      if (!isOwner && workerId && job?.status === 'abierto') {
        try {
          const alreadyInterested = Array.isArray(applications) && applications.some(app => app.worker_id === workerId);
          if (!alreadyInterested) {
            const payload = {
              express_job_id: job.id,
              worker_id: workerId,
              // Usamos un precio mínimo simbólico para registrar el interés
              proposed_price: 1,
              message: 'Estoy interesado',
            };
            await api.createExpressJobApplication(payload, token);
            Alert.alert('Interés registrado', 'Se registró tu interés en este anuncio.');
            await loadApplications();
          } else {
            console.log('Ya se registró interés previamente para este anuncio.');
          }
        } catch (e) {
          console.warn('No se pudo registrar interés automático', e?.message || e);
        }
      }
  
      navigation.navigate('Chat', {
        userId: job.client_id,
        userName: job.client_email ? job.client_email.split('@')[0] : 'Cliente',
        userRole: 'cliente'
      });
    } catch (e) {
      Alert.alert('No se pudo abrir el chat', e.message || 'Intenta nuevamente.');
    }
  };

  // Acciones de propietario
  const handleMarkHired = async () => {
    try {
      const updated = await api.updateExpressJob(job.id, { status: 'en_proceso' }, token);
      Alert.alert('Estado actualizado', 'El anuncio fue marcado como "Ya contratado".');
      navigation.replace('ExpressJobDetail', { job: updated });
    } catch (e) {
      console.error('updateExpressJob status error', e);
      Alert.alert('Error', 'No se pudo actualizar el estado.');
    }
  };

  // Confirmación cross-platform (web: window.confirm; móvil: Alert)
  // const confirmDelete = async (title, message) => {
  //   if (Platform.OS === 'web') {
  //     return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  //   }
  //   return new Promise(resolve => {
  //     Alert.alert(title, message, [
  //       { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
  //       { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) }
  //     ]);
  //   });
  // };

  const requestDeleteJob = () => {
    setShowDeleteModal(true);
  };

  const performDeleteJob = async () => {
    setShowDeleteModal(false);
    try {
      await api.deleteExpressJob(job.id, token);
      navigation.goBack();
    } catch (e) {
      console.error('deleteExpressJob error', e);
      const msg = e?.data?.message || e?.message || 'No se pudo eliminar el anuncio.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const statusLabel = (s) => {
    const map = {
      'abierto': 'Disponible',
      'en_proceso': 'Ya contratado',
      'completado': 'Completado',
      'cancelado': 'Cancelado'
    };
    return map[s] || s;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Detalle del Trabajo Exprés</Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{normalizeTextSafe(job?.title || '')}</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>{normalizeTextSafe(job?.title || '')}</Text>
          <Text style={{ fontSize: 14, color: '#374151', marginTop: 8 }}>{normalizeTextSafe(job?.description || '')}</Text>
          {job?.department && job?.municipality ? (
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{normalizeTextSafe(`${job.department} • ${job.municipality}`)}</Text>
          ) : null}
          {(job?.budget_min || job?.budget_max) && (
            <Text style={{ fontSize: 12, color: colors.purpleStart, fontWeight: '600', marginTop: 6 }}>
              {(job?.currency || 'USD')} {job?.budget_min ? `${job.budget_min}` : ''}{job?.budget_min && job?.budget_max ? ' - ' : ''}{job?.budget_max ? `${job.budget_max}` : ''}
            </Text>
          )}
          {job?.urgency ? (
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Urgencia: {normalizeTextSafe(job.urgency)}</Text>
          ) : null}
          {job?.status ? (
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Estado: {normalizeTextSafe(statusLabel(job.status))}</Text>
          ) : null}
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Publicado por: {isOwner ? (user.email?.split('@')[0] || 'Tú') : normalizeTextSafe(job?.client_email ? job.client_email.split('@')[0] : 'Cliente')}</Text>
        </View>

        {/* Acciones (solo no propietarios) */}
        {!isOwner && (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity onPress={contactOwner} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.purpleStart} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.purpleStart, fontWeight: '600' }}>Escribirle</Text>
            </TouchableOpacity>
            {canApply && (
              <TouchableOpacity disabled style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.6, marginBottom: 8 }}>
                <Ionicons name="checkmark-done" size={20} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={{ color: '#6B7280' }}>Aplicar abajo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isOwner && (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity onPress={handleMarkHired} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={{ color: '#10B981', fontWeight: '600' }}>Marcar "Ya contratado"</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={requestDeleteJob} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="trash" size={20} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={{ color: '#EF4444', fontWeight: '600' }}>Eliminar anuncio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Postulaciones existentes */}
        <View style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 8 }}>
            Interesados ({applications.length})
          </Text>
          {loadingApps ? (
            <ActivityIndicator size="small" color={colors.purpleStart} />
          ) : applications.length === 0 ? (
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Aún no hay postulaciones.</Text>
          ) : (
            applications.map(app => (
              <View key={app.id} style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: `${colors.purpleStart}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Ionicons name="person" size={18} color={colors.purpleStart} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600' }}>{normalizeTextSafe(app.full_name || 'Trabajador')}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{normalizeTextSafe(app.specialty || '')}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Precio: {normalizeTextSafe(app.proposed_price)}</Text>
                    {app.estimated_time ? (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Tiempo: {normalizeTextSafe(app.estimated_time)}</Text>
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
          )}
        </View>

        {/* Formulario de postulación para trabajadores */}
        {canApply && (
          <View style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 32 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 8 }}>Postularse</Text>
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Precio propuesto</Text>
              <TextInput value={proposedPrice} onChangeText={setProposedPrice} keyboardType="decimal-pad" placeholder="Ej: 25" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }} />
            </View>
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Tiempo estimado</Text>
              <TextInput value={estimatedTime} onChangeText={setEstimatedTime} placeholder="Ej: 2 horas" style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }} />
            </View>
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Mensaje</Text>
              <TextInput value={message} onChangeText={setMessage} placeholder="Cuéntale al cliente por qué eres ideal" multiline style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 80 }} />
            </View>
            <TouchableOpacity onPress={submitApplication} disabled={sendingApp} style={{ backgroundColor: colors.purpleStart, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
              {sendingApp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar postulación</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar anuncio"
        message="¿Seguro que deseas eliminar este anuncio?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={performDeleteJob}
        onClose={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
}
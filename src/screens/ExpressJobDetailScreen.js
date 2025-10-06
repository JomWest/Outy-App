import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, TextInput, Platform, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { normalizeTextSafe, labelUrgency } from '../services/text';
import ConfirmModal from '../ui/ConfirmModal';
import socketService from '../services/socketService';
import ErrorModal from '../ui/ErrorModal';
import SuccessModal from '../ui/SuccessModal';

export default function ExpressJobDetailScreen({ route, navigation }) {
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 420;
  const job = route.params?.job;
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [sendingApp, setSendingApp] = useState(false);
  const [interestSending, setInterestSending] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [message, setMessage] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const predefinedReasons = [
    'Contenido inapropiado',
    'Fraude o estafa',
    'Información falsa',
    'Lenguaje ofensivo',
    'Actividad sospechosa',
    'Spam o publicidad',
    'Violación de reglas'
  ];
  const [workerId, setWorkerId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [photoUrls, setPhotoUrls] = useState({});
  // Modales de error/éxito
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // Reseña del dueño hacia el trabajador contratado
  const [ownerReviewVisible, setOwnerReviewVisible] = useState(false);
  const [ownerRating, setOwnerRating] = useState(0);
  const [ownerComment, setOwnerComment] = useState('');
  const [submittingOwnerReview, setSubmittingOwnerReview] = useState(false);

  const showErrorModal = (msg) => { setErrorModalMessage(msg); setErrorModalVisible(true); };
  const showSuccessModal = (msg) => { setSuccessModalMessage(msg); setSuccessModalVisible(true); };

  const isOwner = useMemo(() => {
    return user && job && user.id === job.client_id;
  }, [user, job]);

  const alreadyApplied = useMemo(() => {
    if (!Array.isArray(applications) || !workerId) return false;
    return applications.some(app => app.worker_id === workerId || app.user_id === user.id);
  }, [applications, workerId, user?.id]);

  const hasHire = useMemo(() => {
    return (job?.status === 'en_proceso') || (Array.isArray(applications) && applications.some(a => a.status === 'aceptada'));
  }, [job?.status, applications]);

  // Postulación aceptada (contratado)
  const acceptedApp = useMemo(() => {
    return Array.isArray(applications) ? applications.find(a => a.status === 'aceptada') : null;
  }, [applications]);
  const isHiredWorker = useMemo(() => {
    return !!acceptedApp && acceptedApp.user_id === user?.id;
  }, [acceptedApp, user?.id]);

  const canApply = useMemo(() => {
    // Permitir postular solo si el anuncio está abierto y no existe una postulación previa
    return !isOwner && (job?.status === 'abierto') && !alreadyApplied;
  }, [isOwner, job?.status, alreadyApplied]);

  const loadApplications = async () => {
    if (!job?.id) return;
    try {
      setLoadingApps(true);
      const list = await api.getExpressJobApplications(job.id, token);
      const items = Array.isArray(list) ? list : (list.items || []);
      setApplications(items);
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
      if (Object.keys(batch).length > 0) setPhotoUrls(prev => ({ ...prev, ...batch }));
    } catch (e) {
      console.error('getExpressJobApplications error', e);
    } finally {
      setLoadingApps(false);
    }
  };

  const contactApplicant = async (app) => {
    try {
      const conv = await api.createConversation(user.id, app.user_id, token);
      const convId = conv?.id || conv?.conversation_id || conv?.data?.id;
      const displayName = normalizeTextSafe(app.full_name || 'Trabajador');
      if (convId) {
        const text = `Hola ${displayName}, quisiera conversar sobre tu postulación.`;
        await api.sendMessage(convId, text, token);
      }
      navigation.navigate('Chat', { userId: app.user_id, userName: displayName, userRole: 'trabajador' });
    } catch (e) {
      const data = e?.data;
      const msg = Array.isArray(data) && data[0]?.message ? data[0].message : (data?.error || data?.message || e?.message || 'No se pudo iniciar el chat.');
      showErrorModal(msg);
    }
  };

  const hireApplicant = async (app) => {
    try {
      // Evitar contratar más de una vez por anuncio
      if (job?.status === 'en_proceso' || (Array.isArray(applications) && applications.some(a => a.status === 'aceptada'))) {
        showErrorModal('Este anuncio ya tiene una contratación registrada.');
        return;
      }
      // Incluir campos requeridos por la validación del backend
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
      const title = normalizeTextSafe(updatedJob?.title || job?.title || '');
      const conv = await api.createConversation(user.id, app.user_id, token);
      const convId = conv?.id || conv?.conversation_id || conv?.data?.id;
      const text = `Hola ${normalizeTextSafe(app.full_name || 'trabajador')}, te contraté para "${title}".`;
      if (convId) await api.sendMessage(convId, text, token);
      showSuccessModal('Contratación registrada y mensaje enviado.');
    } catch (e) {
      const data = e?.data;
      const msg = Array.isArray(data) && data[0]?.message ? data[0].message : (data?.error || data?.message || e?.message || 'No se pudo contratar.');
      showErrorModal(msg);
    }
  };

  const resolveWorkerId = async () => {
    try {
      // As we don't have an endpoint to get worker_profile by user, fetch a page and try to match
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
  const ensureWorkerProfileExists = async () => {
    const existingId = await resolveWorkerId();
    if (existingId) return existingId;

    let candidate = null;
    try { candidate = await api.getCandidateProfile(user.id, token); } catch (e) { console.warn('getCandidateProfile failed', e?.message || e); }

    const profilePayload = {
      user_id: user.id,
      full_name: candidate?.full_name || user?.email || 'Usuario',
      trade_category_id: job?.trade_category_id || 1,
      specialty: candidate?.specialty || candidate?.profession || job?.trade_category_name || job?.title || 'General',
      years_experience: candidate?.years_experience !== undefined ? Number(candidate?.years_experience) : undefined,
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

  useEffect(() => {
    loadApplications();
    resolveWorkerId();
  }, [job?.id]);

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') {
      window.alert(`${title ? title + ': ' : ''}${msg}`);
    } else {
      Alert.alert(title || '', msg);
    }
  };

  const submitApplication = async () => {
    if (!canApply) return;
    const priceNum = parseFloat(proposedPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showAlert('Precio inválido', 'Ingresa un precio propuesto válido.');
      return;
    }
    try {
      setSendingApp(true);
      // Asegurar que el usuario tenga perfil de trabajador antes de postular
      const wid = await ensureWorkerProfileExists();
      if (!wid) return;
      const payload = {
        express_job_id: job.id,
        worker_id: wid,
        proposed_price: priceNum,
        estimated_time: estimatedTime || undefined,
        message: message || undefined,
        status: 'enviada',
      };
      const created = await api.createExpressJobApplication(payload, token);
      if (created?.id) {
        showAlert('Postulación enviada', 'Tu postulación se envió correctamente.');
        setProposedPrice('');
        setEstimatedTime('');
        setMessage('');
        loadApplications();
      }
    } catch (e) {
      console.error('createExpressJobApplication error', e);
      const data = e?.data;
      const msg = Array.isArray(data) && data[0]?.message
        ? data[0].message
        : (data?.error || data?.message || e?.message || 'No se pudo enviar la postulación.');
      showAlert('Error al postularse', msg);
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
            showAlert('Interés registrado', 'Se registró tu interés en este anuncio.');
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
  // Preferir nombre real del cliente cuando esté disponible
  userName: (job.client_full_name?.trim()) || (job.client_name?.trim()) || 'Cliente',
        userRole: 'cliente'
      });
    } catch (e) {
      showAlert('No se pudo abrir el chat', e.message || 'Intenta nuevamente.');
    }
  };

  // Registrar interés explícito y enviar mensaje automático al publicador
  const markInterestAndMessage = async () => {
    if (!job?.id || isOwner) return;
    try {
      setInterestSending(true);
      // Asegurar workerId; si falta, lo creamos automáticamente
      let wid = workerId;
      if (!wid) wid = await ensureWorkerProfileExists();

      // Registrar interés si no existe
      let alreadyInterested = false;
      if (wid) {
        alreadyInterested = Array.isArray(applications) && applications.some(app => app.worker_id === wid);
        if (!alreadyInterested && job?.status === 'abierto') {
          const payload = {
            express_job_id: job.id,
            worker_id: wid,
            proposed_price: job?.budget_min || 1,
            message: 'Estoy interesado',
            status: 'enviada',
          };
          try {
            await api.createExpressJobApplication(payload, token);
            await loadApplications();
          } catch (e) {
            console.warn('createExpressJobApplication failed', e?.message || e);
          }
        }
      }

      // Crear conversación y enviar mensaje automático
      try {
        const conv = await api.createConversation(user.id, job.client_id, token);
        const conversationId = conv?.id || conv?.conversation_id || conv?.data?.id;
        const text = `Hola, estoy interesado en tu anuncio exprés: ${job.title}`;
        if (conversationId) {
          await api.sendMessage(conversationId, text, token);
          // Emitir por socket para respuesta inmediata si está conectado
          socketService.sendMessage(conversationId, text);
          // Navegar al chat para continuar la conversación
          navigation.navigate('Chat', {
            conversationId,
            userId: job.client_id,
            userName: (job.client_full_name?.trim()) || (job.client_name?.trim()) || 'Cliente',
            userRole: 'cliente'
          });
        }
        showAlert('Interés enviado', 'Se notificó al publicador y se envió un mensaje.');
      } catch (e) {
        showAlert('Error', e?.message || 'No se pudo enviar el mensaje.');
      }
    } finally {
      setInterestSending(false);
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

  // Marcar trabajo como terminado (trabajador contratado)
  const markJobCompleted = async () => {
    try {
      if (!acceptedApp) {
        Alert.alert('No disponible', 'No hay contratación registrada en este anuncio.');
        return;
      }
      const updated = await api.updateExpressJob(job.id, { status: 'completado' }, token);
      // Notificar al dueño por chat que el trabajo fue marcado como terminado
      try {
        const conv = await api.createConversation(user.id, job.client_id, token);
        const conversationId = conv?.id || conv?.conversation_id || conv?.data?.id;
        const marker = acceptedApp?.worker_id ? `[[RATE_EXPRESS_JOB:${job.id}:${acceptedApp.worker_id}]]` : `[[RATE_EXPRESS_JOB:${job.id}]]`;
        const text = `Trabajo terminado: he marcado el anuncio "${normalizeTextSafe(job.title)}" como completado. ${marker}`;
        if (conversationId) {
          await api.sendMessage(conversationId, text, token);
          socketService.sendMessage(conversationId, text);
        }
      } catch (e) {
        console.warn('No se pudo notificar al dueño por chat', e?.message || e);
      }
      showSuccessModal('Has marcado el trabajo como terminado. ¡Gracias!');
      navigation.replace('ExpressJobDetail', { job: updated });
    } catch (e) {
      console.error('updateExpressJob complete error', e);
      const msg = e?.data?.message || e?.message || 'No se pudo marcar el trabajo como terminado.';
      showErrorModal(msg);
    }
  };

  // Enviar reseña del dueño hacia el trabajador contratado
  const submitOwnerReview = async () => {
    if (!isOwner || !acceptedApp) return;
    if (!ownerRating || ownerRating < 1) {
      showErrorModal('Selecciona una calificación válida (1-5).');
      return;
    }
    try {
      setSubmittingOwnerReview(true);
      const payload = {
        worker_id: acceptedApp.worker_id,
        client_id: user.id,
        overall_rating: ownerRating,
        comment: ownerComment || undefined,
        express_job_id: job.id,
      };
      await api.createWorkerReview(payload, token);
      setOwnerReviewVisible(false);
      setOwnerRating(0);
      setOwnerComment('');
      showSuccessModal('Reseña enviada. ¡Gracias por calificar al trabajador!');
    } catch (e) {
      const data = e?.data;
      const msg = Array.isArray(data) && data[0]?.message
        ? data[0].message
        : (data?.error || data?.message || e?.message || 'No se pudo enviar la reseña.');
      showErrorModal(msg);
    } finally {
      setSubmittingOwnerReview(false);
    }
  };

  // Reportar anuncio exprés
  const reportAd = async () => {
    try {
      if (!token || !job?.id) return;
      const reasonToSend = (selectedReason && selectedReason !== 'Otro')
        ? selectedReason
        : (customReason?.trim() || reportReason?.trim() || 'Reporte desde detalle de anuncio');
      await api.reportAd(job.id, 'express_job', reasonToSend, token);
      showAlert('Reporte enviado', 'Gracias por avisar. Revisaremos este anuncio.');
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudo enviar el reporte');
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
          <Text style={{ flex: 1, fontSize: 24, fontWeight: 'bold', color: 'white' }}>Detalle del Trabajo Exprés</Text>
          <TouchableOpacity onPress={() => setReportModalVisible(true)} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Ionicons name="flag-outline" size={20} color="white" />
          </TouchableOpacity>
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
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Urgencia: {labelUrgency(job.urgency)}</Text>
          ) : null}
          {job?.status ? (
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Estado: {normalizeTextSafe(statusLabel(job.status))}</Text>
          ) : null}
  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Publicado por: {isOwner ? ((user.full_name?.trim()) || (user.name?.trim()) || 'Tú') : normalizeTextSafe((job?.client_full_name?.trim()) || (job?.client_name?.trim()) || 'Cliente')}</Text>

          {/* Botón para abrir modal de reporte */}
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity onPress={() => setReportModalVisible(true)} style={{ backgroundColor: colors.purpleStart, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Reportar anuncio</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quitamos el botón "Interesado" para dejar solo el formulario de postulación */}

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
                <View style={{ flexDirection: isNarrow ? 'column' : 'row', alignItems: isNarrow ? 'flex-start' : 'center' }}>
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
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600' }}>{normalizeTextSafe(app.full_name || 'Trabajador')}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{normalizeTextSafe(app.specialty || '')}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Precio: {normalizeTextSafe(app.proposed_price)}</Text>
                    {app.estimated_time ? (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Tiempo: {normalizeTextSafe(app.estimated_time)}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: isNarrow ? 'flex-start' : 'flex-end', flexShrink: 0, marginLeft: isNarrow ? 0 : 8, marginTop: isNarrow ? 8 : 0, maxWidth: isNarrow ? '100%' : 200 }}>
                    {typeof app.average_rating === 'number' && (
                      <Text style={{ fontSize: 12, color: colors.purpleStart }}>★ {Number(app.average_rating).toFixed(1)} ({app.total_reviews || 0})</Text>
                    )}
                    {app.user_id && (
                      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                        {/* Ver perfil siempre disponible */}
                        <TouchableOpacity onPress={() => navigation.navigate('CandidateProfile', { candidateId: app.user_id, candidateName: app.full_name, expressJobId: job.id, applicationId: app.id })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                          <Ionicons name="eye" size={16} color={colors.purpleStart} style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12, color: colors.purpleStart, fontWeight: '600' }}>Ver perfil</Text>
                        </TouchableOpacity>
                        {/* Acciones solo para el dueño del anuncio */}
                        {isOwner && (
                          <>
                            <TouchableOpacity onPress={() => contactApplicant(app)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                              <Ionicons name="chatbubble-ellipses" size={16} color="#2563EB" style={{ marginRight: 6 }} />
                              <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>Escribir</Text>
                            </TouchableOpacity>
                            {(job?.status === 'abierto' && !hasHire) && (
                              <TouchableOpacity onPress={() => hireApplicant(app)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>Contratar</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => navigation.navigate('CandidateProfile', { candidateId: app.user_id, candidateName: app.full_name, expressJobId: job.id, applicationId: app.id })} style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                              <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600' }}>Reseñar</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Acciones del trabajador contratado */}
        {!isOwner && job?.status === 'en_proceso' && isHiredWorker && (
          <View style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 8 }}>Trabajo en proceso</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Cuando termines, marca el trabajo como completado para que el dueño pueda dejarte una reseña.</Text>
            <TouchableOpacity onPress={markJobCompleted} style={{ backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Trabajo terminado</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Calificación del dueño tras completar el trabajo */}
        {isOwner && job?.status === 'completado' && acceptedApp && (
          <View style={{ backgroundColor: 'white', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 8 }}>Calificar al trabajador</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Evalúa el trabajo realizado por el trabajador contratado.</Text>
            <TouchableOpacity onPress={() => setOwnerReviewVisible(true)} style={{ backgroundColor: '#F59E0B', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Calificar ahora</Text>
            </TouchableOpacity>
          </View>
        )}

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
      <ErrorModal
        visible={errorModalVisible}
        title="Error"
        message={errorModalMessage}
        onClose={() => setErrorModalVisible(false)}
      />
      <SuccessModal
        visible={successModalVisible}
        title="Operación exitosa"
        message={successModalMessage}
        onClose={() => setSuccessModalVisible(false)}
      />

      {/* Modal simple para reseña del dueño */}
      {ownerReviewVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 480, backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 }}>Reseñar trabajador</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setOwnerRating(n)} style={{ marginRight: 6 }}>
                  <Ionicons name={ownerRating >= n ? 'star' : 'star-outline'} size={24} color={ownerRating >= n ? '#F59E0B' : '#9CA3AF'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={ownerComment}
              onChangeText={setOwnerComment}
              placeholder="Cuéntanos tu experiencia (opcional)"
              multiline
              style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 80, marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setOwnerReviewVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 12, marginRight: 10 }}>
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitOwnerReview} disabled={submittingOwnerReview} style={{ backgroundColor: colors.purpleStart, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' }}>
                {submittingOwnerReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar reseña</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {reportModalVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 520, backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 }}>Reportar anuncio</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Selecciona el motivo del reporte</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {predefinedReasons.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelectedReason(r)}
                  style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 1, borderColor: selectedReason === r ? colors.purpleStart : '#E5E7EB', backgroundColor: selectedReason === r ? 'rgba(109,40,217,0.08)' : 'white', marginRight: 8, marginBottom: 8 }}
                >
                  <Text style={{ color: selectedReason === r ? colors.purpleStart : '#111827', fontSize: 12 }}>{r}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setSelectedReason('Otro')}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 1, borderColor: selectedReason === 'Otro' ? colors.purpleStart : '#E5E7EB', backgroundColor: selectedReason === 'Otro' ? 'rgba(109,40,217,0.08)' : 'white', marginRight: 8, marginBottom: 8 }}
              >
                <Text style={{ color: selectedReason === 'Otro' ? colors.purpleStart : '#111827', fontSize: 12 }}>Otro</Text>
              </TouchableOpacity>
            </View>
            {selectedReason === 'Otro' && (
              <TextInput
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Describe por qué reportas este anuncio"
                placeholderTextColor="#9CA3AF"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 10, fontSize: 14, color: '#111827', marginBottom: 8 }}
              />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity onPress={() => { setReportModalVisible(false); setSelectedReason(null); setCustomReason(''); }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => { await reportAd(); setReportModalVisible(false); setSelectedReason(null); setCustomReason(''); }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.purpleStart }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Enviar reporte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
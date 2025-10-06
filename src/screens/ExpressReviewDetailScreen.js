import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api as client } from '../api/client';
import { colors, radius } from '../theme';

export default function ExpressReviewDetailScreen({ navigation, route }) {
  const { user, token } = useAuth();
  const incomingJob = route?.params?.job || null;
  const [job, setJob] = useState(incomingJob);
  const [owner, setOwner] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [reason, setReason] = useState(route?.params?.reason || '');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        let j = incomingJob;
        if (!j && route?.params?.jobId) {
          j = await client.getExpressJobById(route.params.jobId, token);
        }
        if (!j) {
          Alert.alert('Error', 'No se pudo cargar el anuncio');
          return;
        }
        if (mounted) setJob(j);
        const own = await client.getUserById(j.client_id, token);
        if (mounted) setOwner(own);
        // Cargar avatar del dueño si existe
        try {
          const url = await client.getFileFromDatabase(own.id, 'profile_image', token);
          if (mounted) setAvatarUrl(url || null);
        } catch {}
        // Perfiles (ocupación y datos adicionales)
        try {
          const cand = await client.getCandidateProfile(own.id, token);
          if (mounted && cand && cand.user_id) setCandidateProfile(cand);
        } catch {}
        try {
          const comp = await client.getCompanyProfile(own.id, token);
          if (mounted && comp && comp.user_id) setCompanyProfile(comp);
        } catch {}
      } catch (e) {
        console.log('ExpressReviewDetail load error', e?.message || e);
        Alert.alert('Error', e?.message || 'No se pudo cargar la información');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [route?.params?.jobId, token]);

  const title = 'Revisión de anuncio';


  const sendOwnerNotification = async (title, body) => {
    try {
      if (!owner?.id || !token) return;
      await client.sendPushToUser(owner.id, title, body, token);
    } catch (e) {
      console.log('sendPushToUser error', e?.message || e);
    }
  };

  const sendOwnerMessage = async (body) => {
    try {
      if (!user?.id || !owner?.id || !token) return;
      const conv = await client.createConversation(user.id, owner.id, token);
      const convId = conv?.id || conv?.conversation_id || conv?.conversation?.id;
      if (convId) await client.sendMessage(convId, body, token);
    } catch (e) {
      console.log('sendMessage error', e?.message || e);
    }
  };

  // Registrar el reporte del anuncio como historial de moderación
  const logAdReport = async (actionLabel) => {
    try {
      if (!job?.id || !token) return;
      const msgReason = reason?.trim() || 'motivo no especificado';
      const composedReason = `${actionLabel}: ${msgReason}`;
      await client.reportAd(job.id, 'express_job', composedReason, token);
    } catch (e) {
      console.log('logAdReport error', e?.message || e);
    }
  };

  // Re-publicar el anuncio tras advertencia
  const publishAdIfNeeded = async () => {
    try {
      if (!job?.id || !token) return;
      const updated = await client.updateExpressJob(job.id, { status: 'abierto' }, token);
      setJob(prev => ({ ...prev, status: updated?.status || 'abierto' }));
    } catch (e) {
      console.log('publishAdIfNeeded error', e?.message || e);
    }
  };

  // Bloqueo automático si acumula 3 reportes de anuncios distintos
  const checkAutoBlockAfterReports = async () => {
    try {
      if (!owner?.id || !token) return;
      const ownerJobs = await client.searchExpressJobs({ client_id: owner.id }, token);
      const jobIds = Array.isArray(ownerJobs) ? ownerJobs.map(j => j.id) : [];
      const reports = await client.listAdReports(token);
      const ownerReportedAdIds = (Array.isArray(reports) ? reports : [])
        .filter(r => r?.ad_type === 'express_job' && jobIds.includes(r?.ad_id))
        .map(r => r.ad_id);
      const uniqueCount = Array.from(new Set(ownerReportedAdIds)).length;
      if (uniqueCount >= 3) {
        const msgReason = reason?.trim() || 'motivo no especificado';
        const autoReason = `Bloqueo automático: 3 reportes de anuncios. Detalle: ${msgReason}`;
        await client.blockUser(owner.id, autoReason, token);
        await sendOwnerNotification('Cuenta bloqueada', autoReason);
        await sendOwnerMessage(autoReason);
        Alert.alert('Bloqueo automático', 'El dueño fue bloqueado por 3 reportes de distintos anuncios.');
      }
    } catch (e) {
      console.log('checkAutoBlockAfterReports error', e?.message || e);
    }
  };

  const onWarnKeep = () => {
    const msgReason = reason?.trim() || 'motivo no especificado';
    Alert.alert(
      'Advertir y mantener anuncio',
      'Se enviará una advertencia al dueño. El anuncio se mantiene publicado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Advertir',
          onPress: async () => {
            try {
              const titlePush = 'Advertencia de moderación';
              const bodyPush = `Tu anuncio "${job?.title || 'sin título'}" recibió una advertencia. Motivo: ${msgReason}`;
              await sendOwnerNotification(titlePush, bodyPush);
              await sendOwnerMessage(bodyPush);
              await logAdReport('Advertencia (mantener)');
              await publishAdIfNeeded();
              await checkAutoBlockAfterReports();
              Alert.alert('Advertencia enviada', 'El dueño fue notificado.');
            } catch (e) {
              console.log('Warn keep error', e?.message || e);
              Alert.alert('Error', e?.message || 'No se pudo enviar la advertencia');
            }
          },
        },
      ],
    );
  };

  const onWarnDelete = () => {
    const msgReason = reason?.trim() || 'motivo no especificado';
    Alert.alert(
      'Advertir y eliminar anuncio',
      'Se enviará advertencia al dueño y se eliminará el anuncio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Advertir y eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await logAdReport('Advertencia (eliminar)');
              await client.deleteExpressJob(job.id, token);
              const titlePush = 'Advertencia y eliminación';
              const bodyPush = `Tu anuncio "${job?.title || 'sin título'}" fue eliminado tras advertencia. Motivo: ${msgReason}`;
              await sendOwnerNotification(titlePush, bodyPush);
              await sendOwnerMessage(bodyPush);
              await checkAutoBlockAfterReports();
              Alert.alert('Anuncio eliminado', 'Se advirtió y notificó al dueño.');
              navigation.goBack();
            } catch (e) {
              console.log('Warn delete error', e?.message || e);
              Alert.alert('Error', e?.message || 'No se pudo completar la acción');
            }
          },
        },
      ],
    );
  };

  const onBlockOwner = () => {
    const msgReason = reason?.trim() || 'motivo no especificado';
    Alert.alert(
      'Bloquear dueño',
      'Esto impedirá que el dueño interactúe. Se enviará notificación con el motivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.blockUser(owner.id, msgReason, token);
              const titlePush = 'Cuenta bloqueada';
              const bodyPush = `Has sido bloqueado por incumplir las políticas. Motivo: ${msgReason}`;
              await sendOwnerNotification(titlePush, bodyPush);
              await sendOwnerMessage(bodyPush);
              Alert.alert('Dueño bloqueado', 'Se bloqueó y notificó al dueño.');
            } catch (e) {
              console.log('Block owner error', e?.message || e);
              Alert.alert('Error', e?.message || 'No se pudo bloquear al dueño');
            }
          },
        },
      ],
    );
  };

  const viewOwnerProfile = () => {
    if (!owner?.id) return;
    navigation.navigate('CandidateProfile', {
      candidateId: owner.id,
      candidateName: owner?.full_name || owner?.name || `ID ${owner?.id}`,
    });
  };



  const onDeleteAd = () => {
    const msgReason = reason?.trim() || 'motivo no especificado';
    Alert.alert(
      'Eliminar anuncio',
      'Se eliminará el anuncio de forma permanente. También se notificará al dueño con el motivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.deleteExpressJob(job.id, token);
              const titlePush = 'Anuncio eliminado';
              const bodyPush = `Tu anuncio "${job?.title || 'sin título'}" fue eliminado. Motivo: ${msgReason}`;
              await sendOwnerNotification(titlePush, bodyPush);
              await sendOwnerMessage(bodyPush);
              Alert.alert('Anuncio eliminado', 'Se notificó al dueño.');
              navigation.goBack();
            } catch (e) {
              console.log('Delete ad error', e?.message || e);
              Alert.alert('Error', e?.message || 'No se pudo eliminar el anuncio');
            }
          },
        },
      ],
    );
  };

  const onContactOwner = async () => {
    try {
      if (!user?.id || !token) {
        Alert.alert('Sesión requerida', 'Inicia sesión para contactar al dueño');
        return;
      }
      if (!owner?.id || !job?.id) return;
      const msgReason = reason?.trim() || 'motivo no especificado';
      const messageText = `Hola ${owner?.full_name || owner?.name || 'usuario'}, tu anuncio exprés "${job?.title || 'sin título'}" está en revisión por el motivo: ${msgReason}. Por favor explícanos para decidir qué hacer con tu anuncio.`;
      setContacting(true);
      const conv = await client.createConversation(user.id, owner.id, token);
      const convId = conv?.id || conv?.conversation_id || conv?.conversation?.id;
      if (!convId) throw new Error('No se pudo crear la conversación');
      await client.sendMessage(convId, messageText, token);
      Alert.alert('Notificado', 'Se envió el mensaje al dueño y recibirá notificación.');
      navigation.navigate('Chats');
    } catch (e) {
      console.log('Contact owner error', e?.message || e);
      Alert.alert('Error', e?.message || 'No se pudo contactar al dueño');
    } finally {
      setContacting(false);
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
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: 'white' }}>{title}</Text>
        </View>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Control y contacto con el dueño</Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{ marginTop: 12, color: '#666' }}>Cargando detalles...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: isNarrow ? 720 : 1080, flexDirection: isNarrow ? 'column' : 'row' }}>
            {/* Columna: Dueño */}
            <View style={{ flex: 1, marginRight: isNarrow ? 0 : 16, marginBottom: isNarrow ? 16 : 0 }}>
              <View style={{ backgroundColor: 'white', borderRadius: radius.md, padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: '#E5E7EB', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56 }} />
                    ) : (
                      <Ionicons name="person-circle-outline" size={48} color="#9CA3AF" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.purpleStart }}>{owner?.full_name || owner?.name || `ID ${owner?.id || job?.client_id}`}</Text>
                    {candidateProfile?.professional_title ? (
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Ocupación: {candidateProfile.professional_title}</Text>
                    ) : companyProfile?.company_name ? (
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Empresa: {companyProfile.company_name}</Text>
                    ) : null}
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Puntuación: {owner?.rating ?? 'N/A'}</Text>
                  </View>
                </View>
                {owner?.email && (
                  <Text style={{ fontSize: 13, color: '#374151', marginTop: 12 }}>Email: {owner.email}</Text>
                )}
                {owner?.phone_number && (
                  <Text style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>Teléfono: {owner.phone_number}</Text>
                )}
                <View style={{ flexDirection: isNarrow ? 'column' : 'row', marginTop: 12 }}>
                  <TouchableOpacity onPress={viewOwnerProfile} style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.sm, marginRight: isNarrow ? 0 : 8, marginBottom: isNarrow ? 8 : 0, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="person" size={18} color="#1D4ED8" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#1D4ED8', fontWeight: '600' }}>Ver perfil</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onWarnKeep} style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.sm, marginRight: isNarrow ? 0 : 8, marginBottom: isNarrow ? 8 : 0, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="alert-circle" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#D97706', fontWeight: '600' }}>Advertir y mantener</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onWarnDelete} style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.sm, marginRight: isNarrow ? 0 : 8, marginBottom: isNarrow ? 8 : 0, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="trash" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#B91C1C', fontWeight: '600' }}>Advertir y eliminar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onBlockOwner} style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="ban" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#B91C1C', fontWeight: '600' }}>Bloquear dueño</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Motivo y acción */}
              <View style={{ backgroundColor: 'white', borderRadius: radius.md, padding: 16, marginBottom: isNarrow ? 24 : 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.purpleStart }}>Motivo de revisión</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Describe el motivo de la revisión"
                  multiline
                  style={{ marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.sm, padding: 10, minHeight: 80, textAlignVertical: 'top' }}
                />
                <TouchableOpacity
                  onPress={onContactOwner}
                  disabled={contacting}
                  style={{ backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.sm, marginTop: 12, opacity: contacting ? 0.7 : 1 }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>{contacting ? 'Enviando...' : 'Contactar y notificar'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Columna: Anuncio */}
            <View style={{ flex: 1, marginLeft: isNarrow ? 0 : 16 }}>
              <View style={{ backgroundColor: 'white', borderRadius: radius.md, padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.purpleStart }}>Anuncio</Text>
                <Text style={{ fontSize: 14, color: '#111827', marginTop: 6 }}>{job?.title || 'Sin título'}</Text>
                {job?.description ? (
                  <Text style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{job.description}</Text>
                ) : null}
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Estado: {job?.status || 'desconocido'}</Text>
                {job?.budget && (
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Presupuesto: {job.budget}</Text>
                )}
                <TouchableOpacity onPress={() => navigation.navigate('ExpressJobDetail', { job })} style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginTop: 12 }}>
                  <Text style={{ color: '#4F46E5', fontWeight: '600' }}>Ver anuncio completo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

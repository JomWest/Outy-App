import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, spacing, radius } from '../theme';
import { normalizeTextSafe } from '../services/text';

export default function CandidateProfileScreen({ route, navigation }) {
  const { candidateId, candidateName: initialName } = route.params || {};
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [resumeUrl, setResumeUrl] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [candidateEmail, setCandidateEmail] = useState('');
  // Estado para calificaciones
  const [candidateWorkerId, setCandidateWorkerId] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  // Estado para reseñas
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  // Estado de contratación (etiqueta visual)
  const [isHired, setIsHired] = useState(route?.params?.jobStatus === 'en_proceso');

  useEffect(() => {
    loadData();
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  };

  const loadData = async () => {
    try {
      if (!candidateId) {
        Alert.alert('Error', 'ID de candidato no proporcionado');
        return;
      }
      setLoading(true);
      // Perfil
      const p = await api.getCandidateProfile(candidateId, token);
      setProfile(p || null);
      // Foto
      try {
        const url = await api.getFileFromDatabase(candidateId, 'profile_image', token);
        setImageUrl(url);
      } catch (e) {
        setImageUrl(null);
      }
      // CV
      try {
        const cvUrl = await api.getFileFromDatabase(candidateId, 'resume', token);
        setResumeUrl(cvUrl);
      } catch (e) {
        setResumeUrl(null);
      }
      // Experiencia laboral
      try {
        const exp = await api.getWorkExperience(candidateId, token);
        setExperiences(Array.isArray(exp) ? exp : []);
      } catch (e) {
        setExperiences([]);
      }
      // Email del candidato (usando lista de chat)
      try {
        const contacts = await api.getUsersForChat(token);
        const found = Array.isArray(contacts) ? contacts.find(u => u.id === candidateId) : null;
        setCandidateEmail(found?.email || '');
      } catch (e) {
        setCandidateEmail('');
      }
      // Resolver worker_id del candidato (necesario para reseñas)
      try {
        const resp = await api.getWorkerProfilesPaged(1, 1000, token);
        const items = resp.items || resp || [];
        const candidateWorker = items.find(wp => wp.user_id === candidateId);
        setCandidateWorkerId(candidateWorker?.id || null);
        // Cargar reseñas si hay perfil de trabajador
        if (candidateWorker?.id) {
          try {
            setReviewsLoading(true);
            const list = await api.getWorkerReviews(candidateWorker.id, token);
            setReviews(Array.isArray(list) ? list : []);
          } catch (errReviews) {
            console.warn('No se pudieron cargar reseñas del trabajador', errReviews?.message || errReviews);
            setReviews([]);
          } finally {
            setReviewsLoading(false);
          }
        } else {
          setReviews([]);
        }
      } catch (e) {
        console.warn('No se pudo resolver worker_id del candidato', e);
        setCandidateWorkerId(null);
      }
    } catch (error) {
      console.error('Error cargando datos del candidato:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil del candidato');
    } finally {
      setLoading(false);
    }
  };

  const ensureHttpUrl = (url) => {
    if (!url) return null;
    const u = String(url).trim();
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    return `https://${u}`;
  };

  const openExternal = async (url) => {
    const safe = ensureHttpUrl(url);
    if (!safe) return;
    try {
      const supported = await Linking.canOpenURL(safe);
      if (supported) {
        await Linking.openURL(safe);
      } else {
        Alert.alert('No se puede abrir la URL', safe);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el enlace');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const monthNames = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return iso;
    }
  };

  // Formatea teléfonos de Nicaragua asegurando prefijo +505
  const formatPhone505 = (raw) => {
    if (!raw) return 'No disponible';
    const s = (raw || '').toString().trim();
    const normalized = s.replace(/\s+/g, '');
    if (normalized.startsWith('+505')) return normalized;
    if (normalized.startsWith('505')) return `+${normalized}`;
    const digits = normalized.replace(/[^0-9]/g, '');
    if (digits.length === 8) return `+505 ${digits.slice(0,4)}-${digits.slice(4)}`;
    return `+505 ${s}`;
  };

  const handleOpenResume = async () => {
    if (!resumeUrl) return;
    try {
      await Linking.openURL(resumeUrl);
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el CV');
    }
  };

  const handleHire = async () => {
    try {
      if (!candidateId) return;
      setSending(true);
      // Si se llega desde un anuncio exprés con una postulación específica, aceptar y marcar en proceso
      const expressJobId = route.params?.expressJobId;
      const applicationId = route.params?.applicationId;
      let jobDetails = null;
      if (expressJobId && applicationId) {
        try {
          await api.updateExpressJobApplication(applicationId, { status: 'aceptada' }, token);
          await api.updateExpressJob(expressJobId, { status: 'en_proceso' }, token);
          setIsHired(true);
          try {
            jobDetails = await api.getExpressJobById(expressJobId, token);
          } catch (_) { /* no crítico */ }
        } catch (e) {
          console.warn('No se pudo actualizar estado de la postulación/anuncio', e?.message || e);
        }
      }
      // Crear conversación (idempotente del lado servidor)
      const conv = await api.createConversation(user.id, candidateId, token);
      const conversationId = conv?.id || conv?.conversation_id || conv?.conversationId;
      if (!conversationId) throw new Error('No se obtuvo ID de conversación');
      // Mensaje automático
      const candidateDisplayName = profile?.full_name || initialName || 'candidato';
      const titleText = jobDetails?.title ? `para "${normalizeTextSafe(jobDetails.title)}"` : '';
      const locationText = jobDetails?.department && jobDetails?.municipality ? `${normalizeTextSafe(jobDetails.department)} • ${normalizeTextSafe(jobDetails.municipality)}` : 'Ubicación por coordinar';
      const offerText = (route.params?.proposedPrice != null)
        ? `$${route.params.proposedPrice}`
        : (typeof jobDetails?.budget_min === 'number' ? `$${jobDetails.budget_min}` : 'Oferta por definir');
      const timeText = route.params?.estimatedTime ? normalizeTextSafe(route.params.estimatedTime) : 'Tiempo por definir';
      const text = `Hola ${candidateDisplayName}, has sido contratado ${titleText}.\nDetalles de la contratación:\n- Oferta: ${offerText}\n- Tiempo estimado: ${timeText}\n- Ubicación: ${locationText}\nTe escribiré por este chat para coordinar fecha y lugar.`;
      await api.sendMessage(conversationId, text, token);
      // Navegar al chat con el candidato
      navigation.navigate('Chat', { userId: candidateId, userName: candidateDisplayName, userRole: 'candidato' });
    } catch (error) {
      console.error('Error al contratar:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje automático');
    } finally {
      setSending(false);
    }
  };

  const submitReview = async () => {
    try {
      if (!rating || rating < 1) {
        Alert.alert('Calificación requerida', 'Por favor selecciona de 1 a 5 estrellas.');
        return;
      }
      setSubmittingReview(true);
      if (candidateWorkerId) {
        // Caso 1: candidato tiene perfil de trabajador -> reseña de trabajador
        const workerReview = {
          worker_id: candidateWorkerId,
          client_id: user?.id,
          overall_rating: rating,
          comment: reviewComment?.trim() || undefined,
          express_job_id: route.params?.expressJobId || undefined,
        };
        await api.createWorkerReview(workerReview, token);
      } else {
        // Caso 2: candidato SIN perfil de trabajador -> reseña genérica ligada a una postulación
        // Intentar localizar alguna postulación del candidato para poder vincular la reseña.
        // El backend devuelve objeto paginado { items, total, ... } así que tomamos items.
        const resp = await api.getJobApplications({ candidate_id: candidateId, page: 1, pageSize: 200 }, token);
        const apps = Array.isArray(resp) ? resp : (resp?.items || []);
        const ownApps = apps.filter(a => a?.candidate_id === candidateId);
        const applicationId = ownApps.length > 0 ? ownApps[0].id : null;
        if (!applicationId) {
          throw new Error('No encontramos una postulación asociada a este candidato para registrar la reseña.');
        }
        const genericReview = {
          job_application_id: applicationId,
          author_id: user?.id,
          author_role: user?.role === 'empleador' ? 'empleador' : 'candidato',
          subject_id: candidateId,
          subject_role: 'candidato',
          rating,
          comment: reviewComment?.trim() || undefined,
        };
        await api.createReview(genericReview, token);
      }
      Alert.alert('¡Gracias!', 'Tu calificación fue registrada correctamente.');
      setRating(0);
      setReviewComment('');
      // Refrescar reseñas si aplica
      if (candidateWorkerId) {
        try {
          await reloadReviews();
        } catch {}
      }
    } catch (error) {
      console.error('Error al enviar reseña:', error);
      Alert.alert('Error', error?.message || 'No se pudo enviar tu calificación');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Recargar reseñas del trabajador
  const reloadReviews = async () => {
    if (!candidateWorkerId) return;
    try {
      setReviewsLoading(true);
      const list = await api.getWorkerReviews(candidateWorkerId, token);
      setReviews(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('No se pudieron recargar las reseñas', e?.message || e);
    } finally {
      setReviewsLoading(false);
    }
  };

  const nameToShow = normalizeTextSafe(profile?.full_name || initialName || 'Candidato');
  const titleToShow = normalizeTextSafe(profile?.professional_title || 'Profesional');

  // Componente de botón social con estilos pulidos y colores de marca
  const SocialButton = ({ visible, onPress, brand = 'default', children, label }) => {
    if (!visible) return null;

    const brandStyles = {
      default: { bg: '#EEF2FF', border: colors.purpleStart, icon: colors.purpleStart },
      website: { bg: '#F0F9FF', border: '#0EA5E9', icon: '#0EA5E9' },
      linkedin: { bg: '#E8F1FB', border: '#0A66C2', icon: '#0A66C2' },
      instagram: { bg: '#FFF1F2', border: '#E1306C', icon: '#E1306C' },
      tiktok: { bg: '#F8FAFC', border: '#111827', icon: '#111827' },
    };

    const s = brandStyles[brand] || brandStyles.default;

    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          marginRight: 12,
          backgroundColor: s.bg,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: `${s.border}`,
          flexDirection: 'row',
          alignItems: 'center'
        }}
        activeOpacity={0.85}
      >
        {children}
        {label ? (
          <Text style={{ marginLeft: 8, color: s.icon, fontWeight: '700' }}>{label}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Estilo base para tarjetas del cuerpo
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 255, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.purpleStart, colors.purpleEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: 'white' }}>Perfil del candidato</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', marginRight: 12 }} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>{getInitials(normalizeTextSafe(nameToShow))}</Text>
            </View>
          )}
          <View>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{nameToShow}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{titleToShow}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <TouchableOpacity onPress={handleHire} disabled={sending} style={{ backgroundColor: 'white', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
            {sending ? (
              <ActivityIndicator size="small" color={colors.purpleStart} />
            ) : (
              <>
                <Ionicons name="hand-left" size={18} color={colors.purpleStart} />
                <Text style={{ color: colors.purpleStart, fontWeight: '700', marginLeft: 8 }}>Contratar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{ marginTop: 12, color: '#64748B' }}>Cargando perfil...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
          <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          {/* (Se quitó la tarjeta de "Experiencia laboral" y se moverá la Biografía más abajo) */}

          {/* Información de contacto */}
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(139, 69, 255, 0.1)', padding: 8, borderRadius: radius.md, marginRight: spacing.sm }}>
                  <Ionicons name="call" size={18} color={colors.purpleStart} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Contacto</Text>
              </View>
              {isHired && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#D1FAE5' }}>
                  <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 12 }}>Contratado</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ backgroundColor: '#EEF2FF', padding: 6, borderRadius: 10 }}>
                <Ionicons name="call" size={16} color={colors.purpleStart} />
              </View>
              <Text style={{ marginLeft: 10, color: '#0F172A', fontSize: 15 }}>{formatPhone505(profile?.phone_number || user?.phone_number)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#EEF2FF', padding: 6, borderRadius: 10 }}>
                <Ionicons name="mail" size={16} color={colors.purpleStart} />
              </View>
              <Text style={{ marginLeft: 10, color: '#0F172A', fontSize: 15 }}>{candidateEmail || user?.email || 'No disponible'}</Text>
            </View>
            {/* Redes sociales */}
            {(profile?.website || profile?.linkedin || profile?.instagram || profile?.tiktok) ? (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 10 }}>Redes sociales</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <SocialButton
                    visible={!!profile?.website}
                    onPress={() => openExternal(profile?.website)}
                    brand="website"
                    label="Web"
                  >
                    <Ionicons name="globe-outline" size={20} color="#0EA5E9" />
                  </SocialButton>

                  <SocialButton
                    visible={!!profile?.linkedin}
                    onPress={() => openExternal(profile?.linkedin)}
                    brand="linkedin"
                    label="LinkedIn"
                  >
                  <FontAwesome5 name="linkedin" size={20} color="#0A66C2" />
                  </SocialButton>

                  <SocialButton
                    visible={!!profile?.instagram}
                    onPress={() => openExternal(profile?.instagram)}
                    brand="instagram"
                    label="Instagram"
                  >
                    {/* Usamos FontAwesome para un icono más reconocible en web */}
                    <FontAwesome name="instagram" size={20} color="#E1306C" />
                  </SocialButton>

                  <SocialButton
                    visible={!!profile?.tiktok}
                    onPress={() => openExternal(profile?.tiktok)}
                    brand="tiktok"
                    label="TikTok"
                  >
                  {/* Usamos FontAwesome5 en estilo brand para que se vea en web */}
                    <FontAwesome5 name="tiktok" brand size={20} color="#111827" />
                  </SocialButton>
                </View>
              </View>
            ) : null}
          </View>

          {/* Reseñas */}
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ backgroundColor: 'rgba(139, 69, 255, 0.1)', padding: 8, borderRadius: radius.md, marginRight: spacing.sm }}>
                <Ionicons name="chatbubbles" size={18} color={colors.purpleStart} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Reseñas</Text>
            </View>
            {reviewsLoading ? (
              <View style={{ paddingVertical: 8 }}>
                <ActivityIndicator color={colors.purpleStart} />
              </View>
            ) : !reviews || reviews.length === 0 ? (
              <Text style={{ color: '#64748B' }}>Sin reseñas aún</Text>
            ) : (
              <View>
                {reviews.map((r, idx) => (
                  <View key={r.id || idx} style={{ paddingVertical: 10, borderTopWidth: idx === 0 ? 0 : 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {[1,2,3,4,5].map((s) => (
                        <Ionicons key={s} name={s <= (r?.overall_rating || r?.rating || 0) ? 'star' : 'star-outline'} size={16} color={colors.purpleStart} style={{ marginRight: 2 }} />
                      ))}
                      <Text style={{ marginLeft: 8, color: '#64748B', fontSize: 12 }}>{formatDate(r?.created_at)}</Text>
                    </View>
                    {r?.comment ? (
                      <Text style={{ marginTop: 6, color: '#0F172A' }}>{normalizeTextSafe(r.comment)}</Text>
                    ) : null}
                    {(r?.client_email || r?.job_title) ? (
                      <Text style={{ marginTop: 4, color: '#6B7280', fontSize: 12 }}>
                        {r?.client_email ? `por ${r.client_email}` : ''}
                        {r?.job_title ? `${r?.client_email ? ' • ' : ''}${r.job_title}` : ''}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Calificar trabajo */}
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ backgroundColor: 'rgba(139, 69, 255, 0.1)', padding: 8, borderRadius: radius.md, marginRight: spacing.sm }}>
                <Ionicons name="star" size={18} color={colors.purpleStart} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Calificar su trabajo</Text>
            </View>
            <Text style={{ color: '#6B7280', marginBottom: 8 }}>Selecciona una calificación de 1 a 5 estrellas</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              {[1,2,3,4,5].map((i) => (
                <TouchableOpacity key={i} onPress={() => setRating(i)} style={{ marginRight: 6 }}>
                  <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={26} color={colors.purpleStart} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Comentario (opcional)"
              value={reviewComment}
              onChangeText={setReviewComment}
              style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' }}
              multiline
            />
            <TouchableOpacity
              onPress={submitReview}
              disabled={submittingReview}
              style={{ marginTop: 12, backgroundColor: colors.purpleStart, paddingVertical: 12, borderRadius: 10, alignItems: 'center', opacity: submittingReview ? 0.7 : 1 }}
            >
              {submittingReview ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Enviar calificación</Text>
              )}
            </TouchableOpacity>
            {!candidateWorkerId && (
              <Text style={{ marginTop: 8, color: '#6B7280' }}>No tiene perfil de trabajador; usaremos reseñas generales vinculadas a postulaciones.</Text>
            )}
          </View>

          {/* Biografía (reemplaza Experiencia laboral) */}
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ backgroundColor: 'rgba(139, 69, 255, 0.1)', padding: 8, borderRadius: radius.md, marginRight: spacing.sm }}>
                <Ionicons name="document-text-outline" size={18} color={colors.purpleStart} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Biografía</Text>
            </View>
            {(profile?.bio || user?.bio) ? (
              <Text style={{ color: '#334155', fontSize: 15, lineHeight: 22 }}>{normalizeTextSafe(profile?.bio || user?.bio)}</Text>
            ) : (
              <Text style={{ color: '#64748B' }}>Sin biografía aún</Text>
            )}
          </View>

          {/* CV */}
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ backgroundColor: 'rgba(139, 69, 255, 0.1)', padding: 8, borderRadius: radius.md, marginRight: spacing.sm }}>
                <Ionicons name="document-text" size={18} color={colors.purpleStart} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Currículum</Text>
            </View>
            {resumeUrl ? (
              <TouchableOpacity onPress={handleOpenResume} style={{ backgroundColor: 'rgba(139, 69, 255, 0.05)', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2, borderColor: colors.purpleStart }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="eye" size={20} color={colors.purpleStart} />
                  <Text style={{ marginLeft: 8, color: colors.purpleStart, fontWeight: '700' }}>Ver CV</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#64748B' }}>CV no disponible</Text>
            )}
          </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, spacing, radius } from '../theme';

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
    } catch (error) {
      console.error('Error cargando datos del candidato:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil del candidato');
    } finally {
      setLoading(false);
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
      // Crear conversación (idempotente del lado servidor)
      const conv = await api.createConversation(user.id, candidateId, token);
      const conversationId = conv?.id || conv?.conversation_id || conv?.conversationId;
      if (!conversationId) throw new Error('No se obtuvo ID de conversación');
      // Mensaje automático
      const candidateDisplayName = profile?.full_name || initialName || 'candidato';
      const text = `Hola ${candidateDisplayName}, estoy interesado en tus servicios profesionales. ¿Podemos conversar para coordinar detalles?`;
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

  const nameToShow = profile?.full_name || initialName || 'Candidato';
  const titleToShow = profile?.professional_title || 'Profesional';

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
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>{getInitials(nameToShow)}</Text>
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Información de contacto */}
          <View style={{ backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(139, 69, 255, 0.1)', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ backgroundColor: 'rgba(139, 69, 255, 0.1)', padding: 8, borderRadius: radius.md, marginRight: spacing.sm }}>
                <Ionicons name="call" size={18} color={colors.purpleStart} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Contacto</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="phone-portrait" size={16} color="#64748B" />
              <Text style={{ marginLeft: 8, color: '#0F172A', fontSize: 15 }}>{profile?.phone_number || 'No disponible'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="mail" size={16} color="#64748B" />
              <Text style={{ marginLeft: 8, color: '#0F172A', fontSize: 15 }}>{candidateEmail || 'No disponible'}</Text>
            </View>
          </View>

          {/* Experiencia laboral */}
          <View style={{ backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(139, 69, 255, 0.1)', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: radius.md, marginRight: spacing.sm }}>
                <Ionicons name="briefcase" size={18} color="#10B981" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>Experiencia laboral</Text>
            </View>
            {experiences.length === 0 ? (
              <Text style={{ color: '#64748B' }}>Sin registros de experiencia</Text>
            ) : (
              experiences.map((exp) => (
                <View key={exp.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{exp.job_title} • {exp.company_name}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{formatDate(exp.start_date)}{exp.end_date ? ` - ${formatDate(exp.end_date)}` : ' - Actual'}</Text>
                  {exp.description ? (
                    <Text style={{ fontSize: 14, color: '#334155', marginTop: 6, lineHeight: 20 }}>{exp.description}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {/* CV */}
          <View style={{ backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(139, 69, 255, 0.1)', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6 }}>
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';
import { api as client } from '../api/client';
import { normalizeTextSafe } from '../services/text';

export default function NotificationsCenterScreen({ navigation }) {
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
  const [items, setItems] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await client.listMyNotifications(token);
        const list = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        // Prefetch detalles de anuncios exprés asociados (si aplica)
        const exprJobIds = list
          .map(n => (n?.data?.express_job_id ? n.data.express_job_id : null))
          .filter(Boolean);
        const uniqueIds = Array.from(new Set(exprJobIds));
        const details = {};
        for (const id of uniqueIds) {
          try {
            const job = await client.getExpressJobById(id, token);
            if (job?.id) details[id] = job;
          } catch (_) {}
        }
        if (!mounted) return;
        setJobsById(details);
        setItems(list);
      } catch (e) {
        console.log('NotificationsCenter load error', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id, token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: 'white' }}>Centro de Notificaciones</Text>
          </View>
        </View>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{items.length} notificaciones</Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{ marginTop: 12, color: '#666' }}>Cargando notificaciones...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="notifications-outline" size={64} color="#CBD5E1" />
              <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>No hay notificaciones</Text>
            </View>
          ) : items.map(n => {
            const job = n?.data?.express_job_id ? (jobsById[n.data.express_job_id] || null) : null;
            const title = n?.title || (job?.title ? normalizeTextSafe(job.title) : 'Notificación');
            const body = n?.body || (n?.type === 'express_review' ? 'Tu anuncio exprés fue puesto en revisión.' : 'Notificación');
            return (
              <View key={n.id} style={{ backgroundColor: 'white', borderRadius: radius.md, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                {job?.id ? (
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Anuncio: {job.id} (express_job)</Text>
                ) : null}
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.purpleStart, marginTop: 4 }}>{title}</Text>
                <Text style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{body}</Text>
                <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
                  {job?.id ? (
                    <TouchableOpacity onPress={() => navigation.navigate('ExpressJobDetail', { job })} style={{ backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginRight: 8 }}>
                      <Text style={{ color: 'white', fontWeight: '600' }}>Ver anuncio</Text>
                    </TouchableOpacity>
                  ) : null}
                  {!n?.is_read ? (
                    <TouchableOpacity onPress={async () => { try { await client.markNotificationRead(n.id, token); n.is_read = true; } catch(_){} }} style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm }}>
                      <Text style={{ color: '#111827' }}>Marcar como leída</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm }}>
                      <Text style={{ color: '#6B7280' }}>Leída</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
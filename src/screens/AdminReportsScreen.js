import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api as client } from '../api/client';
import { colors, spacing, typography, radius } from '../theme';

export default function AdminReportsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [dailyReports, setDailyReports] = useState([]);
  const [adDailyReports, setAdDailyReports] = useState([]);
  const [adDetails, setAdDetails] = useState({}); // { [ad_id]: job }
  const [adOwners, setAdOwners] = useState({}); // { [user_id]: user }
  const [reporters, setReporters] = useState({}); // { [user_id]: user }
  const [reportedUsers, setReportedUsers] = useState({}); // { [user_id]: user }
  const [blocks, setBlocks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isNarrow = width < 420;

  const canModerate = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reports, adReports, blk] = await Promise.all([
        client.listDailyReports(date, token),
        client.listDailyAdReports(date, token),
        client.listBlocks(token)
      ]);
      // Backend returns { date, count, items } for daily endpoints
      setDailyReports(reports?.items || reports || []);
      setAdDailyReports(adReports?.items || adReports || []);
      setBlocks(blk || []);
      // Prefetch detalles básicos para anuncios exprés reportados
      const exprAdIds = (adReports?.items || adReports || []).filter(r => r.ad_type === 'express_job').map(r => r.ad_id);
      const uniqueExprIds = Array.from(new Set(exprAdIds));
      const detailsBatch = {};
      for (const id of uniqueExprIds) {
        try {
          const job = await client.getExpressJobById(id, token);
          if (job?.id) detailsBatch[id] = job;
        } catch (_) { /* omit */ }
      }
      if (Object.keys(detailsBatch).length > 0) setAdDetails(prev => ({ ...prev, ...detailsBatch }));
      // Prefetch propietarios
      const ownerIds = Object.values(detailsBatch).map(j => j.client_id).filter(Boolean);
      const uniqueOwners = Array.from(new Set(ownerIds));
      const ownersBatch = {};
      for (const uid of uniqueOwners) {
        try {
          const u = await client.getUserById(uid, token);
          if (u?.id) ownersBatch[uid] = u;
        } catch (_) { /* omit */ }
      }
      if (Object.keys(ownersBatch).length > 0) setAdOwners(prev => ({ ...prev, ...ownersBatch }));

      // Prefetch reporteros de reportes de anuncios
      const reporterIdsAds = (adReports?.items || adReports || []).map(r => r.reporter_id).filter(Boolean);
      const uniqueReporterAds = Array.from(new Set(reporterIdsAds));
      const reportersBatchAds = {};
      for (const uid of uniqueReporterAds) {
        try {
          const u = await client.getUserById(uid, token);
          if (u?.id) reportersBatchAds[uid] = u;
        } catch (_) { /* omit */ }
      }
      if (Object.keys(reportersBatchAds).length > 0) setReporters(prev => ({ ...prev, ...reportersBatchAds }));

      // Prefetch usuarios involucrados en reportes de usuarios
      const reporterIdsUsers = (reports?.items || reports || []).map(r => r.reporter_user_id).filter(Boolean);
      const reportedIdsUsers = (reports?.items || reports || []).map(r => r.reported_user_id).filter(Boolean);
      const uniqueUserIds = Array.from(new Set([ ...reporterIdsUsers, ...reportedIdsUsers ]));
      const usersBatch = {};
      for (const uid of uniqueUserIds) {
        try {
          const u = await client.getUserById(uid, token);
          if (u?.id) usersBatch[uid] = u;
        } catch (_) { /* omit */ }
      }
      if (Object.keys(usersBatch).length > 0) {
        setReporters(prev => ({ ...prev, ...Object.fromEntries(Object.entries(usersBatch).filter(([id]) => reporterIdsUsers.includes(id))) }));
        setReportedUsers(prev => ({ ...prev, ...Object.fromEntries(Object.entries(usersBatch).filter(([id]) => reportedIdsUsers.includes(id))) }));
      }
    } catch (e) {
      console.log('AdminReports load error', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!canModerate) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" />
        <Text style={{ marginTop: 12, fontSize: 16, color: '#6B7280' }}>Acceso restringido</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: '#9CA3AF' }}>Solo el super administrador puede ver reportes.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16, backgroundColor: colors.purpleStart, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.purpleStart, paddingTop: 40, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: radius.sm, marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: 'white', fontSize: 18, fontWeight: 'bold' }}>Panel de Moderación</Text>
          <TouchableOpacity onPress={onRefresh} style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: radius.sm }}>
            <Ionicons name="refresh" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={{ marginTop: 6, color: 'rgba(255,255,255,0.85)' }}>Reportes del día: {date}</Text>
        {/* Accesos rápidos a listados por estado */}
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TouchableOpacity onPress={() => navigation.navigate('AdminExpressStatus', { status: 'en_revision' })} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, marginRight: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>En revisión</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AdminExpressStatus', { status: 'eliminado' })} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Eliminados</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Daily Reports */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.purpleStart} />
              <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#111827' }}>Reportes de hoy ({dailyReports.length})</Text>
            </View>
            {dailyReports.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#6B7280' }}>No hay reportes para esta fecha.</Text>
            ) : (
              dailyReports.map((r) => (
                <View key={r.id} style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#111827' }}>Usuario reportado: {reportedUsers[r.reported_user_id]?.full_name || reportedUsers[r.reported_user_id]?.name || reportedUsers[r.reported_user_id]?.email || r.reported_user_id}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Reportado por: {reporters[r.reporter_user_id]?.full_name || reporters[r.reporter_user_id]?.name || reporters[r.reporter_user_id]?.email || r.reporter_user_id}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Motivo: {r.reason || 'Sin motivo'}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Fecha: {new Date(r.created_at).toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>

          {/* Ad Reports */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="flag-outline" size={20} color={colors.purpleEnd} />
              <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#111827' }}>Reportes de anuncios ({adDailyReports.length})</Text>
            </View>
            {adDailyReports.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#6B7280' }}>No hay reportes de anuncios.</Text>
            ) : (
              adDailyReports.map((r) => (
                <View key={r.id} style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#111827' }}>Anuncio: {r.ad_id} ({r.ad_type})</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Reportado por: {reporters[r.reporter_id]?.full_name || reporters[r.reporter_id]?.name || reporters[r.reporter_id]?.email || r.reporter_id}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Motivo: {r.reason || 'Sin motivo'}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Fecha: {new Date(r.created_at).toLocaleString()}</Text>
                  {/* Detalles del anuncio exprés */}
                  {r.ad_type === 'express_job' && adDetails[r.ad_id] && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 13, color: colors.purpleStart, fontWeight: '600' }}>{adDetails[r.ad_id]?.title || 'Anuncio exprés'}</Text>
                      {adDetails[r.ad_id]?.description ? (
                        <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{adDetails[r.ad_id].description}</Text>
                      ) : null}
                      {adDetails[r.ad_id]?.client_id && (
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Propietario: {adOwners[adDetails[r.ad_id].client_id]?.full_name || adOwners[adDetails[r.ad_id].client_id]?.name || adOwners[adDetails[r.ad_id].client_id]?.email || adDetails[r.ad_id].client_id}</Text>
                      )}
                      <View style={{ flexDirection: isNarrow ? 'column' : 'row', flexWrap: isNarrow ? 'nowrap' : 'wrap', marginTop: 8 }}>
                        {/* Poner en revisión */}
                        <TouchableOpacity onPress={async () => {
                          try {
                            const job = adDetails[r.ad_id] || await client.getExpressJobById(r.ad_id, token);
                            if (!job?.id) return;
                            const nextStatus = 'en_revision';
                            const updated = await client.updateExpressJob(job.id, { status: nextStatus }, token);
                            setAdDetails(prev => ({ ...prev, [job.id]: { ...(prev[job.id] || job), status: updated?.status || nextStatus } }));
                            // Notificar al propietario (push + mensaje)
                            const ownerId = job?.client_id;
                            if (ownerId) {
                               try { await client.sendPushToUser(ownerId, 'Tu anuncio ha sido puesto en revisión', `Motivo: ${r.reason || 'no especificado'}`, { ad_id: job.id, status: 'en_revision' }, token); } catch (_) {}
                              try {
                                const convo = await client.createConversation(user.id, ownerId, token);
                                await client.sendMessage(convo?.id, `Aviso de moderación: tu anuncio (${job.title || job.id}) fue puesto en revisión. Motivo: ${r.reason || 'no especificado'}.`, token);
                              } catch (_) {}
                            }
                            // Quitar reporte de la lista de "Reportes de anuncios" y mover visualmente al apartado de revisión
                            setAdDailyReports(prev => prev.filter(x => x.id !== r.id));
                          } catch (e) {
                            console.log('Poner en revisión error', e?.message || e);
                          }
                        }} style={{ backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginRight: isNarrow ? 0 : 8, marginBottom: 8, alignItems: 'center', ...(isNarrow ? { width: '100%' } : {}) }}>
                          <Text style={{ color: 'white', fontWeight: '600' }}>Poner en revisión</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={async () => {
                          try {
                            const job = adDetails[r.ad_id] || await client.getExpressJobById(r.ad_id, token);
                            if (job) {
                              navigation.navigate('ExpressJobDetail', { job });
                            }
                          } catch (_) { /* noop */ }
                        }} style={{ backgroundColor: colors.purpleStart, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginRight: isNarrow ? 0 : 8, marginBottom: 8, alignItems: 'center', ...(isNarrow ? { width: '100%' } : {}) }}>
                          <Text style={{ color: 'white', fontWeight: '600' }}>Ver anuncio</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={async () => {
                          try {
                            const job = adDetails[r.ad_id] || await client.getExpressJobById(r.ad_id, token);
                            const ownerId = job?.client_id;
                            if (!ownerId) return;
                            const ownerName = adOwners[ownerId]?.full_name || adOwners[ownerId]?.name || adOwners[ownerId]?.email || 'Propietario';
                            const ownerRole = adOwners[ownerId]?.role;
                            // Navegar al chat pasando userId y nombre, ChatScreen creará (o reutilizará) la conversación
                            navigation.navigate('Chat', { userId: ownerId, userName: ownerName, userRole: ownerRole });
                          } catch (e) {
                            console.log('Contactar propietario error', e?.message || e);
                          }
                        }} style={{ backgroundColor: '#0EA5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginRight: isNarrow ? 0 : 8, marginBottom: 8, alignItems: 'center', ...(isNarrow ? { width: '100%' } : {}) }}>
                          <Text style={{ color: 'white', fontWeight: '600' }}>Contactar propietario</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={async () => {
                          try {
                            const job = adDetails[r.ad_id] || await client.getExpressJobById(r.ad_id, token);
                            if (!job?.id) return;
                            const nextStatus = 'eliminado';
                            const updated = await client.updateExpressJob(job.id, { status: nextStatus }, token);
                            setAdDetails(prev => ({ ...prev, [job.id]: { ...(prev[job.id] || job), status: updated?.status || nextStatus } }));
                            // Notificar al propietario (push + mensaje)
                            const ownerId = job?.client_id;
                            if (ownerId) {
                              try { await client.sendPushToUser(ownerId, 'Tu anuncio ha sido eliminado', `Motivo: ${r.reason || 'no especificado'}`, { ad_id: job.id, status: 'eliminado' }, token); } catch (_) {}
                              try {
                                const convo = await client.createConversation(user.id, ownerId, token);
                                await client.sendMessage(convo?.id, `Aviso de moderación: tu anuncio (${job.title || job.id}) fue eliminado. Motivo: ${r.reason || 'no especificado'}.`, token);
                              } catch (_) {}
                            }
                            // Quitar reporte de la lista
                            setAdDailyReports(prev => prev.filter(x => x.id !== r.id));
                          } catch (e) {
                            console.log('Eliminar anuncio error', e?.message || e);
                          }
                        }} style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginBottom: 8, alignItems: 'center', ...(isNarrow ? { width: '100%' } : {}) }}>
                          <Text style={{ color: 'white', fontWeight: '600' }}>Eliminar anuncio</Text>
                        </TouchableOpacity>
                      </View>
                      {/* Estado del anuncio (si existe) */}
                      {adDetails[r.ad_id]?.status ? (
                        <View style={{ marginTop: 6 }}>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>Estado: {adDetails[r.ad_id].status}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Blocks */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="remove-circle-outline" size={20} color="#EF4444" />
              <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#111827' }}>Usuarios bloqueados ({blocks.length})</Text>
            </View>
            {blocks.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#6B7280' }}>No hay usuarios bloqueados.</Text>
            ) : (
              blocks.map((b) => (
                <View key={b.id} style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#111827' }}>Usuario: {b.blocked_user_id}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Razón: {b.reason || 'Sin motivo'}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Fecha: {new Date(b.created_at).toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Bottom bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          <TouchableOpacity style={{ alignItems: 'center' }} activeOpacity={0.8} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home" size={24} color={colors.purpleStart} />
            <Text style={{ fontSize: 12, color: colors.purpleStart, marginTop: 4, fontWeight: '500' }}>Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center' }} activeOpacity={0.8} onPress={() => navigation.navigate('Chats')}>
            <Ionicons name="chatbubbles-outline" size={24} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Mensajes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center' }} activeOpacity={0.8} onPress={() => navigation.navigate('Jobs')}>
            <Ionicons name="briefcase-outline" size={24} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Trabajos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
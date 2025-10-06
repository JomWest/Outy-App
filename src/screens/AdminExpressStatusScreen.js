import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';
import { api as client } from '../api/client';

export default function AdminExpressStatusScreen({ navigation, route }) {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
  const status = route?.params?.status || 'en_revision';
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await client.searchExpressJobs({ status }, token);
        if (mounted) setJobs(Array.isArray(res) ? res : (res?.items || []));
      } catch (e) {
        console.log('AdminExpressStatusScreen load error', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [status, token]);

  const title = status === 'eliminado' ? 'Anuncios eliminados (exprés)' : 'Anuncios en revisión (exprés)';

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
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{jobs.length} anuncios</Text>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{ marginTop: 12, color: '#666' }}>Cargando anuncios...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {jobs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name={status === 'eliminado' ? 'trash-outline' : 'alert-circle-outline'} size={64} color="#CBD5E1" />
              <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>
                {status === 'eliminado' ? 'No hay anuncios eliminados' : 'No hay anuncios en revisión'}
              </Text>
            </View>
          ) : jobs.map(job => (
            <View key={job.id} style={{ backgroundColor: 'white', borderRadius: radius.md, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
              <View style={{ flexDirection: isNarrow ? 'column' : 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: isNarrow ? 0 : 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.purpleStart }}>{job.title || 'Sin título'}</Text>
                  {job.description ? (
                    <Text style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{job.description}</Text>
                  ) : null}
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Estado: {job.status}</Text>
                </View>
                <View style={{ flexShrink: 0, alignItems: isNarrow ? 'flex-start' : 'flex-end', marginTop: isNarrow ? 12 : 0 }}>
                  <TouchableOpacity onPress={() => navigation.navigate('ExpressReviewDetail', { job })} style={{ backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm }}>
                    <Text style={{ color: 'white', fontWeight: '600' }}>Ver anuncio</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
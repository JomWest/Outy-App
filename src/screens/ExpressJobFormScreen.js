import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, radius } from '../theme';
import { labelUrgency } from '../services/text';

export default function ExpressJobFormScreen({ route, navigation }) {
  const { user, token } = useAuth();
  const editingJob = route?.params?.job || null;

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(editingJob?.title || '');
  const [description, setDescription] = useState(editingJob?.description || '');
  const [tradeCategoryId, setTradeCategoryId] = useState(editingJob?.trade_category_id || null);
  const [locationId, setLocationId] = useState(editingJob?.location_id || null);
  const [addressDetails, setAddressDetails] = useState(editingJob?.address_details || '');
  const [urgency, setUrgency] = useState(editingJob?.urgency || 'flexible');
  const [preferredDate, setPreferredDate] = useState(editingJob?.preferred_date || '');
  const [estimatedDuration, setEstimatedDuration] = useState(editingJob?.estimated_duration || '');
  const [budgetMin, setBudgetMin] = useState(editingJob?.budget_min ? String(editingJob.budget_min) : '');
  const [budgetMax, setBudgetMax] = useState(editingJob?.budget_max ? String(editingJob.budget_max) : '');
  const [currency, setCurrency] = useState(editingJob?.currency || 'NIO');
  const [paymentMethod, setPaymentMethod] = useState(editingJob?.payment_method || '');

  useEffect(() => {
    const loadData = async () => {
      try {
        const cats = await api.getTradeCategories(1, 200, token);
        setCategories(cats.items || cats || []);
        const locs = await api.getLocationsNicaragua(1, 500, token);
        setLocations(locs.items || locs || []);
      } catch (e) {
        console.error('Form load error', e);
      }
    };
    loadData();
  }, [token]);

  const validate = () => {
    if (!title.trim() || !description.trim() || !tradeCategoryId) {
      Alert.alert('Campos requeridos', 'Título, descripción y categoría son obligatorios.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        client_id: user.id,
        trade_category_id: tradeCategoryId,
        title: title.trim(),
        description: description.trim(),
        location_id: locationId || null,
        address_details: addressDetails?.trim() || undefined,
        urgency: urgency || 'flexible',
        preferred_date: preferredDate || undefined,
        estimated_duration: estimatedDuration || undefined,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        currency: currency || 'NIO',
        payment_method: paymentMethod || undefined,
        status: editingJob?.status || 'abierto'
      };

      if (editingJob?.id) {
        const updated = await api.updateExpressJob(editingJob.id, payload, token);
        Alert.alert('Actualizado', 'Tu anuncio fue actualizado correctamente.');
        navigation.replace('ExpressJobDetail', { job: updated });
      } else {
        const created = await api.createExpressJob(payload, token);
        Alert.alert('Publicado', 'Tu anuncio fue publicado correctamente.');
        navigation.replace('ExpressJobDetail', { job: created });
      }
    } catch (e) {
      console.error('Submit express job error', e);
      Alert.alert('Error', 'No se pudo procesar tu anuncio.');
    } finally {
      setLoading(false);
    }
  };

  const headerTitle = editingJob ? 'Editar anuncio exprés' : 'Publicar anuncio exprés';

  const categoryName = (id) => categories.find(c => c.id === id)?.name;
  const locationLabel = (id) => {
    const l = locations.find(x => x.id === id);
    return l ? `${l.department} • ${l.municipality}` : undefined;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <LinearGradient colors={[colors.purpleStart, colors.purpleEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingVertical: 20, paddingTop: Platform.OS === 'ios' ? 40 : 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: 'white' }}>{headerTitle}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Título */}
        <Text style={{ fontSize: 14, color: '#374151' }}>Título del anuncio</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Ej: Necesito un carpintero para arreglar puertas"
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6 }} />

        {/* Descripción */}
        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Descripción detallada</Text>
        <TextInput value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Describe lo que necesitas..."
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6, textAlignVertical: 'top' }} />

        {/* Categoría */}
        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Categoría de servicio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {categories.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setTradeCategoryId(c.id)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tradeCategoryId === c.id ? colors.purpleStart : '#E5E7EB', backgroundColor: tradeCategoryId === c.id ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: tradeCategoryId === c.id ? colors.purpleStart : '#374151' }}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Ubicación */}
        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Ubicación (opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {[null, ...locations.map(l => l.id)].map(id => (
            <TouchableOpacity key={id === null ? 'all' : id} onPress={() => setLocationId(id)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: locationId === id ? colors.purpleStart : '#E5E7EB', backgroundColor: locationId === id ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: locationId === id ? colors.purpleStart : '#374151' }}>{id === null ? 'Sin ubicación' : locationLabel(id)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Urgencia */}
        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Urgencia</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {['inmediato','hoy','esta_semana','flexible'].map(u => (
            <TouchableOpacity key={u} onPress={() => setUrgency(u)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: urgency === u ? colors.purpleStart : '#E5E7EB', backgroundColor: urgency === u ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: urgency === u ? colors.purpleStart : '#374151' }}>{labelUrgency(u)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Presupuesto */}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 14, color: '#374151' }}>Presupuesto mínimo</Text>
            <TextInput value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" placeholder="Ej: 500"
              style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6 }} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontSize: 14, color: '#374151' }}>Presupuesto máximo</Text>
            <TextInput value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="Ej: 1500"
              style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6 }} />
          </View>
        </View>

        {/* Otros detalles */}
        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Dirección (opcional)</Text>
        <TextInput value={addressDetails} onChangeText={setAddressDetails} placeholder="Ej: Barrio X, casa azul"
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6 }} />

        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Fecha preferida (YYYY-MM-DD, opcional)</Text>
        <TextInput value={preferredDate} onChangeText={setPreferredDate} placeholder="2025-10-05"
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6 }} />

        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Duración estimada (opcional)</Text>
        <TextInput value={estimatedDuration} onChangeText={setEstimatedDuration} placeholder="Ej: 2-3 horas"
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6 }} />

        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Moneda</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {['NIO','USD'].map(cur => (
            <TouchableOpacity key={cur} onPress={() => setCurrency(cur)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: currency === cur ? colors.purpleStart : '#E5E7EB', backgroundColor: currency === cur ? `${colors.purpleStart}15` : 'white', marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: currency === cur ? colors.purpleStart : '#374151' }}>{cur}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={{ fontSize: 14, color: '#374151', marginTop: 12 }}>Método de pago (opcional)</Text>
        <TextInput value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Ej: efectivo, transferencia"
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: radius.md, padding: 12, marginTop: 6 }} />

        {/* Botón enviar */}
        <TouchableOpacity onPress={handleSubmit} disabled={loading}
          style={{ marginTop: 20, backgroundColor: colors.purpleStart, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '600' }}>{editingJob ? 'Guardar cambios' : 'Publicar anuncio'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
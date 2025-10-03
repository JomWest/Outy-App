import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import GradientBackground from '../ui/GradientBackground';
import PrimaryButton from '../ui/PrimaryButton';
import LoadingModal from '../ui/LoadingModal';
import SuccessModal from '../ui/SuccessModal';
import ErrorModal from '../ui/ErrorModal';
import { colors, spacing, typography, radius } from '../theme';
import { api } from '../api/client';

export default function CrearCuentaScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nombre: '',
    primerNombre: '',
    apellido: '',
    email: '',
    fechaNacimiento: '',
    telefono: '',
    password: '',
    tituloProfesional: '',
    bio: '',
    ciudad: '',
    departamento: '',
    website: '',
    linkedin: '',
    instagram: '',
    tiktok: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados para foto de perfil y CV (ambos opcionales)
  const [profileImage, setProfileImage] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Estilo de tarjeta para secciones del formulario
  const sectionCardStyle = {
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  };

  // Estilos base modernos para labels e inputs
  const labelStyle = [
    typography.label,
    { color: colors.textSecondary, fontSize: 12, letterSpacing: 0.2 }
  ];

  const inputStyle = {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 6,
    paddingLeft: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // Locations Nicaragua (departamentos y municipios)
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [allCitiesInDept, setAllCitiesInDept] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Cargar todas las páginas para asegurar departamentos y ciudades completas
        const pageSize = 500;
        let page = 1;
        let acc = [];
        while (true) {
          const r = await api.getLocationsNicaragua(page, pageSize);
          const itemsPage = r.items || r || [];
          acc = acc.concat(Array.isArray(itemsPage) ? itemsPage : []);
          const total = (typeof r.total === 'number') ? r.total : undefined;
          if (!itemsPage.length) break;
          if (total && acc.length >= total) break;
          if (itemsPage.length < pageSize) break;
          page += 1;
          if (page > 50) break; // salvaguarda por si el servidor no limita
        }
        const items = acc;
        if (!mounted) return;
        setLocations(Array.isArray(items) ? items : []);
        const deps = Array.from(new Set((Array.isArray(items) ? items : []).map(i => (i.department || '').toString().trim()))).filter(Boolean).sort();
        setDepartments(deps);
      } catch (e) {
        console.log('Load locations error', e?.message || e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const normalize = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Inferir departamento a partir de la ciudad escrita/seleccionada
  const inferDepartmentFromCity = (city) => {
    if (!city) return '';
    const match = locations.find(l => normalize(l.municipality) === normalize(city));
    return match ? (match.department || '') : '';
  };

  const onSelectDepartment = (dept) => {
    setSelectedDept(dept);
    updateField('departamento', dept);
    setCityInput('');
    updateField('ciudad', '');
    const cities = Array.from(new Set(locations.filter(l => normalize(l.department) === normalize(dept)).map(l => (l.municipality || '').toString().trim()))).filter(Boolean).sort();
    setAllCitiesInDept(cities);
    setCitySuggestions(cities);
  };

  const onCityInputChange = (text) => {
    setCityInput(text);
    updateField('ciudad', text);
    // Si no hay departamento seleccionado, intentar inferirlo por la ciudad
    if (!selectedDept) {
      const inferred = inferDepartmentFromCity(text);
      if (inferred) {
        setSelectedDept(inferred);
        updateField('departamento', inferred);
      }
    }
    const baseCities = allCitiesInDept.length ? allCitiesInDept : Array.from(new Set(locations.filter(l => normalize(l.department) === normalize(selectedDept)).map(l => (l.municipality || '').toString().trim()))).filter(Boolean);
    const filtered = (text.trim().length === 0)
      ? baseCities
      : baseCities.filter(c => normalize(c).includes(normalize(text))).sort();
    // Mostrar hasta 100 sugerencias para listas grandes como Matagalpa
    setCitySuggestions(filtered.slice(0, 100));
  };

  const formatDate = (text) => {
    // Auto-format date as DD/MM/YYYY
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const formatPhone = (text) => {
    // Auto-format phone as XXXX-XXXX
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  };

  const validateForm = () => {
    if (!formData.primerNombre.trim()) return 'El primer nombre es requerido';
    if (!formData.apellido.trim()) return 'El apellido es requerido';
    if (!formData.email.trim()) return 'El email es requerido';
    if (!formData.email.includes('@')) return 'Email inválido';
    if (!formData.fechaNacimiento) return 'La fecha de nacimiento es requerida';
    if (formData.fechaNacimiento.length !== 10) return 'Fecha inválida (DD/MM/YYYY)';
    if (!formData.telefono) return 'El teléfono es requerido';
    if (formData.telefono.length < 8) return 'Teléfono inválido';
    if (!formData.password) return 'La contraseña es requerida';
    if (formData.password.length < 10) return 'La contraseña debe tener al menos 10 caracteres';
    // Ubicación requerida (Nicaragua)
    if (!formData.departamento.trim()) return 'El departamento es requerido';
    if (!formData.ciudad.trim()) return 'La ciudad es requerida';
    // Validación simple de URLs si se proporcionan
    const urlRegex = /^https?:\/\//i;
    if (formData.website && !urlRegex.test(formData.website)) return 'Website debe iniciar con http(s)://';
    if (formData.linkedin && !urlRegex.test(formData.linkedin)) return 'LinkedIn debe iniciar con http(s)://';
    if (formData.instagram && !urlRegex.test(formData.instagram)) return 'Instagram debe iniciar con http(s)://';
    if (formData.tiktok && !urlRegex.test(formData.tiktok)) return 'TikTok debe iniciar con http(s)://';
    return null;
  };

  const selectProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar la foto');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        // Validar tamaño (máx 8MB)
        if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
          Alert.alert('Imagen muy grande', 'La foto debe ser menor a 8MB');
          return;
        }
        setProfileImage(asset);
      }
    } catch (e) {
      console.error('Error selecting profile image', e);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const selectResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          Alert.alert('Archivo muy grande', 'El CV debe ser menor a 10MB');
          return;
        }
        setResumeFile(asset);
      }
    } catch (e) {
      console.error('Error selecting resume', e);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const uploadProfileImage = async (jwt) => {
    if (!profileImage || !jwt) return null;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      if (profileImage.uri.startsWith('blob:') || profileImage.uri.startsWith('data:')) {
        const response = await fetch(profileImage.uri);
        const blob = await response.blob();
        formData.append('file', blob, profileImage.fileName || 'profile.jpg');
      } else {
        formData.append('file', {
          uri: profileImage.uri,
          type: profileImage.type || 'image/jpeg',
          name: profileImage.fileName || 'profile.jpg',
        });
      }
      const res = await api.uploadFileToDatabase(formData, jwt, 'profile_image');
      return res?.success ? 'stored_in_database' : null;
    } catch (e) {
      console.error('Error uploading profile image', e);
      Alert.alert('Error', 'No se pudo subir la foto de perfil');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadResume = async (jwt) => {
    if (!resumeFile || !jwt) return null;
    try {
      setUploadingResume(true);
      const formData = new FormData();
      if (resumeFile.uri && (resumeFile.uri.startsWith('blob:') || resumeFile.uri.startsWith('data:'))) {
        const response = await fetch(resumeFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, resumeFile.name || 'resume.pdf');
      } else {
        formData.append('file', {
          uri: resumeFile.uri,
          type: resumeFile.mimeType,
          name: resumeFile.name,
        });
      }
      const res = await api.uploadFileToDatabase(formData, jwt, 'resume');
      return res?.success ? 'stored_in_database' : null;
    } catch (e) {
      console.error('Error uploading resume', e);
      Alert.alert('Error', 'No se pudo subir el CV');
      return null;
    } finally {
      setUploadingResume(false);
    }
  };

  const onSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

  try {
      // Prepare data for API
      const userData = {
        email: formData.email.trim().toLowerCase(),
        password_hash: formData.password, // The API will hash it
        role: 'candidato', // rol no editable (se elimina selector)
        phone_number: formData.telefono.replace('-', '')
      };
      // Crear usuario mediante el cliente API
      const newUser = await api.createUser(userData);

      // Completar perfil con datos adicionales
        // Iniciar sesión para obtener token
        const loginRes = await api.login(formData.email.trim().toLowerCase(), formData.password);
        const jwt = loginRes?.token;

        if (!jwt) {
          throw new Error('No se pudo autenticar después de crear el usuario.');
        }

        // Construir payload de perfil
        const deptToUse = (selectedDept || formData.departamento || inferDepartmentFromCity(formData.ciudad) || '').trim();
        const fullName = [formData.primerNombre, formData.apellido]
          .map(s => (s || '').trim())
          .filter(Boolean)
          .join(' ') || formData.nombre.trim();

        const profileData = {
          user_id: newUser.id,
          full_name: fullName,
          professional_title: formData.tituloProfesional.trim() || undefined,
          bio: formData.bio.trim() || undefined,
          city: formData.ciudad.trim(),
          country: 'Nicaragua',
          // Nuevo: guardar departamento
          department: deptToUse || undefined,
          // Campos que acepta el backend según schemas.candidate_profiles
          website: formData.website.trim() || undefined,
          linkedin: formData.linkedin.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          tiktok: formData.tiktok.trim() || undefined,
        };

        // Omitimos location_id en el payload porque la columna no existe en la DB actual
        // Si más adelante se agrega la columna, se puede reactivar el mapeo

        // Intentar crear el perfil; si falla, intentar actualizar (por si existe fila creada por carga de archivos)
        let profileSaved = false;
        try {
          const created = await api.createCandidateProfile(profileData, jwt);
          profileSaved = !!created && !!created.user_id;
        } catch (profileErr) {
          console.warn('Error al crear perfil de candidato:', profileErr?.message || profileErr);
          const errMsg = (profileErr?.message || '').toString();
          if (errMsg.includes("Invalid column name 'department'")) {
            // Si el servidor aún no tiene la migración aplicada, reintentar sin department
            const safeProfileData = { ...profileData };
            delete safeProfileData.department;
            try {
              const created2 = await api.createCandidateProfile(safeProfileData, jwt);
              profileSaved = !!created2 && !!created2.user_id;
            } catch (profileErr2) {
              try {
                const updated2 = await api.updateCandidateProfile(newUser.id, safeProfileData, jwt);
                profileSaved = !!updated2 && !!updated2.user_id;
              } catch (updateErr2) {
                console.error('Error al actualizar perfil existente (sin department):', updateErr2?.message || updateErr2);
                setErrorMessage(updateErr2?.message || profileErr2?.message || 'No se pudo guardar el perfil');
                setShowErrorModal(true);
                return;
              }
            }
          } else {
            // Fallback: si ya existe una fila, intentamos actualizar
            try {
              const updated = await api.updateCandidateProfile(newUser.id, profileData, jwt);
              profileSaved = !!updated && !!updated.user_id;
            } catch (updateErr) {
              console.error('Error al actualizar perfil existente:', updateErr?.message || updateErr);
              // Mostrar error y abortar registro si no se pudo guardar el perfil
              setErrorMessage(updateErr?.message || profileErr?.message || 'No se pudo guardar el perfil');
              setShowErrorModal(true);
              return; // Evitar mostrar éxito y no subir archivos
            }
          }
        }

        // Verificación posterior: consultar el perfil y confirmar datos críticos
        try {
          const checkProfile = await api.getCandidateProfile(newUser.id, jwt);
          if (!checkProfile || !checkProfile.full_name) {
            throw new Error('El perfil no contiene nombre después de guardarlo.');
          }
          // Si llega aquí, consideramos que el perfil está guardado
          profileSaved = true;
        } catch (verifyErr) {
          console.warn('Verificación de perfil falló:', verifyErr?.message || verifyErr);
          if (!profileSaved) {
            setErrorMessage('No se pudo verificar el guardado del perfil.');
            setShowErrorModal(true);
            return;
          }
        }

        // Subir archivos opcionales (no bloquea el éxito del registro)
        try {
          await uploadProfileImage(jwt);
        } catch {}
        try {
          await uploadResume(jwt);
        } catch {}

      // Mostrar modal de éxito
      setShowSuccessModal(true);

    } catch (err) {
      console.error('Error creating account:', err);
      setErrorMessage(err.message || 'Error al crear la cuenta');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalNavigate = () => {
    setShowSuccessModal(false);
    navigation.navigate('Login');
  };

  const handleErrorModalRetry = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    // El usuario puede intentar nuevamente
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Layout container to center and limit width */}
          <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
             <Image source={require('../../assets/logo_outy.png')} style={{ width: 56, height: 56, marginBottom: 24 }} />
            
            <Text style={{
              fontSize: 30,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: 0.3
            }}>
              Crear Cuenta
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              lineHeight: 22
            }}>
              Esta es OUTY la oportunidad que miles de{'\n'}profesionales Nicaragüenses esperaban
            </Text>
          </View>

          {/* Form */}
          
            {/* Foto de perfil (opcional) visible en Avanzado */}
            {showAdvanced && (
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <TouchableOpacity
                onPress={selectProfileImage}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: colors.purpleStart,
                  overflow: 'hidden'
                }}
                activeOpacity={0.85}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage.uri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    {uploadingImage ? (
                      <ActivityIndicator color={colors.purpleStart} />
                    ) : (
                      <Ionicons name="camera" size={28} color={colors.purpleStart} />
                    )}
                    <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Agregar Foto (opcional)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            )}
            {/* Información Personal */}
            <View style={sectionCardStyle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="person-circle-outline" size={20} color={colors.purpleStart} />
                <Text style={{ marginLeft: 8, color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Información Personal</Text>
              </View>

              {/* Primer Nombre y Apellido */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textSecondary }]}>Primer Nombre</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={formData.primerNombre}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, primerNombre: text }))}
                      placeholder="Jomar"
                      placeholderTextColor="#9CA3AF"
                      style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                    />
                    <Ionicons name="person-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textSecondary }]}>Apellido</Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={formData.apellido}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, apellido: text }))}
                      placeholder="Díaz"
                      placeholderTextColor="#9CA3AF"
                      style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                    />
                    <Ionicons name="person-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                  </View>
                </View>
              </View>

            {/* Email Input */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Correo Electrónico</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={formData.email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                    placeholder="jornar@gmail.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="mail-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>
              </View>

            {/* Birth Date Input */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Fecha de Nacimiento</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={formData.fechaNacimiento}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fechaNacimiento: formatDate(text) }))}
                    placeholder="18/03/2001"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="calendar-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>
              </View>

          {/* Phone Input */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Número de Teléfono</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={formData.telefono}
                onChangeText={(text) => setFormData(prev => ({ ...prev, telefono: formatPhone(text) }))}
                placeholder="5815-5967"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={9}
                style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
              />
              <Ionicons name="call-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
            </View>
          </View>

          {/* Password inside Personal Info */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Contraseña</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36, paddingRight: 44 }}
              />
              <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 10, top: 16 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
          </View>

          {/* Toggle Avanzado */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(v => !v)}
            style={{ alignSelf: 'center', marginTop: 8, marginBottom: 16 }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(139,69,255,0.25)' }}>
              <Ionicons name={showAdvanced ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.purpleStart} />
              <Text style={{ marginLeft: 6, color: colors.textSecondary, fontWeight: '600' }}>
                Información adicional (opcional)
              </Text>
            </View>
          </TouchableOpacity>

          {/* Perfil Profesional */}
          {showAdvanced && (
            <>
            <View style={sectionCardStyle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="briefcase-outline" size={20} color={colors.purpleStart} />
                <Text style={{ marginLeft: 8, color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Perfil Profesional</Text>
              </View>
              {/* Professional Title */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Título Profesional</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={formData.tituloProfesional}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, tituloProfesional: text }))}
                    placeholder="Desarrollador Frontend, Electricista, etc."
                    placeholderTextColor="#9CA3AF"
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="briefcase-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>
              </View>

            {/* Bio */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Bio</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={formData.bio}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                    placeholder="Cuenta tu experiencia y fortalezas"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36, minHeight: 100 }}
                  />
                  <Ionicons name="document-text-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>
              </View>
            </View>

              {/* Ubicación */}
              <View style={sectionCardStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="location-outline" size={20} color={colors.purpleStart} />
                  <Text style={{ marginLeft: 8, color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Ubicación</Text>
                </View>
                {/* Departamento (Nicaragua) */}
                <Text style={[typography.label, { color: colors.textSecondary }]}>Departamento (Nicaragua)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {departments.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => onSelectDepartment(d)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        marginRight: 8,
                        marginBottom: 8,
                        backgroundColor: selectedDept === d ? colors.purpleStart : colors.card,
                      }}
                    >
                      <Text style={{ color: selectedDept === d ? 'white' : colors.textSecondary }}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* City */}
              <View style={sectionCardStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="business-outline" size={20} color={colors.purpleStart} />
                  <Text style={{ marginLeft: 8, color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Ciudad</Text>
                </View>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Ciudad</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={cityInput}
                    onChangeText={onCityInputChange}
                    placeholder={selectedDept ? `Ciudad en ${selectedDept}` : 'Selecciona un departamento primero'}
                    placeholderTextColor="#9CA3AF"
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="location-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>
                {/* Sugerencias de ciudades */}
                {selectedDept ? (
                  <ScrollView style={{ marginTop: 6, maxHeight: 200 }}>
                    {citySuggestions.map((c) => (
                      <TouchableOpacity
                        key={`${selectedDept}-${c}`}
                        onPress={() => { setCityInput(c); updateField('ciudad', c); }}
                        style={{ backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6 }}
                      >
                        <Text style={{ color: colors.textSecondary }}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>

              {/* Redes y Sitio */}
              <View style={sectionCardStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="globe-outline" size={20} color={colors.purpleStart} />
                  <Text style={{ marginLeft: 8, color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Redes y Sitio</Text>
                </View>

                {/* Website */}
                <Text style={[typography.label, { color: colors.textSecondary }]}>Website</Text>
                <View style={{ position: 'relative', marginBottom: spacing.md }}>
                  <TextInput
                    value={formData.website}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
                    placeholder="https://tu-sitio.com"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="globe-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>

                {/* LinkedIn */}
                <Text style={[typography.label, { color: colors.textSecondary }]}>LinkedIn</Text>
                <View style={{ position: 'relative', marginBottom: spacing.md }}>
                  <TextInput
                    value={formData.linkedin}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, linkedin: text }))}
                    placeholder="https://www.linkedin.com/in/usuario"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="logo-linkedin" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>

                {/* Instagram */}
                <Text style={[typography.label, { color: colors.textSecondary }]}>Instagram</Text>
                <View style={{ position: 'relative', marginBottom: spacing.md }}>
                  <TextInput
                    value={formData.instagram}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, instagram: text }))}
                    placeholder="https://www.instagram.com/usuario"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="logo-instagram" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>

                {/* TikTok */}
                <Text style={[typography.label, { color: colors.textSecondary }]}>TikTok</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={formData.tiktok}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, tiktok: text }))}
                    placeholder="https://www.tiktok.com/@usuario"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6, paddingLeft: 36 }}
                  />
                  <Ionicons name="musical-notes-outline" size={18} color="#6B7280" style={{ position: 'absolute', left: 10, top: 18 }} />
                </View>
              </View>

            {/* Currículum */}
            <View style={sectionCardStyle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="document-text-outline" size={20} color={colors.purpleStart} />
                <Text style={{ marginLeft: 8, color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Currículum</Text>
              </View>
              <TouchableOpacity
                onPress={selectResume}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                  borderWidth: 2,
                  borderColor: resumeFile ? colors.purpleStart : '#E5E7EB',
                  borderStyle: resumeFile ? 'solid' : 'dashed'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-text" size={20} color={colors.purpleStart} />
                  <Text style={{ marginLeft: 8, color: colors.textSecondary }}>
                    {resumeFile ? `CV seleccionado: ${resumeFile.name}` : 'Subir CV (opcional, PDF o DOCX)'}
                  </Text>
                </View>
                {uploadingResume && (
                  <View style={{ marginTop: 8 }}>
                    <ActivityIndicator color={colors.purpleStart} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
            </>
          )}

            {/* Seguridad eliminada: la contraseña ahora está dentro de Información Personal */}

            {/* Error Message */}
            {error && (
              <Text style={{
                color: '#FF6B6B',
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 16,
                backgroundColor: 'rgba(255,107,107,0.1)',
                padding: 12,
                borderRadius: 8
              }}>
                {error}
              </Text>
            )}

            {/* Submit Button */}
            <PrimaryButton
              title="Crear Cuenta"
              onPress={onSubmit}
              loading={loading}
            />
          

          {/* Bottom Spacer */}
          <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Loading Modal */}
      <LoadingModal 
        visible={loading} 
        message="Creando cuenta..." 
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        message="Usuario creado exitosamente"
        onNavigateToLogin={handleSuccessModalNavigate}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onRetry={handleErrorModalRetry}
        onClose={handleErrorModalClose}
      />
    </GradientBackground>
  );
}
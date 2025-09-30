import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  TextInput, 
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, spacing, typography, radius } from '../theme';
import LoadingModal from '../ui/LoadingModal';
import SuccessModal from '../ui/SuccessModal';
import ErrorModal from '../ui/ErrorModal';

export default function ProfileScreen({ navigation }) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

  // Profile data state
  const [profileData, setProfileData] = useState({
    full_name: '',
    professional_title: '',
    bio: '',
    profile_picture_url: '',
    resume_url: '',
    phone_number: user?.phone_number || ''
  });

  // File upload states
  const [profileImage, setProfileImage] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    loadProfileData();
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const profile = await api.getCandidateProfile(user.id, token);
      if (profile) {
        // Load profile image URL if exists
        let profileImageUrl = '';
        if (profile.profile_picture_data) {
          try {
            profileImageUrl = await api.getFileFromDatabase(user.id, 'profile_image', token);
          } catch (imageError) {
            console.error('Error loading profile image:', imageError);
          }
        }
        
        // Load resume URL if exists
        let resumeUrl = '';
        if (profile.resume_data) {
          try {
            resumeUrl = await api.getFileFromDatabase(user.id, 'resume', token);
          } catch (resumeError) {
            console.error('Error loading resume:', resumeError);
          }
        }
        
        setProfileData({
          full_name: profile.full_name || user?.full_name || user?.name || '',
          professional_title: profile.professional_title || '',
          bio: profile.bio || '',
          profile_picture_url: profileImageUrl,
          resume_url: resumeUrl,
          phone_number: user?.phone_number || ''
        });
      } else {
        // If no profile exists, initialize with user data
        setProfileData({
          full_name: user?.full_name || user?.name || '',
          professional_title: '',
          bio: '',
          profile_picture_url: '',
          resume_url: '',
          phone_number: user?.phone_number || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // If profile doesn't exist, initialize with user data
      setProfileData({
        full_name: user?.full_name || user?.name || '',
        professional_title: '',
        bio: '',
        profile_picture_url: '',
        resume_url: '',
        phone_number: user?.phone_number || ''
      });
    } finally {
      setLoading(false);
    }
  };

  const [nameValidationMessage, setNameValidationMessage] = useState('');
  const [nameValidationTimeout, setNameValidationTimeout] = useState(null);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate full name for duplicates
    if (field === 'full_name' && value.trim().length >= 2) {
      // Clear previous timeout
      if (nameValidationTimeout) {
        clearTimeout(nameValidationTimeout);
      }

      // Set new timeout for validation
      const timeout = setTimeout(async () => {
        try {
          const response = await api.validateCandidateName(value.trim(), user.id, token);
          if (response.exists) {
            if (response.suggestions && response.suggestions.length > 0) {
              setNameValidationMessage(`Este nombre ya existe. Sugerencias: ${response.suggestions.join(', ')}`);
            } else {
              setNameValidationMessage('Este nombre ya está en uso por otro candidato.');
            }
          } else {
            setNameValidationMessage('');
          }
        } catch (error) {
          console.log('Error validating name:', error);
          // Don't show error to user for validation failures
        }
      }, 1000); // Wait 1 second after user stops typing

      setNameValidationTimeout(timeout);
    } else if (field === 'full_name') {
      setNameValidationMessage('');
    }
  };

  const validateForm = () => {
    if (!profileData.full_name.trim()) {
      return 'El nombre completo es requerido';
    }
    if (profileData.full_name.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    return null;
  };

  const handleSaveProfile = async () => {
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      setShowErrorModal(true);
      return;
    }

    try {
      setSaving(true);
      
      // Upload profile image if selected
      if (profileImage) {
        await uploadProfileImage();
        // Reload profile data to get the updated image URL
        await loadProfileData();
      }

      // Upload resume if selected
      if (resumeFile) {
        await uploadResume();
        // Reload profile data to get the updated resume URL
        await loadProfileData();
      }

      // Save profile data (without file URLs since files are now stored as BLOBs)
      const updatedProfile = {
        ...profileData,
        user_id: user.id
      };

      // Remove file URL fields since we're now storing files as BLOBs
      delete updatedProfile.profile_picture_url;
      delete updatedProfile.resume_url;

      await api.updateCandidateProfile(user.id, updatedProfile, token);
      
      // Update phone number in user table if changed
      if (profileData.phone_number !== user.phone_number) {
        await api.updateUser(user.id, { phone_number: profileData.phone_number }, token);
      }

      setShowSuccessModal(true);
      
      // Clear selected files after successful upload
      setProfileImage(null);
      setResumeFile(null);
      
      // Reload profile data to reflect changes
      await loadProfileData();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorMessage(error.message || 'Error al guardar el perfil');
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const selectProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos permisos para acceder a tus fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Archivo muy grande', 'La imagen debe ser menor a 5MB');
          return;
        }

        setProfileImage(asset);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const selectResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate file size (max 10MB)
        if (asset.size > 10 * 1024 * 1024) {
          Alert.alert('Archivo muy grande', 'El CV debe ser menor a 10MB');
          return;
        }

        setResumeFile(asset);
      }
    } catch (error) {
      console.error('Error selecting resume:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };



  const uploadProfileImage = async () => {
    if (!profileImage) return null;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      
      // Check if we're in web environment
      if (profileImage.uri.startsWith('blob:') || profileImage.uri.startsWith('data:')) {
        // Web environment - convert to blob
        const response = await fetch(profileImage.uri);
        const blob = await response.blob();
        formData.append('file', blob, profileImage.fileName || 'profile.jpg');
      } else {
        // React Native environment
        formData.append('file', {
          uri: profileImage.uri,
          type: profileImage.type || 'image/jpeg',
          name: profileImage.fileName || 'profile.jpg',
        });
      }
      
      const response = await api.uploadFileToDatabase(formData, token, 'profile_image');
      return response.success ? 'stored_in_database' : null;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw new Error('Error al subir la imagen de perfil');
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadResume = async () => {
    if (!resumeFile) return null;

    try {
      setUploadingResume(true);
      const formData = new FormData();
      
      // Check if we're in web environment
      if (resumeFile.uri && (resumeFile.uri.startsWith('blob:') || resumeFile.uri.startsWith('data:'))) {
        // Web environment - convert to blob
        const response = await fetch(resumeFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, resumeFile.name || 'resume.pdf');
      } else {
        // React Native environment
        formData.append('file', {
          uri: resumeFile.uri,
          type: resumeFile.mimeType,
          name: resumeFile.name,
        });
      }

      const response = await api.uploadFileToDatabase(formData, token, 'resume');
      return response.success ? 'stored_in_database' : null;
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw new Error('Error al subir el CV');
    } finally {
      setUploadingResume(false);
    }
  };

  const renderProfileImage = () => {
    const imageSource = profileImage ? { uri: profileImage.uri } : 
                       profileData.profile_picture_url ? { uri: profileData.profile_picture_url } : null;

    return (
      <Animated.View style={{
        alignItems: 'center',
        marginBottom: spacing.lg,
        opacity: fadeAnim
      }}>
        <View style={{
          shadowColor: colors.purpleStart,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 12
        }}>
          <TouchableOpacity
            onPress={selectProfileImage}
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'white',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.sm,
              borderWidth: 5,
              borderColor: colors.purpleStart,
              overflow: 'hidden',
              transform: [{ scale: 1 }]
            }}
            activeOpacity={0.8}
          >
            {uploadingImage ? (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}>
                <ActivityIndicator size="large" color="white" />
                <Text style={{ color: 'white', marginTop: 12, fontSize: 14, fontWeight: '600' }}>
                  Subiendo imagen...
                </Text>
              </View>
            ) : null}
            
            {imageSource ? (
              <Image source={imageSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[colors.purpleStart, colors.purpleEnd]}
                style={{
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="person-add" size={60} color="white" />
                <Text style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: '600',
                  marginTop: 8,
                  textAlign: 'center'
                }}>
                  Agregar Foto
                </Text>
              </LinearGradient>
            )}
            
            {/* Camera overlay with improved design */}
            <View style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: colors.purpleStart,
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6
            }}>
              <Ionicons name="camera" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={selectProfileImage}
          style={{
            backgroundColor: 'rgba(139, 69, 255, 0.15)',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 25,
            borderWidth: 2,
            borderColor: colors.purpleStart,
            shadowColor: colors.purpleStart,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4
          }}
        >
          <Text style={{
            color: colors.purpleStart,
            fontSize: 15,
            fontWeight: '700',
            textAlign: 'center'
          }}>
            {profileImage || profileData.profile_picture_url ? '✨ Cambiar imagen' : '📸 Agregar foto de perfil'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <LinearGradient
          colors={[colors.purpleStart, colors.purpleEnd]}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: 40,
            borderRadius: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10
          }}>
            <ActivityIndicator size="large" color={colors.purpleStart} />
            <Text style={{ 
              marginTop: spacing.md, 
              color: colors.textPrimary,
              fontSize: 16,
              fontWeight: '600'
            }}>
              Cargando perfil...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.purpleStart, colors.purpleEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingTop: 40,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 12,
              borderRadius: radius.md,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center'
            }}>
              Mi Perfil
            </Text>
            <Text style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              marginTop: 2
            }}>
              Completa tu información profesional
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={saving}
            style={{
              backgroundColor: saving ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              padding: 12,
              borderRadius: radius.md,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4
            }}
          >
            {saving ? (
              <ActivityIndicator size={24} color="white" />
            ) : (
              <Ionicons name="checkmark" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ 
          padding: spacing.lg,
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }}>
          {/* Profile Image Section */}
          {renderProfileImage()}

          {/* Basic Information */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: radius.xl,
            padding: spacing.lg,
            marginBottom: spacing.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(139, 69, 255, 0.1)'
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md
            }}>
              <View style={{
                backgroundColor: 'rgba(139, 69, 255, 0.1)',
                padding: 8,
                borderRadius: radius.md,
                marginRight: spacing.sm
              }}>
                <Ionicons name="person" size={20} color={colors.purpleStart} />
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: colors.textPrimary
              }}>
                Información Personal
              </Text>
            </View>

            {/* Full Name */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { 
                color: colors.textSecondary,
                fontSize: 14,
                fontWeight: '600',
                marginBottom: 8
              }]}>
                Nombre Completo *
              </Text>
              <View style={{
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: profileData.full_name ? colors.purpleStart : '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}>
                <TextInput
                  value={profileData.full_name}
                  onChangeText={(value) => handleInputChange('full_name', value)}
                  placeholder="Ingresa tu nombre completo"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    fontSize: 17,
                    fontWeight: '500',
                    color: '#1F2937',
                    letterSpacing: 0.5
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {nameValidationMessage ? (
                <Text style={{
                  color: '#F59E0B',
                  fontSize: 13,
                  fontWeight: '500',
                  marginTop: 6,
                  marginLeft: 4
                }}>
                  ⚠️ {nameValidationMessage}
                </Text>
              ) : null}
            </View>

            {/* Professional Title */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { 
                color: colors.textSecondary,
                fontSize: 14,
                fontWeight: '600',
                marginBottom: 8
              }]}>
                Título Profesional
              </Text>
              <View style={{
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: profileData.professional_title ? colors.purpleStart : '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}>
                <TextInput
                  value={profileData.professional_title}
                  onChangeText={(value) => handleInputChange('professional_title', value)}
                  placeholder="Ej: Desarrollador Frontend, Diseñador UX/UI"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    fontSize: 17,
                    fontWeight: '500',
                    color: '#1F2937',
                    letterSpacing: 0.5
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { 
                color: colors.textSecondary,
                fontSize: 14,
                fontWeight: '600',
                marginBottom: 8
              }]}>
                Número de Teléfono
              </Text>
              <View style={{
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: profileData.phone_number ? colors.purpleStart : '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}>
                <TextInput
                  value={profileData.phone_number}
                  onChangeText={(value) => handleInputChange('phone_number', value)}
                  placeholder="Ej: 8888-8888"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  style={{
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    fontSize: 17,
                    fontWeight: '500',
                    color: '#1F2937',
                    letterSpacing: 0.5
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Bio */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[typography.label, { 
                  color: colors.textSecondary,
                  fontSize: 14,
                  fontWeight: '600'
                }]}>
                  Biografía
                </Text>
                <Text style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '500'
                }}>
                  {profileData.bio ? profileData.bio.length : 0}/500
                </Text>
              </View>
              <View style={{
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: profileData.bio ? colors.purpleStart : '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}>
                <TextInput
                  value={profileData.bio}
                  onChangeText={(value) => {
                    if (value.length <= 500) {
                      handleInputChange('bio', value);
                    }
                  }}
                  placeholder="Cuéntanos sobre ti, tu experiencia y objetivos profesionales..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={{
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    fontSize: 17,
                    fontWeight: '500',
                    minHeight: 140,
                    maxHeight: 200,
                    color: '#1F2937',
                    letterSpacing: 0.3,
                    lineHeight: 24
                  }}
                  autoCapitalize="sentences"
                  autoCorrect={true}
                  maxLength={500}
                />
              </View>
              {profileData.bio && profileData.bio.length > 450 && (
                <Text style={{
                  color: profileData.bio.length >= 500 ? '#EF4444' : '#F59E0B',
                  fontSize: 12,
                  fontWeight: '500',
                  marginTop: 4,
                  marginLeft: 4
                }}>
                  {profileData.bio.length >= 500 ? '⚠️ Límite alcanzado' : '⚠️ Cerca del límite'}
                </Text>
              )}
            </View>
          </View>

          {/* Documents Section */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: radius.xl,
            padding: spacing.lg,
            marginBottom: spacing.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(139, 69, 255, 0.1)'
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md
            }}>
              <View style={{
                backgroundColor: 'rgba(139, 69, 255, 0.1)',
                padding: 8,
                borderRadius: radius.md,
                marginRight: spacing.sm
              }}>
                <Ionicons name="document-text" size={20} color={colors.purpleStart} />
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: colors.textPrimary
              }}>
                Documentos
              </Text>
            </View>

            {/* Resume Upload */}
            <TouchableOpacity
              onPress={selectResume}
              style={{
                backgroundColor: resumeFile || profileData.resume_url ? 
                  'rgba(139, 69, 255, 0.05)' : colors.card,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
                borderWidth: 2,
                borderColor: resumeFile || profileData.resume_url ? colors.purpleStart : '#E5E7EB',
                borderStyle: resumeFile || profileData.resume_url ? 'solid' : 'dashed',
                shadowColor: resumeFile || profileData.resume_url ? colors.purpleStart : '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: resumeFile || profileData.resume_url ? 0.2 : 0.1,
                shadowRadius: 8,
                elevation: 4
              }}
            >
              <View style={{ alignItems: 'center' }}>
                {uploadingResume ? (
                  <View style={{ alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.purpleStart} />
                    <Text style={{
                      marginTop: spacing.sm,
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.purpleStart
                    }}>
                      Subiendo CV...
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={{
                      backgroundColor: resumeFile || profileData.resume_url ? 
                        colors.purpleStart : 'rgba(139, 69, 255, 0.1)',
                      padding: 16,
                      borderRadius: 50,
                      marginBottom: spacing.sm
                    }}>
                      <Ionicons 
                        name="document-text" 
                        size={40} 
                        color={resumeFile || profileData.resume_url ? 'white' : colors.purpleStart} 
                      />
                    </View>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: resumeFile || profileData.resume_url ? colors.purpleStart : colors.textSecondary,
                      textAlign: 'center'
                    }}>
                      {resumeFile ? `📄 ${resumeFile.name}` : 
                       profileData.resume_url ? '✅ CV cargado exitosamente' : '📎 Subir CV (PDF, DOCX)'}
                    </Text>
                    <Text style={{
                      marginTop: 8,
                      fontSize: 14,
                      color: colors.textSecondary,
                      textAlign: 'center',
                      lineHeight: 20
                    }}>
                      {resumeFile || profileData.resume_url ? 
                        'Toca para cambiar tu curriculum vitae' : 
                        'Selecciona tu curriculum vitae en formato PDF o DOCX'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modals */}
      <LoadingModal visible={saving} message="Guardando perfil..." />
      <SuccessModal 
        visible={showSuccessModal}
en tr        message="¡Perfil actualizado exitosamente! 🎉"
        onClose={() => {
          setShowSuccessModal(false);
          // Reload profile data after modal is closed to show updated information
          loadProfileData();
        }}
      />
      <ErrorModal 
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
}
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors, spacing, typography, radius } from '../theme';
import socketService from '../services/socketService';

// Helper functions
const getUserTypeInfo = (role) => {
  switch (role) {
    case 'empleado':
      return {
        label: 'Empleado',
        color: '#10B981',
        icon: 'briefcase'
      };
    case 'candidato':
      return {
        label: 'Candidato',
        color: colors.purpleStart,
        icon: 'person'
      };
    default:
      return {
        label: 'Usuario',
        color: '#6B7280',
        icon: 'person'
      };
  }
};

const getInitials = (email) => {
  if (!email) return 'U';
  const name = email.split('@')[0];
  return name.substring(0, 2).toUpperCase();
};

const formatTime = (time) => {
  return time || '10:30 AM';
};

export default function ChatsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [profileImages, setProfileImages] = useState({});

  useEffect(() => {
    loadConversations();
    
    // Set up real-time listeners for new messages
    const handleNewMessage = (message) => {
      updateConversationWithNewMessage(message);
    };

    // Listen for new messages globally
    socketService.addGlobalMessageListener(handleNewMessage);

    return () => {
      socketService.removeGlobalMessageListener(handleNewMessage);
    };
  }, []);

  const updateConversationWithNewMessage = (message) => {
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.conversation_id === message.conversation_id) {
          return {
            ...conv,
            last_message: message.message_text,
            last_message_at: message.created_at,
            unread_count: message.sender_id !== user.id ? (conv.unread_count || 0) + 1 : conv.unread_count
          };
        }
        return conv;
      });
    });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Token requerido');
      }
      
      // Get user conversations from API
      const conversationsData = await api.getUserConversations(user.id, token);
      
      // Process conversations data
      const processedConversations = conversationsData.map(conv => ({
        ...conv,
        isOnline: Math.random() > 0.5, // This would come from socket connection status in real implementation
        unread_count: conv.unread_count || 0
      }));
      
      setConversations(processedConversations);
      
      // Load profile images for all users in conversations
      loadProfileImages(processedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError('Error al cargar las conversaciones');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileImages = async (conversations) => {
    const imagePromises = conversations.map(async (conv) => {
      try {
        // Check if user has profile image data
        const profile = await api.getCandidateProfile(conv.other_user_id, token);
        if (profile && profile.profile_picture_data) {
          const imageUrl = api.getFileFromDatabase('profile_image', conv.other_user_id, token);
          return { userId: conv.other_user_id, imageUrl };
        }
      } catch (error) {
        console.log(`No profile image for user ${conv.other_user_id}`);
      }
      return { userId: conv.other_user_id, imageUrl: null };
    });

    try {
      const results = await Promise.all(imagePromises);
      const imageMap = {};
      results.forEach(result => {
        imageMap[result.userId] = result.imageUrl;
      });
      setProfileImages(imageMap);
    } catch (error) {
      console.error('Error loading profile images:', error);
    }
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv =>
    conv.other_user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConversationItem = (conversation) => {
    const userTypeInfo = getUserTypeInfo(conversation.other_user_role);
    const profileImageUrl = profileImages[conversation.other_user_id];
    
    return (
      <TouchableOpacity
        key={conversation.conversation_id}
        style={{
          backgroundColor: 'white',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6'
        }}
        onPress={() => navigation.navigate('Chat', { 
          userId: conversation.other_user_id, 
          userName: conversation.other_user_email?.split('@')[0] || 'Usuario',
          userRole: conversation.other_user_role
        })}
        activeOpacity={0.7}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          {/* Avatar */}
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: userTypeInfo.color,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {profileImageUrl ? (
              <Image 
                source={{ uri: profileImageUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 28
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: 'white'
              }}>
                {getInitials(conversation.other_user_email)}
              </Text>
            )}
            
            {/* Online indicator */}
            {conversation.isOnline && (
              <View style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#10B981',
                borderWidth: 2,
                borderColor: 'white'
              }} />
            )}
          </View>

          {/* Conversation Info */}
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#1F2937',
                flex: 1
              }}>
                {conversation.other_user_email?.split('@')[0] || 'Usuario'}
              </Text>
              
              <Text style={{
                fontSize: 12,
                color: '#9CA3AF'
              }}>
                {formatTime(conversation.last_message_at)}
              </Text>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 6
            }}>
              <View style={{
                backgroundColor: `${userTypeInfo.color}15`,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.sm,
                marginRight: 8
              }}>
                <Text style={{
                  fontSize: 11,
                  color: userTypeInfo.color,
                  fontWeight: '500'
                }}>
                  {userTypeInfo.label}
                </Text>
              </View>
              
              <Ionicons 
                name={userTypeInfo.icon} 
                size={12} 
                color={userTypeInfo.color} 
              />
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Text style={{
                fontSize: 14,
                color: conversation.unread_count > 0 ? '#1F2937' : '#6B7280',
                fontWeight: conversation.unread_count > 0 ? '600' : 'normal',
                flex: 1
              }} numberOfLines={1}>
                {conversation.last_message || 'Sin mensajes'}
              </Text>
              
              {conversation.unread_count > 0 && (
                <View style={{
                  backgroundColor: colors.purpleStart,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8
                }}>
                  <Text style={{
                    fontSize: 12,
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Calculate total unread messages
  const totalUnreadCount = conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.purpleStart, colors.purpleEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 24,
          paddingVertical: 20,
          paddingTop: 40
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: 'white'
            }}>
              Chats
            </Text>
            {totalUnreadCount > 0 && (
              <Text style={{
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                {totalUnreadCount} mensaje{totalUnreadCount !== 1 ? 's' : ''} sin leer
              </Text>
            )}
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {totalUnreadCount > 0 && (
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 12,
                minWidth: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Text style={{
                  fontSize: 12,
                  color: colors.purpleStart,
                  fontWeight: 'bold'
                }}>
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="person" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: radius.lg,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: 16,
              color: 'white',
              placeholderTextColor: 'rgba(255, 255, 255, 0.7)'
            }}
            placeholder="Buscar conversaciones..."
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color={colors.purpleStart} />
          <Text style={{
            marginTop: 16,
            fontSize: 16,
            color: '#6B7280'
          }}>
            Cargando conversaciones...
          </Text>
        </View>
      ) : error ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24
        }}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={{
            marginTop: 16,
            fontSize: 18,
            fontWeight: '600',
            color: '#1F2937',
            textAlign: 'center'
          }}>
            Error al cargar
          </Text>
          <Text style={{
            marginTop: 8,
            fontSize: 14,
            color: '#6B7280',
            textAlign: 'center'
          }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={loadConversations}
            style={{
              marginTop: 20,
              backgroundColor: colors.purpleStart,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: radius.md
            }}
          >
            <Text style={{
              color: 'white',
              fontWeight: '600'
            }}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {filteredConversations.length > 0 ? (
            filteredConversations.map(renderConversationItem)
          ) : (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 60,
              paddingHorizontal: 24
            }}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={{
                marginTop: 16,
                fontSize: 18,
                fontWeight: '600',
                color: '#1F2937',
                textAlign: 'center'
              }}>
                {searchQuery ? 'Sin resultados' : 'No hay conversaciones'}
              </Text>
              <Text style={{
                marginTop: 8,
                fontSize: 14,
                color: '#6B7280',
                textAlign: 'center'
              }}>
                {searchQuery 
                  ? `No se encontraron conversaciones que coincidan con "${searchQuery}"`
                  : 'Aún no tienes conversaciones. ¡Inicia una nueva conversación!'
                }
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
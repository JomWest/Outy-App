import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Image, Modal } from 'react-native';
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

const highlightMatch = (text, query) => {
  if (!text) return [<Text key="empty"> </Text>];
  const q = (query || '').toLowerCase();
  if (!q) return [<Text key="plain" style={{ color: '#1F2937' }}>{text}</Text>];
  const lower = text.toLowerCase();
  const parts = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(<Text key={`p-${i}`} style={{ color: '#1F2937' }}>{text.slice(i)}</Text>);
      break;
    }
    if (idx > i) parts.push(<Text key={`p-${i}`} style={{ color: '#1F2937' }}>{text.slice(i, idx)}</Text>);
    parts.push(<Text key={`h-${idx}`} style={{ backgroundColor: '#FEF3C7', color: '#1F2937' }}>{text.slice(idx, idx + q.length)}</Text>);
    i = idx + q.length;
  }
  return parts;
};

export default function ChatsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const displayName = user?.full_name || (user?.email?.split('@')[0]) || 'Usuario';

  useEffect(() => {
    let mounted = true;
    const loadAvatar = async () => {
      try {
        if (!user?.id || !token) return;
        const url = await api.getFileFromDatabase(user.id, 'profile_image', token);
        if (mounted) setAvatarUrl(url || null);
      } catch (e) {
        console.log('Chats header avatar error', e?.message || e);
      }
    };
    loadAvatar();
    return () => { mounted = false; };
  }, [user?.id, token, user?.profile_image_updated_at]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [profileImages, setProfileImages] = useState({});
  // Contacts modal state
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(null);
  const [contactsSearch, setContactsSearch] = useState('');
  // Debounced search and suggestions
  const [searchQueryDebounced, setSearchQueryDebounced] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQueryDebounced(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    // Lazy-load contacts for suggestions if needed
    if (searchQueryDebounced && contacts.length === 0 && !contactsLoading) {
      loadContactsList();
    }
    const q = searchQueryDebounced.toLowerCase();
    if (!q) { setSuggestions([]); return; }
    const convPeople = conversations.map(conv => ({
      id: conv.other_user_id,
      email: conv.other_user_email,
      role: conv.other_user_role,
      // Prefer full name when available, fallback to email prefix
      name: (conv.other_user_full_name?.trim()) || (conv.other_user_name?.trim()) || (conv.other_user_email?.split('@')[0]) || 'Usuario',
      source: 'conversation',
      last_message_at: conv.last_message_at || ''
    }));
    const contactPeople = contacts.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      // Prefer full name when available, fallback to email prefix
      name: (u.full_name?.trim()) || (u.name?.trim()) || (u.email?.split('@')[0]) || 'Usuario',
      source: 'contact'
    }));
    const byId = new Map();
    [...convPeople, ...contactPeople].forEach(p => {
      const existing = byId.get(p.id);
      if (!existing || (p.source === 'conversation' && existing.source !== 'conversation')) {
        byId.set(p.id, p);
      }
    });
    const merged = Array.from(byId.values());
    const filtered = merged.filter(p => {
      const ql = q.toLowerCase();
      const name = (p.name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(ql) || email.includes(ql);
    });
    const sorted = filtered.sort((a, b) => {
      const aConv = a.source === 'conversation';
      const bConv = b.source === 'conversation';
      if (aConv && bConv) {
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      }
      if (aConv !== bConv) return aConv ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    setSuggestions(sorted.slice(0, 5));
  }, [searchQueryDebounced, conversations, contacts, contactsLoading]);

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

  // Load contacts on mount so available users section is ready
  useEffect(() => {
    if (contacts.length === 0 && !contactsLoading) {
      loadContactsList();
    }
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
          const imageUrl = await api.getFileFromDatabase(conv.other_user_id, 'profile_image', token);
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

  // Load contacts list for starting new conversations
  const loadContactsList = async () => {
    try {
      setContactsLoading(true);
      setContactsError(null);
      if (!token) throw new Error('Token requerido');
      const users = await api.getUsersForChat(token);
      // Handle both array and object response shapes from the server
      let usersArray = [];
      if (Array.isArray(users)) {
        usersArray = users;
      } else if (users && Array.isArray(users.all)) {
        usersArray = users.all;
      } else if (users && (Array.isArray(users.employees) || Array.isArray(users.candidates))) {
        usersArray = [ ...(users.employees || []), ...(users.candidates || []) ];
      }
      setContacts(usersArray.filter(u => u.id !== user.id));
    } catch (e) {
      console.error('Error loading contacts:', e);
      setContactsError('No se pudieron cargar los contactos');
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  const openContactsModal = async () => {
    setContactsModalVisible(true);
    await loadContactsList();
  };

  const closeContactsModal = () => {
    setContactsModalVisible(false);
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv =>
    conv.other_user_email?.toLowerCase().includes(searchQueryDebounced.toLowerCase())
  );

  const filteredContacts = contacts.filter(u =>
    u.email?.toLowerCase().includes(contactsSearch.toLowerCase())
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
              ¡Hola, {displayName}!
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
            
            {/* New: Open contacts list */}
            <TouchableOpacity
              onPress={openContactsModal}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}
            >
              <Ionicons name="people" size={20} color="white" />
            </TouchableOpacity>

            {/* Existing: Go to own profile */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ionicons name="person" size={20} color="white" />
              )}
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
            onChangeText={(t) => { setSearchQuery(t); setActiveSuggestionIndex(-1); setSuggestionsOpen(true); }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyPress={({ nativeEvent }) => {
              const key = nativeEvent?.key;
              if (key === 'ArrowDown') {
                setActiveSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
              } else if (key === 'ArrowUp') {
                setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
              } else if (key === 'Escape') {
                setSuggestionsOpen(false);
              }
            }}
            onSubmitEditing={() => {
              if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
                const s = suggestions[activeSuggestionIndex];
                setSuggestionsOpen(false);
                navigation.navigate('Chat', { userId: s.id, userName: s.name, userRole: s.role });
              }
            }}
          />
        </View>
        {/* Suggestions Dropdown */}
        {searchQueryDebounced?.length > 0 && suggestions.length > 0 && suggestionsOpen && (
          <View style={{
            marginTop: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            {suggestions.map((s, idx) => {
              const info = getUserTypeInfo(s.role);
              const isActive = idx === activeSuggestionIndex;
              return (
                <TouchableOpacity
                  key={`sugg-${s.id}`}
                  onPress={() => { setSuggestionsOpen(false); navigation.navigate('Chat', { userId: s.id, userName: s.name, userRole: s.role }); }}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: isActive ? '#F3F4F6' : 'transparent' }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: info.color, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>{getInitials(s.email)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>{highlightMatch(s.name, searchQueryDebounced)}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{highlightMatch(s.email, searchQueryDebounced)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: info.color, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, marginRight: 8 }}>
                      <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>{info.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </LinearGradient>

      {/* Contacts Modal */}
      <Modal
        visible={contactsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeContactsModal}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: '#1F2937' }}>Contactos</Text>
              <TouchableOpacity onPress={closeContactsModal} style={{ padding: 8 }}>
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
              <Ionicons name="search" size={18} color="#6B7280" />
              <TextInput
                value={contactsSearch}
                onChangeText={setContactsSearch}
                placeholder="Buscar usuarios..."
                placeholderTextColor="#9CA3AF"
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#111827' }}
              />
              <TouchableOpacity onPress={loadContactsList} style={{ paddingLeft: 8 }}>
                <Ionicons name="refresh" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {contactsLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.purpleStart} />
                <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>Cargando contactos...</Text>
              </View>
            ) : contactsError ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>{contactsError}</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: '100%' }}>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((u) => {
                    const info = getUserTypeInfo(u.role);
                    const name = u.email?.split('@')[0] || 'Usuario';
                    return (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => {
                          setContactsModalVisible(false);
                          navigation.navigate('Chat', { userId: u.id, userName: name, userRole: u.role });
                        }}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: info.color, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>{getInitials(u.email)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#1F2937' }}>{name}</Text>
                            <View style={{ backgroundColor: `${info.color}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm }}>
                              <Text style={{ fontSize: 11, color: info.color, fontWeight: '500' }}>{info.label}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={32} color="#D1D5DB" />
                    <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>
                      {contactsSearch ? 'Sin usuarios que coincidan con la búsqueda' : 'No hay usuarios disponibles'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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

              {/* Available users section */}
              <View style={{ marginTop: 24, width: '100%' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>Usuarios disponibles</Text>
                {contactsLoading ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.purpleStart} />
                    <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>Cargando usuarios...</Text>
                  </View>
                ) : contactsError ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                    <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>{contactsError}</Text>
                  </View>
                ) : (
                  <View>
                    {contacts.length > 0 ? (
                      contacts.slice(0, 8).map((u) => {
                        const info = getUserTypeInfo(u.role);
                        const name = (u.full_name?.trim()) || (u.name?.trim()) || (u.email?.split('@')[0]) || 'Usuario';
                        return (
                          <TouchableOpacity
                            key={u.id}
                            onPress={() => navigation.navigate('Chat', { userId: u.id, userName: name, userRole: u.role })}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: info.color, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>{getInitials(u.email)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#1F2937' }}>{name}</Text>
                                <View style={{ backgroundColor: `${info.color}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm }}>
                                  <Text style={{ fontSize: 11, color: info.color, fontWeight: '500' }}>{info.label}</Text>
                                </View>
                              </View>
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                        <Ionicons name="people-outline" size={32} color="#D1D5DB" />
                        <Text style={{ marginTop: 8, fontSize: 14, color: '#6B7280' }}>No hay usuarios disponibles</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
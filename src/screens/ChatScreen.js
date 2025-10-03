import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  TextInput, 
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api as client } from '../api/client';
import { colors, spacing, typography, radius } from '../theme';
import socketService from '../services/socketService';

export default function ChatScreen({ route, navigation }) {
  const { userId, userName, userRole } = route.params;
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollViewRef = useRef(null);
  const [otherAvatarUrl, setOtherAvatarUrl] = useState(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  // Nombre mostrado en el header: preferir nombre de BD sobre correo
  const [displayName, setDisplayName] = useState(userName);

  useEffect(() => {
    initializeChat();
    
    // Cleanup function to leave conversation when component unmounts
    return () => {
      if (conversationId) {
        socketService.leaveConversation(conversationId);
        socketService.removeMessageListener(conversationId, handleNewMessage);
      }
    };
  }, []);

  useEffect(() => {
    // Set up real-time message listener when conversationId is available
    if (conversationId) {
      socketService.joinConversation(conversationId);
      socketService.addMessageListener(conversationId, handleNewMessage);
      socketService.addMessageStatusListener(handleMessageStatusUpdate);
    }

    return () => {
      if (conversationId) {
        socketService.removeMessageListener(conversationId, handleNewMessage);
        socketService.removeMessageStatusListener(handleMessageStatusUpdate);
        socketService.leaveConversation(conversationId);
      }
    };
  }, [conversationId]);

  // Mark messages as read when user views them
  useEffect(() => {
    // Cargar avatares (interlocutor y propio)
    let mounted = true;
    const loadAvatars = async () => {
      try {
        if (token && userId) {
          const otherUrl = await client.getFileFromDatabase(userId, 'profile_image', token);
          if (mounted) setOtherAvatarUrl(otherUrl || null);
        }
        if (token && user?.id) {
          const meUrl = await client.getFileFromDatabase(user.id, 'profile_image', token);
          if (mounted) setMyAvatarUrl(meUrl || null);
        }
      } catch (e) {
        console.log('ChatScreen avatar load error', e?.message || e);
      }
    };
    loadAvatars();
    return () => { mounted = false; };
  }, [userId, user?.id, token, user?.profile_image_updated_at]);

  // Cargar nombre real desde la BD (si existe)
  useEffect(() => {
    let mounted = true;
    const loadDisplayName = async () => {
      try {
        if (!userId || !token) return;
        // Intentar obtener primero el nombre del perfil (full_name)
        let nameFromProfile = null;
        try {
          const profile = await client.getCandidateProfile(userId, token);
          nameFromProfile = (profile?.full_name?.trim()) || null;
        } catch (e) {
          // no bloquear si el perfil no existe
          console.log('ChatScreen profile name load error', e?.message || e);
        }

        // Luego intentar obtener el nombre del usuario
        let nameFromUser = null;
        try {
          const otherUser = await client.getUserById(userId, token);
          nameFromUser = (otherUser?.full_name?.trim()) || (otherUser?.name?.trim()) || null;
        } catch (e) {
          console.log('ChatScreen user name load error', e?.message || e);
        }

        const name = nameFromProfile || nameFromUser || (userName?.trim()) || 'Usuario';
        if (mounted) setDisplayName(name);
      } catch (e) {
        // Mantener valor actual si falla
        console.log('ChatScreen loadDisplayName error', e?.message || e);
      }
    };
    loadDisplayName();
    return () => { mounted = false; };
  }, [userId, token]);

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const unreadMessages = messages.filter(msg => 
        msg.sender_id !== user.id && 
        msg.status !== 'read'
      );
      unreadMessages.forEach(message => {
        // Actualiza estado local inmediatamente
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'read', read_at: new Date().toISOString() } : m));
        // Usa sockets para notificar lectura sin retrasos
        try {
          socketService.markMessageAsRead(conversationId, message.id);
        } catch (e) {
          console.log('Socket mark read error', e?.message || e);
        }
        // Fallback HTTP (no bloqueante)
        client.markMessageAsRead(conversationId, message.id, token).catch(err => {
          console.log('HTTP mark read error', err?.message || err);
        });
      });
    }
  }, [messages, conversationId, user.id, token]);

  const handleNewMessage = (message) => {
    console.log('Received new message:', message);
    setMessages(prevMessages => {
      // Check if message already exists to avoid duplicates
      const messageExists = prevMessages.some(msg => msg.id === message.id);
      if (messageExists) {
        return prevMessages;
      }
      
      // Remove any temporary message with the same content and sender
      const filteredMessages = prevMessages.filter(msg => {
        if (msg.isTemporary && 
            msg.sender_id === message.sender_id && 
            msg.message_text === message.message_text) {
          return false; // Remove temporary message
        }
        return true;
      });
      
      const newMessages = [...filteredMessages, {
        id: message.id,
        message_text: message.message_text,
        sender_id: message.sender_id,
        sender_email: message.sender_email,
        sender_role: message.sender_role,
        created_at: message.created_at,
        delivered_at: message.delivered_at,
        read_at: message.read_at,
        status: message.status
      }];
      
      // Auto-scroll to bottom when new message arrives
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      return newMessages;
    });
  };

  const handleMessageStatusUpdate = (statusUpdate) => {
    console.log('Message status update:', statusUpdate);
    setMessages(prevMessages => {
      return prevMessages.map(msg => {
        if (msg.id === statusUpdate.messageId) {
          return {
            ...msg,
            status: statusUpdate.status,
            read_at: statusUpdate.readAt || msg.read_at
          };
        }
        return msg;
      });
    });
  };

  const initializeChat = async () => {
    try {
      setLoadingMessages(true);
      
      if (!token) {
        throw new Error('Token requerido');
      }
      
      // Create or get existing conversation
      const conversation = await client.createConversation(user.id, userId, token);
      setConversationId(conversation.conversation_id);
      
      // Load messages for this conversation
      await loadMessages(conversation.conversation_id);
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Fallback to simulated data
      loadSimulatedMessages();
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const messagesData = await client.getConversationMessages(convId, token);
      const sorted = (messagesData || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(sorted);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      // Fallback to simulated messages
      loadSimulatedMessages();
    }
  };

  const loadSimulatedMessages = () => {
    // Mensajes simulados para demostración
    const simulatedMessages = [
      {
        id: '1',
        text: 'Hola, ¿cómo estás?',
        senderId: userId,
        senderName: userName,
        timestamp: new Date(Date.now() - 3600000), // 1 hora atrás
        isOwn: false
      },
      {
        id: '2',
        text: '¡Hola! Muy bien, gracias por preguntar. ¿Y tú qué tal?',
        senderId: user.id,
        senderName: user.email?.split('@')[0],
        timestamp: new Date(Date.now() - 3500000),
        isOwn: true
      },
      {
        id: '3',
        text: 'Me interesa mucho la oportunidad que publicaste en OUTY. ¿Podrías contarme más detalles?',
        senderId: userId,
        senderName: userName,
        timestamp: new Date(Date.now() - 3000000),
        isOwn: false
      },
      {
        id: '4',
        text: 'Por supuesto, me encanta tu CV. Revisemos los detalles.',
        senderId: user.id,
        senderName: user.email?.split('@')[0],
        timestamp: new Date(Date.now() - 2500000),
        isOwn: true
      }
    ];
    
    setMessages(simulatedMessages);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !conversationId) return;

    setIsSending(true);

    try {
      const messageData = {
        message_text: messageText.trim(),
        sender_id: user.id
      };
      
      // Immediately add message to local state for better UX
      const tempMessage = {
        id: `temp_${Date.now()}`, // Temporary ID with prefix
        message_text: messageText.trim(),
        sender_id: user.id,
        sender_email: user.email,
        sender_role: user.role,
        created_at: new Date().toISOString(),
        isTemporary: true
      };
      
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      setMessageText('');
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Send message to server
      const response = await client.sendMessage(conversationId, messageData.message_text, token);
      
      if (response) {
        // Remove temporary message since the real one will come via Socket.IO
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== tempMessage.id)
        );
        
        // The real message will be added automatically via handleNewMessage from Socket.IO
        console.log('Message sent successfully, waiting for Socket.IO update');
      } else {
        // Remove temporary message on failure
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== tempMessage.id)
        );
        Alert.alert('Error', 'No se pudo enviar el mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temporary message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== tempMessage.id)
      );
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getUserTypeInfo = (role) => {
    switch (role) {
      case 'employee':
        return {
          label: 'Empleado',
          color: '#10B981',
          icon: 'briefcase'
        };
      case 'candidate':
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const renderMessage = (message) => {
    const isOwn = message.sender_id === user.id;
    const senderName = message.sender_email?.split('@')[0] || 'Usuario';
    const userTypeInfo = getUserTypeInfo(message.sender_role || 'candidate');

    return (
      <View
        key={message.id}
        style={{
          flexDirection: 'row',
          marginBottom: 16,
          paddingHorizontal: 16,
          justifyContent: isOwn ? 'flex-end' : 'flex-start'
        }}
      >
        {!isOwn && (
          <View style={{ marginRight: 12 }}>
            {otherAvatarUrl ? (
              <Image source={{ uri: otherAvatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: userTypeInfo.color,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {getInitials(userName)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{
          maxWidth: '75%',
          minWidth: '20%'
        }}>
          {!isOwn && (
            <Text style={{
              fontSize: 12,
              color: '#6B7280',
              marginBottom: 4,
              marginLeft: 4
            }}>
              {senderName}
            </Text>
          )}
          
          <View style={{
            backgroundColor: isOwn ? colors.purpleStart : '#F3F4F6',
            borderRadius: radius.lg,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomRightRadius: isOwn ? 4 : radius.lg,
            borderBottomLeftRadius: isOwn ? radius.lg : 4
          }}>
            <Text style={{
              fontSize: 16,
              color: isOwn ? 'white' : '#1F2937',
              lineHeight: 22
            }}>
              {message.message_text}
            </Text>
          </View>
          
          <Text style={{
            fontSize: 11,
            color: '#9CA3AF',
            marginTop: 4,
            marginLeft: 4,
            textAlign: isOwn ? 'right' : 'left'
          }}>
            {formatTime(message.created_at)}
            {isOwn && (
              <Text style={{ marginLeft: 4 }}>
                {message.status === 'sent' && ' ✓'}
                {message.status === 'delivered' && ' ✓✓'}
                {message.status === 'read' && (
                  <Text style={{ color: colors.purpleStart }}> ✓✓</Text>
                )}
              </Text>
            )}
          </Text>
        </View>

        {isOwn ? (
          myAvatarUrl ? (
            <Image source={{ uri: myAvatarUrl }} style={{ width: 32, height: 32, borderRadius: 16, marginLeft: 8, marginTop: 4 }} />
          ) : (
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.purpleStart,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
              marginTop: 4
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: 'white'
              }}>
                {getInitials((user.full_name?.trim()) || (user.name?.trim()) || (user.email?.split('@')[0]) || 'Tú')}
              </Text>
            </View>
          )
        ) : null}
      </View>
    );
  };

  const userTypeInfo = getUserTypeInfo(userRole);

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
          paddingTop: 40
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 8,
              borderRadius: radius.sm,
              marginRight: 16
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {otherAvatarUrl ? (
            <Image source={{ uri: otherAvatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
          ) : (
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: userTypeInfo.color,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: 'white'
              }}>
                {getInitials(displayName)}
              </Text>
            </View>
           )}
           <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: 'white'
            }} numberOfLines={1}>
              {displayName}
            </Text>
            {/* Ver perfil debajo del nombre (sin chip de rol ni estado) */}
            <View style={{ marginTop: 6 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('CandidateProfile', { candidateId: userId, candidateName: displayName })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.30)',
                  maxWidth: '70%'
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="person-circle-outline" size={18} color="white" />
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginLeft: 6 }} numberOfLines={1}>
                  Ver perfil
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        

          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              padding: 8,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.35)'
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: 'white' }}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {loadingMessages ? (
             <View style={styles.loadingContainer}>
               <ActivityIndicator size="large" color="#8B5CF6" />
               <Text style={styles.loadingText}>Cargando mensajes...</Text>
             </View>
           ) : messages.length === 0 ? (
             <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>No hay mensajes aún</Text>
               <Text style={styles.emptySubtext}>Inicia la conversación enviando un mensaje</Text>
             </View>
           ) : (
             messages.map(renderMessage)
           )}
          
          {isSending && (
            <View style={{
              alignItems: 'center',
              paddingVertical: 8
            }}>
              <Text style={{
                fontSize: 12,
                color: '#9CA3AF',
                fontStyle: 'italic'
              }}>
                Enviando...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={{
          backgroundColor: 'white',
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: Platform.OS === 'ios' ? 32 : 12,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end'
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#F3F4F6',
                padding: 12,
                borderRadius: 24,
                marginRight: 8
              }}
            >
              <Ionicons name="attach" size={20} color="#6B7280" />
            </TouchableOpacity>

            <View style={{
              flex: 1,
              backgroundColor: '#F3F4F6',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 8,
              maxHeight: 100
            }}>
              <TextInput
                style={{
                  fontSize: 16,
                  color: '#1F2937',
                  minHeight: 24,
                  maxHeight: 80
                }}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#9CA3AF"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                textAlignVertical="center"
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!messageText.trim() || isSending}
              style={{
                backgroundColor: messageText.trim() ? colors.purpleStart : '#D1D5DB',
                padding: 12,
                borderRadius: 24,
                marginLeft: 8
              }}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color="white" 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  loadingText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 12
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center'
  }
});

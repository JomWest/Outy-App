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
  Image,
  Linking,
  Modal
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Video } from 'expo-av';
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
  // Moderación: estado de carga para reportes/bloqueos
  const [moderationLoading, setModerationLoading] = useState(false);

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
      // Marcar la conversación como activa para evitar notificaciones y contadores
      try {
        socketService.setActiveConversation(conversationId);
      } catch {}
    }

    return () => {
      if (conversationId) {
        socketService.removeMessageListener(conversationId, handleNewMessage);
        socketService.removeMessageStatusListener(handleMessageStatusUpdate);
        socketService.leaveConversation(conversationId);
        // Limpiar conversación activa al salir
        try {
          socketService.setActiveConversation(null);
        } catch {}
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

  // ===== Moderación: Reportar y Bloquear usuarios =====
  const handleReportUser = async () => {
    try {
      if (!token || !userId) return;
      Alert.alert(
        'Reportar usuario',
        '¿Quieres reportar a este usuario? Se enviará a moderación.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reportar',
            style: 'destructive',
            onPress: async () => {
              try {
                setModerationLoading(true);
                await client.reportUser(userId, 'Reporte desde chat', token);
                Alert.alert('Enviado', 'El reporte fue creado. Gracias por avisar.');
              } catch (e) {
                Alert.alert('Error', e?.message || 'No se pudo enviar el reporte');
              } finally {
                setModerationLoading(false);
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo reportar');
    }
  };

  const handleBlockUser = async () => {
    try {
      if (user?.role !== 'super_admin' && user?.role !== 'admin') {
        Alert.alert('No autorizado', 'Solo administradores pueden bloquear usuarios.');
        return;
      }
      if (!token || !userId) return;
      Alert.alert(
        'Bloquear usuario',
        '¿Bloquear a este usuario? No podrá interactuar mientras esté bloqueado.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Bloquear',
            style: 'destructive',
            onPress: async () => {
              try {
                setModerationLoading(true);
                await client.blockUser(userId, 'Bloqueo desde chat', token);
                Alert.alert('Listo', 'El usuario fue bloqueado.');
              } catch (e) {
                Alert.alert('Error', e?.message || 'No se pudo bloquear');
              } finally {
                setModerationLoading(false);
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo bloquear');
    }
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

  // Adjuntar archivo (imágenes o documentos) y enviarlo como mensaje
  const handleAttachPress = async () => {
    try {
      // Abrir selector de documentos (también permite imágenes)
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false
      });

      // Manejo de diferentes formatos de resultado según plataforma/versión
      const canceled = result.canceled || result.type === 'cancel';
      if (canceled) return;

      const asset = result.assets ? result.assets[0] : result;
      const uri = asset.uri;
      const name = asset.name || uri?.split('/')?.pop() || `archivo_${Date.now()}`;
      const mimeType = asset.mimeType || asset.type || 'application/octet-stream';
      const size = asset.size;

      if (!uri) {
        Alert.alert('Error', 'No se pudo obtener el archivo seleccionado.');
        return;
      }

      setIsSending(true);

      const formData = new FormData();
      if (typeof uri === 'string' && (uri.startsWith('blob:') || uri.startsWith('data:'))) {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        formData.append('file', blob, name);
      } else {
        formData.append('file', {
          uri,
          name,
          type: mimeType
        });
      }
      formData.append('type', 'figan');

      // Mensaje temporal optimista
      const tempId = `temp_attach_${Date.now()}`;
      const tempToken = `[[FILE:uploading|${name}|${mimeType}]]`;
      const tempMessage = {
        id: tempId,
        message_text: tempToken,
        sender_id: user.id,
        sender_email: user.email,
        sender_role: user.role,
        created_at: new Date().toISOString(),
        isTemporary: true,
        status: 'sent'
      };
      setMessages(prev => [...prev, tempMessage]);

      // Subir archivo
      const uploadRes = await client.uploadFile(formData, token, 'figan');
      const fileUrl = uploadRes?.url;
      const finalToken = `[[FILE:${fileUrl}|${name}|${mimeType}]]`;

      if (!fileUrl) {
        // Remover temporal si falla
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Error', 'No se pudo subir el archivo.');
        return;
      }

      // Enviar el token como texto del mensaje
      const response = await client.sendMessage(conversationId, finalToken, token);
      if (response) {
        // El mensaje real llegará por Socket.IO; eliminamos el temporal
        setMessages(prev => prev.filter(m => m.id !== tempId));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Error', 'No se pudo enviar el adjunto.');
      }
    } catch (error) {
      console.error('Error attaching file:', error);
      Alert.alert('Error', error?.message || 'No se pudo adjuntar el archivo');
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

  const confirmDeleteMessage = (messageId) => {
    Alert.alert(
      'Eliminar mensaje',
      '¿Quieres eliminar este mensaje? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteMessage(messageId) }
      ]
    );
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (!conversationId) return;
      // Optimista: quitar de la UI
      setMessages(prev => prev.filter(m => m.id !== messageId));
      await client.deleteMessage(conversationId, messageId, token);
    } catch (e) {
      Alert.alert('No se pudo eliminar', e?.message || 'Intenta nuevamente');
      // Recuperar estado si falla (idealmente recargar)
      await loadMessages(conversationId);
    }
  };

  const handleDeleteConversation = () => {
    Alert.alert(
      'Eliminar chat',
      '¿Eliminar toda la conversación? Se borrarán todos los mensajes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            if (!conversationId) return;
            await client.deleteConversation(conversationId, token);
            navigation.goBack();
          } catch (e) {
            Alert.alert('No se pudo eliminar el chat', e?.message || 'Intenta nuevamente');
          }
        }}
      ]
    );
  };

  // Detecta el marcador especial para calificación de trabajo exprés dentro del texto
  const parseRateExpressJobToken = (text) => {
    if (!text) return null;
    const m = /\[\[RATE_EXPRESS_JOB:(\d+)(?::(\d+))?\]\]/.exec(text);
    if (!m) return null;
    return { jobId: Number(m[1]), workerId: m[2] ? Number(m[2]) : null };
  };

  // Inferir MIME por extensión si no viene en el token
  const inferMimeFromPath = (urlOrName) => {
    if (!urlOrName) return undefined;
    const lower = urlOrName.toLowerCase();
    const ext = lower.split('?')[0].split('#')[0].split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'webm':
        return 'video/webm';
      case 'm4v':
        return 'video/x-m4v';
      case 'ogg':
      case 'ogv':
        return 'video/ogg';
      case 'avi':
        return 'video/x-msvideo';
      case 'mkv':
        return 'video/x-matroska';
      case 'pdf':
        return 'application/pdf';
      default:
        return undefined;
    }
  };

  // Parse de token de archivo: [[FILE:url|name|mime]] o [[FILE:url|name]]
  const parseFileToken = (text) => {
    if (!text) return null;
    // Formato con MIME explícito
    let m = /\[\[FILE:([^\|\]]+)\|([^\|\]]+)\|([^\]]+)\]\]/.exec(text);
    if (m) return { url: m[1], name: m[2], mime: m[3] };
    // Formato antiguo sin MIME
    m = /\[\[FILE:([^\|\]]+)\|([^\]]+)\]\]/.exec(text);
    if (m) {
      const inferred = inferMimeFromPath(m[1]) || inferMimeFromPath(m[2]) || 'application/octet-stream';
      return { url: m[1], name: m[2], mime: inferred };
    }
    return null;
  };

  const handleRateExpressJob = async (jobId) => {
    try {
      const job = await client.getExpressJobById(jobId, token);
      navigation.navigate('ExpressJobDetail', { job });
    } catch (e) {
      Alert.alert('No se pudo abrir el detalle', e?.message || 'Intenta nuevamente.');
    }
  };

  const renderMessage = (message) => {
    const isOwn = message.sender_id === user.id;
    const senderName = (message.sender_full_name?.trim())
      || (message.sender_name?.trim())
      || userName
      || (message.sender_email?.split('@')[0])
      || 'Usuario';
    const userTypeInfo = getUserTypeInfo(message.sender_role || 'candidate');

    const tokenInfo = parseRateExpressJobToken(message.message_text);
    const fileToken = parseFileToken(message.message_text);
    const cleanedText = tokenInfo ? message.message_text.replace(/\[\[RATE_EXPRESS_JOB:[^\]]+\]\]/, '').trim() : message.message_text;

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
          
          <TouchableOpacity
            onLongPress={isOwn ? () => confirmDeleteMessage(message.id) : undefined}
            activeOpacity={0.9}
            style={{
              backgroundColor: isOwn ? colors.purpleStart : '#F3F4F6',
              borderRadius: radius.lg,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomRightRadius: isOwn ? 4 : radius.lg,
              borderBottomLeftRadius: isOwn ? radius.lg : 4
            }}
          >
            {fileToken ? (
              <View>
                {fileToken.mime?.startsWith('image/') ? (
                  <TouchableOpacity onPress={() => setImagePreview({ url: fileToken.url, name: fileToken.name })}>
                    <Image 
                      source={{ uri: encodeURI(fileToken.url) }} 
                      style={{ width: 240, height: 240, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <Text style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: isOwn ? 'white' : '#4B5563'
                    }} numberOfLines={1}>{fileToken.name}</Text>
                  </TouchableOpacity>
                ) : fileToken.mime?.startsWith('video/') ? (
                  <View>
                    {Platform.OS === 'web' ? (
                      // En web, usar el elemento HTML5 <video> para reproducir el archivo tal cual se envió
                      <video
                        controls
                        preload="metadata"
                        playsInline
                        style={{ width: 240, height: 240, borderRadius: 12 }}
                      >
                        <source src={encodeURI(fileToken.url)} type={fileToken.mime || undefined} />
                      </video>
                    ) : (
                      // En nativo, usar expo-av sin alterar el formato original
                      <Video
                        source={{ uri: encodeURI(fileToken.url) }}
                        style={{ width: 240, height: 240, borderRadius: 12 }}
                        useNativeControls
                        resizeMode="contain"
                      />
                    )}
                    <Text style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: isOwn ? 'white' : '#4B5563'
                    }} numberOfLines={1}>{fileToken.name}</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(fileToken.url)}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Ionicons name="document-outline" size={20} color={isOwn ? 'white' : '#4B5563'} />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 14,
                      color: isOwn ? 'white' : '#1F2937'
                    }} numberOfLines={1}>{fileToken.name}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={{
                fontSize: 16,
                color: isOwn ? 'white' : '#1F2937',
                lineHeight: 22
              }}>
                {cleanedText || 'El trabajador marcó el trabajo como terminado.'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Botón especial para calificar trabajo si el mensaje contiene el marcador */}
          {tokenInfo && !isOwn && (
            <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
              <TouchableOpacity
                onPress={() => handleRateExpressJob(tokenInfo.jobId)}
                style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Calificar trabajo</Text>
              </TouchableOpacity>
            </View>
          )}
          
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

  const [imagePreview, setImagePreview] = useState(null);
  const userTypeInfo = getUserTypeInfo(userRole);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Image Preview Modal */}
      <Modal
        visible={!!imagePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreview(null)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16
        }}>
          {imagePreview?.url ? (
            <Image
              source={{ uri: encodeURI(imagePreview.url) }}
              style={{ width: '92%', height: '72%', borderRadius: 12 }}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => setImagePreview(null)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 24,
                marginRight: 8,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)'
              }}
            >
              <Ionicons name="close" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => imagePreview?.url && Linking.openURL(imagePreview.url)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)'
              }}
            >
              <Ionicons name="open-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

        

          {/* Acciones de moderación en el header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
            <TouchableOpacity
              onPress={handleReportUser}
              disabled={moderationLoading}
              style={{
                backgroundColor: 'rgba(255,255,255,0.18)',
                padding: 8,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
                marginRight: 8
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="flag-outline" size={20} color="white" />
            </TouchableOpacity>
            {user?.role === 'super_admin' && (
              <TouchableOpacity
                onPress={handleBlockUser}
                disabled={moderationLoading}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  padding: 8,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.35)',
                  marginRight: 8
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={20} color="white" />
              </TouchableOpacity>
            )}
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
            onPress={handleDeleteConversation}
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
              onPress={handleAttachPress}
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

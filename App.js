import { Buffer } from 'buffer';
if (typeof global !== 'undefined' && !global.Buffer) { global.Buffer = Buffer; }
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { addMessageNotificationListeners } from './src/services/pushNotifications';
import InicioScreen from './src/screens/InicioScreen';
import LoginScreen from './src/screens/LoginScreen';
import BienvenidaScreen from './src/screens/BienvenidaScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import JobsScreen from './src/screens/JobsScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import ExpressJobsScreen from './src/screens/ExpressJobsScreen';
import ExpressJobFormScreen from './src/screens/ExpressJobFormScreen';
import ExpressJobDetailScreen from './src/screens/ExpressJobDetailScreen';
import MyExpressAdsScreen from './src/screens/MyExpressAdsScreen';
import CrearCuentaScreen from './src/screens/CrearCuentaScreen';
import RecuperarContrasenaScreen from './src/screens/RecuperarContrasenaScreen';
import VerificarEmailScreen from './src/screens/VerificarEmailScreen';
import CandidateProfileScreen from './src/screens/CandidateProfileScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const navigationRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = addMessageNotificationListeners(
      undefined,
      (response) => {
        try {
          const data = response?.notification?.request?.content?.data || {};
          const senderId = data?.sender_id;
          const conversationId = data?.conversation_id;
          if (senderId) {
            navigationRef.current?.navigate('Chat', { userId: senderId, userName: 'Usuario' });
          } else if (conversationId) {
            // Fallback: open chats list if we only know the conversation
            navigationRef.current?.navigate('Chats');
          }
        } catch (e) {
          // Ignore navigation errors
        }
      }
    );
    return () => { try { unsubscribe?.(); } catch {} };
  }, [isAuthenticated]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#FFFFFF' },
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Chats" component={ChatsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Jobs" component={JobsScreen} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} />
            <Stack.Screen name="Bienvenida" component={BienvenidaScreen} />
            <Stack.Screen name="CandidateProfile" component={CandidateProfileScreen} />
            {/* Express Jobs */}
            <Stack.Screen name="ExpressJobs" component={ExpressJobsScreen} />
            <Stack.Screen name="ExpressJobForm" component={ExpressJobFormScreen} />
            <Stack.Screen name="ExpressJobDetail" component={ExpressJobDetailScreen} />
            <Stack.Screen name="MyExpressAds" component={MyExpressAdsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Inicio" component={InicioScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="CrearCuenta" component={CrearCuentaScreen} />
            <Stack.Screen name="RecuperarContrasena" component={RecuperarContrasenaScreen} />
            <Stack.Screen name="VerificarEmail" component={VerificarEmailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

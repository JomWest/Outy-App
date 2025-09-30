import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import InicioScreen from './src/screens/InicioScreen';
import LoginScreen from './src/screens/LoginScreen';
import BienvenidaScreen from './src/screens/BienvenidaScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import JobsScreen from './src/screens/JobsScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import CrearCuentaScreen from './src/screens/CrearCuentaScreen';
import RecuperarContrasenaScreen from './src/screens/RecuperarContrasenaScreen';
import VerificarEmailScreen from './src/screens/VerificarEmailScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Chats" component={ChatsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Jobs" component={JobsScreen} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} />
            <Stack.Screen name="Bienvenida" component={BienvenidaScreen} />
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

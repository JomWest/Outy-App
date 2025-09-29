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
import CrearCuentaScreen from './src/screens/CrearCuentaScreen';
import RecuperarContrasenaScreen from './src/screens/RecuperarContrasenaScreen';
import VerificarEmailScreen from './src/screens/VerificarEmailScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { initialized, isAuthenticated } = useAuth();

  if (!initialized) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Bienvenida" component={BienvenidaScreen} />
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

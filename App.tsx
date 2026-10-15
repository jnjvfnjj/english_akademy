import React from 'react';
import { View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { store } from './store';

export default function App() {
  const Container = Platform.OS === 'web' ? View : GestureHandlerRootView;

  return (
    <Container style={{ flex: 1, minHeight: '100%', width: '100%' }}>
      <Provider store={store}>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </Provider>
    </Container>
  );
}

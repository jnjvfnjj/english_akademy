import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, logout, setSyncError, store } from '../store';
import { Home, Users, Calendar, DollarSign, LogOut, BookOpen, Database, ShieldCheck, GraduationCap, UserRound } from 'lucide-react-native';
import { ApiError, apiRequest, clearAuthToken } from '../services/api';

// Import Screens
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import StudentsScreen from '../screens/main/StudentsScreen';
import ScheduleScreen from '../screens/main/ScheduleScreen';
import BillingScreen from '../screens/main/BillingScreen';
import DatabaseScreen from '../screens/main/DatabaseScreen';
import AdminUsersScreen from '../screens/main/AdminUsersScreen';
import TeachersScreen from '../screens/main/TeachersScreen';
import TeacherProfileScreen from '../screens/main/TeacherProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = currentUser?.role === 'Admin';
  const isSuperAdmin = currentUser?.superAdmin === true;
  const isTeacher = currentUser?.role === 'Teacher';

  const handleLogout = async () => {
    const token = store.getState().auth.token;
    try {
      if (token) await apiRequest<void>('/auth/logout', { method: 'POST' }, token);
    } catch (error) {
      dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось завершить серверную сессию.'));
    } finally {
      try {
        await clearAuthToken();
      } catch {
        dispatch(setSyncError('Не удалось удалить сохранённую сессию с этого устройства.'));
      }
      dispatch(logout());
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Overview') {
            return <Home size={size} color={color} />;
          } else if (route.name === 'Students') {
            return <Users size={size} color={color} />;
          } else if (route.name === 'Schedule') {
            return <Calendar size={size} color={color} />;
          } else if (route.name === 'Billing') {
            return <DollarSign size={size} color={color} />;
          } else if (route.name === 'Database') {
            return <Database size={size} color={color} />;
          } else if (route.name === 'Administrators') {
            return <ShieldCheck size={size} color={color} />;
          } else if (route.name === 'Teachers') {
            return <GraduationCap size={size} color={color} />;
          } else if (route.name === 'Profile') {
            return <UserRound size={size} color={color} />;
          }
          return null;
        },
        tabBarActiveTintColor: '#4f46e5', // Indigo-600
        tabBarInactiveTintColor: '#64748b', // Slate-500
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          position: 'relative',
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
        },
        headerStyle: {
          backgroundColor: '#0f172a', // deep slate navy
          shadowColor: 'transparent',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 14,
          letterSpacing: 0.5,
        },
        // Right header actions Logout trigger
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => void handleLogout()}
            className="mr-2 px-2.5 py-2 flex-row items-center bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <LogOut size={14} color="#f43f5e" className="mr-1.5" />
            <Text className="text-rose-400 text-[11px] font-bold">Выйти</Text>
          </TouchableOpacity>
        ),
        headerLeft: () => (
          <View className="ml-2 flex-row items-center gap-1.5">
            <BookOpen size={18} color="#6366f1" />
            <Text className="text-white text-sm font-bold tracking-wide">BridgeCRM</Text>
          </View>
        )
      })}
    >
      <Tab.Screen name="Overview" component={DashboardScreen} options={{ title: 'Панель управления', tabBarLabel: 'Обзор' }} />
      <Tab.Screen name="Students" component={StudentsScreen} options={{ title: 'База студентов', tabBarLabel: 'Студенты' }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Расписание уроков', tabBarLabel: 'Расписание' }} />
      {isAdmin && (
        <Tab.Screen name="Billing" component={BillingScreen} options={{ title: 'Финансовый журнал', tabBarLabel: 'Журнал оплат' }} />
      )}
      {isAdmin && (
        <Tab.Screen name="Database" component={DatabaseScreen} options={{ title: 'Управление СУБД', tabBarLabel: 'СУБД' }} />
      )}
      {isTeacher && (
        <Tab.Screen name="Profile" component={TeacherProfileScreen} options={{ title: 'Профиль преподавателя', tabBarLabel: 'Профиль' }} />
      )}
      {isAdmin && (
        <Tab.Screen name="Teachers" component={TeachersScreen} options={{ title: 'Управление преподавателями', tabBarLabel: 'Преподаватели' }} />
      )}
      {isSuperAdmin && (
        <Tab.Screen name="Administrators" component={AdminUsersScreen} options={{ title: 'Управление администраторами', tabBarLabel: 'Админы' }} />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
    </Stack.Navigator>
  );
}

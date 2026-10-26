import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { useDispatch } from 'react-redux';
import { login, setSyncError } from '../../store';
import { LogIn, BookOpen, AlertCircle } from 'lucide-react-native';
import { ApiError, apiRequest, ApiStaffUser, saveAuthToken } from '../../services/api';

export default function LoginScreen() {
  const [loginRole, setLoginRole] = useState<'teacher' | 'admin'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminRegistrationOpen, setAdminRegistrationOpen] = useState(false);
  const [registrationName, setRegistrationName] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [registrationPassword, setRegistrationPassword] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await apiRequest<ApiStaffUser & { token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password })
      });
      const expectedRole = loginRole === 'admin' ? 'Admin' : 'Teacher';
      if (response.role !== expectedRole) {
        setError(loginRole === 'admin'
          ? 'Эта учётная запись — преподаватель. Выберите вход для преподавателя.'
          : 'Эта учётная запись — администратор. Выберите вход для администратора.');
        return;
      }
      await saveAuthToken(response.token);
      dispatch(setSyncError(null));
      dispatch(login(response));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось выполнить вход.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminRegistration = async () => {
    if (!registrationName.trim() || !registrationEmail.trim() || registrationPassword.length < 8 || registrationCode.length < 16) {
      setError('Заполните ФИО, email, пароль и секретный код администратора.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await apiRequest<ApiStaffUser & { token: string }>('/auth/register/admin', {
        method: 'POST',
        body: JSON.stringify({
          name: registrationName.trim(),
          email: registrationEmail.trim(),
          password: registrationPassword,
          registrationCode
        })
      });
      await saveAuthToken(response.token);
      dispatch(setSyncError(null));
      dispatch(login(response));
      setAdminRegistrationOpen(false);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось зарегистрировать администратора.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 w-full bg-slate-100"
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
        ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : {})
      }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: 24,
        paddingBottom: 160,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      alwaysBounceVertical
      bounces
    >
      <View className="mb-12 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <View className="items-center justify-center bg-slate-900 px-6 py-5">
          <View className="mb-2 items-center justify-center rounded-full bg-indigo-600 p-2.5 shadow-lg shadow-indigo-500/30">
            <BookOpen size={24} color="#ffffff" />
          </View>
          <Text className="text-xl font-bold tracking-wide text-white">Академия Bridge</Text>
          <Text className="mt-0.5 text-xs text-indigo-200">CRM-система языковой школы и учет групп</Text>
        </View>

        <View className="border-b border-slate-200 bg-slate-50 py-3.5">
          <Text className="text-center text-xs font-bold text-indigo-600">Вход в кабинет</Text>
        </View>

        <View className="p-6 md:p-7">
          {error ? (
            <View className="mb-4 flex-row items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle size={16} color="#dc2626" />
              <Text className="flex-1 text-xs font-semibold text-red-600">{error}</Text>
            </View>
          ) : null}

          <Text className="mb-4 text-center text-base font-bold text-slate-800">
            Вход {loginRole === 'admin' ? 'администратора' : 'преподавателя'}
          </Text>

          <View className="mb-5 flex-row rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['teacher', 'admin'] as const).map(role => (
              <TouchableOpacity
                key={role}
                accessibilityRole="button"
                accessibilityState={{ selected: loginRole === role }}
                onPress={() => {
                  setLoginRole(role);
                  setError('');
                }}
                className={`flex-1 rounded-md py-2.5 ${loginRole === role ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`text-center text-xs font-bold ${loginRole === role ? 'text-indigo-700' : 'text-slate-500'}`}>
                  {role === 'admin' ? 'Администратор' : 'Преподаватель'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mb-4">
            <Text className="mb-1.5 text-xs font-semibold uppercase text-slate-600">Электронная почта</Text>
            <TextInput
              value={email}
              onChangeText={text => {
                setEmail(text);
                setError('');
              }}
              placeholder="name@school.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white"
            />
          </View>

          <View className="mb-6">
            <Text className="mb-1.5 text-xs font-semibold uppercase text-slate-600">Пароль</Text>
            <TextInput
              value={password}
              onChangeText={text => {
                setPassword(text);
                setError('');
              }}
              placeholder="Введите пароль"
              secureTextEntry
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white"
            />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void handleLogin()}
            disabled={submitting}
            className={`w-full flex-row items-center justify-center rounded-lg py-3.5 shadow-md shadow-indigo-200 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            <LogIn size={18} color="#ffffff" className="mr-2" />
            <Text className="text-sm font-bold tracking-wide text-white">
              {submitting ? 'Подключение...' : `Войти как ${loginRole === 'admin' ? 'администратор' : 'преподаватель'}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setAdminRegistrationOpen(true);
              setError('');
            }}
            className="mt-5 items-center"
          >
            <Text className="text-xs font-semibold text-indigo-600">Регистрация администратора</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Modal visible={adminRegistrationOpen} transparent animationType="fade" onRequestClose={() => setAdminRegistrationOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-lg rounded-2xl bg-white p-6">
            <Text className="mb-1 text-lg font-bold text-slate-900">Регистрация администратора</Text>
            <Text className="mb-4 text-xs text-slate-500">Преподавательские аккаунты создаются только администратором.</Text>
            {error ? <Text className="mb-3 text-xs font-semibold text-rose-700">{error}</Text> : null}
            <TextInput value={registrationName} onChangeText={setRegistrationName} placeholder="ФИО" className="mb-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
            <TextInput value={registrationEmail} onChangeText={setRegistrationEmail} placeholder="Электронная почта" keyboardType="email-address" autoCapitalize="none" className="mb-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
            <TextInput value={registrationPassword} onChangeText={setRegistrationPassword} placeholder="Пароль" secureTextEntry className="mb-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
            <TextInput value={registrationCode} onChangeText={setRegistrationCode} placeholder="Секретный код регистрации" secureTextEntry className="mb-4 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity onPress={() => setAdminRegistrationOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5">
                <Text className="text-xs font-semibold text-slate-600">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleAdminRegistration()} disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2.5">
                <Text className="text-xs font-bold text-white">{submitting ? 'Регистрация...' : 'Создать аккаунт'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

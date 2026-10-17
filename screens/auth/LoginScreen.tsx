import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { login, setSyncError } from '../../store';
import { LogIn, BookOpen, UserCheck, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ApiError, apiRequest, ApiStaffUser, saveAuthToken } from '../../services/api';

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Admin registration requires a secret configured on the backend.
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSchool, setRegSchool] = useState('Bridge Academy');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [registrationRole, setRegistrationRole] = useState<'teacher' | 'admin'>('teacher');
  const [adminRegistrationCode, setAdminRegistrationCode] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
      await saveAuthToken(response.token);
      dispatch(setSyncError(null));
      dispatch(login(response));
    } catch (error) {
      setError(error instanceof ApiError ? error.message : 'Не удалось выполнить вход.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) {
      setError('Пожалуйста, укажите ваше имя и фамилию');
      return;
    }
    if (!regEmail.trim()) {
      setError('Пожалуйста, укажите контактный email');
      return;
    }
    if (registrationRole === 'admin' && adminRegistrationCode.length < 16) {
      setError('Введите код регистрации администратора (не менее 16 символов)');
      return;
    }
    if (!regPassword) {
      setError('Пожалуйста, задайте пароль для доступа');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Пароли не совпадают, проверьте введенные данные');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const response = await apiRequest<ApiStaffUser & { token: string }>(
        registrationRole === 'admin' ? '/auth/register/admin' : '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            email: regEmail.trim(),
            name: regName.trim(),
            password: regPassword,
            ...(registrationRole === 'admin' ? { registrationCode: adminRegistrationCode } : {})
          })
        }
      );
      await saveAuthToken(response.token);
      dispatch(setSyncError(null));
      setSuccessMsg('Регистрация завершена. Выполняется вход...');
      dispatch(login(response));
    } catch (error) {
      setError(error instanceof ApiError
        ? error.message
        : `Не удалось зарегистрировать ${registrationRole === 'admin' ? 'администратора' : 'преподавателя'}.`);
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
      showsVerticalScrollIndicator={true}
      alwaysBounceVertical={true}
      bounces={true}
    >
      <View className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-12">
        
        {/* Top Banner Accent */}
        <View className="bg-slate-900 px-6 py-5 items-center justify-center text-center">
          <View className="bg-indigo-600 p-2.5 rounded-full mb-2 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen size={24} color="#ffffff" />
          </View>
          <Text className="text-xl font-bold text-white tracking-wide">
            Академия Bridge
          </Text>
          <Text className="text-xs text-indigo-200 mt-0.5">
            CRM-система языковой школы и учет групп
          </Text>
        </View>

        {/* Tab switcher: Вход / Регистрация */}
        <View className="flex-row border-b border-slate-200 bg-slate-50">
          <TouchableOpacity
            onPress={() => {
              setActiveTab('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-3.5 flex-row items-center justify-center gap-2 border-b-2 ${
              activeTab === 'login' ? 'border-indigo-600 bg-white' : 'border-transparent'
            }`}
          >
            <LogIn size={16} color={activeTab === 'login' ? '#4f46e5' : '#64748b'} />
            <Text className={`text-xs font-bold ${activeTab === 'login' ? 'text-indigo-600' : 'text-slate-500'}`}>
              Вход в кабинет
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveTab('register');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-3.5 flex-row items-center justify-center gap-2 border-b-2 ${
              activeTab === 'register' ? 'border-indigo-600 bg-white' : 'border-transparent'
            }`}
          >
            <UserPlus size={16} color={activeTab === 'register' ? '#4f46e5' : '#64748b'} />
            <Text className={`text-xs font-bold ${activeTab === 'register' ? 'text-indigo-600' : 'text-slate-500'}`}>
              Регистрация
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        <View className="p-6 md:p-7">
          {error ? (
            <View className="mb-4 bg-red-50 p-3 rounded-lg border border-red-200 flex-row items-center gap-2">
              <AlertCircle size={16} color="#dc2626" />
              <Text className="text-red-600 text-xs font-semibold flex-1">{error}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View className="mb-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex-row items-center gap-2">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-emerald-700 text-xs font-semibold flex-1">{successMsg}</Text>
            </View>
          ) : null}

          {activeTab === 'login' ? (
            /* LOGIN TAB */
            <View>
              <Text className="text-base font-bold text-slate-800 mb-4 text-center">
                Авторизация в системе
              </Text>

              {/* Email Field */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Электронная почта
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError('');
                  }}
                  placeholder="name@school.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                />
              </View>

              {/* Password Field */}
              <View className="mb-6">
                <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Пароль
                </Text>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  placeholder="Введите пароль"
                  secureTextEntry
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                />
              </View>

              {/* Sign In button */}
              <TouchableOpacity
                onPress={() => void handleLogin()}
                disabled={submitting}
                className={`w-full py-3.5 rounded-lg flex-row justify-center items-center shadow-md shadow-indigo-200 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <LogIn size={18} color="#ffffff" className="mr-2" />
                <Text className="text-white text-sm font-bold tracking-wide">
                  {submitting ? 'Подключение...' : 'Войти'}
                </Text>
              </TouchableOpacity>

              <View className="mt-6 pt-4 border-t border-slate-100 flex items-center">
                <TouchableOpacity 
                  onPress={() => setActiveTab('register')}
                  className="mt-2"
                >
                  <Text className="text-xs text-indigo-600 font-bold">
                    Создать аккаунт →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* PUBLIC REGISTRATION TAB */
            <View>
              <Text className="text-base font-bold text-slate-800 mb-1 text-center">
                Регистрация {registrationRole === 'admin' ? 'администратора' : 'преподавателя'}
              </Text>
              <Text className="text-xs text-slate-400 mb-4 text-center">
                {registrationRole === 'admin'
                  ? 'Для создания аккаунта нужен секретный код регистрации. Уже созданный через терминал аккаунт можно открыть на вкладке «Вход».'
                  : 'Создайте учетную запись преподавателя для работы с группами и расписанием'}
              </Text>

              <View className="mb-4 flex-row rounded-lg border border-slate-200 bg-slate-50 p-1">
                <TouchableOpacity
                  onPress={() => {
                    setRegistrationRole('teacher');
                    setError('');
                  }}
                  className={`flex-1 rounded-md py-2 ${registrationRole === 'teacher' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text className={`text-center text-xs font-bold ${registrationRole === 'teacher' ? 'text-indigo-700' : 'text-slate-500'}`}>
                    Преподаватель
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRegistrationRole('admin');
                    setError('');
                  }}
                  className={`flex-1 rounded-md py-2 ${registrationRole === 'admin' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text className={`text-center text-xs font-bold ${registrationRole === 'admin' ? 'text-indigo-700' : 'text-slate-500'}`}>
                    Администратор
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mb-4 bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-indigo-600 items-center justify-center">
                  <UserCheck size={18} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-800">
                    Роль: {registrationRole === 'admin' ? 'Администратор' : 'Преподаватель'}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    {registrationRole === 'admin'
                      ? 'Регистрация защищена секретным кодом сервера'
                      : 'Регистрация доступна для преподавателей'}
                  </Text>
                </View>
                <View className="px-2 py-0.5 bg-indigo-100 rounded">
                  <Text className="text-[10px] font-bold text-indigo-700">Выбрано</Text>
                </View>
              </View>

              {registrationRole === 'admin' ? (
                <View className="mb-3.5">
                  <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Секретный код регистрации *
                  </Text>
                  <TextInput
                    value={adminRegistrationCode}
                    onChangeText={(text) => {
                      setAdminRegistrationCode(text);
                      setError('');
                    }}
                    placeholder="Код, заданный на сервере"
                    autoCapitalize="none"
                    secureTextEntry
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                  />
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Код должен быть настроен владельцем сервера и содержать не менее 16 символов.
                  </Text>
                </View>
              ) : null}

              {/* Full Name */}
              <View className="mb-3.5">
                <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  ФИО *
                </Text>
                <TextInput
                  value={regName}
                  onChangeText={setRegName}
                  placeholder="Анна Смирнова"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                />
              </View>

              {/* Email & Phone */}
              <View className="flex flex-col md:flex-row gap-3 mb-3.5">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Электронная почта *
                  </Text>
                  <TextInput
                    value={regEmail}
                    onChangeText={setRegEmail}
                    placeholder="anna@school.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Номер телефона
                  </Text>
                  <TextInput
                    value={regPhone}
                    onChangeText={setRegPhone}
                    placeholder="+7 (999) 000-00-00"
                    keyboardType="phone-pad"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                  />
                </View>
              </View>

              {/* School / Branch Name */}
              <View className="mb-3.5">
                <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Название языковой школы / Филиала
                </Text>
                <TextInput
                  value={regSchool}
                  onChangeText={setRegSchool}
                  placeholder="Bridge Academy"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                />
              </View>

              {/* Password & Confirm Password */}
              <View className="flex flex-col md:flex-row gap-3 mb-5">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Пароль *
                  </Text>
                  <TextInput
                    value={regPassword}
                    onChangeText={setRegPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Повтор пароля *
                  </Text>
                  <TextInput
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 text-sm focus:border-indigo-500 focus:bg-white"
                  />
                </View>
              </View>

              {/* Submit Registration button */}
              <TouchableOpacity
                onPress={() => void handleRegister()}
                disabled={submitting}
                className={`w-full py-3.5 rounded-lg flex-row justify-center items-center shadow-md shadow-indigo-200 mt-1 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <UserPlus size={18} color="#ffffff" className="mr-2" />
                <Text className="text-white text-sm font-bold tracking-wide">
                  {submitting
                    ? 'Подключение...'
                    : `Зарегистрироваться как ${registrationRole === 'admin' ? 'администратор' : 'преподаватель'}`}
                </Text>
              </TouchableOpacity>

              <View className="mt-5 pt-4 border-t border-slate-100 flex items-center">
                <TouchableOpacity 
                  onPress={() => setActiveTab('login')}
                  className="py-2"
                >
                  <Text className="text-xs text-indigo-600 font-bold">
                    Уже зарегистрированы? Войти в кабинет →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </View>
    </ScrollView>
  );
}

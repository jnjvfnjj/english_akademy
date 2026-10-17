import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { AlertCircle, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react-native';
import { RootState } from '../../store';
import { ApiError, apiRequest } from '../../services/api';

export default function AdminUsersScreen() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const createAdmin = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Заполните имя, электронную почту и пароль.');
      setSuccess('');
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError('Пароль должен содержать от 8 до 72 символов.');
      setSuccess('');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      setSuccess('');
      return;
    }
    if (!token) {
      setError('Сессия не найдена. Войдите в систему повторно.');
      setSuccess('');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const account = await apiRequest<{ name: string; email: string; role: string }>(
        '/admin/users',
        {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        },
        token
      );
      setSuccess(`Администратор ${account.name} (${account.email}) создан. Он сможет войти со своим email и паролем.`);
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось создать администратора.');
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser?.superAdmin !== true) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-base font-bold text-slate-800">Создавать администраторов может только главный администратор.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ flexGrow: 1, padding: 20, alignItems: 'center' }}>
      <View className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <View className="mb-5 flex-row items-center gap-3">
          <View className="rounded-xl bg-indigo-100 p-3">
            <ShieldCheck size={24} color="#4f46e5" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">Управление администраторами</Text>
            <Text className="text-xs text-slate-500">Создать учётную запись администратора</Text>
          </View>
        </View>

        {error ? (
          <View className="mb-4 flex-row items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={16} color="#dc2626" />
            <Text className="flex-1 text-xs font-semibold text-red-700">{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View className="mb-4 flex-row items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 size={16} color="#059669" />
            <Text className="flex-1 text-xs font-semibold text-emerald-700">{success}</Text>
          </View>
        ) : null}

        <Text className="mb-1.5 text-xs font-semibold uppercase text-slate-600">Имя и фамилия</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Анна Смирнова"
          autoComplete="name"
          className="mb-4 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800"
        />

        <Text className="mb-1.5 text-xs font-semibold uppercase text-slate-600">Электронная почта</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="admin@school.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          className="mb-4 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800"
        />

        <Text className="mb-1.5 text-xs font-semibold uppercase text-slate-600">Пароль (8–72 символа)</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Надёжный пароль"
          secureTextEntry
          autoComplete="new-password"
          className="mb-4 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800"
        />

        <Text className="mb-1.5 text-xs font-semibold uppercase text-slate-600">Повторите пароль</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Повторите пароль"
          secureTextEntry
          autoComplete="new-password"
          className="mb-5 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800"
        />

        <TouchableOpacity
          onPress={() => void createAdmin()}
          disabled={submitting}
          className={`w-full flex-row items-center justify-center gap-2 rounded-lg py-3.5 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}
        >
          <UserPlus size={18} color="#ffffff" />
          <Text className="text-sm font-bold text-white">
            {submitting ? 'Создание...' : 'Создать администратора'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

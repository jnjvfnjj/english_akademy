import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AlertCircle, Check, Circle, RefreshCw, UserCheck, UserPlus, UserRoundX } from 'lucide-react-native';
import { RootState } from '../../store';
import { ApiError, ApiTeacherAccount, apiRequest } from '../../services/api';

export default function TeachersScreen() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [teachers, setTeachers] = useState<ApiTeacherAccount[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loadTeachers = useCallback(async () => {
    if (!token) {
      setError('Сессия не найдена. Войдите в систему повторно.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setTeachers(await apiRequest<ApiTeacherAccount[]>('/admin/teachers', {}, token));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось загрузить список преподавателей.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const setTeacherStatus = async (teacher: ApiTeacherAccount) => {
    if (!token) return;
    setUpdatingId(teacher.id);
    setError('');
    try {
      const updated = await apiRequest<ApiTeacherAccount>(
        `/admin/teachers/${teacher.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ active: !teacher.active })
        },
        token
      );
      setTeachers(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось изменить статус преподавателя.');
    } finally {
      setUpdatingId(null);
    }
  };

  const createTeacher = async () => {
    if (!token) return;
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Укажите ФИО, email и пароль не короче 8 символов.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const created = await apiRequest<ApiTeacherAccount>('/admin/teachers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      }, token);
      setTeachers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      setName('');
      setEmail('');
      setPassword('');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось создать учётную запись.');
    } finally {
      setCreating(false);
    }
  };

  const setPaymentVisibility = async (teacher: ApiTeacherAccount) => {
    if (!token) return;
    setUpdatingId(teacher.id);
    setError('');
    try {
      const updated = await apiRequest<ApiTeacherAccount>(
        `/admin/teachers/${teacher.id}/payment-visibility`,
        {
          method: 'PATCH',
          body: JSON.stringify({ enabled: !teacher.canViewStudentPayments })
        },
        token
      );
      setTeachers(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось изменить доступ к оплатам.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
      <View className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <View className="mb-5 flex-row items-center justify-between gap-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Преподаватели</Text>
            <Text className="mt-1 text-xs text-slate-500">Список учётных записей и доступ к системе</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void loadTeachers()}
            disabled={loading}
            className="flex-row items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
          >
            <RefreshCw size={15} color="#475569" />
            <Text className="text-xs font-semibold text-slate-700">Обновить</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View className="mb-4 flex-row items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={16} color="#dc2626" />
            <Text className="flex-1 text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <Text className="mb-3 text-sm font-bold text-slate-800">Добавить преподавателя</Text>
          <TextInput value={name} onChangeText={setName} placeholder="ФИО преподавателя" className="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800" />
          <TextInput value={email} onChangeText={setEmail} placeholder="Электронная почта" keyboardType="email-address" autoCapitalize="none" className="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800" />
          <TextInput value={password} onChangeText={setPassword} placeholder="Пароль (не менее 8 символов)" secureTextEntry className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800" />
          <TouchableOpacity accessibilityRole="button" onPress={() => void createTeacher()} disabled={creating} className="flex-row items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3">
            <UserPlus size={16} color="#ffffff" />
            <Text className="text-xs font-bold text-white">{creating ? 'Создание...' : 'Создать учётную запись'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color="#4f46e5" /> : teachers.length ? teachers.map(teacher => (
          <View key={teacher.id} testID={`teacher-card-${teacher.id}`} className="mb-3 flex-row flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-800">{teacher.name}</Text>
              <Text className="mt-1 text-xs text-slate-500">{teacher.email}</Text>
              <Text className={`mt-1 text-xs font-semibold ${teacher.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                {teacher.active ? 'Аккаунт активен' : 'Доступ отключён'}
              </Text>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: teacher.canViewStudentPayments }}
                onPress={() => void setPaymentVisibility(teacher)}
                disabled={updatingId === teacher.id}
                className="mt-3 flex-row items-center gap-2"
              >
                {teacher.canViewStudentPayments
                  ? <Check size={16} color="#4f46e5" />
                  : <Circle size={16} color="#94a3b8" />}
                <Text className="text-xs font-medium text-slate-700">
                  Видит статус и сумму оплат своих студентов
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void setTeacherStatus(teacher)}
              disabled={updatingId === teacher.id}
              className={`flex-row items-center gap-2 rounded-lg px-3 py-2 ${teacher.active ? 'bg-rose-50' : 'bg-emerald-50'}`}
            >
              {teacher.active
                ? <UserRoundX size={16} color="#be123c" />
                : <UserCheck size={16} color="#047857" />}
              <Text className={`text-xs font-bold ${teacher.active ? 'text-rose-700' : 'text-emerald-700'}`}>
                {updatingId === teacher.id ? 'Сохранение...' : teacher.active ? 'Отключить' : 'Восстановить'}
              </Text>
            </TouchableOpacity>
          </View>
        )) : !error ? (
          <Text className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            Учётные записи преподавателей пока не созданы.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

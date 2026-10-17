import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AlertCircle, RefreshCw, UserCheck, UserRoundX } from 'lucide-react-native';
import { RootState } from '../../store';
import { ApiError, ApiTeacherAccount, apiRequest } from '../../services/api';

export default function TeachersScreen() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [teachers, setTeachers] = useState<ApiTeacherAccount[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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

        {loading ? <ActivityIndicator color="#4f46e5" /> : teachers.length ? teachers.map(teacher => (
          <View key={teacher.id} testID={`teacher-card-${teacher.id}`} className="mb-3 flex-row flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-800">{teacher.name}</Text>
              <Text className="mt-1 text-xs text-slate-500">{teacher.email}</Text>
              <Text className={`mt-1 text-xs font-semibold ${teacher.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                {teacher.active ? 'Аккаунт активен' : 'Доступ отключён'}
              </Text>
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

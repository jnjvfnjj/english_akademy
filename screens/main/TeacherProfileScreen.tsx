import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AlertCircle, Mail, RefreshCw, UserRound } from 'lucide-react-native';
import { RootState } from '../../store';
import { ApiError, ApiTeacherProfile, apiRequest } from '../../services/api';

export default function TeacherProfileScreen() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [profile, setProfile] = useState<ApiTeacherProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setError('Сессия не найдена. Войдите в систему повторно.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setProfile(await apiRequest<ApiTeacherProfile>('/teachers/me', {}, token));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось загрузить профиль.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
      <View className="w-full max-w-2xl gap-4">
        <View className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <View className="mb-5 flex-row items-center gap-3">
            <View className="rounded-xl bg-indigo-100 p-3">
              <UserRound size={24} color="#4f46e5" />
            </View>
            <View>
              <Text className="text-xl font-bold text-slate-900">Мой профиль</Text>
              <Text className="text-xs text-slate-500">Личный кабинет преподавателя</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color="#4f46e5" />
          ) : error ? (
            <View className="flex-row items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle size={16} color="#dc2626" />
              <Text className="flex-1 text-sm text-red-700">{error}</Text>
            </View>
          ) : profile ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-3 rounded-lg bg-slate-50 p-4">
                <UserRound size={18} color="#64748b" />
                <View>
                  <Text className="text-xs text-slate-500">Имя</Text>
                  <Text className="text-sm font-semibold text-slate-800">{profile.name}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3 rounded-lg bg-slate-50 p-4">
                <Mail size={18} color="#64748b" />
                <View>
                  <Text className="text-xs text-slate-500">Электронная почта</Text>
                  <Text className="text-sm font-semibold text-slate-800">{profile.email}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void loadProfile()}
            disabled={loading}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5"
          >
            <RefreshCw size={15} color="#475569" />
            <Text className="text-sm font-semibold text-slate-700">Обновить профиль</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

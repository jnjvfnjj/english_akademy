import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import {
  ApiError,
  ApiStudent,
  ApiTransaction,
  StudentDeletionNotice,
  apiRequest,
  clearAuthToken,
  createStudentRequest,
  loadAuthToken,
  saveAuthToken,
} from './services/api';
import {
  AppDispatch,
  RootState,
  login,
  mapApiStudent,
  replaceStudents,
  replaceTransactions,
  mapApiTransaction,
  setDeletionNotices,
  setSyncError,
  store,
} from './store';

function NotificationBanner() {
  const error = useSelector((state: RootState) => state.sync.error);
  const user = useSelector((state: RootState) => state.auth.user);
  const notices = useSelector((state: RootState) => state.notifications.deletions);
  const [visibleNoticeId, setVisibleNoticeId] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    if (user?.role !== 'Admin') return;
    const newest = notices[notices.length - 1];
    if (newest && !dismissed.includes(newest.id)) {
      setVisibleNoticeId(newest.id);
    }
  }, [dismissed, notices, user?.role]);

  const currentNotice = notices.find(notice => notice.id === visibleNoticeId);
  if (!error && (!currentNotice || user?.role !== 'Admin')) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: Platform.OS === 'ios' ? 52 : 12,
        left: 12,
        right: 12,
        zIndex: 1000,
      }}
    >
      {error ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => store.dispatch(setSyncError(null))}
          className="mb-2 rounded-xl border border-rose-200 bg-white px-4 py-3 shadow-lg"
        >
          <Text className="text-sm font-bold text-rose-700">Ошибка синхронизации · нажмите, чтобы закрыть</Text>
          <Text className="mt-1 text-xs text-slate-600">{error}</Text>
        </TouchableOpacity>
      ) : null}
      {currentNotice && user?.role === 'Admin' ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            setDismissed(current => [...current, currentNotice.id]);
            setVisibleNoticeId(null);
          }}
          className="rounded-xl border border-amber-200 bg-white px-4 py-3 shadow-lg"
        >
          <Text className="text-sm font-bold text-amber-800">Удалён ученик</Text>
          <Text className="mt-1 text-xs text-slate-700">
            {currentNotice.studentName} · удалил(а) {currentNotice.deletedBy}
          </Text>
          <Text className="mt-1 text-[10px] text-slate-500">Нажмите, чтобы закрыть</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AppShell() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  const students = useSelector((state: RootState) => state.students.list);
  const lastNoticeId = useRef(0);
  const hasLoadedNotices = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const savedToken = await loadAuthToken();
        if (!savedToken || cancelled) return;
        const account = await apiRequest<{ email: string; name: string; role: 'Admin' | 'Teacher' }>(
          '/auth/me',
          {},
          savedToken
        );
        if (!cancelled) {
          dispatch(setSyncError(null));
          dispatch(login({ ...account, token: savedToken }));
        }
      } catch (error) {
        try {
          await clearAuthToken();
        } catch {
          if (!cancelled) {
            dispatch(setSyncError('Не удалось очистить сохранённую сессию.'));
          }
        }
        if (!cancelled) {
          dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось восстановить сессию.'));
        }
      }
    };
    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    let refreshing = false;

    const refreshStudents = async (allowInitialImport: boolean) => {
      if (refreshing) return;
      refreshing = true;
      try {
        const localStudents = store.getState().students.list;
        let remoteStudents = await apiRequest<ApiStudent[]>('/students', {}, token);
        if (allowInitialImport && remoteStudents.length === 0 && localStudents.length > 0) {
          for (const student of localStudents) {
            try {
              await apiRequest<ApiStudent>('/students', {
                method: 'POST',
                body: JSON.stringify(createStudentRequest(student)),
              }, token);
            } catch (error) {
              if (!(error instanceof ApiError) || !error.message.includes('already registered')) throw error;
            }
          }
          remoteStudents = await apiRequest<ApiStudent[]>('/students', {}, token);
        }
        if (!cancelled) {
          dispatch(replaceStudents(remoteStudents.map(mapApiStudent)));
          if (user?.role === 'Admin') {
            let remoteTransactions = await apiRequest<ApiTransaction[]>('/transactions', {}, token);
            const localTransactions = store.getState().billing.transactions;
            if (remoteTransactions.length === 0 && localTransactions.length > 0) {
              for (const transaction of localTransactions) {
                const localStudent = transaction.studentId
                  ? localStudents.find(student => student.id === transaction.studentId)
                  : undefined;
                const remoteStudent = localStudent
                  ? remoteStudents.find(student => student.email.toLowerCase() === localStudent.email.toLowerCase())
                  : undefined;
                await apiRequest<ApiTransaction>('/transactions', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...transaction,
                    id: undefined,
                    studentId: remoteStudent?.id,
                    applyToStudentBalance: false
                  })
                }, token);
              }
              remoteTransactions = await apiRequest<ApiTransaction[]>('/transactions', {}, token);
            }
            if (!cancelled) dispatch(replaceTransactions(remoteTransactions.map(mapApiTransaction)));
          }
        }
      } catch (error) {
        if (!cancelled) {
          dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось загрузить учеников.'));
        }
      } finally {
        refreshing = false;
      }
    };

    const refreshNotices = async () => {
      if (user?.role !== 'Admin') return;
      try {
        const notices = await apiRequest<StudentDeletionNotice[]>(
          `/admin/notifications?afterId=${hasLoadedNotices.current ? lastNoticeId.current : 0}`,
          {},
          token
        );
        if (cancelled) return;
        if (!hasLoadedNotices.current) {
          const latest = notices[notices.length - 1];
          if (latest) lastNoticeId.current = latest.id;
          hasLoadedNotices.current = true;
          const recent = latest && latest.deletedBy.toLowerCase() !== user.email.toLowerCase() ? [latest] : [];
          dispatch(setDeletionNotices(recent));
          return;
        }
        if (notices.length > 0) {
          lastNoticeId.current = notices[notices.length - 1].id;
          dispatch(setDeletionNotices(notices.filter(
            notice => notice.deletedBy.toLowerCase() !== user.email.toLowerCase()
          )));
        }
      } catch (error) {
        if (!cancelled) {
          dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось проверить уведомления.'));
        }
      }
    };

    void refreshStudents(true);
    void refreshNotices();
    const interval = setInterval(() => {
      void refreshStudents(false);
      void refreshNotices();
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dispatch, students.length, token, user?.role]);

  return (
    <NavigationContainer>
      <AppNavigator />
      <NotificationBanner />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  const Container = Platform.OS === 'web' ? View : GestureHandlerRootView;

  return (
    <Container style={{ flex: 1, minHeight: '100%', width: '100%' }}>
      <Provider store={store}>
        <AppShell />
      </Provider>
    </Container>
  );
}

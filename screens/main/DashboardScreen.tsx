import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  RootState,
  Student,
  Group,
  deleteGroup,
  mapApiGroup,
  mapApiWeeklySchedule,
  replaceGroups,
  replaceWeeklySchedules,
  setSyncError
} from '../../store';
import StudentStatusBadge from '../../components/StudentStatusBadge';
import StudentDetailModal from '../../components/StudentDetailModal';
import GroupDetailModal from '../../components/GroupDetailModal';
import { Users, GraduationCap, Calendar, DollarSign, Plus, ArrowUpRight, TrendingUp, ChevronRight, X, Clock, CheckCircle, Search, Shield, BookOpen, Trash2 } from 'lucide-react-native';
import { ApiError, ApiSchoolGroup, ApiTeacherAccount, ApiWeeklySchedule, apiRequest } from '../../services/api';

const groupScheduleWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const groupScheduleTimes = Array.from({ length: 24 }, (_, index) => {
  const hour = 8 + Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
});

export default function DashboardScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const students = useSelector((state: RootState) => state.students.list);
  const groups = useSelector((state: RootState) => state.groups.list);
  const weeklySchedules = useSelector((state: RootState) => state.weeklySchedules.list);
  const lessons = useSelector((state: RootState) => state.lessons.list);
  const transactions = useSelector((state: RootState) => state.billing.transactions);
  const token = useSelector((state: RootState) => state.auth.token);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isAdmin = userRole === 'Admin';
  const [teacherAccounts, setTeacherAccounts] = useState<ApiTeacherAccount[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupFormError, setGroupFormError] = useState('');

  // Dedicated list modals for stat cards
  const [activeStudentsModalOpen, setActiveStudentsModalOpen] = useState(false);
  const [scheduledLessonsModalOpen, setScheduledLessonsModalOpen] = useState(false);
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);

  // Modals for student info page and group students list
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<Student | null>(null);
  const [groupModalKey, setGroupModalKey] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);


  // Selector state for level groups
  const [selectedLevelGroup, setSelectedLevelGroup] = useState<string | null>(null);

  // Search states for modals
  const [activeStudentsSearch, setActiveStudentsSearch] = useState('');
  const [scheduledLessonsSearch, setScheduledLessonsSearch] = useState('');

  // Form states for adding group
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupLevel, setNewGroupLevel] = useState('B1');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupTeacherId, setNewGroupTeacherId] = useState<number | null>(null);
  const [newGroupStudentIds, setNewGroupStudentIds] = useState<string[]>([]);
  const [newGroupScheduleDays, setNewGroupScheduleDays] = useState<number[]>([]);
  const [newGroupScheduleTimes, setNewGroupScheduleTimes] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    let cancelled = false;
    apiRequest<ApiTeacherAccount[]>('/admin/teachers', {}, token)
      .then(accounts => {
        if (!cancelled) {
          const active = accounts.filter(account => account.active);
          setTeacherAccounts(active);
          setNewGroupTeacherId(current => current ?? active[0]?.id ?? null);
        }
      })
      .catch(error => {
        if (!cancelled) dispatch(setSyncError(
          error instanceof ApiError ? error.message : 'Не удалось загрузить список преподавателей.'
        ));
      });
    return () => { cancelled = true; };
  }, [dispatch, isAdmin, token]);

  // Stats calculations
  const activeStudentsList = students.filter(s => s.status === 'Active');
  const activeStudents = activeStudentsList.length;
  
  const scheduledLessonsList = lessons.filter(l => l.status === 'Scheduled');
  const pendingLessons = scheduledLessonsList.length;

  const activeTransactions = transactions;
  const sumByCurrency = (type: 'Income' | 'Expense', currency: 'KGS' | 'USD') =>
    activeTransactions
      .filter(transaction => transaction.type === type && (transaction.currency || 'USD') === currency)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalIncomeKgs = sumByCurrency('Income', 'KGS');
  const totalIncomeUsd = sumByCurrency('Income', 'USD');
  const profitKgs = totalIncomeKgs - sumByCurrency('Expense', 'KGS');
  const profitUsd = totalIncomeUsd - sumByCurrency('Expense', 'USD');
  const formatMoneySummary = (kgs: number, usd: number) =>
    `${kgs.toLocaleString()} сом${usd ? ` · $${usd.toLocaleString()}` : ''}`;

  const matchStudentLevel = (studentLevelStr: string, groupKey: string) => {
    if (!studentLevelStr || !groupKey) return false;
    const normalizedGroup = groupKey.toUpperCase();
    const normalizedLevel = studentLevelStr.toUpperCase();
    return normalizedLevel === normalizedGroup || normalizedLevel.includes(`(${normalizedGroup})`) || normalizedLevel.includes(normalizedGroup);
  };

  const studentsInGroup = (group: Group | undefined, groupKey: string) => {
    if (group?.studentIds) {
      return students.filter(student => group.studentIds?.includes(student.id));
    }
    return students.filter(student => !student.groupId && matchStudentLevel(student.level, groupKey));
  };

  const selectedGroup = groups.find(group => group.id === selectedLevelGroup);

  useEffect(() => {
    if (!selectedLevelGroup && groups.length > 0) setSelectedLevelGroup(groups[0].id);
  }, [groups, selectedLevelGroup]);

  const handleAddGroup = async () => {
    if (!token || !newGroupTitle.trim() || !newGroupTeacherId) {
      setGroupFormError('Введите название группы и выберите зарегистрированного преподавателя.');
      return;
    }
    if ((newGroupScheduleDays.length === 0) !== (newGroupScheduleTimes.length === 0)) {
      setGroupFormError('Для расписания выберите хотя бы один день недели и одно время.');
      return;
    }
    setGroupSaving(true);
    setGroupFormError('');
    try {
      const created = await apiRequest<ApiSchoolGroup>('/groups', {
        method: 'POST',
        body: JSON.stringify({
          title: newGroupTitle.trim(),
          level: newGroupLevel,
          description: newGroupDesc.trim() || `Курс уровня ${newGroupLevel}`,
          teacherId: newGroupTeacherId,
          studentIds: newGroupStudentIds.map(Number)
        })
      }, token);
      dispatch(replaceGroups([...groups, mapApiGroup(created)]));
      const groupTitle = newGroupTitle.trim();
      setNewGroupTitle('');
      setNewGroupDesc('');
      setNewGroupStudentIds([]);
      setNewGroupScheduleDays([]);
      setNewGroupScheduleTimes([]);
      setAddGroupModalOpen(false);

      const scheduleSlots = newGroupScheduleDays.flatMap(dayOfWeek =>
        newGroupScheduleTimes.map(time => ({ dayOfWeek, time }))
      );
      if (scheduleSlots.length > 0) {
        const results = await Promise.allSettled(scheduleSlots.map(slot =>
          apiRequest<ApiWeeklySchedule>('/weekly-schedules', {
            method: 'POST',
            body: JSON.stringify({
              groupId: Number(created.id),
              dayOfWeek: slot.dayOfWeek,
              time: slot.time,
              topic: groupTitle,
              duration: 1
            })
          }, token)
        ));
        const savedSchedules = results.flatMap(result =>
          result.status === 'fulfilled' ? [mapApiWeeklySchedule(result.value)] : []
        );
        if (savedSchedules.length > 0) {
          dispatch(replaceWeeklySchedules([...weeklySchedules, ...savedSchedules]));
        }
        const failedSchedules = results.filter(result => result.status === 'rejected');
        if (failedSchedules.length > 0) {
          const firstError = failedSchedules[0].reason;
          const reason = firstError instanceof ApiError
            ? firstError.message
            : 'Не удалось сохранить одно или несколько занятий.';
          dispatch(setSyncError(
            `Группа создана. Не удалось добавить расписание для ${failedSchedules.length} ячеек: ${reason}`
          ));
        }
      }
    } catch (error) {
      setGroupFormError(error instanceof ApiError ? error.message : 'Не удалось создать группу.');
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!token || !groupToDelete) return;
    try {
      await apiRequest<void>(`/groups/${encodeURIComponent(groupToDelete.id)}`, { method: 'DELETE' }, token);
      dispatch(deleteGroup(groupToDelete.id));
      if (selectedLevelGroup === groupToDelete.id) setSelectedLevelGroup(null);
      if (groupModalKey === groupToDelete.id) setGroupModalKey(null);
      setGroupToDelete(null);
    } catch (error) {
      dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось удалить группу.'));
    }
  };

  const filteredActiveStudents = activeStudentsList.filter(s =>
    s.name.toLowerCase().includes(activeStudentsSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(activeStudentsSearch.toLowerCase()) ||
    s.level.toLowerCase().includes(activeStudentsSearch.toLowerCase())
  );

  const filteredScheduledLessons = scheduledLessonsList.filter(l =>
    (l.groupName || '').toLowerCase().includes(scheduledLessonsSearch.toLowerCase()) ||
    (l.topic || '').toLowerCase().includes(scheduledLessonsSearch.toLowerCase()) ||
    (l.teacherName || '').toLowerCase().includes(scheduledLessonsSearch.toLowerCase())
  );

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 12, paddingBottom: 80, flexGrow: 1 }}>
      
      {/* Header section */}
      <View className="mb-8 flex-row justify-between items-center flex-wrap">
        <View className="mb-2">
          <Text className="text-2xl font-bold text-slate-900">Обзор успеваемости</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Вы вошли как: <Text className="font-semibold text-indigo-600">{isAdmin ? 'Администратор' : 'Преподаватель'}</Text>
          </Text>
        </View>
        {/* Quick action triggers */}
        <View className="flex-row gap-3">
          {isAdmin && <TouchableOpacity
            onPress={() => navigation.navigate('Students')}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg flex-row items-center gap-2 shadow"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white text-xs font-semibold">Новый студент</Text>
          </TouchableOpacity>}

          <TouchableOpacity 
            onPress={() => navigation.navigate('Schedule')}
            className="bg-slate-800 hover:bg-slate-900 px-4 py-2.5 rounded-lg flex-row items-center gap-2 shadow"
          >
            <Calendar size={16} color="#ffffff" />
            <Text className="text-white text-xs font-semibold">Назначить урок группы</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid of four stat widgets */}
      <View className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-6 mb-8`}>
        
        {/* Stat item 1: Активные студенты (CLICKABLE -> OPENS ACTIVE STUDENTS LIST) */}
        <TouchableOpacity 
          onPress={() => setActiveStudentsModalOpen(true)}
          className="bg-white hover:bg-indigo-50/40 rounded-xl p-5 border border-slate-200 hover:border-indigo-300 shadow-sm flex-row items-center justify-between transition-all"
        >
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Активные студенты</Text>
            <Text className="text-3xl font-extrabold text-slate-900 mt-2">{activeStudents}</Text>
            <View className="flex-row items-center mt-2.5">
              <Text className="text-xs font-bold text-indigo-600">Нажмите для списка →</Text>
            </View>
          </View>
          <View className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            <Users size={24} color="#4f46e5" />
          </View>
        </TouchableOpacity>

        {/* Stat item 2: Запланировано уроков (CLICKABLE -> OPENS SCHEDULED LESSONS LIST) */}
        <TouchableOpacity 
          onPress={() => setScheduledLessonsModalOpen(true)}
          className="bg-white hover:bg-indigo-50/40 rounded-xl p-5 border border-slate-200 hover:border-indigo-300 shadow-sm flex-row items-center justify-between transition-all"
        >
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Запланировано уроков</Text>
            <Text className="text-3xl font-extrabold text-slate-900 mt-2">{pendingLessons}</Text>
            <View className="flex-row items-center mt-2.5">
              <Text className="text-xs font-bold text-indigo-600">Нажмите для списка →</Text>
            </View>
          </View>
          <View className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            <GraduationCap size={24} color="#4f46e5" />
          </View>
        </TouchableOpacity>

        {isAdmin && <>
        {/* Stat item 3: Общая выручка */}
        <View className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Общая выручка</Text>
            <Text className="text-3xl font-extrabold text-slate-900 mt-2">
              {isAdmin ? formatMoneySummary(totalIncomeKgs, totalIncomeUsd) : 'Недоступно'}
            </Text>
            <View className="flex-row items-center mt-2.5">
              <Plus size={14} color="#10b981" />
              <Text className="text-xs font-medium text-emerald-600 ml-1">
                {isAdmin ? 'Журнал оплат доступен' : 'Доступно администратору'}
              </Text>
            </View>
          </View>
          <View className="bg-emerald-50 p-3 rounded-xl">
            <DollarSign size={24} color="#10b981" />
          </View>
        </View>

        {/* Stat item 4: Чистый баланс */}
        <View className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Чистый баланс</Text>
            <Text className={`text-3xl font-extrabold mt-2 ${profitKgs >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              {isAdmin ? formatMoneySummary(profitKgs, profitUsd) : 'Недоступно'}
            </Text>
            <View className="flex-row items-center mt-2.5">
              <ArrowUpRight size={14} color="#64748b" />
              <Text className="text-xs font-medium text-slate-500 ml-1">Маржинальность</Text>
            </View>
          </View>
          <View className={`p-3 rounded-xl ${profitKgs >= 0 ? "bg-slate-100" : "bg-rose-50"}`}>
            <TrendingUp size={24} color={profitKgs >= 0 ? "#475569" : "#e11d48"} />
          </View>
          </View>
          </>}

      </View>

      {/* РЈР§Р•Р‘РќР«Р• Р“Р РЈРџРџР« (РЎ РљРќРћРџРљРћР™ "Р”РћР‘РђР’РРўР¬ Р“Р РЈРџРџРЈ") */}
      <View className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <View className="mb-4 flex-row justify-between items-center flex-wrap gap-3">
          <View>
            <Text className="text-lg font-bold text-slate-800">Учебные группы (CEFR)</Text>
            <Text className="text-xs text-slate-400 mt-1">
              Нажмите на группу, чтобы сразу открыть список студентов группы:
            </Text>
          </View>
          
          <View className="flex-row items-center gap-2">
            {/* РљРќРћРџРљРђ "Р”РћР‘РђР’РРўР¬ Р“Р РЈРџРџРЈ" */}
            {isAdmin && <TouchableOpacity
              onPress={() => setAddGroupModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg flex-row items-center gap-1.5 shadow"
            >
              <Plus size={15} color="#ffffff" />
              <Text className="text-white text-xs font-bold">Добавить группу</Text>
            </TouchableOpacity>}

            {selectedLevelGroup && (
              <TouchableOpacity
                onPress={() => setGroupModalKey(selectedLevelGroup)}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg flex-row items-center gap-1.5"
              >
                <Users size={14} color="#4f46e5" />
                <Text className="text-xs font-bold text-indigo-700">Открыть {selectedGroup?.title} списком</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Group Cards */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          {groups.map((item) => {
            const count = studentsInGroup(item, item.key).length;
            const isSelected = selectedLevelGroup === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setSelectedLevelGroup(item.id);
                  setGroupModalKey(item.id);
                }}
                className={`p-4 rounded-xl border flex-1 min-w-[180px] transition-all flex flex-row items-center justify-between ${
                  isSelected ? 'border-indigo-400 bg-indigo-50/70 border-2 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <View className="flex-1 mr-2">
                  <Text className={`font-bold text-sm ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>
                    {item.title}
                  </Text>
                  <Text className="text-slate-500 text-[10px] mt-0.5">{item.desc}</Text>
                  {item.teacherName ? (
                    <Text className="text-indigo-600 text-[10px] font-semibold mt-1">Преп.: {item.teacherName}</Text>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-2">
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>{count}</Text>
                  </View>
                  {isAdmin && <TouchableOpacity
                    onPress={(e) => {
                      // @ts-ignore
                      if (e && e.stopPropagation) e.stopPropagation();
                      setGroupToDelete(item);
                    }}
                    className="w-8 h-8 rounded-full items-center justify-center bg-rose-50 hover:bg-rose-100 border border-rose-200"
                    accessibilityLabel="Удалить группу"
                  >
                    <Trash2 size={13} color="#e11d48" />
                  </TouchableOpacity>}
                </View>
              </TouchableOpacity>
            );
          })}
          {groups.length === 0 && (
            <View className="w-full p-6 bg-slate-50 border border-slate-200 rounded-xl items-center justify-center">
              <Text className="text-sm font-semibold text-slate-600">Нет учебных групп</Text>
              <Text className="text-xs text-slate-400 mt-1">
                {isAdmin ? 'Нажмите «Добавить группу», чтобы создать группу' : 'Пока вам не назначили учебные группы.'}
              </Text>
            </View>
          )}
        </View>


        {selectedGroup && (
          <View className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Студенты группы {selectedGroup.title} • Нажмите на строку для полного профиля:
              </Text>
              <TouchableOpacity onPress={() => setGroupModalKey(selectedGroup.id)}>
                <Text className="text-xs font-bold text-indigo-600">Все студенты группы ({studentsInGroup(selectedGroup, selectedGroup.key).length}) →</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-2">
              {studentsInGroup(selectedGroup, selectedGroup.key).slice(0, 5).map((std) => (
                <TouchableOpacity
                  key={std.id}
                  onPress={() => setSelectedStudentInfo(std)}
                  className="bg-white p-3 rounded-lg border border-slate-200 flex-row justify-between items-center hover:border-indigo-300 shadow-sm"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
                      <Text className="text-indigo-700 font-bold text-xs">{std.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-800">{std.name}</Text>
                      <Text className="text-xs text-slate-400">{std.email}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <StudentStatusBadge student={std} size="sm" interactive={isAdmin} />
                    <Text className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      {std.balance} С‡.
                    </Text>
                    <ChevronRight size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              ))}

              {studentsInGroup(selectedGroup, selectedGroup.key).length === 0 && (
                <View className="py-6 items-center">
                  <Text className="text-xs text-slate-400">В группе {selectedGroup.title} пока нет студентов.</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* TODAY'S LESSONS & QUICK CRM ACCESS */}
      <View className="flex-row flex-wrap gap-3 md:gap-6 lg:flex-nowrap w-full">
        
        {/* Today's Lessons List */}
        <View className="flex-1 min-w-0 md:min-w-[340px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-lg font-bold text-slate-800">Уроки на сегодня и расписание</Text>
              <Text className="text-xs text-slate-400 mt-1">Список ближайших уроков по группам</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')} className="text-xs font-bold text-indigo-600">
              <Text className="text-xs font-bold text-indigo-600">Всё расписание →</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3 flex-1">
            {lessons.slice(0, 4).map((lesson) => {
              const displayName = lesson.groupName || lesson.studentName || 'Учебная группа';
              return (
                <View 
                  key={lesson.id}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 flex-row justify-between items-center"
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="p-2 rounded-lg bg-indigo-100">
                      <Clock size={16} color="#4f46e5" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-800">{displayName}</Text>
                      <Text className="text-xs text-indigo-600 font-semibold mt-0.5">РўРµРјР°: {lesson.topic}</Text>
                      <Text className="text-[11px] text-slate-400">Преподаватель: {lesson.teacherName}</Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {lesson.time}
                    </Text>
                    <Text className="text-[10px] text-slate-400 mt-1">{lesson.date}</Text>
                  </View>
                </View>
              );
            })}

            {lessons.length === 0 && (
              <View className="py-12 items-center">
                <Text className="text-slate-400 text-sm">Уроков на сегодня не запланировано.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Access CRM Panel */}
        <View className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col justify-between">
          <View>
            <Text className="text-lg font-bold text-slate-800 mb-2">Быстрый доступ к CRM</Text>
            <Text className="text-xs text-slate-500 mb-6">Управление группами, учет и переход к реестру студентов.</Text>

            {/* Payment Button - only for Admin */}
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => {
                  navigation.navigate('Billing');
                }}
                className="mb-4 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/60 p-4 rounded-xl flex-row items-center"
              >
                <View className="bg-emerald-500 p-2.5 rounded-lg mr-4">
                  <DollarSign size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-800">Внести оплату студента</Text>
                  <Text className="text-xs text-emerald-700 mt-0.5">Пополняет баланс учебных часов</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              onPress={() => navigation.navigate('Students')}
              className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/60 p-4 rounded-xl flex-row items-center mb-4"
            >
              <View className="bg-indigo-500 p-2.5 rounded-lg mr-4">
                <Users size={18} color="#ffffff" />
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-800">База студентов и уровни</Text>
                <Text className="text-xs text-indigo-700 mt-0.5">Поиск, статус активности и контакты</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setAddGroupModalOpen(true)}
              className="bg-slate-50 border border-slate-200 hover:bg-slate-100 p-4 rounded-xl flex-row items-center"
            >
              <View className="bg-slate-800 p-2.5 rounded-lg mr-4">
                <Plus size={18} color="#ffffff" />
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-800">Новая учебная группа</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Создание группы для расписания</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="pt-6 border-t border-slate-100 mt-6">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Статус системы</Text>
            <View className="flex-row items-center justify-between text-xs text-slate-600 mb-1">
              <Text>База данных</Text>
              <Text className="text-emerald-600 font-bold">● Подключено</Text>
            </View>
            <View className="flex-row items-center justify-between text-xs text-slate-600">
              <Text>Синхронизация данных</Text>
              <Text className="text-indigo-600 font-bold">Реактивная локальная</Text>
            </View>
          </View>
        </View>

      </View>

      {/* 1. MODAL: РЎРџРРЎРћРљ РђРљРўРР’РќР«РҐ РЎРўРЈР”Р•РќРўРћР’ (РџРѕ РЅР°Р¶Р°С‚РёСЋ РЅР° РєР°СЂС‚РѕС‡РєСѓ "РђРєС‚РёРІРЅС‹Рµ СЃС‚СѓРґРµРЅС‚С‹") */}
      <Modal animationType="slide" transparent={true} visible={activeStudentsModalOpen} onRequestClose={() => setActiveStudentsModalOpen(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <View className="bg-slate-900 p-5 flex-row justify-between items-center">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center">
                  <Users size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-white">Список активных студентов</Text>
                  <Text className="text-xs text-indigo-200">
                    Всего активных: {activeStudents} студентов
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setActiveStudentsModalOpen(false)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
                <X size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Search filter */}
            <View className="p-4 border-b border-slate-200 bg-slate-50 flex-row items-center gap-2">
              <Search size={16} color="#94a3b8" />
              <TextInput
                value={activeStudentsSearch}
                onChangeText={setActiveStudentsSearch}
                placeholder="Поиск активного студента по имени, email или уровню..."
                className="flex-1 text-xs text-slate-800 py-1"
              />
            </View>

            {/* Students list */}
            <ScrollView className="p-4" showsVerticalScrollIndicator={true}>
              <View className="gap-2.5">
                {filteredActiveStudents.map(std => (
                  <TouchableOpacity
                    key={std.id}
                    onPress={() => {
                      setSelectedStudentInfo(std);
                      setActiveStudentsModalOpen(false);
                    }}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex-row justify-between items-center transition"
                  >
                    <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                      <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                        <Text className="text-emerald-800 font-extrabold text-sm">{std.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-slate-800">{std.name}</Text>
                        <Text className="text-xs text-slate-400">{std.email} · {std.phone}</Text>
                        <Text className="text-[11px] text-indigo-600 font-semibold mt-0.5">Уровень: {std.level}</Text>
                      </View>
                    </View>

                    <View className="items-end gap-1.5">
                      <StudentStatusBadge student={std} size="sm" interactive={isAdmin} />
                      <Text className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {std.balance} зан.
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {filteredActiveStudents.length === 0 && (
                  <View className="py-12 items-center">
                    <Text className="text-slate-400 text-xs">Активных студентов не найдено.</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="p-4 border-t border-slate-200 flex-row justify-between items-center bg-slate-50">
              <Text className="text-xs text-slate-500">Нажмите на студента для открытия его личного дела</Text>
              <TouchableOpacity onPress={() => setActiveStudentsModalOpen(false)} className="px-4 py-2 bg-slate-800 rounded-lg">
                <Text className="text-white text-xs font-bold">Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. MODAL: РЎРџРРЎРћРљ Р—РђРџР›РђРќРР РћР’РђРќРќР«РҐ РЈР РћРљРћР’ (РџРѕ РЅР°Р¶Р°С‚РёСЋ РЅР° РєР°СЂС‚РѕС‡РєСѓ "Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅРѕ СѓСЂРѕРєРѕРІ") */}
      <Modal animationType="slide" transparent={true} visible={scheduledLessonsModalOpen} onRequestClose={() => setScheduledLessonsModalOpen(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <View className="bg-slate-900 p-5 flex-row justify-between items-center">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center">
                  <GraduationCap size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-white">Запланированные уроки</Text>
                  <Text className="text-xs text-indigo-200">
                    Всего в графике: {pendingLessons} уроков
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setScheduledLessonsModalOpen(false)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
                <X size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Search filter */}
            <View className="p-4 border-b border-slate-200 bg-slate-50 flex-row items-center gap-2">
              <Search size={16} color="#94a3b8" />
              <TextInput
                value={scheduledLessonsSearch}
                onChangeText={setScheduledLessonsSearch}
                placeholder="Поиск по названию группы, теме или преподавателю..."
                className="flex-1 text-xs text-slate-800 py-1"
              />
            </View>

            {/* Lessons list */}
            <ScrollView className="p-4" showsVerticalScrollIndicator={true}>
              <View className="gap-3">
                {filteredScheduledLessons.map(lesson => {
                  const displayName = lesson.groupName || lesson.studentName || 'Учебная группа';
                  return (
                    <View 
                      key={lesson.id} 
                      className="p-4 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-200 flex-row justify-between items-center"
                    >
                      <View className="flex-row gap-3 items-center flex-1 pr-3">
                        <View className="p-2.5 rounded-lg bg-indigo-100">
                          <Users size={18} color="#4f46e5" />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-bold text-slate-800">{displayName}</Text>
                            <View className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                              <Text className="text-[10px] font-bold text-indigo-700">Группа</Text>
                            </View>
                          </View>
                          <Text className="text-xs text-indigo-600 font-bold mt-0.5">РўРµРјР°: {lesson.topic}</Text>
                          <Text className="text-xs text-slate-400 mt-0.5">Преподаватель: {lesson.teacherName}</Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-xs font-extrabold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded">
                          {lesson.time}
                        </Text>
                        <Text className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                          {lesson.date}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {filteredScheduledLessons.length === 0 && (
                  <View className="py-12 items-center">
                    <Text className="text-slate-400 text-xs">Запланированных уроков не найдено.</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="p-4 border-t border-slate-200 flex-row justify-between items-center bg-slate-50">
              <TouchableOpacity 
                onPress={() => {
                  setScheduledLessonsModalOpen(false);
                  navigation.navigate('Schedule');
                }}
                className="px-4 py-2 bg-indigo-600 rounded-lg flex-row items-center gap-1.5"
              >
                <Plus size={14} color="#ffffff" />
                <Text className="text-white text-xs font-bold">Назначить новый урок</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setScheduledLessonsModalOpen(false)} className="px-4 py-2 bg-slate-800 rounded-lg">
                <Text className="text-white text-xs font-bold">Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. MODAL: Р”РћР‘РђР’РРўР¬ Р“Р РЈРџРџРЈ Р’ "РЈР§Р•Р‘РќР«Р• Р“Р РЈРџРџР«" (FIXED HEADER & FOOTER, FULLY SCROLLABLE) */}
      <Modal animationType="slide" transparent={true} visible={addGroupModalOpen} onRequestClose={() => setAddGroupModalOpen(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Pinned Header */}
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50">
              <Text className="text-lg font-bold text-slate-900">Создать новую учебную группу</Text>
              <TouchableOpacity onPress={() => setAddGroupModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView 
              className="flex-1"
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 24, paddingBottom: 24 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Название группы *
                  </Text>
                  <TextInput
                    value={newGroupTitle}
                    onChangeText={setNewGroupTitle}
                    placeholder="Например: Группа B1+ / IELTS"
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm"
                  />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Уровень подготовки (CEFR)
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                      <TouchableOpacity
                        key={lvl}
                        onPress={() => setNewGroupLevel(lvl)}
                        className={`flex-1 min-w-[45px] py-2 items-center rounded-md ${
                          newGroupLevel === lvl ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <Text className={`text-xs font-bold ${newGroupLevel === lvl ? 'text-white' : 'text-slate-700'}`}>
                          {lvl}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Описание и фокус курса
                  </Text>
                  <TextInput
                    value={newGroupDesc}
                    onChangeText={setNewGroupDesc}
                    placeholder="Например: Разговорная практика, грамматика и аудирование"
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm"
                  />
                </View>

                <View>
                  <Text className="mb-1 text-xs font-semibold uppercase text-slate-500">
                    Расписание занятий
                  </Text>
                  <Text className="mb-3 text-xs text-slate-500">
                    Необязательно. Выберите дни и время: для каждой пары будет создано занятие на неделю.
                  </Text>
                  <Text className="mb-2 text-xs font-semibold text-slate-600">Дни недели</Text>
                  <View className="mb-3 flex-row flex-wrap gap-2">
                    {groupScheduleWeekdays.map((day, index) => {
                      const dayOfWeek = index + 1;
                      const selected = newGroupScheduleDays.includes(dayOfWeek);
                      return (
                        <TouchableOpacity
                          key={day}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          onPress={() => setNewGroupScheduleDays(current => selected
                            ? current.filter(value => value !== dayOfWeek)
                            : [...current, dayOfWeek])}
                          className={`rounded-lg border px-3 py-2 ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                        >
                          <Text className={`text-xs font-semibold ${selected ? 'text-indigo-700' : 'text-slate-600'}`}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text className="mb-2 text-xs font-semibold text-slate-600">Время</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {groupScheduleTimes.map(scheduleTime => {
                      const selected = newGroupScheduleTimes.includes(scheduleTime);
                      return (
                        <TouchableOpacity
                          key={scheduleTime}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          onPress={() => setNewGroupScheduleTimes(current => selected
                            ? current.filter(value => value !== scheduleTime)
                            : [...current, scheduleTime])}
                          className={`rounded-lg border px-2.5 py-2 ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                        >
                          <Text className={`text-xs font-semibold ${selected ? 'text-indigo-700' : 'text-slate-600'}`}>
                            {scheduleTime}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {newGroupScheduleDays.length > 0 && newGroupScheduleTimes.length > 0 && (
                    <Text className="mt-2 text-xs font-semibold text-indigo-600">
                      Будет добавлено ячеек: {newGroupScheduleDays.length * newGroupScheduleTimes.length}
                    </Text>
                  )}
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Зарегистрированный преподаватель *
                  </Text>
                  <View className="gap-2">
                  {teacherAccounts.map(teacher => (
                    <TouchableOpacity
                      key={teacher.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: newGroupTeacherId === teacher.id }}
                      onPress={() => setNewGroupTeacherId(teacher.id)}
                      className={`rounded-lg border p-3 ${newGroupTeacherId === teacher.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                    >
                      <Text className="text-sm font-semibold text-slate-800">{teacher.name}</Text>
                      <Text className="text-xs text-slate-500">{teacher.email}</Text>
                    </TouchableOpacity>
                  ))}
                  {teacherAccounts.length === 0 && (
                    <Text className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      Сначала создайте преподавателя в разделе «Преподаватели».
                    </Text>
                  )}
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Студенты группы
                  </Text>
                  <View className="gap-2">
                  {students.map(student => {
                    const selected = newGroupStudentIds.includes(student.id);
                    return (
                      <TouchableOpacity
                        key={student.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        onPress={() => setNewGroupStudentIds(current => selected
                          ? current.filter(id => id !== student.id)
                          : [...current, student.id])}
                        className={`rounded-lg border p-3 ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                      >
                        <Text className="text-sm font-semibold text-slate-800">{student.name}</Text>
                        <Text className="text-xs text-slate-500">{student.level} · {student.email}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {students.length === 0 && <Text className="text-xs text-slate-500">Сначала добавьте студентов в базу.</Text>}
                  </View>
                </View>
              </View>
            </ScrollView>

            {groupFormError ? <Text className="px-6 pb-2 text-xs font-medium text-rose-700">{groupFormError}</Text> : null}
            {/* Pinned Footer with Actions */}
            <View className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setAddGroupModalOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                <Text className="text-xs font-semibold text-slate-500">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleAddGroup()} disabled={groupSaving || teacherAccounts.length === 0} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow">
                <Text className="text-xs font-bold text-white">{groupSaving ? 'Сохранение...' : 'Создать группу'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* STUDENT DETAIL MODAL */}
      <StudentDetailModal
        visible={!!selectedStudentInfo}
        student={selectedStudentInfo}
        onClose={() => setSelectedStudentInfo(null)}
        navigation={navigation}
        onScheduleLesson={() => {
          setSelectedStudentInfo(null);
          navigation.navigate('Schedule');
        }}
      />

      {/* GROUP DETAIL MODAL */}
      <GroupDetailModal
        visible={!!groupModalKey}
        groupKey={groupModalKey}
        group={groups.find(group => group.id === groupModalKey)}
        students={students}
        onClose={() => setGroupModalKey(null)}
        onSelectStudent={(std) => setSelectedStudentInfo(std)}
        onAddStudentToGroup={isAdmin ? () => navigation.navigate('Students') : undefined}
        onDeleteGroup={isAdmin ? (grpKey) => {
          const target = groups.find(g => g.id === grpKey || g.key === grpKey);
          if (target) setGroupToDelete(target);
        } : undefined}
      />

      {/* DELETE GROUP CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!groupToDelete}
        onRequestClose={() => setGroupToDelete(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="w-12 h-12 rounded-2xl bg-rose-100 items-center justify-center">
                <Trash2 size={24} color="#e11d48" />
              </View>
              <TouchableOpacity
                onPress={() => setGroupToDelete(null)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center hover:bg-slate-200"
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-lg font-bold text-slate-900 mb-2">
              Удалить группу «{groupToDelete?.title}»?
            </Text>

            <Text className="text-sm text-slate-600 mb-6 leading-relaxed">
              Вы действительно хотите удалить эту группу из учебных групп? Студенты сохранятся в базе данных школы.
            </Text>

            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setGroupToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50"
              >
                <Text className="text-sm font-semibold text-slate-700">Отмена</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleDeleteGroup()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 flex-row items-center gap-2 shadow-sm"
              >
                <Trash2 size={16} color="#ffffff" />
                <Text className="text-sm font-bold text-white">Да, удалить группу</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

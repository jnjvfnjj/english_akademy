import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, Student, Group, addStudent, addGroup, addLesson, addTransaction } from '../../store';
import StudentStatusBadge from '../../components/StudentStatusBadge';
import StudentDetailModal from '../../components/StudentDetailModal';
import GroupDetailModal from '../../components/GroupDetailModal';
import { Users, GraduationCap, Calendar, DollarSign, Plus, ArrowUpRight, TrendingUp, ChevronRight, X, Clock, CheckCircle, Search, Shield, BookOpen } from 'lucide-react-native';

export default function DashboardScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const students = useSelector((state: RootState) => state.students.list);
  const groups = useSelector((state: RootState) => state.groups.list);
  const lessons = useSelector((state: RootState) => state.lessons.list);
  const transactions = useSelector((state: RootState) => state.billing.transactions);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isAdmin = userRole === 'Admin';

  // Quick action modals
  const [modalType, setModalType] = useState<'student' | 'lesson' | 'payment' | null>(null);

  // Dedicated list modals for stat cards
  const [activeStudentsModalOpen, setActiveStudentsModalOpen] = useState(false);
  const [scheduledLessonsModalOpen, setScheduledLessonsModalOpen] = useState(false);
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);

  // Modals for student info page and group students list
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<Student | null>(null);
  const [groupModalKey, setGroupModalKey] = useState<string | null>(null);

  // Selector state for level groups
  const [selectedLevelGroup, setSelectedLevelGroup] = useState<string | null>('B1');

  // Search states for modals
  const [activeStudentsSearch, setActiveStudentsSearch] = useState('');
  const [scheduledLessonsSearch, setScheduledLessonsSearch] = useState('');

  // Form states for adding student
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentLevel, setStudentLevel] = useState('Intermediate (B1)');
  const [studentAge, setStudentAge] = useState<'Kids' | 'Teens' | 'Adults'>('Adults');
  const [studentBalance, setStudentBalance] = useState('10');

  // Form states for adding group
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupLevel, setNewGroupLevel] = useState('B1');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupTeacher, setNewGroupTeacher] = useState('Елена Смирнова');

  // Form states for scheduling lesson - Selecting GROUP instead of student
  const [lessonGroupId, setLessonGroupId] = useState(groups.length > 0 ? groups[0].id : '');
  const [lessonGroupName, setLessonGroupName] = useState(groups.length > 0 ? groups[0].title : '');
  const [lessonDate, setLessonDate] = useState('2026-05-28');
  const [lessonTime, setLessonTime] = useState('12:00');
  const [lessonTeacher, setLessonTeacher] = useState('Елена Смирнова');
  const [lessonTopic, setLessonTopic] = useState('');

  // Form states for payment
  const [paymentStudentId, setPaymentStudentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('150');
  const [paymentDesc, setPaymentDesc] = useState('Покупка пакета занятий');

  // Stats calculations
  const activeStudentsList = students.filter(s => s.status === 'Active');
  const activeStudents = activeStudentsList.length;
  
  const scheduledLessonsList = lessons.filter(l => l.status === 'Scheduled');
  const pendingLessons = scheduledLessonsList.length;

  const activeTransactions = transactions.filter(t => !t.studentId || students.some(s => s.id === t.studentId));
  const totalIncome = activeTransactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = activeTransactions
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const profitLoss = totalIncome - totalExpense;

  const matchStudentLevel = (studentLevelStr: string, groupKey: string) => {
    if (!studentLevelStr || !groupKey) return false;
    const normalizedGroup = groupKey.toUpperCase();
    const normalizedLevel = studentLevelStr.toUpperCase();
    return normalizedLevel === normalizedGroup || normalizedLevel.includes(`(${normalizedGroup})`) || normalizedLevel.includes(normalizedGroup);
  };

  const handleAddStudent = () => {
    if (!studentName.trim() || !studentEmail.trim()) return;
    dispatch(addStudent({
      name: studentName.trim(),
      email: studentEmail.trim(),
      phone: studentPhone || '+79998881111',
      level: studentLevel,
      ageGroup: studentAge,
      balance: parseInt(studentBalance, 10) || 0,
      status: 'Active',
      notes: 'Регистрация студента через панель управления'
    }));

    const bal = parseInt(studentBalance, 10) || 0;
    if (bal > 0) {
      dispatch(addTransaction({
        studentName: studentName.trim(),
        amount: bal * 25,
        type: 'Income',
        category: 'Tuition',
        date: new Date().toISOString().split('T')[0],
        description: `Зарегистрирован студент ${studentName} со стартовым пакетом из ${bal} часов`
      }));
    }

    setStudentName('');
    setStudentEmail('');
    setStudentPhone('');
    setStudentBalance('10');
    setModalType(null);
  };

  const handleAddGroup = () => {
    if (!newGroupTitle.trim()) return;

    dispatch(addGroup({
      key: newGroupLevel,
      title: newGroupTitle.trim(),
      desc: newGroupDesc.trim() || `Курс уровня ${newGroupLevel}`,
      level: newGroupLevel,
      teacherName: newGroupTeacher,
      color: 'border-indigo-400 bg-indigo-50 text-indigo-700',
      activeText: 'text-indigo-800'
    }));

    setNewGroupTitle('');
    setNewGroupDesc('');
    setAddGroupModalOpen(false);
  };

  const handleOpenScheduleModal = () => {
    if (groups.length > 0) {
      setLessonGroupId(groups[0].id);
      setLessonGroupName(groups[0].title);
      if (groups[0].teacherName) setLessonTeacher(groups[0].teacherName);
    }
    setLessonTopic('');
    setModalType('lesson');
  };

  const handleAddLesson = () => {
    if (!lessonGroupName || !lessonTopic.trim()) return;

    dispatch(addLesson({
      groupId: lessonGroupId,
      groupName: lessonGroupName,
      date: lessonDate,
      time: lessonTime,
      teacherName: lessonTeacher,
      topic: lessonTopic.trim(),
      duration: 1,
      status: 'Scheduled'
    }));

    setLessonTopic('');
    setModalType(null);
  };

  const handleAddPayment = () => {
    if (!paymentStudentId || !paymentAmount) return;
    const selectedStd = students.find(s => s.id === paymentStudentId);
    if (!selectedStd) return;

    const amt = parseFloat(paymentAmount) || 0;
    dispatch(addTransaction({
      studentId: paymentStudentId,
      studentName: selectedStd.name,
      amount: amt,
      type: 'Income',
      category: 'Tuition',
      date: new Date().toISOString().split('T')[0],
      description: paymentDesc || 'Оплата за обучение'
    }));

    const hours = Math.floor(amt / 25);
    if (hours > 0) {
      const idx = students.findIndex(s => s.id === paymentStudentId);
      if (idx !== -1) {
        dispatch({
          type: 'students/updateStudent',
          payload: {
            ...students[idx],
            balance: students[idx].balance + hours,
            totalPaid: students[idx].totalPaid + amt,
            totalClasses: students[idx].totalClasses + hours
          }
        });
      }
    }

    setPaymentAmount('150');
    setPaymentDesc('Покупка пакета занятий');
    setModalType(null);
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
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24, paddingBottom: 80, flexGrow: 1 }}>
      
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
          <TouchableOpacity 
            onPress={() => setModalType('student')}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg flex-row items-center gap-2 shadow"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white text-xs font-semibold">Новый студент</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleOpenScheduleModal}
            className="bg-slate-800 hover:bg-slate-900 px-4 py-2.5 rounded-lg flex-row items-center gap-2 shadow"
          >
            <Calendar size={16} color="#ffffff" />
            <Text className="text-white text-xs font-semibold">Назначить урок группы</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid of four stat widgets */}
      <View className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
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

        {/* Stat item 3: Общая выручка */}
        <View className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Общая выручка</Text>
            <Text className="text-3xl font-extrabold text-slate-900 mt-2">${totalIncome.toLocaleString()}</Text>
            <View className="flex-row items-center mt-2.5">
              <Plus size={14} color="#10b981" />
              <Text className="text-xs font-medium text-emerald-600 ml-1">
                {isAdmin ? 'Журнал оплат доступен' : 'Только для администратора'}
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
            <Text className={`text-3xl font-extrabold mt-2 ${profitLoss >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              ${profitLoss.toLocaleString()}
            </Text>
            <View className="flex-row items-center mt-2.5">
              <ArrowUpRight size={14} color="#64748b" />
              <Text className="text-xs font-medium text-slate-500 ml-1">Маржинальность</Text>
            </View>
          </View>
          <View className={`p-3 rounded-xl ${profitLoss >= 0 ? "bg-slate-100" : "bg-rose-50"}`}>
            <TrendingUp size={24} color={profitLoss >= 0 ? "#475569" : "#e11d48"} />
          </View>
        </View>

      </View>

      {/* УЧЕБНЫЕ ГРУППЫ (С КНОПКОЙ "ДОБАВИТЬ ГРУППУ") */}
      <View className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <View className="mb-4 flex-row justify-between items-center flex-wrap gap-3">
          <View>
            <Text className="text-lg font-bold text-slate-800">Учебные группы (CEFR)</Text>
            <Text className="text-xs text-slate-400 mt-1">
              Нажмите на группу, чтобы сразу открыть список студентов группы:
            </Text>
          </View>
          
          <View className="flex-row items-center gap-2">
            {/* КНОПКА "ДОБАВИТЬ ГРУППУ" */}
            <TouchableOpacity
              onPress={() => setAddGroupModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg flex-row items-center gap-1.5 shadow"
            >
              <Plus size={15} color="#ffffff" />
              <Text className="text-white text-xs font-bold">Добавить группу</Text>
            </TouchableOpacity>

            {selectedLevelGroup && (
              <TouchableOpacity
                onPress={() => setGroupModalKey(selectedLevelGroup)}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg flex-row items-center gap-1.5"
              >
                <Users size={14} color="#4f46e5" />
                <Text className="text-xs font-bold text-indigo-700">Открыть {selectedLevelGroup} списком</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Group Cards */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          {groups.map((item) => {
            const count = students.filter(s => matchStudentLevel(s.level, item.key)).length;
            const isSelected = selectedLevelGroup === item.key;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setSelectedLevelGroup(item.key);
                  setGroupModalKey(item.key);
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
                <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedLevelGroup && (
          <View className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Студенты группы {selectedLevelGroup} • Нажмите на строку для полного профиля:
              </Text>
              <TouchableOpacity onPress={() => setGroupModalKey(selectedLevelGroup)}>
                <Text className="text-xs font-bold text-indigo-600">Все студенты группы ({students.filter(s => matchStudentLevel(s.level, selectedLevelGroup)).length}) →</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-2">
              {students.filter(s => matchStudentLevel(s.level, selectedLevelGroup)).slice(0, 5).map((std) => (
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
                    <StudentStatusBadge student={std} size="sm" />
                    <Text className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      {std.balance} ч.
                    </Text>
                    <ChevronRight size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              ))}

              {students.filter(s => matchStudentLevel(s.level, selectedLevelGroup)).length === 0 && (
                <View className="py-6 items-center">
                  <Text className="text-xs text-slate-400">В группе {selectedLevelGroup} пока нет студентов.</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* TODAY'S LESSONS & QUICK CRM ACCESS */}
      <View className="flex-row flex-wrap gap-6 lg:flex-nowrap w-full">
        
        {/* Today's Lessons List */}
        <View className="flex-1 min-w-[340px] bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
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
                      <Text className="text-xs text-indigo-600 font-semibold mt-0.5">Тема: {lesson.topic}</Text>
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
        <View className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <View>
            <Text className="text-lg font-bold text-slate-800 mb-2">Быстрый доступ к CRM</Text>
            <Text className="text-xs text-slate-500 mb-6">Управление группами, учет и переход к реестру студентов.</Text>

            {/* Payment Button - only for Admin */}
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => {
                  setModalType('payment');
                  if (students.length > 0) setPaymentStudentId(students[0].id);
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

      {/* 1. MODAL: СПИСОК АКТИВНЫХ СТУДЕНТОВ (По нажатию на карточку "Активные студенты") */}
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
                        <Text className="text-xs text-slate-400">{std.email} • {std.phone}</Text>
                        <Text className="text-[11px] text-indigo-600 font-semibold mt-0.5">Уровень: {std.level}</Text>
                      </View>
                    </View>

                    <View className="items-end gap-1.5">
                      <StudentStatusBadge student={std} size="sm" />
                      <Text className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {std.balance} ч.
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

      {/* 2. MODAL: СПИСОК ЗАПЛАНИРОВАННЫХ УРОКОВ (По нажатию на карточку "Запланировано уроков") */}
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
                          <Text className="text-xs text-indigo-600 font-bold mt-0.5">Тема: {lesson.topic}</Text>
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
                  handleOpenScheduleModal();
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

      {/* 3. MODAL: ДОБАВИТЬ ГРУППУ В "УЧЕБНЫЕ ГРУППЫ" (FIXED HEADER & FOOTER, FULLY SCROLLABLE) */}
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
                    placeholder="Например: Группа B1+ Интенсив / IELTS Подготовка"
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
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Назначенный преподаватель
                  </Text>
                  <TextInput
                    value={newGroupTeacher}
                    onChangeText={setNewGroupTeacher}
                    placeholder="Елена Смирнова"
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Pinned Footer with Actions */}
            <View className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setAddGroupModalOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                <Text className="text-xs font-semibold text-slate-500">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddGroup} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow">
                <Text className="text-xs font-bold text-white">Создать группу</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. MODAL: НОВЫЙ СТУДЕНТ (FIXED HEADER & FOOTER, FULLY SCROLLABLE) */}
      <Modal animationType="slide" transparent={true} visible={modalType === 'student'} onRequestClose={() => setModalType(null)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Pinned Header */}
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50">
              <Text className="text-lg font-bold text-slate-900">Регистрация студента в базу CRM</Text>
              <TouchableOpacity onPress={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200">
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
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">ФИО студента *</Text>
                  <TextInput value={studentName} onChangeText={setStudentName} placeholder="Иван Иванов" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Электронная почта *</Text>
                  <TextInput value={studentEmail} onChangeText={setStudentEmail} keyboardType="email-address" placeholder="ivan@example.com" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Телефон</Text>
                    <TextInput value={studentPhone} onChangeText={setStudentPhone} placeholder="+7 (999) 000-00-00" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Стартовый баланс часов</Text>
                    <TextInput value={studentBalance} onChangeText={setStudentBalance} keyboardType="numeric" placeholder="10" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Уровень по CEFR</Text>
                    <TextInput value={studentLevel} onChangeText={setStudentLevel} placeholder="Intermediate (B1)" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Возрастная категория</Text>
                    <View className="flex-row bg-slate-100 rounded-lg p-1">
                      {['Kids', 'Teens', 'Adults'].map((age) => (
                        <TouchableOpacity 
                          key={age} 
                          onPress={() => setStudentAge(age as any)}
                          className={`flex-1 py-1.5 rounded items-center ${studentAge === age ? 'bg-white shadow' : ''}`}
                        >
                          <Text className="text-xs font-bold text-slate-800">
                            {age === 'Kids' ? 'Дети' : age === 'Teens' ? 'Подростки' : 'Взрослые'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Pinned Footer with Actions */}
            <View className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setModalType(null)} className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                <Text className="text-xs font-semibold text-slate-500">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddStudent} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow">
                <Text className="text-xs font-bold text-white">Сохранить студента</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. MODAL: НАЗНАЧИТЬ УРОК - ВЫБОР ГРУППЫ ВМЕСТО СТУДЕНТА (FIXED HEADER & FOOTER, FULLY SCROLLABLE) */}
      <Modal animationType="slide" transparent={true} visible={modalType === 'lesson'} onRequestClose={() => setModalType(null)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Pinned Header */}
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50">
              <View>
                <Text className="text-lg font-bold text-slate-900 mb-0.5">Запланировать учебное занятие</Text>
                <Text className="text-xs text-slate-400">
                  Выберите учебную группу для проведения урока
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200">
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
                {/* SELECT GROUP INSTEAD OF STUDENT */}
                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">Выберите группу *</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {groups.map((g) => {
                      const count = students.filter(s => matchStudentLevel(s.level, g.key)).length;
                      const isSelected = lessonGroupId === g.id;
                      return (
                        <TouchableOpacity 
                          key={g.id} 
                          onPress={() => {
                            setLessonGroupId(g.id);
                            setLessonGroupName(g.title);
                            if (g.teacherName) setLessonTeacher(g.teacherName);
                          }}
                          className={`px-3 py-2 rounded-xl border flex-1 min-w-[130px] flex-row justify-between items-center ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-500 border-2 shadow-sm' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <View>
                            <Text className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{g.title}</Text>
                            <Text className="text-[10px] text-slate-400">{g.desc || g.level}</Text>
                          </View>
                          <View className={`px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                            <Text className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                              {count}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Тема занятия / Материалы *</Text>
                  <TextInput value={lessonTopic} onChangeText={setLessonTopic} placeholder="Например: Разбор Present Continuous и чтение" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Дата занятия</Text>
                    <TextInput value={lessonDate} onChangeText={setLessonDate} placeholder="2026-05-28" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Время (ЧЧ:ММ)</Text>
                    <TextInput value={lessonTime} onChangeText={setLessonTime} placeholder="12:00" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Преподаватель</Text>
                  <TextInput value={lessonTeacher} onChangeText={setLessonTeacher} placeholder="Елена Смирнова" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>
              </View>
            </ScrollView>

            {/* Pinned Footer with Actions */}
            <View className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setModalType(null)} className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                <Text className="text-xs font-semibold text-slate-500">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddLesson} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow">
                <Text className="text-xs font-bold text-white">Создать урок для группы</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. MODAL: НОВЫЙ ПЛАТЕЖ */}
      <Modal animationType="slide" transparent={true} visible={modalType === 'payment'} onRequestClose={() => setModalType(null)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh]">
            <ScrollView showsVerticalScrollIndicator={true}>
              <Text className="text-lg font-bold text-slate-900 mb-4">Внести платеж / продажу</Text>

              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">Выберите студента</Text>
                  <View className="bg-slate-100 rounded-lg p-2 flex-wrap flex-row gap-1">
                    {students.map((s) => (
                      <TouchableOpacity 
                         key={s.id} 
                         onPress={() => setPaymentStudentId(s.id)}
                         className={`px-3 py-1.5 rounded-md ${paymentStudentId === s.id ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                        <Text className={`text-xs ${paymentStudentId === s.id ? 'text-white font-bold' : 'text-slate-700'}`}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Сумма ($ USD)</Text>
                    <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" placeholder="150" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm font-bold" />
                  </View>
                  <View className="justify-center pt-4">
                    <Text className="text-xs text-slate-500 font-medium">Авто-зачисление: 1 час за каждые $25</Text>
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Описание счёта</Text>
                  <TextInput value={paymentDesc} onChangeText={setPaymentDesc} placeholder="Оплачен пакет из 10 занятий" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>
              </View>

              <View className="flex-row justify-end space-x-3 mt-6 pt-2">
                <TouchableOpacity onPress={() => setModalType(null)} className="px-4 py-2.5 rounded-lg border border-slate-200">
                  <Text className="text-xs font-semibold text-slate-400">Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddPayment} className="px-5 py-2.5 bg-emerald-600 rounded-lg shadow">
                  <Text className="text-xs font-bold text-white">Провести</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
          handleOpenScheduleModal();
        }}
      />

      {/* GROUP DETAIL MODAL */}
      <GroupDetailModal
        visible={!!groupModalKey}
        groupKey={groupModalKey}
        students={students}
        onClose={() => setGroupModalKey(null)}
        onSelectStudent={(std) => setSelectedStudentInfo(std)}
        onAddStudentToGroup={(grp) => {
          setStudentLevel(grp);
          setModalType('student');
        }}
      />

    </ScrollView>
  );
}

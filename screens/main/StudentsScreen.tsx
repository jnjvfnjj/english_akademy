import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, Student, addStudent, updateStudent, deleteStudent, addTransaction } from '../../store';
import StudentStatusBadge from '../../components/StudentStatusBadge';
import { Search, UserCheck, Plus, Trash2, Edit, Award, ShoppingCart, MessageSquare, AlertCircle, X, Check } from 'lucide-react-native';

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const addOneMonth = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endOfMonth = new Date(nextYear, nextMonth, 0).getDate();
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(day, endOfMonth)).padStart(2, '0')}`;
};

export default function StudentsScreen({ route }: any) {
  const dispatch = useDispatch();
  const students = useSelector((state: RootState) => state.students.list);
  const isAdmin = useSelector((state: RootState) => state.auth.user?.role === 'Admin');
  const canViewPayments = useSelector((state: RootState) =>
    state.auth.user?.role === 'Admin' || state.auth.user?.canViewStudentPayments === true
  );
  const groups = useSelector((state: RootState) => state.groups.list);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'On Hold' | 'Completed'>('All');
  const [filterAge, setFilterAge] = useState<'All' | 'Kids' | 'Teens' | 'Adults'>('All');

  // Selected student details / editing state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Auto-select student if passed via navigation route parameters
  useEffect(() => {
    if (route?.params?.studentId) {
      const target = students.find(s => s.id === route.params.studentId);
      if (target) {
        setSelectedStudent(target);
        setFilterStatus('All');
      }
    } else if (!selectedStudent && students.length > 0) {
      setSelectedStudent(students[0]);
    }
  }, [route?.params?.studentId, students]);

  const [editModal, setEditModal] = useState(false);
  const [buyHoursModal, setBuyHoursModal] = useState(false);
  const [registerModal, setRegisterModal] = useState(false);
  const [buyHoursAmount, setBuyHoursAmount] = useState('10');
  const [buyPaymentAmount, setBuyPaymentAmount] = useState('');
  const [buyPaymentError, setBuyPaymentError] = useState('');
  const [buyPaymentDate, setBuyPaymentDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editAgeGroup, setEditAgeGroup] = useState<'Kids' | 'Teens' | 'Adults'>('Adults');
  const [editStatus, setEditStatus] = useState<'Active' | 'On Hold' | 'Completed'>('Active');
  const [editNotes, setEditNotes] = useState('');

  // Register new student form states
  const [regName, setRegName] = useState('');
  const [regFormat, setRegFormat] = useState('');
  const [regCourses, setRegCourses] = useState<string[]>([]);
  const [regCustomCourse, setRegCustomCourse] = useState('');
  const [regAmount, setRegAmount] = useState('');
  const [regLessons, setRegLessons] = useState('');
  const [regPaymentDate, setRegPaymentDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [registrationError, setRegistrationError] = useState('');
  const [editGroupId, setEditGroupId] = useState<string | undefined>();

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) || 
                          student.email.toLowerCase().includes(search.toLowerCase()) ||
                          student.phone.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || student.status === filterStatus;
    const matchesAge = filterAge === 'All' || student.ageGroup === filterAge;
    return matchesSearch && matchesStatus && matchesAge;
  });

  const handleOpenEdit = (student: Student) => {
    setEditName(student.name);
    setEditEmail(student.email);
    setEditPhone(student.phone);
    setEditLevel(student.level);
    setEditAgeGroup(student.ageGroup);
    setEditStatus(student.status);
    setEditNotes(student.notes || '');
    setEditGroupId(student.groupId);
    setEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedStudent) return;
    const updated: Student = {
      ...selectedStudent,
      name: editName,
      email: editEmail,
      phone: editPhone,
      level: editLevel,
      ageGroup: editAgeGroup,
      status: editStatus,
      notes: editNotes,
      groupId: editGroupId,
      groupName: groups.find(group => group.id === editGroupId)?.title
    };
    dispatch(updateStudent(updated));
    setSelectedStudent(updated);
    setEditModal(false);
  };

  const handleRegisterStudent = () => {
    const amount = Number(regAmount);
    const lessons = Number(regLessons);
    if (!regName.trim() || !regFormat.trim() || regCourses.length === 0
        || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(lessons) || lessons <= 0
        || !isValidDate(regPaymentDate)) {
      setRegistrationError('Заполните ФИО, формат, курс, сумму, число занятий и корректную дату оплаты.');
      return;
    }
    setRegistrationError('');
    dispatch(addStudent({
      name: regName.trim(),
      email: '',
      phone: '',
      level: regCourses.join(', '),
      ageGroup: 'Adults',
      balance: lessons,
      totalClasses: lessons,
      totalPaid: amount,
      paymentAmount: amount,
      paymentDate: regPaymentDate,
      paymentExpiresAt: addOneMonth(regPaymentDate),
      paymentCurrency: 'KGS',
      educationFormat: regFormat.trim(),
      courses: regCourses,
      status: 'Active',
      notes: '',
      groupIds: []
    }));

    setRegName('');
    setRegFormat('');
    setRegCourses([]);
    setRegCustomCourse('');
    setRegAmount('');
    setRegLessons('');
    setRegistrationError('');
    setRegisterModal(false);
  };

  const handleDeleteStudent = () => {
    if (!selectedStudent) return;
    dispatch(deleteStudent(selectedStudent.id));
    setSelectedStudent(null);
    setShowDeleteConfirm(false);
  };

  const handleBuyHours = () => {
    if (!selectedStudent) return;
    const hours = Number(buyHoursAmount);
    const amount = Number(buyPaymentAmount);
    if (!Number.isInteger(hours) || hours <= 0 || !Number.isFinite(amount) || amount <= 0 || !isValidDate(buyPaymentDate)) {
      setBuyPaymentError('Укажите положительное целое число занятий, сумму и корректную дату оплаты.');
      return;
    }
    setBuyPaymentError('');

    const expiresAt = addOneMonth(buyPaymentDate);
    // Add billing transaction record
    dispatch(addTransaction({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      amount,
      currency: 'KGS',
      type: 'Income',
      category: 'Tuition',
      date: buyPaymentDate,
      lessonsPurchased: hours,
      expiresAt,
      description: `Оплата ${hours} занятий`
    }));

    // Update selected student in local view
    const updated: Student = {
      ...selectedStudent,
      balance: selectedStudent.balance + hours,
      totalPaid: selectedStudent.paymentCurrency === 'KGS' ? selectedStudent.totalPaid + amount : amount,
      totalClasses: selectedStudent.totalClasses + hours,
      paymentCurrency: 'KGS',
      paymentAmount: amount,
      paymentDate: buyPaymentDate,
      paymentExpiresAt: expiresAt
    };
    dispatch(updateStudent(updated));
    setSelectedStudent(updated);

    setBuyHoursModal(false);
    setBuyHoursAmount('10');
    setBuyPaymentAmount('');
  };

  const statusLabels: Record<string, string> = {
    All: 'Все статусы',
    Active: 'Активен',
    'On Hold': 'В паузе',
    Completed: 'Завершен'
  };

  const ageLabels: Record<string, string> = {
    All: 'Все возраста',
    Kids: 'Дети',
    Teens: 'Подростки',
    Adults: 'Взрослые'
  };

  return (
    <ScrollView 
      className="flex-1 w-full bg-slate-50" 
      style={{ flex: 1, width: '100%', height: '100%' }}
      contentContainerStyle={{ padding: 12, paddingBottom: 100, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      <View className="flex-row flex-wrap gap-3 md:gap-6 lg:flex-nowrap w-full">
      
      {/* LEFT: Students list register (3/5ths width on desktop) */}
      <View className="flex-1 min-w-0 md:min-w-[340px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col">
        <View className="flex-row justify-between items-center mb-2 flex-wrap gap-3">
          <View>
            <Text className="text-xl font-bold text-slate-800">Реестр студентов</Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              Отслеживание курсов, истории оплат и остатка занятий.
            </Text>
          </View>

          {/* Button to register student */}
          <TouchableOpacity
            onPress={() => setRegisterModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg flex-row items-center gap-1.5 shadow"
          >
            <Plus size={15} color="#ffffff" />
            <Text className="text-white text-xs font-bold">Зарегистрировать студента</Text>
          </TouchableOpacity>
        </View>

        {/* Filters and search box */}
        <View className="space-y-4 mb-6 mt-4">
          <View className="relative bg-slate-50 border border-slate-200 rounded-lg flex-row items-center px-4">
            <Search size={16} color="#94a3b8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Поиск по имени, email, телефону..."
              className="flex-grow p-3 text-slate-700 text-sm focus:outline-none"
            />
          </View>

          {/* Filters tag slider */}
          <View className="flex-row items-center justify-between flex-wrap gap-3">
            <View className="flex-row bg-slate-100 rounded-lg p-1 flex-wrap">
              {(['All', 'Active', 'On Hold', 'Completed'] as const).map((st) => (
                <TouchableOpacity 
                  key={st}
                  onPress={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-md ${filterStatus === st ? 'bg-indigo-600' : 'bg-slate-100'}`}
                >
                  <Text className={`text-xs font-semibold ${filterStatus === st ? 'text-white' : 'text-slate-600'}`}>
                    {statusLabels[st]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row bg-slate-100 rounded-lg p-1 flex-wrap">
              {(['All', 'Kids', 'Teens', 'Adults'] as const).map((ag) => (
                <TouchableOpacity 
                  key={ag}
                  onPress={() => setFilterAge(ag)}
                  className={`px-3 py-1.5 rounded-md ${filterAge === ag ? 'bg-slate-800' : 'bg-slate-100'}`}
                >
                  <Text className={`text-xs font-semibold ${filterAge === ag ? 'text-white' : 'text-slate-600'}`}>
                    {ageLabels[ag]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Live List Scroll container */}
        <View className="gap-3 flex-1">
          {filteredStudents.map((student) => (
            <TouchableOpacity 
              key={student.id} 
              onPress={() => { setSelectedStudent(student); setShowDeleteConfirm(false); }}
              className={`p-4 rounded-xl border flex flex-row justify-between items-center transition-all ${
                selectedStudent?.id === student.id
                  ? 'bg-indigo-50/50 border-indigo-400' 
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100/60'
              }`}
            >
              <View className="flex-row items-center space-x-4 gap-3">
                {/* Initial Level bubble representation */}
                <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                  <Text className="text-xs font-extrabold text-indigo-700">
                    {student.level || 'A1'}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-800">{student.name}</Text>
                  {student.educationFormat ? <Text className="text-xs text-slate-500 mt-0.5">{student.educationFormat}</Text> : null}
                  {student.courses?.length ? <Text className="text-[11px] text-slate-500 mt-0.5">{student.courses.join(', ')}</Text> : null}
                  <View className="flex-row gap-2 mt-1.5 items-center">
                    <StudentStatusBadge 
                      student={student} 
                      size="sm" 
                      interactive={isAdmin}
                      onStatusChange={(newStatus) => {
                        if (selectedStudent?.id === student.id) {
                          setSelectedStudent({ ...selectedStudent, status: newStatus });
                        }
                      }}
                    />
                    <Text className="text-xs bg-slate-100 text-slate-600 px-2 rounded">
                      {ageLabels[student.ageGroup]}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="text-right items-end">
                <Text className={`text-sm font-black ${student.balance > 0 ? "text-slate-900" : "text-rose-600"}`}>
                  {student.balance} ч. осталось
                </Text>
                {canViewPayments && (
                  <Text className="text-xs text-slate-400 mt-1">
                    Оплата: {student.totalPaid > 0
                      ? `есть · ${student.paymentCurrency === 'KGS' ? `${student.totalPaid} сом` : `$${student.totalPaid}`}`
                      : 'нет'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {filteredStudents.length === 0 && (
            <View className="py-12 items-center">
              <Text className="text-slate-400 text-sm">Студентов с такими критериями не найдено.</Text>
            </View>
          )}
        </View>
      </View>

      {/* RIGHT: Detail View / CRM Actions Panel */}
      <View className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col">
        {selectedStudent ? (
          <View className="space-y-6">
            
            {/* Header info */}
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-xl font-bold text-slate-900">{selectedStudent.name}</Text>
                {selectedStudent.educationFormat ? <Text className="text-xs text-slate-500 mt-0.5">Формат: {selectedStudent.educationFormat}</Text> : null}
                {selectedStudent.courses?.length ? <Text className="text-xs text-slate-500 mt-0.5">Курсы: {selectedStudent.courses.join(', ')}</Text> : null}
                {selectedStudent.paymentDate ? <Text className="text-xs text-slate-500 mt-0.5">Оплачено: {selectedStudent.paymentDate}</Text> : null}
                {selectedStudent.paymentExpiresAt ? <Text className="text-xs text-slate-500 mt-0.5">Оплата действует до: {selectedStudent.paymentExpiresAt}</Text> : null}
                <Text className="text-xs text-slate-400 mt-0.5">{selectedStudent.phone}</Text>
              </View>
              
              {isAdmin && <TouchableOpacity
                onPress={() => handleOpenEdit(selectedStudent)}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Edit size={16} color="#6366f1" />
              </TouchableOpacity>}
            </View>

            {/* Quick stats grid on student */}
            <View className="grid grid-cols-2 gap-3">
              <View className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Уровень знаний</Text>
                <Text className="text-sm font-extrabold text-indigo-600 mt-1">{selectedStudent.level}</Text>
              </View>

              <View className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Категория</Text>
                <Text className="text-sm font-bold text-slate-800 mt-1">{ageLabels[selectedStudent.ageGroup]}</Text>
              </View>

              <View className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Остаток занятий</Text>
                <Text className={`text-base font-black mt-1 ${selectedStudent.balance > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {selectedStudent.balance} ч.
                </Text>
              </View>

              {canViewPayments && (
                <View className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Оплачено всего</Text>
                  <Text className="text-base font-black text-slate-800 mt-1">
                    {selectedStudent.paymentCurrency === 'KGS' ? `${selectedStudent.totalPaid} сом` : `$${selectedStudent.totalPaid}`}
                  </Text>
                  <Text className="mt-1 text-[10px] text-slate-500">
                    {selectedStudent.totalPaid > 0 ? 'Есть оплата по договору' : 'Оплаты пока нет'}
                  </Text>
                </View>
              )}
            </View>

            {/* Actions for lesson balance */}
            {isAdmin && <View className="space-y-3">
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Оплаченные занятия</Text>
              
              <TouchableOpacity 
                onPress={() => {
                  setBuyPaymentError('');
                  setBuyHoursModal(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-lg flex-row justify-center items-center shadow"
              >
                <ShoppingCart size={16} color="#ffffff" className="mr-2" />
                <Text className="text-white text-xs font-bold">Добавить оплату занятий</Text>
              </TouchableOpacity>
            </View>}

            {isAdmin && <>
            {/* Quick Status / Delete Actions Container */}
            <View className="gap-2.5">
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Статус активности студента</Text>
              
              <View className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-semibold text-slate-600">Текущий статус:</Text>
                  <Text className="text-[10px] text-slate-400">Нажмите на бейдж для изменения</Text>
                </View>
                <StudentStatusBadge 
                  student={selectedStudent} 
                  size="md" 
                  interactive={isAdmin}
                  onStatusChange={(newStatus) => {
                    setSelectedStudent({ ...selectedStudent, status: newStatus });
                  }} 
                />
              </View>

              {!showDeleteConfirm ? (
                <TouchableOpacity 
                  onPress={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 border border-rose-200 bg-rose-50/50 rounded-lg flex-row justify-center items-center"
                >
                  <Trash2 size={14} color="#f43f5e" className="mr-1.5" />
                  <Text className="text-rose-600 text-xs font-bold">Удалить из реестра</Text>
                </TouchableOpacity>
              ) : (
                <View className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <Text className="text-xs font-bold text-red-800 text-center">Вы точно хотите удалить студента?</Text>
                  <Text className="text-[10px] text-red-600 text-center">Все связанные уроки и статистика будут безвозвратно удалены.</Text>
                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity 
                      onPress={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-1.5 bg-slate-200 rounded-lg items-center"
                    >
                      <Text className="text-xs font-bold text-slate-700">Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={handleDeleteStudent}
                      className="flex-1 py-1.5 bg-red-600 rounded-lg items-center"
                    >
                      <Text className="text-xs font-bold text-white">Да, удалить</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            </>}

            {/* Notes field */}
            <View>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Заметки преподавателя</Text>
              <View className="bg-slate-50 border border-slate-100 p-3 rounded-lg min-h-[60px]">
                <Text className="text-xs text-slate-600">{selectedStudent.notes || 'Заметок пока нет.'}</Text>
              </View>
            </View>

          </View>
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <AlertCircle size={32} color="#cbd5e1" className="mb-2" />
            <Text className="text-slate-400 text-sm">Выберите студента для просмотра детальной информации.</Text>
          </View>
        )}
      </View>
      </View>

      {/* 1. REGISTER NEW STUDENT MODAL (FIXED HEADER & FOOTER, FULLY SCROLLABLE) */}
      <Modal animationType="slide" transparent={true} visible={registerModal} onRequestClose={() => setRegisterModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Pinned Header */}
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50">
              <Text className="text-lg font-bold text-slate-900">Зарегистрировать студента в реестр</Text>
              <TouchableOpacity onPress={() => setRegisterModal(false)} className="p-1 rounded-full hover:bg-slate-200">
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
                  <TextInput value={regName} onChangeText={setRegName} placeholder="Например: Иван Иванов" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Формат обучения *</Text>
                  <TextInput value={regFormat} onChangeText={setRegFormat} placeholder="Например: Продлёнка" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">Курсы * · можно выбрать несколько</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {Array.from(new Set([
                      'Английский язык',
                      'Кыргыз тили',
                      'Математика',
                      'Алгебра',
                      'Арабский язык',
                      ...groups.map(group => group.title)
                    ])).map(course => {
                      const selected = regCourses.includes(course);
                      return (
                        <TouchableOpacity
                          key={course}
                          onPress={() => setRegCourses(current => selected
                            ? current.filter(item => item !== course)
                            : [...current, course])}
                          className={`rounded-lg border px-3 py-2 ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                        >
                          <Text className={`text-xs font-semibold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{course}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View className="mt-2 flex-row gap-2">
                    <TextInput
                      value={regCustomCourse}
                      onChangeText={setRegCustomCourse}
                      placeholder="Другой курс"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const course = regCustomCourse.trim();
                        if (course && !regCourses.includes(course)) setRegCourses(current => [...current, course]);
                        setRegCustomCourse('');
                      }}
                      className="px-4 justify-center rounded-lg bg-slate-800"
                    >
                      <Text className="text-xs font-bold text-white">Добавить</Text>
                    </TouchableOpacity>
                  </View>
                  {regCourses.filter(course => !['Английский язык', 'Кыргыз тили', 'Математика', 'Алгебра', 'Арабский язык'].includes(course) && !groups.some(group => group.title === course)).map(course => (
                    <TouchableOpacity key={course} onPress={() => setRegCourses(current => current.filter(item => item !== course))} className="self-start mt-2 rounded-full bg-indigo-50 px-3 py-1">
                      <Text className="text-xs font-semibold text-indigo-700">{course} ×</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Оплачено, сом *</Text>
                    <TextInput value={regAmount} onChangeText={setRegAmount} keyboardType="decimal-pad" placeholder="2100" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Оплачено занятий *</Text>
                    <TextInput value={regLessons} onChangeText={setRegLessons} keyboardType="number-pad" placeholder="12" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Дата оплаты *</Text>
                  <TextInput value={regPaymentDate} onChangeText={setRegPaymentDate} placeholder="ГГГГ-ММ-ДД" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Действует до {isValidDate(regPaymentDate) ? addOneMonth(regPaymentDate) : 'через один календарный месяц'}.
                  </Text>
                </View>
                {registrationError ? <Text className="text-xs font-semibold text-rose-600">{registrationError}</Text> : null}
              </View>
            </ScrollView>

            {/* Pinned Footer with Actions */}
            <View className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setRegisterModal(false)} className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                <Text className="text-xs font-semibold text-slate-500">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRegisterStudent} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow">
                <Text className="text-xs font-bold text-white">Зарегистрировать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. EDIT STUDENT MODAL (FIXED HEADER & FOOTER, FULLY SCROLLABLE) */}
      <Modal animationType="slide" transparent={true} visible={editModal} onRequestClose={() => setEditModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Pinned Header */}
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50">
              <Text className="text-lg font-bold text-slate-900">Редактировать профиль студента</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} className="p-1 rounded-full hover:bg-slate-200">
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
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">ФИО студента</Text>
                  <TextInput value={editName} onChangeText={setEditName} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Email</Text>
                    <TextInput value={editEmail} onChangeText={setEditEmail} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Телефон</Text>
                    <TextInput value={editPhone} onChangeText={setEditPhone} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Уровень по CEFR</Text>
                    <TextInput value={editLevel} onChangeText={setEditLevel} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" />
                  </View>

                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Статус обучения</Text>
                    <View className="flex flex-row bg-slate-100 rounded-lg p-1">
                      {(['Active', 'On Hold', 'Completed'] as const).map((st) => (
                        <TouchableOpacity 
                          key={st}
                          onPress={() => setEditStatus(st)}
                          className={`flex-1 items-center py-1.5 rounded-md ${editStatus === st ? 'bg-white shadow' : ''}`}
                        >
                          <Text className="text-xs font-bold text-slate-800">{statusLabels[st]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {isAdmin && (
                  <View>
                    <Text className="mb-1 text-xs font-semibold uppercase text-slate-500">Учебная группа</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <TouchableOpacity onPress={() => setEditGroupId(undefined)} className={`rounded-lg border px-3 py-2 ${!editGroupId ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                        <Text className="text-xs font-semibold text-slate-700">Не назначена</Text>
                      </TouchableOpacity>
                      {groups.map(group => (
                        <TouchableOpacity key={group.id} onPress={() => setEditGroupId(group.id)} className={`rounded-lg border px-3 py-2 ${editGroupId === group.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                          <Text className="text-xs font-semibold text-slate-700">{group.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Заметки и пожелания</Text>
                  <TextInput 
                    value={editNotes} 
                    onChangeText={setEditNotes} 
                    multiline 
                    numberOfLines={3} 
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-xs min-h-[80px]" 
                  />
                </View>
              </View>
            </ScrollView>

            {/* Pinned Footer with Actions */}
            <View className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setEditModal(false)} className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                <Text className="text-xs font-semibold text-slate-500">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow">
                <Text className="text-xs font-bold text-white">Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. BUY HOURS MODULE MODAL */}
      <Modal animationType="slide" transparent={true} visible={isAdmin && buyHoursModal} onRequestClose={() => setBuyHoursModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center items-center max-h-[90vh]">
            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ alignItems: 'center', width: '100%' }}>
              <ShoppingCart size={32} color="#10b981" className="mb-2" />
              <Text className="text-lg font-bold text-slate-900">Добавить оплату ученика</Text>
              <Text className="text-xs text-slate-400 mt-1 mb-6 text-center">Укажите реальную сумму и количество оплаченных занятий.</Text>
              {buyPaymentError ? <Text className="w-full mb-3 text-xs text-rose-600">{buyPaymentError}</Text> : null}

              <View className="w-full space-y-4 mb-6">
                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Оплачено занятий</Text>
                  <TextInput 
                    value={buyHoursAmount} 
                    onChangeText={setBuyHoursAmount} 
                    keyboardType="numeric" 
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-center text-lg font-bold" 
                  />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Оплачено, сом</Text>
                  <TextInput
                    value={buyPaymentAmount}
                    onChangeText={setBuyPaymentAmount}
                    keyboardType="decimal-pad"
                    placeholder="2100"
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-lg font-bold text-slate-800"
                  />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Дата оплаты</Text>
                  <TextInput
                    value={buyPaymentDate}
                    onChangeText={setBuyPaymentDate}
                    placeholder="ГГГГ-ММ-ДД"
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-sm text-slate-800"
                  />
                  <Text className="mt-1 text-[11px] text-slate-500">Действует до {isValidDate(buyPaymentDate) ? addOneMonth(buyPaymentDate) : 'через один месяц'}.</Text>
                </View>
              </View>

              <View className="flex-row justify-end w-full space-x-3 pt-2">
                <TouchableOpacity onPress={() => setBuyHoursModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 items-center">
                  <Text className="text-xs font-semibold text-slate-500">Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBuyHours} className="flex-1 py-2.5 bg-emerald-600 rounded-lg items-center shadow">
                  <Text className="text-xs font-bold text-white">Купить и зачислить</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

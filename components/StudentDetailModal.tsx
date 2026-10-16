import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ScrollView, TextInput, Linking, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, Student, updateStudent, addTransaction } from '../store';
import StudentStatusBadge from './StudentStatusBadge';
import { 
  X, User, Mail, Phone, BookOpen, Clock, Calendar, 
  DollarSign, ShoppingCart, Award, ArrowRight, MessageSquare, Plus, Check
} from 'lucide-react-native';

interface StudentDetailModalProps {
  visible: boolean;
  student: Student | null;
  onClose: () => void;
  navigation?: any;
  onScheduleLesson?: (student: Student) => void;
}

export default function StudentDetailModal({
  visible,
  student,
  onClose,
  navigation,
  onScheduleLesson,
}: StudentDetailModalProps) {
  const dispatch = useDispatch();
  const lessons = useSelector((state: RootState) => state.lessons.list);
  const transactions = useSelector((state: RootState) => state.billing.transactions);
  const allStudents = useSelector((state: RootState) => state.students.list);

  // If student updated in store, find latest version
  const currentStudent = student ? allStudents.find(s => s.id === student.id) || student : null;

  // Local state for fast hours top-up modal or notes editing
  const [showTopup, setShowTopup] = useState(false);
  const [topupHours, setTopupHours] = useState('8');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  if (!currentStudent) return null;

  // Filter lessons for this student
  const studentLessons = lessons.filter(l => l.studentId === currentStudent.id);
  // Filter transactions for this student
  const studentTransactions = transactions.filter(t => t.studentId === currentStudent.id);

  const handleTopup = () => {
    const hours = parseInt(topupHours, 10) || 0;
    if (hours <= 0) return;
    const amount = hours * 25; // standard rate $25/hr

    dispatch(addTransaction({
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      amount: amount,
      type: 'Income',
      category: 'Tuition',
      date: new Date().toISOString().split('T')[0],
      description: `Пополнение пакета занятий: ${hours} ч.`,
    }));

    dispatch(updateStudent({
      ...currentStudent,
      balance: currentStudent.balance + hours,
      totalClasses: currentStudent.totalClasses + hours,
      totalPaid: currentStudent.totalPaid + amount,
    }));

    setShowTopup(false);
    setTopupHours('8');
  };

  const handleSaveNotes = () => {
    dispatch(updateStudent({
      ...currentStudent,
      notes: notesText,
    }));
    setIsEditingNotes(false);
  };

  const startEditNotes = () => {
    setNotesText(currentStudent.notes || '');
    setIsEditingNotes(true);
  };

  const handleNavigateToStudentsTab = () => {
    onClose();
    if (navigation) {
      navigation.navigate('Students', { studentId: currentStudent.id });
    }
  };

  const handleCallStudent = async () => {
    const phoneNumber = currentStudent.phone.replace(/[^\d+]/g, '');
    if (!phoneNumber) {
      Alert.alert('Нет номера телефона', 'Добавьте номер в карточке студента.');
      return;
    }

    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert('Не удалось открыть вызов', 'Проверьте номер телефона и попробуйте ещё раз.');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-center items-center bg-black/55 p-3 md:p-6"
      >
        <Pressable
          onPress={(e) => {
            if (e && typeof (e as any).stopPropagation === 'function') {
              (e as any).stopPropagation();
            }
          }}
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100"
        >
          {/* Header Banner */}
          <View className="bg-slate-900 p-6 flex-row justify-between items-start">
            <View className="flex-row items-center gap-4 flex-1 mr-3">
              <View className="w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center shadow-md">
                <Text className="text-white text-xl font-black">
                  {currentStudent.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap mb-1">
                  <Text className="text-xl font-bold text-white">
                    {currentStudent.name}
                  </Text>
                  {/* Clickable Status Badge right in the header! */}
                  <StudentStatusBadge student={currentStudent} size="sm" />
                </View>

                <View className="flex-row items-center gap-3 flex-wrap">
                  <View className="flex-row items-center gap-1">
                    <BookOpen size={13} color="#94a3b8" />
                    <Text className="text-xs text-slate-300 font-medium">
                      Уровень: <Text className="text-indigo-300 font-bold">{currentStudent.level}</Text>
                    </Text>
                  </View>
                  <Text className="text-slate-500">•</Text>
                  <Text className="text-xs text-slate-300">
                    Категория: <Text className="text-white font-medium">{
                      currentStudent.ageGroup === 'Kids' ? 'Дети' :
                      currentStudent.ageGroup === 'Teens' ? 'Подростки' : 'Взрослые'
                    }</Text>
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Body */}
          <ScrollView className="flex-1 p-6 space-y-5 gap-5" contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Contact info strip */}
            <View className="bg-slate-50 border border-slate-200/70 p-4 rounded-xl flex-row flex-wrap justify-between items-center gap-3">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-indigo-50 items-center justify-center">
                  <Mail size={16} color="#4f46e5" />
                </View>
                <View>
                  <Text className="text-[10px] uppercase font-bold text-slate-400">Email</Text>
                  <Text className="text-xs font-semibold text-slate-800">{currentStudent.email}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCallStudent}
                accessibilityRole="button"
                accessibilityLabel={`Позвонить студенту ${currentStudent.name}`}
                className="min-h-11 flex-row items-center gap-2.5 rounded-lg"
              >
                <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center">
                  <Phone size={16} color="#059669" />
                </View>
                <View>
                  <Text className="text-[10px] uppercase font-bold text-slate-400">Телефон</Text>
                  <Text className="text-xs font-semibold text-indigo-700">{currentStudent.phone} · Позвонить</Text>
                </View>
              </TouchableOpacity>

              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center">
                  <Clock size={16} color="#d97706" />
                </View>
                <View>
                  <Text className="text-[10px] uppercase font-bold text-slate-400">Баланс часов</Text>
                  <Text className={`text-xs font-extrabold ${currentStudent.balance > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {currentStudent.balance} ч. доступно
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Metrics */}
            <View className="grid grid-cols-3 gap-3 flex-row">
              <View className="flex-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Остаток уроков</Text>
                <Text className={`text-2xl font-black mt-1 ${currentStudent.balance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {currentStudent.balance} <Text className="text-xs font-medium text-slate-500">часов</Text>
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">
                  {currentStudent.balance > 0 ? 'Готов к занятиям' : 'Требуется пополнение'}
                </Text>
              </View>

              <View className="flex-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Всего уроков</Text>
                <Text className="text-2xl font-black text-indigo-600 mt-1">
                  {currentStudent.totalClasses} <Text className="text-xs font-medium text-slate-500">часов</Text>
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">
                  История посещаемости
                </Text>
              </View>

              <View className="flex-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Всего оплачено</Text>
                <Text className="text-2xl font-black text-slate-900 mt-1">
                  ${currentStudent.totalPaid}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">
                  Суммарный доход
                </Text>
              </View>
            </View>

            {/* Status Quick Control Notice */}
            <View className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold text-indigo-950">
                  Активность студента: <Text className="text-indigo-600">{currentStudent.status === 'Active' ? 'Активен' : currentStudent.status === 'On Hold' ? 'В паузе' : 'Завершен'}</Text>
                </Text>
                <Text className="text-[11px] text-indigo-700/80 mt-0.5">
                  Нажмите на значок статуса для моментального изменения активности.
                </Text>
              </View>
              <StudentStatusBadge student={currentStudent} size="md" />
            </View>

            {/* Teacher Notes */}
            <View className="bg-white p-4 rounded-xl border border-slate-200">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center gap-1.5">
                  <MessageSquare size={14} color="#64748b" />
                  <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Заметки преподавателя
                  </Text>
                </View>
                {!isEditingNotes ? (
                  <TouchableOpacity onPress={startEditNotes}>
                    <Text className="text-xs text-indigo-600 font-semibold hover:underline">Изменить</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleSaveNotes} className="flex-row items-center gap-1 bg-indigo-600 px-2 py-0.5 rounded">
                    <Check size={12} color="#ffffff" />
                    <Text className="text-xs text-white font-semibold">Сохранить</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isEditingNotes ? (
                <Text className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                  "{currentStudent.notes || 'Заметок об успеваемости или пожеланиях пока нет. Нажмите «Изменить», чтобы добавить.'}"
                </Text>
              ) : (
                <TextInput
                  value={notesText}
                  onChangeText={setNotesText}
                  multiline
                  numberOfLines={3}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 min-h-[70px]"
                  placeholder="Добавьте примечание о прогрессе студента..."
                />
              )}
            </View>

            {/* Student's Scheduled Lessons */}
            <View className="bg-white p-4 rounded-xl border border-slate-200">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center gap-1.5">
                  <Calendar size={14} color="#64748b" />
                  <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Уроки студента ({studentLessons.length})
                  </Text>
                </View>
                {onScheduleLesson && (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onScheduleLesson(currentStudent);
                    }}
                    className="flex-row items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md hover:bg-slate-700"
                  >
                    <Plus size={12} color="#ffffff" />
                    <Text className="text-[11px] font-semibold text-white">Назначить урок</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="space-y-2 gap-2">
                {studentLessons.slice(0, 3).map((lesson) => (
                  <View
                    key={lesson.id}
                    className="flex-row justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <View>
                      <Text className="text-xs font-bold text-slate-800">{lesson.topic}</Text>
                      <Text className="text-[11px] text-slate-500 mt-0.5">
                        {lesson.date} в {lesson.time} • Преподаватель: {lesson.teacherName}
                      </Text>
                    </View>
                    <Text className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      lesson.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                      lesson.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {lesson.status === 'Completed' ? 'Проведен' : lesson.status === 'Cancelled' ? 'Отменен' : 'Запланирован'}
                    </Text>
                  </View>
                ))}

                {studentLessons.length === 0 && (
                  <Text className="text-xs text-slate-400 italic py-2 text-center">
                    Для студента пока нет запланированных уроков.
                  </Text>
                )}
              </View>
            </View>

            {/* Quick Top-up Expandable Box */}
            {showTopup && (
              <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <Text className="text-xs font-bold text-emerald-900 mb-2">
                  Пополнить баланс академических часов
                </Text>
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text className="text-[10px] text-emerald-700 font-semibold mb-1">Количество часов:</Text>
                    <TextInput
                      value={topupHours}
                      onChangeText={setTopupHours}
                      keyboardType="numeric"
                      className="bg-white border border-emerald-300 rounded-lg p-2 text-xs font-bold text-slate-800 text-center"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] text-emerald-700 font-semibold mb-1">Сумма к оплате:</Text>
                    <Text className="text-base font-extrabold text-emerald-800 mt-1">
                      ${(parseInt(topupHours, 10) || 0) * 25}
                    </Text>
                  </View>
                  <View className="flex-row gap-2 mt-4">
                    <TouchableOpacity
                      onPress={handleTopup}
                      className="bg-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-700"
                    >
                      <Text className="text-xs font-bold text-white">Зачислить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowTopup(false)}
                      className="bg-white border border-emerald-200 px-3 py-2 rounded-lg"
                    >
                      <Text className="text-xs text-slate-600">Отмена</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Bar Footer */}
          <View className="p-4 bg-slate-50 border-t border-slate-200 flex-row justify-between items-center gap-2 flex-wrap">
            <TouchableOpacity
              onPress={() => setShowTopup(!showTopup)}
              className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg flex-row items-center gap-1.5 shadow-xs"
            >
              <ShoppingCart size={14} color="#ffffff" />
              <Text className="text-xs font-bold text-white">Пополнить часы</Text>
            </TouchableOpacity>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleNavigateToStudentsTab}
                className="bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg flex-row items-center gap-1.5 shadow-xs"
              >
                <Text className="text-xs font-bold text-white">Открыть в реестре</Text>
                <ArrowRight size={14} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                className="bg-white border border-slate-300 hover:bg-slate-100 px-3.5 py-2 rounded-lg"
              >
                <Text className="text-xs font-semibold text-slate-700">Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

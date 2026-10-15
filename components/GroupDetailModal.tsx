import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Student } from '../store';
import StudentStatusBadge from './StudentStatusBadge';
import { X, Search, Users, Plus, BookOpen, Clock, ArrowRight } from 'lucide-react-native';

interface GroupDetailModalProps {
  visible: boolean;
  groupKey: string | null;
  students: Student[];
  onClose: () => void;
  onSelectStudent: (student: Student) => void;
  onAddStudentToGroup?: (groupKey: string) => void;
}

const GROUP_INFO: Record<string, { title: string; cefr: string; desc: string; color: string; badgeBg: string; textCol: string }> = {
  A1: {
    title: 'Группа A1',
    cefr: 'Beginner / Начальный',
    desc: 'Базовые основы английского языка, числительные, приветствия и повседневные фразы.',
    color: 'border-indigo-400 bg-indigo-50',
    badgeBg: 'bg-indigo-600',
    textCol: 'text-indigo-700',
  },
  A2: {
    title: 'Группа A2',
    cefr: 'Elementary / Базовый',
    desc: 'Простые предложения, базовые времена (Present, Past Simple), диалоги о покупках и семье.',
    color: 'border-cyan-400 bg-cyan-50',
    badgeBg: 'bg-cyan-600',
    textCol: 'text-cyan-700',
  },
  B1: {
    title: 'Группа B1',
    cefr: 'Intermediate / Средний',
    desc: 'Уверенная речь в путешествиях, сравнение времен, обсуждение планов и профессиональных тем.',
    color: 'border-emerald-400 bg-emerald-50',
    badgeBg: 'bg-emerald-600',
    textCol: 'text-emerald-700',
  },
  B2: {
    title: 'Группа B2',
    cefr: 'Upper-Intermediate / Выше среднего',
    desc: 'Свободное общение с носителями, подготовка к международным экзаменам (IELTS, TOEFL).',
    color: 'border-amber-400 bg-amber-50',
    badgeBg: 'bg-amber-600',
    textCol: 'text-amber-700',
  },
  C1: {
    title: 'Группа C1',
    cefr: 'Advanced / Продвинутый',
    desc: 'Академический и деловой английский, аргументация, сложные идиомы и свободные презентации.',
    color: 'border-rose-400 bg-rose-50',
    badgeBg: 'bg-rose-600',
    textCol: 'text-rose-700',
  },
};

export default function GroupDetailModal({
  visible,
  groupKey,
  students,
  onClose,
  onSelectStudent,
  onAddStudentToGroup,
}: GroupDetailModalProps) {
  const [search, setSearch] = useState('');

  if (!groupKey) return null;

  const info = GROUP_INFO[groupKey] || {
    title: `Группа ${groupKey}`,
    cefr: groupKey,
    desc: `Языковая группа уровня ${groupKey}`,
    color: 'border-indigo-400 bg-indigo-50',
    badgeBg: 'bg-indigo-600',
    textCol: 'text-indigo-700',
  };

  const matchStudentLevel = (studentLevel: string, group: string) => {
    if (!studentLevel) return false;
    const normalizedGroup = group.toUpperCase();
    const normalizedLevel = studentLevel.toUpperCase();
    return (
      normalizedLevel === normalizedGroup ||
      normalizedLevel.includes(`(${normalizedGroup})`) ||
      normalizedLevel.includes(normalizedGroup)
    );
  };

  const groupStudents = students.filter(s => matchStudentLevel(s.level, groupKey));

  const filteredGroupStudents = groupStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.toLowerCase().includes(search.toLowerCase())
  );

  const totalGroupHours = groupStudents.reduce((sum, s) => sum + (s.balance || 0), 0);
  const activeCount = groupStudents.filter(s => s.status === 'Active').length;

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
          {/* Header */}
          <View className="bg-slate-900 p-6 flex-row justify-between items-start">
            <View className="flex-row items-center gap-4 flex-1 mr-3">
              <View className={`w-14 h-14 rounded-2xl ${info.badgeBg} items-center justify-center shadow-md`}>
                <Text className="text-white text-xl font-black">{groupKey}</Text>
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap mb-1">
                  <Text className="text-xl font-bold text-white">{info.title}</Text>
                  <View className="bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                    <Text className="text-[11px] font-bold text-slate-200">{info.cefr}</Text>
                  </View>
                </View>

                <Text className="text-xs text-slate-300 leading-tight">
                  {info.desc}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Group Stats Strip */}
          <View className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 flex-row justify-between items-center flex-wrap gap-2">
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <Users size={15} color="#4f46e5" />
                <Text className="text-xs text-slate-600">
                  Всего студентов: <Text className="font-bold text-slate-900">{groupStudents.length}</Text>
                </Text>
              </View>
              <Text className="text-slate-300">|</Text>
              <Text className="text-xs text-slate-600">
                Активных: <Text className="font-bold text-emerald-600">{activeCount}</Text>
              </Text>
              <Text className="text-slate-300">|</Text>
              <View className="flex-row items-center gap-1">
                <Clock size={14} color="#059669" />
                <Text className="text-xs text-slate-600">
                  Общий баланс: <Text className="font-bold text-slate-900">{totalGroupHours} ч.</Text>
                </Text>
              </View>
            </View>

            {onAddStudentToGroup && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onAddStudentToGroup(groupKey);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 shadow-xs"
              >
                <Plus size={13} color="#ffffff" />
                <Text className="text-xs font-bold text-white">Добавить в группу</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Body */}
          <View className="p-6 flex-1 flex flex-col">
            {/* Search within group */}
            <View className="relative bg-slate-50 border border-slate-200 rounded-lg flex-row items-center px-3 mb-4">
              <Search size={15} color="#94a3b8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск по студентам группы..."
                className="flex-grow p-2.5 text-slate-700 text-xs focus:outline-none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Список студентов группы ({filteredGroupStudents.length})
            </Text>

            {/* List */}
            <ScrollView className="flex-1 space-y-2.5 gap-2.5" contentContainerStyle={{ paddingBottom: 16 }}>
              {filteredGroupStudents.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onSelectStudent(student);
                  }}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 flex-row justify-between items-center transition-all shadow-2xs"
                >
                  <View className="flex-row items-center gap-3 flex-1 mr-3">
                    <View className="w-9 h-9 rounded-full bg-indigo-100 items-center justify-center">
                      <Text className="text-xs font-extrabold text-indigo-700">
                        {student.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-800">
                        {student.name}
                      </Text>
                      <Text className="text-[11px] text-slate-400 mt-0.5">
                        {student.email} • {student.phone}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    {/* Clickable Status Badge */}
                    <StudentStatusBadge student={student} size="sm" />

                    <View className="items-end min-w-[55px]">
                      <Text className={`text-xs font-black ${student.balance > 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {student.balance} ч.
                      </Text>
                      <Text className="text-[9px] text-slate-400">остаток</Text>
                    </View>

                    <View className="w-6 h-6 rounded-full bg-slate-100 items-center justify-center">
                      <ArrowRight size={12} color="#64748b" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {filteredGroupStudents.length === 0 && (
                <View className="py-12 items-center justify-center">
                  <Users size={32} color="#cbd5e1" className="mb-2" />
                  <Text className="text-slate-500 text-xs font-medium">
                    {search ? 'Студентов по вашему запросу не найдено' : 'В этой группе пока нет студентов'}
                  </Text>
                  {onAddStudentToGroup && !search && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onAddStudentToGroup(groupKey);
                      }}
                      className="mt-3 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-lg"
                    >
                      <Text className="text-xs font-bold text-indigo-600">Зарегистрировать первого студента</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>

          {/* Footer */}
          <View className="p-4 bg-slate-50 border-t border-slate-200 flex-row justify-between items-center">
            <Text className="text-xs text-slate-500">
              Нажмите на студента, чтобы открыть его профиль
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="bg-white border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-lg"
            >
              <Text className="text-xs font-semibold text-slate-700">Закрыть</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

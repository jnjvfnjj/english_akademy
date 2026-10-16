import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, Group, addLesson, updateLessonStatus, deleteLesson, adjustBalance } from '../../store';
import { Calendar, Plus, CheckCircle, XCircle, Clock, Users, GraduationCap, Trash2 } from 'lucide-react-native';

export default function ScheduleScreen() {
  const dispatch = useDispatch();
  const lessons = useSelector((state: RootState) => state.lessons.list);
  const students = useSelector((state: RootState) => state.students.list);
  const groups = useSelector((state: RootState) => state.groups.list);

  // States
  const [filter, setFilter] = useState<'All' | 'Scheduled' | 'Completed' | 'Cancelled'>('All');
  const [scheduleModal, setScheduleModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  // Form states - Selecting GROUP instead of student
  const [selectedGroupId, setSelectedGroupId] = useState(groups.length > 0 ? groups[0].id : '');
  const [selectedGroupName, setSelectedGroupName] = useState(groups.length > 0 ? groups[0].title : '');
  const [date, setDate] = useState('2026-05-28');
  const [time, setTime] = useState('14:00');
  const [teacher, setTeacher] = useState('Елена Смирнова');
  const [topic, setTopic] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');

  const filteredLessons = lessons.filter(l => filter === 'All' || l.status === filter);

  const matchStudentGroup = (studentLevel: string, groupKey: string) => {
    if (!studentLevel || !groupKey) return false;
    const nGroup = groupKey.toUpperCase();
    const nLevel = studentLevel.toUpperCase();
    return nLevel === nGroup || nLevel.includes(`(${nGroup})`) || nLevel.includes(nGroup);
  };

  const handleOpenScheduleModal = () => {
    if (groups.length > 0) {
      setSelectedGroupId(groups[0].id);
      setSelectedGroupName(groups[0].title);
    }
    setTopic('');
    setScheduleModal(true);
  };

  const handleCreateLesson = () => {
    if (!selectedGroupName || !topic.trim()) return;

    dispatch(addLesson({
      groupId: selectedGroupId,
      groupName: selectedGroupName,
      date,
      time,
      teacherName: teacher,
      topic: topic.trim(),
      duration: 1,
      status: 'Scheduled',
      notes: ''
    }));

    setTopic('');
    setScheduleModal(false);
  };

  const handleCompleteLesson = (lesson: any) => {
    // Find target group and students
    const targetGroup = groups.find(g => g.id === lesson.groupId || g.title === lesson.groupName);
    if (targetGroup) {
      // Deduct 1 hour from all students in this group
      const groupStudents = students.filter(s => matchStudentGroup(s.level, targetGroup.key));
      groupStudents.forEach(st => {
        dispatch(adjustBalance({ id: st.id, amount: -1 }));
      });
    } else if (lesson.studentId) {
      dispatch(adjustBalance({ id: lesson.studentId, amount: -1 }));
    }

    dispatch(updateLessonStatus({
      id: lesson.id,
      status: 'Completed',
      notes: lessonNotes || 'Занятие группы успешно проведено по расписанию.'
    }));

    setDetailModal(false);
    setSelectedLesson(null);
    setLessonNotes('');
  };

  const handleCancelLesson = (lesson: any) => {
    dispatch(updateLessonStatus({
      id: lesson.id,
      status: 'Cancelled',
      notes: 'Отменено по согласованию с группой.'
    }));
    setDetailModal(false);
    setSelectedLesson(null);
    setLessonNotes('');
  };

  const handleDelete = (id: string) => {
    dispatch(deleteLesson(id));
    setDetailModal(false);
    setSelectedLesson(null);
  };

  const statusLabels: Record<string, string> = {
    All: 'Все уроки',
    Scheduled: 'Запланировано',
    Completed: 'Проведено',
    Cancelled: 'Отменено'
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 12, paddingBottom: 80, flexGrow: 1 }}>
      <View className="flex-row flex-wrap gap-3 md:gap-6 lg:flex-nowrap w-full">
      
      {/* LEFTSIDE: Main Daily List scheduler */}
      <View className="flex-1 min-w-0 md:min-w-[340px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 overflow-hidden flex flex-col">
        <View className="flex flex-row justify-between items-center mb-6 flex-wrap gap-4">
          <View>
            <Text className="text-xl font-bold text-slate-800">Расписание уроков по группам</Text>
            <Text className="text-xs text-slate-400 mt-1">
              Планирование уроков для учебных групп и учет посещаемости.
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleOpenScheduleModal}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex-row items-center gap-2 shadow"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white text-xs font-bold">Запланировать урок группы</Text>
          </TouchableOpacity>
        </View>

        {/* Tab filters */}
        <View className="flex-row bg-slate-100 rounded-lg p-1 mb-6 max-w-md">
          {(['All', 'Scheduled', 'Completed', 'Cancelled'] as const).map((t) => (
            <TouchableOpacity 
              key={t}
              onPress={() => setFilter(t)}
              className={`flex-1 py-1.5 items-center rounded-md ${filter === t ? 'bg-white shadow' : ''}`}
            >
              <Text className={`text-xs font-bold ${filter === t ? 'text-indigo-600' : 'text-slate-600'}`}>
                {statusLabels[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List of lesson scheduling */}
        <View className="gap-3 flex-1">
          {filteredLessons.map((lesson) => {
            const displayName = lesson.groupName || lesson.studentName || 'Учебная группа';
            return (
              <TouchableOpacity 
                key={lesson.id} 
                onPress={() => {
                  setSelectedLesson(lesson);
                  setLessonNotes(lesson.notes || '');
                  setDetailModal(true);
                }}
                className="p-4 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-200/80 flex-row justify-between items-center transition"
              >
                <View className="flex-row gap-3.5 items-center flex-1 pr-2">
                  <View className={`p-2.5 rounded-lg ${
                    lesson.status === 'Completed' ? 'bg-emerald-100' :
                    lesson.status === 'Cancelled' ? 'bg-rose-100' : 'bg-indigo-100'
                  }`}>
                    {lesson.status === 'Completed' ? <CheckCircle size={20} color="#059669" /> :
                     lesson.status === 'Cancelled' ? <XCircle size={20} color="#e11d48" /> :
                     <Users size={20} color="#4f46e5" />}
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-extrabold text-slate-800">{displayName}</Text>
                      <View className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        <Text className="text-[10px] font-bold text-indigo-700">Группа</Text>
                      </View>
                    </View>
                    <Text className="text-xs text-indigo-600 font-bold mt-0.5">Тема: {lesson.topic}</Text>
                    <Text className="text-xs text-slate-400 mt-0.5">Преподаватель: {lesson.teacherName}</Text>
                  </View>
                </View>

                <View className="text-right items-end">
                  <Text className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {lesson.time}
                  </Text>
                  <Text className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                    {lesson.date}
                  </Text>
                  <Text className={`text-[10px] font-bold mt-1 ${
                    lesson.status === 'Completed' ? 'text-emerald-600' :
                    lesson.status === 'Cancelled' ? 'text-rose-500' : 'text-amber-600'
                  }`}>
                    {statusLabels[lesson.status] || lesson.status}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredLessons.length === 0 && (
            <View className="py-20 items-center justify-center">
              <Calendar size={32} color="#cbd5e1" className="mb-2" />
              <Text className="text-slate-400 text-sm">Уроков в этой категории пока нет.</Text>
            </View>
          )}
        </View>
      </View>
      </View>

      {/* DETAIL MODAL */}
      <Modal animationType="fade" transparent={true} visible={detailModal} onRequestClose={() => setDetailModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            {selectedLesson && (
              <View>
                <Text className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Информация об уроке группы</Text>
                <Text className="text-xl font-bold text-slate-900 mb-1">{selectedLesson.groupName || selectedLesson.studentName}</Text>
                <Text className="text-xs text-indigo-600 font-bold mb-4">Тема занятия: {selectedLesson.topic}</Text>

                <View className="bg-slate-50 p-4 rounded-xl space-y-2.5 mb-5 border border-slate-100">
                  <View className="flex flex-row justify-between text-sm">
                    <Text className="text-slate-500 font-medium">Дата и время:</Text>
                    <Text className="text-slate-800 font-bold">{selectedLesson.date} в {selectedLesson.time}</Text>
                  </View>
                  <View className="flex flex-row justify-between text-sm">
                    <Text className="text-slate-500 font-medium">Преподаватель:</Text>
                    <Text className="text-slate-800 font-semibold">{selectedLesson.teacherName}</Text>
                  </View>
                  <View className="flex flex-row justify-between text-sm">
                    <Text className="text-slate-500 font-medium">Статус урока:</Text>
                    <Text className={`font-bold uppercase text-xs ${
                      selectedLesson.status === 'Completed' ? 'text-emerald-600' :
                      selectedLesson.status === 'Cancelled' ? 'text-rose-600' : 'text-amber-600'
                    }`}>{statusLabels[selectedLesson.status] || selectedLesson.status}</Text>
                  </View>
                </View>

                {selectedLesson.status === 'Scheduled' ? (
                  <View className="space-y-4">
                    <View>
                      <Text className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Заметки и комментарий к занятию</Text>
                      <TextInput 
                        value={lessonNotes} 
                        onChangeText={setLessonNotes} 
                        placeholder="Например: Группа успешно освоила материал темы, домашнее задание выдано."
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-xs min-h-[60px]"
                      />
                    </View>

                    {/* Completion actions */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity 
                        onPress={() => handleCancelLesson(selectedLesson)}
                        className="flex-1 py-3 bg-rose-50 border border-rose-200 rounded-lg items-center"
                      >
                        <Text className="text-rose-600 text-xs font-bold">Отменить</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleCompleteLesson(selectedLesson)}
                        className="flex-2 py-3 bg-emerald-600 rounded-lg flex-row justify-center items-center gap-2 shadow"
                      >
                        <CheckCircle size={16} color="#ffffff" />
                        <Text className="text-white text-xs font-bold">Проведено (списать часы)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="mt-2">
                    {selectedLesson.notes ? (
                      <View className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                        <Text className="text-xs text-slate-500 font-bold mb-1">Заметки преподавателя:</Text>
                        <Text className="text-xs text-slate-700">{selectedLesson.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <View className="mt-5 pt-4 border-t border-slate-100 flex-row justify-between items-center">
                  <TouchableOpacity onPress={() => handleDelete(selectedLesson.id)} className="flex-row items-center gap-1.5 p-1">
                    <Trash2 size={16} color="#ef4444" />
                    <Text className="text-xs text-red-500 font-semibold">Удалить из расписания</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setDetailModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg">
                    <Text className="text-xs text-slate-500 font-semibold">Закрыть</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* SCHEDULE LESSON MODAL - SELECT GROUP INSTEAD OF STUDENT */}
      <Modal animationType="slide" transparent={true} visible={scheduleModal} onRequestClose={() => setScheduleModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh]">
            <ScrollView showsVerticalScrollIndicator={true}>
              <Text className="text-lg font-bold text-slate-900 mb-1">Запланировать урок группы</Text>
              <Text className="text-xs text-slate-400 mb-4">
                Выберите учебную группу, для которой планируется проведение занятия
              </Text>

              <View className="space-y-4">
                {/* SELECT GROUP */}
                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    Выберите учебную группу *
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {groups.map((g) => {
                      const count = students.filter(s => matchStudentGroup(s.level, g.key)).length;
                      const isSelected = selectedGroupId === g.id;
                      return (
                        <TouchableOpacity 
                          key={g.id} 
                          onPress={() => {
                            setSelectedGroupId(g.id);
                            setSelectedGroupName(g.title);
                            if (g.teacherName) setTeacher(g.teacherName);
                          }}
                          className={`p-3 rounded-xl border flex-1 min-w-[140px] flex-row justify-between items-center ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-500 border-2 shadow-sm' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <View>
                            <Text className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                              {g.title}
                            </Text>
                            <Text className="text-[10px] text-slate-400">{g.desc || g.level}</Text>
                          </View>
                          <View className={`px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                            <Text className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                              {count} студ.
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {groups.length === 0 && (
                    <Text className="text-xs text-rose-500 p-2">Группы не найдены. Добавьте группу в разделе Учебные группы!</Text>
                  )}
                </View>

                {/* LESSON TOPIC */}
                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1 font-bold">
                    Тема урока / Материалы *
                  </Text>
                  <TextInput 
                    value={topic} 
                    onChangeText={setTopic} 
                    placeholder="Например: Разбор Present Perfect vs Past Simple и диалоги" 
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" 
                  />
                </View>

                {/* DATE & TIME */}
                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Дата урока</Text>
                    <TextInput 
                      value={date} 
                      onChangeText={setDate} 
                      placeholder="ГГГГ-ММ-ДД" 
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" 
                    />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Время урока</Text>
                    <TextInput 
                      value={time} 
                      onChangeText={setTime} 
                      placeholder="ЧЧ:ММ" 
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" 
                    />
                  </View>
                </View>

                {/* TEACHER */}
                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Преподаватель</Text>
                  <TextInput 
                    value={teacher} 
                    onChangeText={setTeacher} 
                    placeholder="Елена Смирнова" 
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" 
                  />
                </View>
              </View>

              <View className="flex-row justify-end space-x-3 mt-6 pt-2">
                <TouchableOpacity onPress={() => setScheduleModal(false)} className="px-4 py-2.5 rounded-lg border border-slate-200">
                  <Text className="text-xs font-semibold text-slate-400">Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateLesson} className="px-5 py-2.5 bg-indigo-600 rounded-lg shadow">
                  <Text className="text-xs font-bold text-white">Запланировать для группы</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

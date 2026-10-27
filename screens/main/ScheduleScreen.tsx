import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  RootState,
  addLesson,
  updateLessonStatus,
  deleteLesson,
  mapApiGroup,
  mapApiStudent,
  mapApiWeeklySchedule,
  replaceGroups,
  replaceStudents,
  replaceWeeklySchedules,
  setSyncError
} from '../../store';
import { Calendar, Plus, CheckCircle, XCircle, Clock, Users, GraduationCap, Trash2 } from 'lucide-react-native';
import { ApiError, ApiSchoolGroup, ApiStudent, ApiWeeklySchedule, apiRequest } from '../../services/api';

const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const calendarTimes = Array.from({ length: 24 }, (_, index) => {
  const hour = 8 + Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
});
const shortWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

interface ScheduleCell {
  dayOfWeek: number;
  time: string;
}

export default function ScheduleScreen() {
  const dispatch = useDispatch();
  const lessons = useSelector((state: RootState) => state.lessons.list);
  const students = useSelector((state: RootState) => state.students.list);
  const groups = useSelector((state: RootState) => state.groups.list);
  const weeklySchedules = useSelector((state: RootState) => state.weeklySchedules.list);
  const token = useSelector((state: RootState) => state.auth.token);
  const isAdmin = useSelector((state: RootState) => state.auth.user?.role === 'Admin');

  // States
  const [filter, setFilter] = useState<'All' | 'Scheduled' | 'Completed' | 'Cancelled'>('All');
  const [scheduleModal, setScheduleModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<(typeof weeklySchedules)[number] | null>(null);
  const [assignmentGroupId, setAssignmentGroupId] = useState('');
  const [assignmentCells, setAssignmentCells] = useState<ScheduleCell[]>([]);
  const [assignmentTopic, setAssignmentTopic] = useState('');
  const [assignmentDuration, setAssignmentDuration] = useState('1');
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterSaving, setRosterSaving] = useState(false);

  // Form states - Selecting GROUP instead of student
  const [selectedGroupId, setSelectedGroupId] = useState(groups.length > 0 ? groups[0].id : '');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  });
  const [time, setTime] = useState('14:00');
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
    if (groups.length === 0) return;
    setSelectedGroupId(groups[0].id);
    setTopic('');
    setScheduleModal(true);
  };

  const openAssignmentModal = (cell?: ScheduleCell) => {
    const firstGroup = groups[0];
    if (!firstGroup) return;
    setAssignmentGroupId(firstGroup.id);
    setAssignmentTopic(firstGroup.title);
    setAssignmentCells(cell ? [cell] : []);
    setAssignmentError('');
    setAssignmentModalOpen(true);
  };

  const toggleAssignmentCell = (cell: ScheduleCell) => {
    setAssignmentCells(current => current.some(selected =>
      selected.dayOfWeek === cell.dayOfWeek && selected.time === cell.time
    )
      ? current.filter(selected => selected.dayOfWeek !== cell.dayOfWeek || selected.time !== cell.time)
      : [...current, cell]);
  };

  const handleCreateLesson = () => {
    const selectedGroup = groups.find(group => group.id === selectedGroupId);
    if (!selectedGroup || !topic.trim()) return;

    dispatch(addLesson({
      groupId: selectedGroup.id,
      groupName: selectedGroup.title,
      date,
      time,
      teacherName: selectedGroup.teacherName || '',
      topic: topic.trim(),
      duration: 1,
      status: 'Scheduled',
      notes: ''
    }));

    setTopic('');
    setScheduleModal(false);
  };

  const handleCompleteLesson = (lesson: any) => {
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

  const refreshScheduleData = async () => {
    if (!token) return;
    try {
      const [scheduleData, groupData, studentData] = await Promise.all([
        apiRequest<ApiWeeklySchedule[]>('/weekly-schedules', {}, token),
        apiRequest<ApiSchoolGroup[]>('/groups', {}, token),
        apiRequest<ApiStudent[]>('/students', {}, token)
      ]);
      dispatch(replaceWeeklySchedules(scheduleData.map(mapApiWeeklySchedule)));
      dispatch(replaceGroups(groupData.map(mapApiGroup)));
      dispatch(replaceStudents(studentData.map(mapApiStudent)));
    } catch (error) {
      dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось обновить недельное расписание.'));
    }
  };

  const handleCreateWeeklyAssignments = async () => {
    if (!token || !/^\d+$/.test(assignmentGroupId) || !assignmentTopic.trim()
        || assignmentCells.length === 0
        || !Number.isFinite(Number(assignmentDuration))
        || Number(assignmentDuration) < 0.5 || Number(assignmentDuration) > 4) {
      setAssignmentError('Выберите группу, тему, хотя бы одну ячейку и длительность от 0,5 до 4 часов.');
      return;
    }
    const duplicate = assignmentCells.find(cell => weeklySchedules.some(schedule =>
      schedule.groupId === assignmentGroupId
        && schedule.dayOfWeek === cell.dayOfWeek
        && schedule.time === cell.time
    ));
    if (duplicate) {
      setAssignmentError(
        `У группы уже есть занятие: ${weekdays[duplicate.dayOfWeek - 1]}, ${duplicate.time}. Снимите эту ячейку перед сохранением.`
      );
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError('');
    try {
      const outcomes = await Promise.all(assignmentCells.map(async cell => {
        try {
          const schedule = await apiRequest<ApiWeeklySchedule>('/weekly-schedules', {
            method: 'POST',
            body: JSON.stringify({
              groupId: Number(assignmentGroupId),
              dayOfWeek: cell.dayOfWeek,
              time: cell.time,
              topic: assignmentTopic.trim(),
              duration: Number(assignmentDuration)
            })
          }, token);
          return { cell, schedule };
        } catch (error) {
          return { cell, error };
        }
      }));
      const savedSchedules = outcomes.flatMap(outcome =>
        'schedule' in outcome ? [mapApiWeeklySchedule(outcome.schedule)] : []
      );
      if (savedSchedules.length > 0) {
        dispatch(replaceWeeklySchedules([...weeklySchedules, ...savedSchedules]));
      }
      const failed = outcomes.filter(outcome => 'error' in outcome);
      if (failed.length > 0) {
        const firstError = failed[0].error;
        const reason = firstError instanceof ApiError
          ? firstError.message
          : 'Не удалось сохранить одно или несколько занятий.';
        setAssignmentCells(failed.map(outcome => outcome.cell));
        setAssignmentError(
          `Сохранено ячеек: ${savedSchedules.length}. Не сохранено: ${failed.length}. ${reason}`
        );
      } else {
        setAssignmentModalOpen(false);
        setAssignmentCells([]);
      }
      await refreshScheduleData();
    } finally {
      setAssignmentSaving(false);
    }
  };

  const updateRoster = async (studentId: string, enroll: boolean) => {
    if (!token || !selectedSlot || !/^\d+$/.test(selectedSlot.groupId) || !/^\d+$/.test(studentId)) {
      dispatch(setSyncError('Группа или ученик ещё не сохранены на сервере.'));
      return;
    }
    setRosterSaving(true);
    try {
      await apiRequest<ApiSchoolGroup>(
        `/groups/${encodeURIComponent(selectedSlot.groupId)}/students/${encodeURIComponent(studentId)}`,
        { method: enroll ? 'POST' : 'DELETE' },
        token
      );
      await refreshScheduleData();
      setSelectedSlot(current => current ? {
        ...current,
        studentIds: enroll
          ? [...new Set([...current.studentIds, studentId])]
          : current.studentIds.filter(id => id !== studentId)
      } : null);
    } catch (error) {
      dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось изменить список учеников группы.'));
    } finally {
      setRosterSaving(false);
    }
  };

  const handleDeleteWeeklySlot = async () => {
    if (!token || !selectedSlot) return;
    try {
      await apiRequest<void>(`/weekly-schedules/${encodeURIComponent(selectedSlot.id)}`, { method: 'DELETE' }, token);
      setRosterModalOpen(false);
      setSelectedSlot(null);
      await refreshScheduleData();
    } catch (error) {
      dispatch(setSyncError(error instanceof ApiError ? error.message : 'Не удалось удалить занятие из недельного расписания.'));
    }
  };

  const statusLabels: Record<string, string> = {
    All: 'Все уроки',
    Scheduled: 'Запланировано',
    Completed: 'Проведено',
    Cancelled: 'Отменено'
  };
  const selectedSlotGroup = groups.find(group => group.id === selectedSlot?.groupId);
  const rosterIds = selectedSlot?.studentIds || selectedSlotGroup?.studentIds || [];
  const rosterStudents = students.filter(student =>
    rosterIds.includes(student.id) || student.groupId === selectedSlot?.groupId
  );
  const availableStudents = students.filter(student =>
    !rosterIds.includes(student.id)
      && student.groupId !== selectedSlot?.groupId
      && student.name.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 12, paddingBottom: 80, flexGrow: 1 }}>
      <View className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
          <View>
            <Text className="text-xl font-bold text-slate-800">Недельное расписание</Text>
            <Text className="mt-1 text-xs text-slate-500">Нажмите пустую ячейку, чтобы назначить занятие; существующее занятие открывает список учеников.</Text>
          </View>
          {groups.length > 0 && (
            <TouchableOpacity
              onPress={() => openAssignmentModal()}
              className="flex-row items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2"
            >
              <Plus size={16} color="#ffffff" />
              <Text className="text-xs font-bold text-white">Назначить занятие</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View className="flex-row border-b border-slate-200 bg-slate-50">
              <View style={{ width: 76 }} className="justify-center p-2">
                <Text className="text-xs font-bold text-slate-500">Время</Text>
              </View>
              {weekdays.map(day => (
                <View key={day} style={{ width: 160 }} className="items-center justify-center border-l border-slate-200 p-2">
                  <Text className="text-xs font-bold text-slate-700">{day}</Text>
                </View>
              ))}
            </View>
            {calendarTimes.map(timeLabel => (
              <View key={timeLabel} className="flex-row border-b border-slate-100">
                <View style={{ width: 76, minHeight: 70 }} className="justify-start p-2">
                  <Text className="text-xs font-semibold text-slate-500">{timeLabel}</Text>
                </View>
                {weekdays.map((day, dayIndex) => {
                  const slots = weeklySchedules.filter(slot =>
                    slot.dayOfWeek === dayIndex + 1 && slot.time === timeLabel
                  );
                  return (
                    <View key={`${day}-${timeLabel}`} style={{ width: 160, minHeight: 70 }} className="gap-1 border-l border-slate-100 p-1">
                      {slots.length === 0 ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Назначить занятие: ${day}, ${timeLabel}`}
                          onPress={() => openAssignmentModal({ dayOfWeek: dayIndex + 1, time: timeLabel })}
                          disabled={groups.length === 0}
                          className="min-h-[60px] flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 bg-slate-50"
                        >
                          <Plus size={13} color="#6366f1" />
                          <Text className="text-[10px] font-semibold text-indigo-600">Назначить</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                      {slots.map(slot => (
                        <TouchableOpacity
                          key={slot.id}
                          onPress={() => {
                            setSelectedSlot(slot);
                            setRosterSearch('');
                            setRosterModalOpen(true);
                          }}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 p-2"
                        >
                          <Text className="text-[11px] font-extrabold text-indigo-900">{slot.groupName}</Text>
                          <Text className="mt-0.5 text-[10px] font-semibold text-indigo-700">{slot.topic}</Text>
                          <Text className="mt-0.5 text-[10px] text-slate-600">{slot.teacherName}</Text>
                          <View className="mt-1 flex-row items-center justify-between">
                            <Text className="text-[10px] font-bold text-slate-500">{slot.time}</Text>
                            <Text className="text-[10px] text-slate-500">{slot.studentIds.length} уч.</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Добавить занятие: ${day}, ${timeLabel}`}
                            onPress={() => openAssignmentModal({ dayOfWeek: dayIndex + 1, time: timeLabel })}
                            disabled={groups.length === 0}
                            className="items-center rounded-md border border-dashed border-slate-200 py-1"
                          >
                            <Text className="text-[10px] font-semibold text-indigo-600">+ Добавить</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
        {weeklySchedules.length === 0 && (
          <Text className="py-6 text-center text-sm text-slate-400">Пока нет повторяющихся занятий. Добавьте занятие, чтобы заполнить календарь.</Text>
        )}
      </View>
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
          {groups.length > 0 ? (
            <TouchableOpacity
              onPress={handleOpenScheduleModal}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex-row items-center gap-2 shadow"
            >
              <Plus size={16} color="#ffffff" />
              <Text className="text-white text-xs font-bold">Запланировать урок группы</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-xs text-slate-500">
              {isAdmin ? 'Сначала создайте учебную группу на панели управления.' : 'Вам пока не назначили учебные группы.'}
            </Text>
          )}
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
                      const count = g.studentIds
                        ? students.filter(student => g.studentIds?.includes(student.id)).length
                        : students.filter(student => !student.groupId && matchStudentGroup(student.level, g.key)).length;
                      const isSelected = selectedGroupId === g.id;
                      return (
                        <TouchableOpacity 
                          key={g.id} 
                          onPress={() => {
                            setSelectedGroupId(g.id);
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
                  <View className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Text className="text-sm font-semibold text-slate-800">
                      {groups.find(group => group.id === selectedGroupId)?.teacherName || 'Преподаватель группы'}
                    </Text>
                  </View>
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

      <Modal animationType="slide" transparent visible={weeklyModalOpen} onRequestClose={() => setWeeklyModalOpen(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <Text className="mb-1 text-lg font-bold text-slate-900">Повторяющееся занятие</Text>
            <Text className="mb-4 text-xs text-slate-500">Урок будет повторяться каждую неделю в выбранный день и час.</Text>
            <Text className="mb-1 text-xs font-semibold uppercase text-slate-500">Группа / курс</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {groups.map(group => (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => setSlotGroupId(group.id)}
                  className={`rounded-lg border px-3 py-2 ${slotGroupId === group.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                >
                  <Text className="text-xs font-semibold text-slate-700">{group.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="mb-2 text-xs font-semibold uppercase text-slate-500">День недели</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {weekdays.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSlotDay(index + 1)}
                  className={`rounded-lg border px-2.5 py-2 ${slotDay === index + 1 ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                >
                  <Text className="text-[11px] font-semibold text-slate-700">{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={slotTopic} onChangeText={setSlotTopic} placeholder="Предмет / название занятия" className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800" />
            <View className="mb-5 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold uppercase text-slate-500">Время</Text>
                <TextInput value={slotTime} onChangeText={setSlotTime} placeholder="10:00" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800" />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold uppercase text-slate-500">Длительность, ч</Text>
                <TextInput value={slotDuration} onChangeText={setSlotDuration} keyboardType="decimal-pad" placeholder="1" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800" />
              </View>
            </View>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setWeeklyModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5">
                <Text className="text-xs font-semibold text-slate-600">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleCreateWeeklySlot()} className="rounded-lg bg-indigo-600 px-5 py-2.5">
                <Text className="text-xs font-bold text-white">Сохранить в календарь</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={rosterModalOpen} onRequestClose={() => setRosterModalOpen(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            {selectedSlot && (
              <>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {weekdays[selectedSlot.dayOfWeek - 1]} · {selectedSlot.time}
                </Text>
                <Text className="mt-1 text-xl font-bold text-slate-900">{selectedSlot.groupName}</Text>
                <Text className="mt-1 text-sm font-semibold text-indigo-700">{selectedSlot.topic} · {selectedSlot.teacherName}</Text>
                <View className="my-4 border-t border-slate-100" />
                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">Ученики и остаток занятий</Text>
                <ScrollView className="max-h-56">
                  {rosterStudents.map(student => (
                    <View key={student.id} className="mb-2 flex-row items-center justify-between rounded-lg bg-slate-50 p-3">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-semibold text-slate-800">{student.name}</Text>
                        <Text className={`mt-0.5 text-xs font-bold ${student.balance <= 2 ? 'text-rose-600' : 'text-slate-500'}`}>
                          Осталось: {student.balance} занятий
                        </Text>
                      </View>
                      <TouchableOpacity
                        disabled={rosterSaving}
                        onPress={() => void updateRoster(student.id, false)}
                        className="rounded-md border border-rose-200 bg-white px-3 py-2"
                      >
                        <Text className="text-xs font-bold text-rose-600">Убрать</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {rosterStudents.length === 0 && <Text className="py-2 text-sm text-slate-400">В группе пока нет учеников.</Text>}
                </ScrollView>
                <TextInput
                  value={rosterSearch}
                  onChangeText={setRosterSearch}
                  placeholder="Найти ученика для добавления"
                  className="my-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
                />
                <ScrollView className="max-h-40">
                  {availableStudents.slice(0, 8).map(student => (
                    <TouchableOpacity
                      key={student.id}
                      disabled={rosterSaving}
                      onPress={() => void updateRoster(student.id, true)}
                      className="mb-2 flex-row items-center justify-between rounded-lg border border-slate-100 p-3"
                    >
                      <View>
                        <Text className="text-sm font-semibold text-slate-800">{student.name}</Text>
                        <Text className="text-xs text-slate-500">Осталось: {student.balance} занятий</Text>
                      </View>
                      <Plus size={16} color="#4f46e5" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View className="mt-4 flex-row justify-between">
                  {isAdmin && !lessons.some(lesson => lesson.weeklyScheduleId === selectedSlot.id) ? (
                    <TouchableOpacity onPress={() => void handleDeleteWeeklySlot()} className="rounded-lg border border-rose-200 px-3 py-2">
                      <Text className="text-xs font-semibold text-rose-600">Удалить занятие</Text>
                    </TouchableOpacity>
                  ) : <View />}
                  <TouchableOpacity onPress={() => setRosterModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2">
                    <Text className="text-xs font-semibold text-slate-600">Закрыть</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

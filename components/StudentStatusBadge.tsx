import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import { Student, updateStudent } from '../store';
import { Check, ChevronDown, CheckCircle, Clock, XCircle, X, ShieldAlert } from 'lucide-react-native';

export interface StudentStatusBadgeProps {
  student: Student;
  onStatusChange?: (newStatus: Student['status']) => void;
  size?: 'sm' | 'md' | 'lg';
  showDropdownIcon?: boolean;
  interactive?: boolean;
}

export const STATUS_CONFIG: Record<
  Student['status'],
  {
    label: string;
    sublabel: string;
    badgeBg: string;
    badgeText: string;
    dotBg: string;
    borderColor: string;
    activeBg: string;
    icon: typeof CheckCircle;
  }
> = {
  Active: {
    label: 'Активен',
    sublabel: 'Посещает уроки, баланс часов активен',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    dotBg: 'bg-emerald-500',
    borderColor: 'border-emerald-300',
    activeBg: 'bg-emerald-50',
    icon: CheckCircle,
  },
  'On Hold': {
    label: 'В паузе',
    sublabel: 'Временный перерыв, заморозка занятий',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dotBg: 'bg-amber-500',
    borderColor: 'border-amber-300',
    activeBg: 'bg-amber-50',
    icon: Clock,
  },
  Completed: {
    label: 'Завершен',
    sublabel: 'Окончил программу или архивный профиль',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    dotBg: 'bg-slate-500',
    borderColor: 'border-slate-300',
    activeBg: 'bg-slate-100',
    icon: XCircle,
  },
};

export default function StudentStatusBadge({
  student,
  onStatusChange,
  size = 'md',
  showDropdownIcon = true,
  interactive = true,
}: StudentStatusBadgeProps) {
  const dispatch = useDispatch();
  const [modalVisible, setModalVisible] = useState(false);

  const currentStatus = student.status || 'Active';
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Active;

  const handleSelectStatus = (newStatus: Student['status']) => {
    if (newStatus !== student.status) {
      const updated: Student = {
        ...student,
        status: newStatus,
      };
      dispatch(updateStudent(updated));
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    }
    setModalVisible(false);
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={(e) => {
          // Prevent click from propagating to parent student card if on web
          if (e && typeof (e as any).stopPropagation === 'function') {
            (e as any).stopPropagation();
          }
          if (interactive) setModalVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Статус: ${config.label}. Нажмите чтобы изменить`}
        className={`flex-row items-center rounded-full border border-transparent hover:border-slate-300 hover:shadow-xs transition-all ${config.badgeBg} ${sizeClasses[size]}`}
      >
        <View className={`rounded-full mr-1.5 ${config.dotBg} ${dotSizes[size]}`} />
        <Text className={`font-bold ${config.badgeText}`}>
          {config.label}
        </Text>
        {showDropdownIcon && interactive && (
          <ChevronDown
            size={size === 'sm' ? 10 : size === 'lg' ? 14 : 12}
            className={`ml-1 ${config.badgeText} opacity-75`}
            color={currentStatus === 'Active' ? '#065f46' : currentStatus === 'On Hold' ? '#92400e' : '#334155'}
          />
        )}
      </TouchableOpacity>

      {/* Status Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={interactive && modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          onPress={() => setModalVisible(false)}
          className="flex-1 justify-center items-center bg-black/50 p-4"
        >
          <Pressable
            onPress={(e) => {
              if (e && typeof (e as any).stopPropagation === 'function') {
                (e as any).stopPropagation();
              }
            }}
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100"
          >
            {/* Header */}
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-base font-bold text-slate-900">
                  Изменить активность
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  Студент: <Text className="font-semibold text-slate-800">{student.name}</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center hover:bg-slate-200"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-slate-400 mb-3 font-medium">
              Выберите статус обучения студента в системе:
            </Text>

            {/* Status Options */}
            <View className="space-y-2.5 gap-2.5">
              {(['Active', 'On Hold', 'Completed'] as const).map((statusKey) => {
                const optConfig = STATUS_CONFIG[statusKey];
                const isSelected = student.status === statusKey;
                const IconComponent = optConfig.icon;

                return (
                  <TouchableOpacity
                    key={statusKey}
                    activeOpacity={0.7}
                    onPress={() => handleSelectStatus(statusKey)}
                    className={`p-3.5 rounded-xl border flex-row items-center justify-between transition-all ${
                      isSelected
                        ? `${optConfig.activeBg} ${optConfig.borderColor} border-2 shadow-xs`
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <View className="flex-row items-center gap-3 flex-1 mr-2">
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${optConfig.badgeBg}`}>
                        <IconComponent
                          size={16}
                          color={
                            statusKey === 'Active'
                              ? '#059669'
                              : statusKey === 'On Hold'
                              ? '#d97706'
                              : '#475569'
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-bold text-slate-800">
                            {optConfig.label}
                          </Text>
                          {isSelected && (
                            <Text className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                              Текущий
                            </Text>
                          )}
                        </View>
                        <Text className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          {optConfig.sublabel}
                        </Text>
                      </View>
                    </View>

                    {isSelected ? (
                      <View className="w-6 h-6 rounded-full bg-indigo-600 items-center justify-center">
                        <Check size={14} color="#ffffff" />
                      </View>
                    ) : (
                      <View className="w-5 h-5 rounded-full border border-slate-300" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer buttons */}
            <View className="mt-5 pt-3 border-t border-slate-100 flex-row justify-end">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                <Text className="text-xs font-semibold text-slate-600">Отмена</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

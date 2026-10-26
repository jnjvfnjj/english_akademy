import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const API_BASE_URL = configuredApiBaseUrl || (__DEV__ ? 'http://localhost:8080/api' : undefined);
const TOKEN_KEY = 'english_school_staff_token';

export interface ApiStaffUser {
  email: string;
  name?: string;
  role: 'Admin' | 'Teacher';
  superAdmin: boolean;
  canViewStudentPayments?: boolean;
}

export interface ApiTeacherAccount {
  id: number;
  name: string;
  email: string;
  active: boolean;
  canViewStudentPayments: boolean;
}

export interface ApiTeacherProfile {
  name: string;
  email: string;
  role: 'Teacher';
  canViewStudentPayments: boolean;
}

export interface ApiStudent {
  id: number | string;
  name: string;
  email?: string;
  phone?: string;
  level?: string;
  balance: number;
  totalClasses: number;
  totalPaid: number;
  ageGroup: 'Kids' | 'Teens' | 'Adults';
  status: 'Active' | 'On Hold' | 'Completed';
  notes?: string;
  groupId?: number | string;
  groupName?: string;
  groupIds?: Array<number | string>;
  educationFormat?: string;
  courses?: string[];
  paymentExpiresAt?: string;
  paymentCurrency?: 'KGS' | 'USD';
  paymentDate?: string;
  paymentAmount?: number;
}

export function createStudentRequest(student: Omit<ApiStudent, 'id'> | ApiStudent): Omit<ApiStudent, 'id'> {
  return {
    name: student.name,
    email: student.email?.trim() || undefined,
    phone: student.phone,
    level: student.level,
    balance: student.balance,
    totalClasses: student.totalClasses,
    totalPaid: student.totalPaid,
    ageGroup: student.ageGroup,
    status: student.status,
    notes: student.notes,
    groupId: student.groupId && /^\d+$/.test(String(student.groupId))
      ? Number(student.groupId)
      : undefined,
    groupIds: student.groupIds?.filter(id => /^\d+$/.test(String(id))).map(Number),
    educationFormat: student.educationFormat,
    courses: student.courses,
    paymentExpiresAt: student.paymentExpiresAt,
    paymentCurrency: student.paymentCurrency,
    paymentDate: student.paymentDate,
    paymentAmount: student.paymentAmount,
  };
}

export interface ApiSchoolGroup {
  id: number | string;
  title: string;
  level: string;
  description: string;
  teacherId: number;
  teacherName: string;
  studentIds: Array<number | string>;
}

export interface ApiLesson {
  id: number | string;
  groupId?: number | string;
  groupName?: string;
  studentId?: number | string;
  studentName?: string;
  date: string;
  time: string;
  teacherName: string;
  topic: string;
  duration: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
  weeklyScheduleId?: number;
}

export interface ApiWeeklySchedule {
  id: number;
  groupId: number;
  groupName: string;
  teacherName: string;
  dayOfWeek: number;
  time: string;
  topic: string;
  duration: number;
  studentIds: number[];
}

export interface ApiPaymentReminder {
  studentId: number;
  studentName: string;
  remainingLessons: number;
  expiresAt?: string;
}

export interface StudentDeletionNotice {
  id: number;
  deletedStudentId: number;
  studentName: string;
  studentEmail: string;
  deletedBy: string;
  deletedAt: string;
}

export interface ApiTransaction {
  id: number | string;
  studentId?: number | string;
  studentName?: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: 'Tuition' | 'Salary' | 'Materials' | 'Rent' | 'Other';
  date: string;
  description: string;
  lessonsPurchased?: number;
  expiresAt?: string;
  currency?: 'KGS' | 'USD';
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'Адрес API не настроен. Укажите EXPO_PUBLIC_API_URL в переменных окружения Vercel и пересоберите сайт.'
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(`Не удалось подключиться к серверу ${API_BASE_URL}.`);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as
      | { message?: string; error?: string }
      | null;
    if (response.status === 405) {
      throw new ApiError(
        'Адрес EXPO_PUBLIC_API_URL ведёт не на API или там не развернут актуальный Java API. Укажите адрес сервера API с окончанием /api и заново соберите клиент.',
        response.status
      );
    }
    const message = body?.message || body?.error ||
      (response.status === 401
        ? 'Сессия завершена. Войдите снова.'
        : `Запрос к серверу завершился ошибкой (${response.status}).`);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function loadAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

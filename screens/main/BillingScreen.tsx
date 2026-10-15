import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, Transaction, addTransaction, updateTransaction, deleteTransaction } from '../../store';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, AlertCircle, Edit, Trash2, ShieldAlert, Lock, Check } from 'lucide-react-native';

export default function BillingScreen() {
  const dispatch = useDispatch();
  const transactions = useSelector((state: RootState) => state.billing.transactions);
  const students = useSelector((state: RootState) => state.students.list);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = currentUser?.role === 'Admin';

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');

  // Form states
  const [amount, setAmount] = useState('150');
  const [type, setType] = useState<'Income' | 'Expense'>('Income');
  const [category, setCategory] = useState<'Tuition' | 'Salary' | 'Materials' | 'Rent' | 'Other'>('Tuition');
  const [studentId, setStudentId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-05-28');

  // If user is not Admin, display access restricted screen
  if (!isAdmin) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <View className="bg-white max-w-md w-full p-8 rounded-2xl border border-slate-200 shadow-xl items-center text-center">
          <View className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 items-center justify-center mb-4">
            <Lock size={32} color="#e11d48" />
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-2">Доступ ограничен</Text>
          <Text className="text-sm text-slate-500 mb-6 text-center leading-relaxed">
            Финансовый журнал и баланс школы доступны исключительно пользователям с ролью <Text className="font-bold text-indigo-600">Администратор</Text>. Преподаватели имеют доступ к расписанию и группам.
          </Text>
          <View className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full flex-row items-center gap-3">
            <ShieldAlert size={20} color="#64748b" />
            <Text className="text-xs text-slate-600">
              Ваш текущий статус: <Text className="font-bold text-slate-800">{currentUser?.role || 'Пользователь'}</Text>
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Filter transactions to only active existing records in database
  const activeTransactions = transactions.filter(t => !t.studentId || students.some(s => s.id === t.studentId));

  // Financial aggregates
  const incomeTrans = activeTransactions.filter(t => t.type === 'Income');
  const expenseTrans = activeTransactions.filter(t => t.type === 'Expense');

  const totalIncome = incomeTrans.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTrans.reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const filteredTrans = activeTransactions.filter(t => filterType === 'All' || t.type === filterType);

  const openAddModal = () => {
    setEditingTransaction(null);
    setAmount('150');
    setType('Income');
    setCategory('Tuition');
    setStudentId(students.length > 0 ? students[0].id : '');
    setDescription('');
    setDate('2026-05-28');
    setModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setAmount(tx.amount.toString());
    setType(tx.type);
    setCategory(tx.category);
    setStudentId(tx.studentId || '');
    setDescription(tx.description);
    setDate(tx.date);
    setModalOpen(true);
  };

  const handleSaveTransaction = () => {
    if (!amount || !description) return;
    const amtNum = parseFloat(amount) || 0;
    if (amtNum <= 0) return;

    let selectedStdName = '';
    if (type === 'Income' && studentId) {
      const s = students.find(item => item.id === studentId);
      if (s) selectedStdName = s.name;
    }

    if (editingTransaction) {
      // Editing existing transaction
      const updatedTx: Transaction = {
        ...editingTransaction,
        amount: amtNum,
        type,
        category,
        studentId: type === 'Income' && studentId ? studentId : undefined,
        studentName: selectedStdName || undefined,
        date,
        description
      };
      dispatch(updateTransaction(updatedTx));
    } else {
      // Creating new transaction
      dispatch(addTransaction({
        studentId: type === 'Income' && studentId ? studentId : undefined,
        studentName: selectedStdName || undefined,
        amount: amtNum,
        type,
        category,
        date,
        description
      }));

      // If tuition, increment student hours
      if (type === 'Income' && studentId) {
        const index = students.findIndex(s => s.id === studentId);
        if (index !== -1) {
          const student = students[index];
          const hoursBought = Math.floor(amtNum / 25);
          if (hoursBought > 0) {
            dispatch({
              type: 'students/updateStudent',
              payload: {
                ...student,
                balance: student.balance + hoursBought,
                totalPaid: student.totalPaid + amtNum,
                totalClasses: student.totalClasses + hoursBought
              }
            });
          }
        }
      }
    }

    setModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    dispatch(deleteTransaction(id));
  };

  const filterTypeLabels: Record<string, string> = {
    All: 'Все операции',
    Income: 'Доходы',
    Expense: 'Расходы'
  };

  const categoryLabels: Record<string, string> = {
    Tuition: 'Обучение',
    Salary: 'Зарплата',
    Materials: 'Материалы',
    Rent: 'Аренда',
    Other: 'Другое'
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24, paddingBottom: 80, flexGrow: 1 }}>
      <View className="flex-row flex-wrap gap-6 lg:flex-nowrap w-full">
      
      {/* LEFT ASPECT: Ledger timeline */}
      <View className="flex-1 min-w-[340px] bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col">
        <View className="flex flex-row justify-between items-center mb-6 flex-wrap gap-4">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-slate-800">Финансовый журнал</Text>
              <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Text className="text-[10px] font-bold text-emerald-700">Режим Администратора</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-400 mt-1">
              Учет доходов от оплат обучения и расходов. Нажмите на иконку карандаша для редактирования записи.
            </Text>
          </View>
          <TouchableOpacity 
            onPress={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex-row items-center gap-2 shadow"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white text-xs font-bold">Внести запись</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Filters */}
        <View className="flex-row bg-slate-100 rounded-lg p-1 mb-6 max-w-xs">
          {(['All', 'Income', 'Expense'] as const).map((t) => (
            <TouchableOpacity 
              key={t}
              onPress={() => setFilterType(t)}
              className={`flex-1 py-1.5 items-center rounded-md ${filterType === t ? 'bg-white shadow' : ''}`}
            >
              <Text className={`text-xs font-bold ${filterType === t ? 'text-indigo-600' : 'text-slate-600'}`}>
                {filterTypeLabels[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List ledger */}
        <View className="gap-3 flex-1">
          {filteredTrans.map((tx) => (
            <View 
              key={tx.id}
              className="p-4 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-200/80 flex-row justify-between items-center transition-all"
            >
              <View className="flex flex-row items-center gap-4 flex-1 pr-3">
                {/* Income or expense indicator */}
                <View className={`p-2.5 rounded-full ${tx.type === 'Income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {tx.type === 'Income' ? <ArrowUpRight size={18} color="#059669" /> : <ArrowDownRight size={18} color="#e11d48" />}
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-slate-800">{tx.description}</Text>
                  {tx.studentName && (
                    <Text className="text-xs text-indigo-600 font-bold mt-0.5">Студент: {tx.studentName}</Text>
                  )}
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-xs text-slate-400">
                      Категория: {categoryLabels[tx.category] || tx.category}
                    </Text>
                    <Text className="text-slate-300">•</Text>
                    <Text className="text-xs text-slate-400 font-medium">
                      {tx.date}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                <View className="items-end mr-1">
                  <Text className={`text-sm font-black ${tx.type === 'Income' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {tx.type === 'Income' ? '+' : '-'}${tx.amount}
                  </Text>
                  <Text className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                    {tx.type === 'Income' ? 'Доход' : 'Расход'}
                  </Text>
                </View>

                {/* Edit Button */}
                <TouchableOpacity
                  onPress={() => openEditModal(tx)}
                  className="p-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg shadow-sm"
                  title="Редактировать запись"
                >
                  <Edit size={15} color="#4f46e5" />
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity
                  onPress={() => handleDeleteTransaction(tx.id)}
                  className="p-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg shadow-sm"
                  title="Удалить запись"
                >
                  <Trash2 size={15} color="#e11d48" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredTrans.length === 0 && (
            <View className="py-20 items-center justify-center">
              <DollarSign size={32} color="#cbd5e1" className="mb-2" />
              <Text className="text-slate-400 text-sm">Операций по выбранному фильтру не найдено.</Text>
            </View>
          )}
        </View>
      </View>

      {/* RIGHT PANEL: Balance calculation indicators */}
      <View className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
        <View className="space-y-6">
          <Text className="text-lg font-bold text-slate-800">Финансовая аналитика</Text>
          <Text className="text-xs text-slate-500">Live-обзор текущего операционного баланса и рентабельности школы.</Text>

          {/* Metric cards right sidebar panel */}
          <View className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-4">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-xs text-slate-400 uppercase font-semibold">Валовая выручка (доходы)</Text>
                <Text className="text-lg font-black text-emerald-600 mt-1">${totalIncome.toLocaleString()}</Text>
              </View>
              <ArrowUpRight size={24} color="#10b981" />
            </View>

            <View className="border-t border-slate-200 flex-row justify-between items-center pt-3">
              <View>
                <Text className="text-xs text-slate-400 uppercase font-semibold">Общие расходы</Text>
                <Text className="text-lg font-black text-rose-600 mt-1">${totalExpense.toLocaleString()}</Text>
              </View>
              <ArrowDownRight size={24} color="#f43f5e" />
            </View>
          </View>

          <View className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex-row justify-between items-center">
            <View>
              <Text className="text-xs text-indigo-700 uppercase font-bold">Чистая прибыль школы</Text>
              <Text className={`text-2xl font-black mt-1 ${netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                ${netProfit.toLocaleString()}
              </Text>
            </View>
            <DollarSign size={28} color="#4f46e5" />
          </View>
        </View>

        <View className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center items-center mt-6">
          <AlertCircle size={24} color="#6366f1" className="mb-1" />
          <Text className="text-xs text-slate-600 font-bold mb-1">Редактирование записей</Text>
          <Text className="text-[10px] text-slate-400 text-center">
            Администратор может в любой момент скорректировать сумму, дату, категорию или описание любой транзакции.
          </Text>
        </View>
      </View>
      </View>

      {/* MODAL FOR NEW OR EDIT TRANSACTION */}
      <Modal animationType="slide" transparent={true} visible={modalOpen} onRequestClose={() => setModalOpen(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh]">
            <ScrollView showsVerticalScrollIndicator={true}>
              <Text className="text-lg font-bold text-slate-900 mb-4">
                {editingTransaction ? 'Редактировать финансовую операцию' : 'Провести новую финансовую операцию'}
              </Text>

              <View className="space-y-4">
                <View className="flex-row bg-slate-100 rounded-lg p-1 mb-2">
                  {(['Income', 'Expense'] as const).map((t) => (
                    <TouchableOpacity 
                      key={t}
                      onPress={() => {
                        setType(t);
                        if (t === 'Expense') {
                          setCategory('Salary');
                        } else {
                          setCategory('Tuition');
                        }
                      }}
                      className={`flex-1 py-1.5 items-center rounded-md ${type === t ? 'bg-white shadow' : ''}`}
                    >
                      <Text className={`text-xs font-bold ${type === t ? 'text-indigo-600 font-semibold' : 'text-slate-600'}`}>
                        {t === 'Income' ? 'Приход (Доход)' : 'Расход'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="grid grid-cols-2 gap-4">
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Сумма ($ USD)</Text>
                    <TextInput 
                      value={amount} 
                      onChangeText={setAmount} 
                      keyboardType="numeric" 
                      placeholder="150" 
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm font-bold" 
                    />
                  </View>

                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Категория</Text>
                    <View className="flex-row flex-wrap gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      {(['Tuition', 'Salary', 'Materials', 'Rent', 'Other'] as const).map(cat => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setCategory(cat)}
                          className={`px-2 py-1 rounded text-xs ${category === cat ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                          <Text className={`text-[11px] ${category === cat ? 'text-white font-bold' : 'text-slate-700'}`}>
                            {categoryLabels[cat]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {type === 'Income' && (
                  <View>
                    <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">Студент-плательщик</Text>
                    <View className="bg-slate-50 rounded-lg p-2.5 flex-row flex-wrap gap-1 border border-slate-200">
                      {students.map((st) => (
                        <TouchableOpacity 
                          key={st.id}
                          onPress={() => setStudentId(st.id)}
                          className={`px-3 py-1.5 rounded-md ${studentId === st.id ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                          <Text className={`text-xs ${studentId === st.id ? 'text-white font-bold' : 'text-slate-700'}`}>{st.name}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity 
                        onPress={() => setStudentId('')} 
                        className={`px-3 py-1.5 rounded-md ${!studentId ? 'bg-slate-400' : 'bg-slate-200'}`}
                      >
                        <Text className={`text-xs ${!studentId ? 'text-white font-bold' : 'text-slate-700'}`}>Без студента</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Описание операции</Text>
                  <TextInput 
                    value={description} 
                    onChangeText={setDescription} 
                    placeholder="Например: Покупка пакета 10 занятий / Выплата зарплаты" 
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" 
                  />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Дата транзакции</Text>
                  <TextInput 
                    value={date} 
                    onChangeText={setDate} 
                    placeholder="2026-05-28" 
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm" 
                  />
                </View>
              </View>

              <View className="flex-row justify-end space-x-3 mt-6 pt-2">
                <TouchableOpacity 
                  onPress={() => {
                    setModalOpen(false);
                    setEditingTransaction(null);
                  }} 
                  className="px-4 py-2.5 rounded-lg border border-slate-200"
                >
                  <Text className="text-xs font-semibold text-slate-400">Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSaveTransaction} 
                  className="px-5 py-2.5 bg-indigo-600 rounded-lg flex-row items-center gap-1.5 shadow"
                >
                  <Check size={14} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">
                    {editingTransaction ? 'Сохранить изменения' : 'Провести'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

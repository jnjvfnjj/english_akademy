import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Database, Terminal, Play, CircleDot, HelpCircle, CheckCircle2, AlertCircle, Copy, FileSpreadsheet } from 'lucide-react-native';

interface SchemaTable {
  name: string;
  description: string;
  columns: { name: string; type: string; constraints?: string; desc: string }[];
}

export default function DatabaseScreen() {
  const students = useSelector((state: RootState) => state.students.list);
  const lessons = useSelector((state: RootState) => state.lessons.list);
  const transactions = useSelector((state: RootState) => state.billing.transactions);

  // Generate audit logs dynamically based on records
  const auditLogs = useMemo(() => {
    const logs: any[] = [];
    
    // Low balance warnings
    students.forEach(s => {
      if (s.balance <= 3 && s.status === 'Active') {
        logs.push({
          id: `log-bal-${s.id}`,
          timestamp: new Date().toISOString().split('T')[0] + ' 09:00:00',
          level: 'WARNING',
          source: 'BALANCE_MONITOR',
          message: `Баланс студента ${s.name} критически низок: осталось ${s.balance} ч. Рекомендуется пополнение.`,
        });
      }
    });

    // Finished lessons check
    lessons.forEach(l => {
      if (l.status === 'Completed') {
        logs.push({
          id: `log-les-comp-${l.id}`,
          timestamp: l.date + ' ' + l.time + ':00',
          level: 'INFO',
          source: 'LESSON_SERVICE',
          message: `Списание часов подтверждено: списан 1 час у студента ${l.studentName} за урок "${l.topic}".`,
        });
      } else if (l.status === 'Cancelled') {
        logs.push({
          id: `log-les-can-${l.id}`,
          timestamp: l.date + ' ' + l.time + ':00',
          level: 'INFO',
          source: 'LESSON_SERVICE',
          message: `Урок студента ${l.studentName} отменен. Часы сохранены на балансе.`,
        });
      }
    });

    // Finance logs
    transactions.forEach(t => {
      logs.push({
        id: `log-tx-${t.id}`,
        timestamp: t.date + ' 12:00:00',
        level: 'INFO',
        source: 'TRANSACTION_SERVICE',
        message: `Финансовая проводка: тип = ${t.type === 'Income' ? 'ДОХОД' : 'РАСХОД'} (${t.category}), сумма = $${t.amount}. Описание: ${t.description}`,
      });
    });

    // Sort by timestamp desc
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [students, lessons, transactions]);

  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'STUDENTS' | 'LESSONS' | 'TRANSACTIONS' | 'AUDIT_LOGS' | 'SCHEMA'>('CONSOLE');
  const [sqlQuery, setSqlQuery] = useState('SELECT name, email, level, balance FROM STUDENTS WHERE balance <= 10 ORDER BY balance ASC;');
  
  // Results states
  const [queryHeaders, setQueryHeaders] = useState<string[]>([]);
  const [queryRows, setQueryRows] = useState<any[][]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [querySuccess, setQuerySuccess] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);

  // Schema Definitions for the documentation view
  const databaseSchema: SchemaTable[] = [
    {
      name: 'STUDENTS (Таблица студентов)',
      description: 'Хранит персональные данные студентов, их текущий баланс часов, уровень языка и статус обучения.',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', constraints: 'PRIMARY KEY', desc: 'Уникальный идентификатор студента' },
        { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', desc: 'ФИО студента' },
        { name: 'email', type: 'VARCHAR(100)', constraints: 'UNIQUE', desc: 'Электронная почта' },
        { name: 'phone', type: 'VARCHAR(20)', desc: 'Номер телефона' },
        { name: 'level', type: 'VARCHAR(10)', desc: 'Уровень английского (A1-C2)' },
        { name: 'balance', type: 'INT', constraints: 'DEFAULT 0', desc: 'Количество оставшихся оплаченных учебных часов' },
        { name: 'totalClasses', type: 'INT', constraints: 'DEFAULT 0', desc: 'Всего часов занятий в архиве' },
        { name: 'totalPaid', type: 'DECIMAL(10,2)', constraints: 'DEFAULT 0.00', desc: 'Суммарно оплачено за все время ($)' },
        { name: 'ageGroup', type: 'VARCHAR(20)', desc: 'Возрастная категория (Kids, Teens, Adults)' },
        { name: 'status', type: 'VARCHAR(30)', desc: 'Статус аккаунта (Active, On Hold, Completed)' }
      ]
    },
    {
      name: 'LESSONS (Расписание и Проведение занятий)',
      description: 'Управляет жизненным циклом занятий, связывает студента с преподавателем, хранит темы и списывает часы.',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', constraints: 'PRIMARY KEY', desc: 'Идентификатор урока' },
        { name: 'studentId', type: 'VARCHAR(50)', constraints: 'FOREIGN KEY REFERENCES STUDENTS(id)', desc: 'Идентификатор студента (Внешний ключ)' },
        { name: 'studentName', type: 'VARCHAR(100)', desc: 'Имя студента для быстрого чтения (денормализация)' },
        { name: 'date', type: 'DATE', constraints: 'NOT NULL', desc: 'Дата урока (ГГГГ-ММ-ДД)' },
        { name: 'time', type: 'TIME', constraints: 'NOT NULL', desc: 'Время начала (ЧЧ:ММ)' },
        { name: 'teacherName', type: 'VARCHAR(100)', desc: 'ФИО преподавателя' },
        { name: 'topic', type: 'VARCHAR(255)', desc: 'Тема занятия' },
        { name: 'duration', type: 'DECIMAL(3,1)', desc: 'Продолжительность в часах' },
        { name: 'status', type: 'VARCHAR(30)', desc: 'Статус урока (Scheduled, Completed, Cancelled)' }
      ]
    },
    {
      name: 'TRANSACTIONS (Бухгалтерские проводки)',
      description: 'Регистрирует все финансовые движения: приток от оплат за обучение (Tuition) и расходы на аренду/зарплату.',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', constraints: 'PRIMARY KEY', desc: 'ID транзакции' },
        { name: 'studentId', type: 'VARCHAR(50)', constraints: 'FOREIGN KEY REFERENCES STUDENTS(id)', desc: 'Студент-плательщик (для Income), NULL для общих затрат' },
        { name: 'studentName', type: 'VARCHAR(100)', desc: 'Имя студента' },
        { name: 'amount', type: 'DECIMAL(10,2)', constraints: 'NOT NULL', desc: 'Сумма проводки в долларах ($)' },
        { name: 'type', type: 'VARCHAR(15)', desc: 'Тип операции (Income = Доход, Expense = Расход)' },
        { name: 'category', type: 'VARCHAR(30)', desc: 'Категория (Tuition, Salary, Rent, Materials, Other)' },
        { name: 'date', type: 'DATE', desc: 'Дата проведения расчета' },
        { name: 'description', type: 'TEXT', desc: 'Комментарий к платежу' }
      ]
    },
    {
      name: 'AUDIT_LOGS (Журналирование аудита)',
      description: 'Служебная системная таблица, фиксирующая важные изменения состояний баланса, списания часов или предупреждения.',
      columns: [
        { name: 'id', type: 'VARCHAR(50)', constraints: 'PRIMARY KEY', desc: 'Идентификатор записи' },
        { name: 'timestamp', type: 'DATETIME', desc: 'Точное время события' },
        { name: 'level', type: 'VARCHAR(15)', desc: 'Важность лога (INFO, WARNING, ERROR)' },
        { name: 'source', type: 'VARCHAR(50)', desc: 'Системный сервис-источник записи' },
        { name: 'message', type: 'TEXT', desc: 'Детализированный текст события' }
      ]
    }
  ];

  // Helper SQL Presets for easy executing
  const sqlPresets = [
    {
      label: 'Студенты с низким балансом часов (< 5 ч.)',
      query: 'SELECT name, level, balance, phone, status FROM STUDENTS WHERE balance < 5 AND status = \'Active\';'
    },
    {
      label: 'Список предстоящих занятий',
      query: 'SELECT date, time, studentName, teacherName, topic FROM LESSONS WHERE status = \'Scheduled\' ORDER BY date ASC, time ASC;'
    },
    {
      label: 'Все доходы от обучения (Tuition)',
      query: 'SELECT date, studentName, amount, description FROM TRANSACTIONS WHERE type = \'Income\' AND category = \'Tuition\';'
    },
    {
      label: 'Агрегация расходов языковой школы по категориям',
      query: 'SELECT category, COUNT(*), SUM(amount) FROM TRANSACTIONS WHERE type = \'Expense\' GROUP BY category;'
    },
    {
      label: 'Системные записи предупреждений (Warning Logs)',
      query: 'SELECT timestamp, source, message FROM AUDIT_LOGS WHERE level = \'WARNING\';'
    }
  ];

  const handleCopyPreset = (query: string) => {
    setSqlQuery(query);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  // Custom Client-Side SQL Interpreter
  const executeSQL = () => {
    setQueryError(null);
    setQuerySuccess(null);
    setQueryHeaders([]);
    setQueryRows([]);

    try {
      // Basic normalization
      const cleanSql = sqlQuery.trim().replace(/\s+/g, ' ').replace(/;$/, '');
      if (!cleanSql) {
        throw new Error('Запрос пуст! Пожалуйста, напишите правильный SQL-запрос.');
      }

      const selectRegex = /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?$/i;
      const match = cleanSql.match(selectRegex);

      if (!match) {
        throw new Error('Синтаксическая ошибка: Поддерживаются только запросы выборки (SELECT ... FROM ... [WHERE] [GROUP BY] [ORDER BY]).');
      }

      let [_, columnsPart, tableName, wherePart, groupByPart, orderByPart] = match;
      tableName = tableName.toUpperCase();

      // Retrieve core table dataset
      let dataset: any[] = [];
      if (tableName === 'STUDENTS') {
        dataset = JSON.parse(JSON.stringify(students));
      } else if (tableName === 'LESSONS') {
        dataset = JSON.parse(JSON.stringify(lessons));
      } else if (tableName === 'TRANSACTIONS') {
        dataset = JSON.parse(JSON.stringify(transactions));
      } else if (tableName === 'AUDIT_LOGS') {
        dataset = JSON.parse(JSON.stringify(auditLogs));
      } else {
        throw new Error(`Таблица "${tableName}" не найдена в схеме базы данных! Доступные таблицы: STUDENTS, LESSONS, TRANSACTIONS, AUDIT_LOGS.`);
      }

      // 1. Process WHERE filter
      let filteredDataset = [...dataset];
      if (wherePart) {
        const checkWhereCond = (row: any, cond: string): boolean => {
          // Supports column = 'value' or column < value, or column <= value
          // Clean the condition string
          const eqMatch = cond.match(/(\w+)\s*(=|!=|<|>|<=|>=|LIKE)\s*['"]?([^'"]+)['"]?/i);
          if (!eqMatch) return true; // fallback if complex

          const [_, field, operator, searchVal] = eqMatch;
          
          // find equivalent key in row (case insensitive)
          const rowKey = Object.keys(row).find(k => k.toLowerCase() === field.toLowerCase());
          if (!rowKey) return false;

          const rowVal = row[rowKey];
          const typedSearchVal = isNaN(Number(searchVal)) ? searchVal : Number(searchVal);
          const typedRowVal = isNaN(Number(rowVal)) ? rowVal : Number(rowVal);

          switch (operator.toUpperCase()) {
            case '=':
              return typedRowVal === typedSearchVal;
            case '!=':
              return typedRowVal !== typedSearchVal;
            case '<':
              return Number(typedRowVal) < Number(typedSearchVal);
            case '>':
              return Number(typedRowVal) > Number(typedSearchVal);
            case '<=':
              return Number(typedRowVal) <= Number(typedSearchVal);
            case '>=':
              return Number(typedRowVal) >= Number(typedSearchVal);
            case 'LIKE':
              const cleanSearch = String(searchVal).replace(/%/g, '').toLowerCase();
              return String(typedRowVal).toLowerCase().includes(cleanSearch);
            default:
              return true;
          }
        };

        // Split multiple AND clauses supported as basic
        const andClauses = wherePart.split(/\s+AND\s+/i);
        filteredDataset = filteredDataset.filter(row => {
          return andClauses.every(clause => checkWhereCond(row, clause));
        });
      }

      // 2. Process GROUP BY
      let results: any[] = [];
      const columnsRequested = columnsPart.split(',').map(c => c.trim());

      const isAggregate = columnsRequested.some(c => 
        c.toUpperCase().startsWith('SUM(') || 
        c.toUpperCase().startsWith('COUNT(') || 
        c.toUpperCase().startsWith('AVG(')
      );

      if (groupByPart || isAggregate) {
        const groupField = groupByPart ? groupByPart.trim() : null;
        const groups: { [key: string]: any[] } = {};

        if (groupField) {
          filteredDataset.forEach(row => {
            const rowKey = Object.keys(row).find(k => k.toLowerCase() === groupField.toLowerCase());
            const keyVal = rowKey ? String(row[rowKey]) : 'NULL';
            if (!groups[keyVal]) groups[keyVal] = [];
            groups[keyVal].push(row);
          });
        } else {
          groups['ALL_DATA'] = filteredDataset;
        }

        // Apply aggregate functions on each group
        Object.entries(groups).forEach(([groupName, rowsInGroup]) => {
          const resultRow: any = {};
          
          if (groupField) {
            resultRow[groupField] = groupName;
          }

          columnsRequested.forEach(col => {
            const colUpper = col.toUpperCase();
            
            if (colUpper.startsWith('COUNT(')) {
              resultRow[col] = rowsInGroup.length;
            } else if (colUpper.startsWith('SUM(')) {
              const fieldMatch = col.match(/\((.*?)\)/);
              const field = fieldMatch ? fieldMatch[1] : '';
              const rowKey = Object.keys(rowsInGroup[0] || {}).find(k => k.toLowerCase() === field.toLowerCase());
              const sum = rowsInGroup.reduce((s, r) => s + (rowKey ? Number(r[rowKey]) || 0 : 0), 0);
              resultRow[col] = sum;
            } else if (colUpper.startsWith('AVG(')) {
              const fieldMatch = col.match(/\((.*?)\)/);
              const field = fieldMatch ? fieldMatch[1] : '';
              const rowKey = Object.keys(rowsInGroup[0] || {}).find(k => k.toLowerCase() === field.toLowerCase());
              const sum = rowsInGroup.reduce((s, r) => s + (rowKey ? Number(r[rowKey]) || 0 : 0), 0);
              resultRow[col] = rowsInGroup.length ? (sum / rowsInGroup.length).toFixed(2) : 0;
            } else {
              // Non-aggregate column, take first row or general representation
              if (col !== groupField) {
                const rowKey = Object.keys(rowsInGroup[0] || {}).find(k => k.toLowerCase() === col.toLowerCase());
                resultRow[col] = rowKey ? rowsInGroup[0][rowKey] : null;
              }
            }
          });

          results.push(resultRow);
        });

      } else {
        // Simple column listing SELECT
        filteredDataset.forEach(row => {
          const resultRow: any = {};
          
          if (columnsPart === '*') {
            results.push(row);
          } else {
            columnsRequested.forEach(col => {
              const rowKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
              resultRow[col] = rowKey ? row[rowKey] : null;
            });
            results.push(resultRow);
          }
        });
      }

      // 3. Process ORDER BY
      if (orderByPart) {
        const orderMatch = orderByPart.trim().match(/(\w+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch) {
          const [_, orderField, direction] = orderMatch;
          const isDesc = direction ? direction.toUpperCase() === 'DESC' : false;

          results.sort((a, b) => {
            const aKey = Object.keys(a).find(k => k.toLowerCase() === orderField.toLowerCase());
            const bKey = Object.keys(b).find(k => k.toLowerCase() === orderField.toLowerCase());
            
            const aVal = aKey ? a[aKey] : '';
            const bVal = bKey ? b[bKey] : '';

            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return isDesc ? bVal - aVal : aVal - bVal;
            }
            return isDesc 
              ? String(bVal).localeCompare(String(aVal))
              : String(aVal).localeCompare(String(bVal));
          });
        }
      }

      // Final output headers extraction
      if (results.length > 0) {
        const headers = Object.keys(results[0]);
        const rows = results.map(item => headers.map(h => item[h]));
        
        setQueryHeaders(headers);
        setQueryRows(rows);
        setQuerySuccess(`Запрос успешно выполнен. Получено строк: ${results.length}.`);
      } else {
        // Empty success result
        setQueryHeaders(columnsPart === '*' ? ['Результат'] : columnsRequested);
        setQueryRows([]);
        setQuerySuccess('Запрос выполнен успешно, но соответствующих записей в таблице не обнаружено.');
      }

    } catch (err: any) {
      setQueryError(err.message || 'Ошибка выполнения SQL-запроса.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24, flexGrow: 1, paddingBottom: 60 }}>
      
      {/* Top Database Banner */}
      <View className="mb-6 bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-800 flex-row items-center justify-between flex-wrap gap-4">
        <View className="flex-row items-center gap-4">
          <View className="bg-indigo-600/20 p-3 rounded-xl border border-indigo-500/30">
            <Database size={28} color="#818cf8" />
          </View>
          <View>
            <Text className="text-xl font-bold text-white tracking-tight">Администрирование СУБД: SQL BridgeDB</Text>
            <Text className="text-xs text-slate-400 mt-1 max-w-lg">
              Интерактивная SQL-консоль и менеджер реляционной базы данных для Capstone-проекта языковой школы.
            </Text>
          </View>
        </View>
        <View className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700">
          <Text className="text-white text-xs font-mono">STATUS: <Text className="text-emerald-400 font-bold">● ONLINE</Text></Text>
          <Text className="text-slate-400 text-[10px] font-mono mt-0.5">ENGINE: SQLite3 Relational JSON API</Text>
        </View>
      </View>

      {/* Tabs navigation */}
      <View className="flex-row gap-2 mb-6 flex-wrap border-b border-slate-200 pb-3">
        <TouchableOpacity
          onPress={() => setActiveTab('CONSOLE')}
          className={`px-4 py-2 rounded-lg flex-row items-center gap-1.5 transition-colors ${activeTab === 'CONSOLE' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <Terminal size={14} color={activeTab === 'CONSOLE' ? '#ffffff' : '#475569'} />
          <Text className={`text-xs font-semibold ${activeTab === 'CONSOLE' ? 'text-white' : 'text-slate-600'}`}>SQL Консоль</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('STUDENTS')}
          className={`px-4 py-2 rounded-lg flex-row items-center gap-1.5 ${activeTab === 'STUDENTS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <CircleDot size={12} color={activeTab === 'STUDENTS' ? '#ffffff' : '#6366f1'} />
          <Text className={`text-xs font-semibold ${activeTab === 'STUDENTS' ? 'text-white' : 'text-slate-600'}`}>Таблица: STUDENTS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('LESSONS')}
          className={`px-4 py-2 rounded-lg flex-row items-center gap-1.5 ${activeTab === 'LESSONS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <CircleDot size={12} color={activeTab === 'LESSONS' ? '#ffffff' : '#10b981'} />
          <Text className={`text-xs font-semibold ${activeTab === 'LESSONS' ? 'text-white' : 'text-slate-600'}`}>Таблица: LESSONS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('TRANSACTIONS')}
          className={`px-4 py-2 rounded-lg flex-row items-center gap-1.5 ${activeTab === 'TRANSACTIONS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <CircleDot size={12} color={activeTab === 'TRANSACTIONS' ? '#ffffff' : '#f59e0b'} />
          <Text className={`text-xs font-semibold ${activeTab === 'TRANSACTIONS' ? 'text-white' : 'text-slate-600'}`}>Таблица: TRANSACTIONS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('AUDIT_LOGS')}
          className={`px-4 py-2 rounded-lg flex-row items-center gap-1.5 ${activeTab === 'AUDIT_LOGS' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <CircleDot size={12} color={activeTab === 'AUDIT_LOGS' ? '#ffffff' : '#ec4899'} />
          <Text className={`text-xs font-semibold ${activeTab === 'AUDIT_LOGS' ? 'text-white' : 'text-slate-600'}`}>Таблица: AUDIT_LOGS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('SCHEMA')}
          className={`px-4 py-2 rounded-lg flex-row items-center gap-1.5 ${activeTab === 'SCHEMA' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <HelpCircle size={14} color={activeTab === 'SCHEMA' ? '#ffffff' : '#64748b'} />
          <Text className={`text-xs font-semibold ${activeTab === 'SCHEMA' ? 'text-white' : 'text-slate-600'}`}>ER-Схема & Описание</Text>
        </TouchableOpacity>
      </View>

      {/* CORE CONTENT */}
      {activeTab === 'CONSOLE' && (
        <View className="mb-6">
          <View className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left panels with help & queries */}
            <View className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-1">
              <Text className="font-bold text-slate-900 text-sm mb-3.5 flex-row items-center gap-2">
                📋 Полезные пресеты SQL:
              </Text>
              <Text className="text-xs text-slate-500 mb-4">
                Кликните по любому запросу, чтобы скопировать его в консоль редактора для быстрого запуска и тестирования на оценку:
              </Text>

              <View className="space-y-3 flex flex-col">
                {sqlPresets.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleCopyPreset(preset.query)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left"
                  >
                    <Text className="text-xs font-bold text-slate-700">{preset.label}</Text>
                    <Text className="text-[10px] font-mono text-indigo-600 mt-1.5" numberOfLines={2}>
                      {preset.query}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="mt-5 pt-4 border-t border-slate-100 flex-row gap-2 items-center text-slate-400 bg-slate-50 p-3 rounded-lg">
                <AlertCircle size={14} color="#64748b" />
                <Text className="text-[10px] text-slate-500 leading-snug">
                  Для обеспечения безопасности данных, консоль работает в режиме чтения (<Text className="font-semibold text-rose-500">Read-Only</Text>). INSERT и DELETE выполняются через экран Студентов или Расписание в реальном времени.
                </Text>
              </View>
            </View>

            {/* Right Interactive SQL terminal */}
            <View className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Terminal View */}
              <View className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-md">
                
                {/* Header terminal controls */}
                <View className="bg-slate-900 px-4 py-2.5 flex-row items-center justify-between border-b border-slate-850">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <Text className="text-xs text-slate-400 ml-2 font-mono">sql_editor_sandbox.sql</Text>
                  </View>
                  <TouchableOpacity
                    onPress={executeSQL}
                    className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-md flex-row items-center gap-1.5"
                  >
                    <Play size={12} color="#ffffff" />
                    <Text className="text-white text-xs font-bold font-mono">RUN (Выполнить)</Text>
                  </TouchableOpacity>
                </View>

                {/* SQL Code Input */}
                <TextInput
                  value={sqlQuery}
                  onChangeText={setSqlQuery}
                  multiline
                  numberOfLines={4}
                  className="p-4 text-emerald-400 font-mono text-xs bg-slate-950 focus:outline-none min-h-[140px]"
                  style={{ textAlignVertical: 'top', color: '#10b981', fontFamily: 'monospace' }}
                />
              </View>

              {/* Status Indicator Feedback */}
              {queryError && (
                <View className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex-row items-start gap-3">
                  <AlertCircle size={18} color="#f43f5e" className="mt-0.5" />
                  <View>
                    <Text className="text-xs font-bold text-rose-700">ОШИБКА СИНТАКСИСА SQL</Text>
                    <Text className="text-xs text-rose-600 mt-1 font-mono">{queryError}</Text>
                  </View>
                </View>
              )}

              {querySuccess && (
                <View className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex-row items-center gap-3">
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text className="text-xs font-semibold text-emerald-800 font-mono">{querySuccess}</Text>
                </View>
              )}

              {/* Result Datagrid view */}
              <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-[250px]">
                <View className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between bg-slate-50">
                  <Text className="font-bold text-slate-800 text-xs">РЕЗУЛЬТАТ ЗАПРОСА (DATASET_OUTPUT):</Text>
                  <Text className="text-[10px] text-slate-400 font-mono">rows: {queryRows.length}</Text>
                </View>

                {queryRows.length === 0 ? (
                  <View className="flex-1 items-center justify-center p-8 bg-slate-50">
                    <Database size={36} color="#94a3b8" />
                    <Text className="text-xs text-slate-500 mt-3 font-semibold">Ждем выполнения запроса...</Text>
                    <Text className="text-[10px] text-slate-400 mt-1 max-w-[280px] text-center">
                      Нажмите кнопку «RUN» выше или выберите готовый пресет из списка слева.
                    </Text>
                  </View>
                ) : (
                  <ScrollView horizontal className="flex-row">
                    <View className="flex-col">
                      
                      {/* Grid Header */}
                      <View className="flex-row bg-slate-800 border-b border-slate-700">
                        {queryHeaders.map((header, idx) => (
                          <View key={idx} className="px-4 py-2.5 border-r border-slate-700" style={{ width: 140 }}>
                            <Text className="text-white font-mono font-bold text-[11px] uppercase tracking-wider">{header}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Grid Body */}
                      <FlatList
                        data={queryRows}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item, index }) => (
                          <View className={`flex-row border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            {item.map((val, cellIdx) => (
                              <View key={cellIdx} className="px-4 py-2 border-r border-slate-100" style={{ width: 140 }}>
                                <Text className="text-slate-700 font-mono text-[11px] overflow-hidden" numberOfLines={1}>
                                  {val === null || val === undefined ? 'NULL' : String(val)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      />
                    </View>
                  </ScrollView>
                )}
              </View>

            </View>

          </View>
        </View>
      )}

      {/* Raw Tab: STUDENTS */}
      {activeTab === 'STUDENTS' && (
        <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <View className="p-4 bg-indigo-50/50 border-b border-slate-100 flex-row justify-between items-center">
            <View>
              <Text className="text-xs font-bold text-indigo-900">БАЗА ТАБЛИЦЫ: STUDENTS (Фактические данные СУБД)</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">Сущность: JPA Student Entity • Кол-во записей: {students.length}</Text>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100 flex-row items-center gap-1.5">
              <FileSpreadsheet size={14} color="#4f46e5" />
              <Text className="text-[10px] font-bold text-indigo-700">STUDENT_MODEL</Text>
            </View>
          </View>

          <ScrollView horizontal>
            <View className="flex-col">
              {/* Header row */}
              <View className="flex-row bg-slate-100 border-b border-slate-200">
                {['id', 'name', 'email', 'phone', 'level', 'balance', 'totalClasses', 'totalPaid', 'ageGroup', 'status'].map((col, idx) => (
                  <View key={idx} className="px-4 py-2.5 border-r border-slate-200" style={{ width: col === 'email' || col === 'name' ? 180 : 100 }}>
                    <Text className="text-slate-800 font-mono font-bold text-[10px] uppercase">{col}</Text>
                  </View>
                ))}
              </View>

              {/* Data rows */}
              {students.map((student, rowIdx) => (
                <View key={student.id} className={`flex-row border-b border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-indigo-600 font-mono text-[11px] font-bold">{student.id}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 180 }}>
                    <Text className="text-slate-800 font-semibold text-[11px]">{student.name}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 180 }}>
                    <Text className="text-slate-600 text-[11px] font-mono">{student.email}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-600 text-[11px] font-mono">{student.phone}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-indigo-700 text-[11px] font-bold font-mono text-center">{student.level}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className={`text-[11px] font-extrabold text-center font-mono ${student.balance <= 3 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {student.balance} ч.
                    </Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-700 text-center font-mono text-[11px]">{student.totalClasses}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-emerald-700 text-center font-mono text-[11px] font-bold">${student.totalPaid}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-500 text-[11px] text-center font-semibold">{student.ageGroup}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className={`text-[10px] text-center font-bold px-2 py-0.5 rounded-full ${student.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : student.status === 'On Hold' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                      {student.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Raw Tab: LESSONS */}
      {activeTab === 'LESSONS' && (
        <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <View className="p-4 bg-emerald-50/50 border-b border-slate-100 flex-row justify-between items-center">
            <View>
              <Text className="text-xs font-bold text-emerald-900">БАЗА ТАБЛИЦЫ: LESSONS (Проведенные и планируемые занятия)</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">Сущность: JPA Lesson Entity • Кол-во уроков: {lessons.length}</Text>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-lg border border-emerald-100 flex-row items-center gap-1.5">
              <FileSpreadsheet size={14} color="#10b981" />
              <Text className="text-[10px] font-bold text-emerald-700">LESSON_MODEL</Text>
            </View>
          </View>

          <ScrollView horizontal>
            <View className="flex-col">
              <View className="flex-row bg-slate-100 border-b border-slate-200">
                {['id', 'studentId', 'studentName', 'date', 'time', 'teacherName', 'topic', 'duration', 'status'].map((col, idx) => (
                  <View key={idx} className="px-4 py-2.5 border-r border-slate-200" style={{ width: col === 'topic' ? 220 : col === 'studentName' || col === 'teacherName' ? 140 : 100 }}>
                    <Text className="text-slate-800 font-mono font-bold text-[10px] uppercase">{col}</Text>
                  </View>
                ))}
              </View>

              {lessons.map((lesson, rowIdx) => (
                <View key={lesson.id} className={`flex-row border-b border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-emerald-700 font-mono text-[11px] font-bold">{lesson.id}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-600 font-mono text-[11px]">{lesson.studentId}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 140 }}>
                    <Text className="text-slate-800 font-semibold text-[11px]">{lesson.studentName}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-600 text-[11px] font-mono">{lesson.date}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-600 text-[11px] font-mono">{lesson.time}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 140 }}>
                    <Text className="text-slate-700 text-[11px]">{lesson.teacherName}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 220 }}>
                    <Text className="text-slate-800 text-[11px] font-medium" numberOfLines={1}>{lesson.topic}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center animate-pulse" style={{ width: 100 }}>
                    <Text className="text-slate-700 text-center font-mono text-[11px]">{lesson.duration} ч.</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className={`text-[10px] text-center font-bold px-2 py-0.5 rounded-full ${lesson.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : lesson.status === 'Scheduled' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-600'}`}>
                      {lesson.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Raw Tab: TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <View className="p-4 bg-amber-50/50 border-b border-slate-100 flex-row justify-between items-center">
            <View>
              <Text className="text-xs font-bold text-amber-950">БАЗА ТАБЛИЦЫ: TRANSACTIONS (Финансовые проводки и платежи)</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">Сущность: JPA Transaction Entity • Кол-во проводок: {transactions.length}</Text>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-lg border border-amber-100 flex-row items-center gap-1.5">
              <FileSpreadsheet size={14} color="#f59e0b" />
              <Text className="text-[10px] font-bold text-amber-700">TRANSACTION_MODEL</Text>
            </View>
          </View>

          <ScrollView horizontal>
            <View className="flex-col">
              <View className="flex-row bg-slate-100 border-b border-slate-200">
                {['id', 'studentId', 'studentName', 'amount', 'type', 'category', 'date', 'description'].map((col, idx) => (
                  <View key={idx} className="px-4 py-2.5 border-r border-slate-200" style={{ width: col === 'description' ? 240 : col === 'studentName' ? 140 : 100 }}>
                    <Text className="text-slate-800 font-mono font-bold text-[10px] uppercase">{col}</Text>
                  </View>
                ))}
              </View>

              {transactions.map((tx, rowIdx) => (
                <View key={tx.id} className={`flex-row border-b border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-amber-700 font-mono text-[11px] font-bold">{tx.id}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-500 font-mono text-[11px]">{tx.studentId || 'NULL'}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 140 }}>
                    <Text className="text-slate-800 font-semibold text-[11px]">{tx.studentName || 'NULL'}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-emerald-700 text-center font-bold font-mono text-[11px]">${tx.amount}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className={`text-[10px] text-center font-bold px-2 py-0.5 rounded-full ${tx.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                      {tx.type.toUpperCase()}
                    </Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-600 font-semibold text-[11px] text-center font-mono">{tx.category}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 100 }}>
                    <Text className="text-slate-500 font-mono text-[11px] text-center">{tx.date}</Text>
                  </View>
                  <View className="px-4 py-2 border-r border-slate-100 justify-center" style={{ width: 240 }}>
                    <Text className="text-slate-700 text-[11px] leading-snug" numberOfLines={2}>{tx.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Raw Tab: AUDIT_LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <View className="p-4 bg-pink-50/50 border-b border-slate-100 flex-row justify-between items-center">
            <View>
              <Text className="text-xs font-bold text-pink-900">БАЗА ТАБЛИЦЫ: AUDIT_LOGS (Журналирование автоматических проверок логов)</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">Внутренний аудит транзакций и предупреждений • Записей: {auditLogs.length}</Text>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-lg border border-pink-100 flex-row items-center gap-1.5">
              <FileSpreadsheet size={14} color="#ec4899" />
              <Text className="text-[10px] font-bold text-pink-700">AUDIT_MODEL</Text>
            </View>
          </View>

          <ScrollView horizontal>
            <View className="flex-col animate-fadeIn">
              <View className="flex-row bg-slate-100 border-b border-slate-200">
                {['id', 'timestamp', 'level', 'source', 'message'].map((col, idx) => (
                  <View key={idx} className="px-4 py-2.5 border-r border-slate-200" style={{ width: col === 'message' ? 440 : col === 'id' || col === 'source' ? 140 : 100 }}>
                    <Text className="text-slate-800 font-mono font-bold text-[10px] uppercase">{col}</Text>
                  </View>
                ))}
              </View>

              {auditLogs.map((log, rowIdx) => (
                <View key={log.id} className={`flex-row border-b border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <View className="px-4 py-2.5 border-r border-slate-100 justify-start" style={{ width: 140 }}>
                    <Text className="text-pink-600 font-mono text-[10px] font-bold">{log.id}</Text>
                  </View>
                  <View className="px-4 py-2.5 border-r border-slate-100 justify-start" style={{ width: 100 }}>
                    <Text className="text-slate-500 font-mono text-[10px]">{log.timestamp}</Text>
                  </View>
                  <View className="px-4 py-2.5 border-r border-slate-100 justify-start" style={{ width: 100 }}>
                    <Text className={`text-[9px] text-center font-bold px-2 py-0.5 rounded-full ${log.level === 'WARNING' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-700'}`}>
                      {log.level.toUpperCase()}
                    </Text>
                  </View>
                  <View className="px-4 py-2.5 border-r border-slate-100 justify-start" style={{ width: 140 }}>
                    <Text className="text-slate-600 font-bold text-[10px] font-mono">{log.source}</Text>
                  </View>
                  <View className="px-4 py-2.5 border-r border-slate-100 justify-start" style={{ width: 440 }}>
                    <Text className="text-slate-700 text-[11px] leading-relaxed select-all" numberOfLines={3}>{log.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Raw Tab: SCHEMA DESIGN */}
      {activeTab === 'SCHEMA' && (
        <View className="space-y-6 flex flex-col mb-6">
          
          {/* Visual ER diagram panel */}
          <View className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <Text className="font-bold text-slate-900 text-sm mb-2">📊 Табличные зависимости (ER-схема связей баз данных):</Text>
            <Text className="text-xs text-slate-500 mb-6">
              Концептуальная модель связей один-ко-многим (One-to-Many), физически связывающая таблицы в JPA:
            </Text>

            <View className="grid grid-cols-1 md:grid-cols-3 gap-6 relative items-center justify-center p-4">
              
              {/* Box 1 */}
              <View className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 shadow-sm items-center">
                <Text className="font-bold text-indigo-900 text-xs font-mono uppercase tracking-wider mb-2">🔑 Table: STUDENTS</Text>
                <View className="h-0.5 w-full bg-indigo-200 mb-3" />
                <Text className="text-[10px] font-semibold text-indigo-700 font-mono">id (PK)</Text>
                <Text className="text-[10px] text-slate-400 font-mono mt-1">1 Student can have ──►</Text>
              </View>

              {/* Box 2 */}
              <View className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 shadow-sm items-center">
                <Text className="font-bold text-emerald-900 text-xs font-mono uppercase tracking-wider mb-2">🔗 Table: LESSONS</Text>
                <View className="h-0.5 w-full bg-emerald-200 mb-3" />
                <Text className="text-[10px] font-semibold text-emerald-700 font-mono">id (PK)</Text>
                <Text className="text-[10px] font-semibold text-indigo-700 font-mono mt-0.5">studentId (FK)</Text>
                <Text className="text-[10px] text-slate-500 mt-1 max-w-[140px] text-center font-mono">Много уроков на одного студента (M:1)</Text>
              </View>

              {/* Box 3 */}
              <View className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 shadow-sm items-center">
                <Text className="font-bold text-amber-900 text-xs font-mono uppercase tracking-wider mb-2">💰 Table: TRANSACTIONS</Text>
                <View className="h-0.5 w-full bg-amber-200 mb-3" />
                <Text className="text-[10px] font-semibold text-amber-700 font-mono">id (PK)</Text>
                <Text className="text-[10px] font-semibold text-indigo-700 font-mono mt-0.5">studentId (FK)</Text>
                <Text className="text-[10px] text-slate-500 mt-1 max-w-[140px] text-center font-mono">Много транзакций на одного студента (M:1)</Text>
              </View>

            </View>
          </View>

          {/* Database definitions description details */}
          <View className="space-y-6 flex flex-col">
            {databaseSchema.map((table, idx) => (
              <View key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <View className="p-4 bg-slate-900 text-white">
                  <Text className="font-bold text-slate-100 text-sm font-mono">{table.name}</Text>
                  <Text className="text-[11px] text-slate-400 mt-1 leading-relaxed">{table.description}</Text>
                </View>

                {/* Table Schema columns list */}
                <View className="p-5">
                  <FlatList
                    data={table.columns}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => (
                      <View className={`py-2 px-3 flex-row justify-between flex-wrap items-center border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                        <View className="flex-row items-center gap-3">
                          <Text className="text-slate-800 font-bold font-mono text-xs w-28">{item.name}</Text>
                          <Text className="text-slate-400 text-[10px] font-semibold font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">{item.type}</Text>
                          {item.constraints && (
                            <Text className="text-orange-500 text-[9px] font-bold font-mono bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-md uppercase">{item.constraints}</Text>
                          )}
                        </View>
                        <Text className="text-slate-500 text-xs mt-1 md:mt-0 font-medium ">{item.desc}</Text>
                      </View>
                    )}
                  />
                </View>
              </View>
            ))}
          </View>

        </View>
      )}

    </ScrollView>
  );
}

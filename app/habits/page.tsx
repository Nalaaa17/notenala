"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Flame, Trophy,
  BarChart2, Loader2, X, CheckSquare, Target, Calendar,
  Zap, TrendingUp, Bell, BellOff, Clock,
} from 'lucide-react';

// ─────────────────────────────── Types ───────────────────────────────
interface Habit {
  id: number;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  reminder_time?: string | null;
}

interface HabitLog {
  id: number;
  habit_id: number;
  user_id: string;
  log_date: string;
}

// ─────────────────────────────── Constants ───────────────────────────────
const HABIT_ICONS = [
  '🏃‍♂️', '💧', '📚', '🧘‍♂️', '💊', '🎸', '✍️', '🥗', '😴', '🏋️',
  '🎯', '🧹', '💻', '🍎', '☕', '🚶', '🙏', '📝', '🎨', '🌿',
  '🛁', '🚴', '🎵', '📖', '💪', '🥛', '🧠', '🌅', '🧪', '⭐',
  '🫁', '🦷', '🥦', '🧘', '🎤', '🎹', '🖊️', '🏊', '🧗', '🌙',
];

const HABIT_COLORS = ['emerald', 'blue', 'purple', 'rose', 'amber', 'cyan'] as const;
type HabitColor = typeof HABIT_COLORS[number];

interface ColorConfig {
  text: string;
  bg: string;
  bgMuted: string;
  border: string;
  heatmap: string[];
}

const COLOR_CONFIG: Record<HabitColor, ColorConfig> = {
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500',
    bgMuted: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    heatmap: ['bg-gray-800/50', 'bg-emerald-900/80', 'bg-emerald-700/80', 'bg-emerald-500', 'bg-emerald-400'],
  },
  blue: {
    text: 'text-blue-400',
    bg: 'bg-blue-500',
    bgMuted: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    heatmap: ['bg-gray-800/50', 'bg-blue-900/80', 'bg-blue-700/80', 'bg-blue-500', 'bg-blue-400'],
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-500',
    bgMuted: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    heatmap: ['bg-gray-800/50', 'bg-purple-900/80', 'bg-purple-700/80', 'bg-purple-500', 'bg-purple-400'],
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-500',
    bgMuted: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    heatmap: ['bg-gray-800/50', 'bg-rose-900/80', 'bg-rose-700/80', 'bg-rose-500', 'bg-rose-400'],
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500',
    bgMuted: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    heatmap: ['bg-gray-800/50', 'bg-amber-900/80', 'bg-amber-700/80', 'bg-amber-500', 'bg-amber-400'],
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500',
    bgMuted: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    heatmap: ['bg-gray-800/50', 'bg-cyan-900/80', 'bg-cyan-700/80', 'bg-cyan-500', 'bg-cyan-400'],
  },
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// ─────────────────────────────── Utility Functions ───────────────────────────────
function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

function getTodayStr(): string {
  return toLocalDateStr(new Date());
}

/** Build an array of the last 365 date strings, oldest first */
function buildLast365Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toLocalDateStr(d));
  }
  return days;
}

/**
 * Group flat date array into week columns (Sun-Sat).
 * Pads the first week with nulls so columns always start on Sunday.
 */
function buildHeatmapWeeks(days: string[]): (string | null)[][] {
  const firstDow = new Date(days[0]).getDay(); // 0=Sun, 6=Sat
  const padded: (string | null)[] = Array(firstDow).fill(null).concat(days as (string | null)[]);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}

/** Count consecutive days going backwards from startDate that exist in logSet */
function calcCurrentStreak(logSet: Set<string>, today: string): number {
  const todayDate = new Date(today);
  // If today is not done, start counting from yesterday
  const startDate = logSet.has(today) ? todayDate : new Date(todayDate.setDate(todayDate.getDate() - 1));

  let streak = 0;
  const check = new Date(startDate);
  while (true) {
    const ds = toLocalDateStr(check);
    if (logSet.has(ds)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Find the longest consecutive day run in an ascendingly sorted list of date strings */
function calcBestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

// ─────────────────────────────── Month Labels Component ───────────────────────────────
function MonthLabels({ weeks }: { weeks: (string | null)[][] }) {
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDate = week.find((d) => d !== null);
    if (!firstDate) return;
    const month = new Date(firstDate).getMonth();
    if (month !== lastMonth) {
      labels.push({ label: MONTH_NAMES[month], weekIndex: wi });
      lastMonth = month;
    }
  });

  return (
    <div className="relative h-4 mb-1.5" style={{ minWidth: `${weeks.length * 13}px` }}>
      {labels.map(({ label, weekIndex }) => (
        <span
          key={`${label}-${weekIndex}`}
          className="absolute text-[10px] text-gray-500 font-medium select-none"
          style={{ left: `${weekIndex * 13}px` }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────── Heatmap Grid Component ───────────────────────────────
interface HeatmapProps {
  weeks: (string | null)[][];
  todayStr: string;
  getCellClass: (dateStr: string) => string;
  getTooltip: (dateStr: string) => string;
}

function HeatmapGrid({ weeks, todayStr, getCellClass, getTooltip }: HeatmapProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <MonthLabels weeks={weeks} />
      <div className="flex gap-[3px]" style={{ minWidth: `${weeks.length * 13}px` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((dateStr, di) => {
              if (!dateStr) return <div key={di} className="w-[11px] h-[11px] rounded-sm opacity-0" />;
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={di}
                  title={getTooltip(dateStr)}
                  className={`w-[11px] h-[11px] rounded-sm transition-all duration-300 cursor-default ${getCellClass(dateStr)} ${
                    isToday ? 'ring-1 ring-white/60 ring-offset-1 ring-offset-gray-900' : ''
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────── Main Page Component ───────────────────────────────
export default function HabitsPage() {
  const [user, setUser] = useState<any>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toggle loading state per habit ID
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // New habit form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('⭐');
  const [newHabitColor, setNewHabitColor] = useState<HabitColor>('emerald');
  const [newHabitReminderTime, setNewHabitReminderTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // UI state
  const [expandedHabit, setExpandedHabit] = useState<number | null>(null);
  const [reminderEditHabitId, setReminderEditHabitId] = useState<number | null>(null);
  const [reminderInput, setReminderInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const notifiedToday = useRef<Map<number, string>>(new Map());

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load data ──
  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        window.location.href = '/login';
        return;
      }
      setUser(user);

      const [{ data: habitsData }, { data: logsData }] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', (() => {
            const d = new Date();
            d.setDate(d.getDate() - 364);
            return toLocalDateStr(d);
          })()),
      ]);

      setHabits(habitsData || []);
      setLogs(logsData || []);
      setIsLoading(false);
    };
    load();
  }, []);

  // ── Derived / memoized data ──
  const todayStr = useMemo(() => getTodayStr(), []);
  const last365 = useMemo(() => buildLast365Days(), []);
  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(last365), [last365]);

  /** Set of habit IDs completed today */
  const todayCompletedIds = useMemo(
    () => new Set(logs.filter((l) => l.log_date === todayStr).map((l) => l.habit_id)),
    [logs, todayStr]
  );

  /** Completions count per date (for overall heatmap) */
  const completionsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach((l) => {
      map[l.log_date] = (map[l.log_date] || 0) + 1;
    });
    return map;
  }, [logs]);

  /** Per-habit log sets */
  const logsByHabit = useMemo(() => {
    const map: Record<number, Set<string>> = {};
    logs.forEach((l) => {
      if (!map[l.habit_id]) map[l.habit_id] = new Set();
      map[l.habit_id].add(l.log_date);
    });
    return map;
  }, [logs]);

  /** Streak statistics per habit */
  const streakData = useMemo(() => {
    return habits.map((h) => {
      const logSet = logsByHabit[h.id] || new Set<string>();
      const sortedDates = Array.from(logSet).sort();
      const total = logSet.size;
      const current = calcCurrentStreak(logSet, todayStr);
      const best = calcBestStreak(sortedDates);
      return { habitId: h.id, current, best, total };
    });
  }, [habits, logsByHabit, todayStr]);

  // ── Toggle today's check-in ──
  const toggleToday = async (habit: Habit) => {
    if (togglingIds.has(habit.id)) return;
    setTogglingIds((prev) => new Set(prev).add(habit.id));

    const isDone = todayCompletedIds.has(habit.id);
    if (isDone) {
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habit.id)
        .eq('log_date', todayStr);
      if (!error) {
        setLogs((prev) =>
          prev.filter((l) => !(l.habit_id === habit.id && l.log_date === todayStr))
        );
      }
    } else {
      const { data, error } = await supabase
        .from('habit_logs')
        .insert([{ habit_id: habit.id, user_id: user.id, log_date: todayStr }])
        .select();
      if (!error && data) {
        setLogs((prev) => [...prev, data[0]]);
        const sd = streakData.find((s) => s.habitId === habit.id);
        const newStreak = (sd?.current ?? 0) + 1;
        const milestones = [7, 14, 30, 60, 100, 365];
        if (milestones.includes(newStreak)) {
          showToast(`🏆 ${newStreak} hari berturut-turut untuk "${habit.name}"!`);
        } else {
          showToast(`${habit.icon} ${habit.name} selesai hari ini!`);
        }
      }
    }
    setTogglingIds((prev) => {
      const n = new Set(prev);
      n.delete(habit.id);
      return n;
    });
  };

  // ── Create habit ──
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    setIsSaving(true);

    const { data, error } = await supabase
      .from('habits')
      .insert([{ user_id: user.id, name: newHabitName.trim(), icon: newHabitIcon, color: newHabitColor, reminder_time: newHabitReminderTime || null }])
      .select();

    if (!error && data) {
      setHabits((prev) => [...prev, data[0]]);
      setNewHabitName('');
      setNewHabitIcon('⭐');
      setNewHabitColor('emerald');
      setNewHabitReminderTime('');
      setIsFormOpen(false);
      showToast(`Kebiasaan "${data[0].name}" berhasil ditambahkan!`);
      // If reminder was set, request notification permission
      if (newHabitReminderTime && typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') showToast('🔔 Notifikasi diizinkan! Pengingat akan aktif.');
      }
    } else {
      showToast('Gagal menambahkan kebiasaan.', 'error');
    }
    setIsSaving(false);
  };

  // ── Delete habit ──
  const handleDeleteHabit = async (id: number) => {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setLogs((prev) => prev.filter((l) => l.habit_id !== id));
      setDeleteConfirmId(null);
      if (expandedHabit === id) setExpandedHabit(null);
      showToast('Kebiasaan dihapus.');
    } else {
      showToast('Gagal menghapus.', 'error');
    }
  };

  // ── Update reminder time ──
  const updateReminderTime = async (habitId: number, time: string | null) => {
    const { error } = await supabase
      .from('habits')
      .update({ reminder_time: time || null })
      .eq('id', habitId);
    if (!error) {
      setHabits((prev) => prev.map((h) => h.id === habitId ? { ...h, reminder_time: time || null } : h));
      setReminderEditHabitId(null);
      setReminderInput('');
      if (time) {
        showToast(`⏰ Pengingat diset ke ${time} untuk kebiasaan ini`);
        // Request notification permission when setting a reminder
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') showToast('🔔 Notifikasi diizinkan! Pengingat akan aktif.');
          else showToast('⚠️ Notifikasi ditolak — aktifkan di pengaturan browser.', 'error');
        }
      } else {
        showToast('Pengingat dihapus.');
      }
    } else {
      showToast('Gagal menyimpan pengingat.', 'error');
    }
  };

  // ── Reminder notification interval (checks every minute) ──
  useEffect(() => {
    if (habits.length === 0) return;
    const check = () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDateStr = toLocalDateStr(now);
      habits.forEach((habit) => {
        if (!habit.reminder_time) return;
        if (habit.reminder_time !== currentTime) return;
        if (notifiedToday.current.get(habit.id) === todayDateStr) return; // already fired today
        if (todayCompletedIds.has(habit.id)) return; // already done today
        notifiedToday.current.set(habit.id, todayDateStr);
        new Notification('⏰ Pengingat Kebiasaan', {
          body: `${habit.icon} Waktunya ${habit.name}! Jangan lupa dicentang setelah selesai.`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `habit-${habit.id}`,
        });
      });
    };
    check(); // run immediately when habits load
    const interval = setInterval(check, 60000); // every 1 minute
    return () => clearInterval(interval);
  }, [habits, todayCompletedIds]);

  // ── Heatmap intensity helpers ──
  const getOverallCellClass = (dateStr: string): string => {
    if (habits.length === 0) return 'bg-gray-800/50';
    const count = completionsByDate[dateStr] || 0;
    const ratio = count / habits.length;
    if (ratio === 0) return 'bg-gray-800/50';
    if (ratio <= 0.25) return 'bg-emerald-900/80';
    if (ratio <= 0.5) return 'bg-emerald-700/80';
    if (ratio <= 0.75) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  const getHabitCellClass = (habitId: number, color: HabitColor) => (dateStr: string): string => {
    const logSet = logsByHabit[habitId];
    const cfg = COLOR_CONFIG[color] || COLOR_CONFIG.emerald;
    return logSet?.has(dateStr) ? cfg.heatmap[4] : cfg.heatmap[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Flame size={52} className="text-emerald-400 opacity-60" />
          <p className="text-gray-300 text-lg font-semibold">Memuat kebiasaanmu...</p>
        </div>
      </div>
    );
  }

  const totalToday = todayCompletedIds.size;
  const totalHabits = habits.length;
  const todayPercent = totalHabits > 0 ? Math.round((totalToday / totalHabits) * 100) : 0;

  return (
    <div className="min-h-screen bg-transparent text-gray-100 font-sans pb-16 relative">

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border flex items-center gap-3 shadow-xl max-w-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'error'
              ? 'bg-red-900/80 border-red-700/50 text-red-100'
              : 'bg-emerald-900/80 border-emerald-700/50 text-emerald-100'
          }`}
        >
          {toast.type === 'error' ? (
            <X size={18} className="text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium leading-tight">{toast.msg}</span>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-gray-900/95 border border-gray-700/50 p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500/10 p-4 rounded-full mb-4 border border-red-500/20">
                <Trash2 size={32} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Hapus Kebiasaan?</h3>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                Semua riwayat log kebiasaan ini akan terhapus secara permanen. Aksi ini tidak bisa diurungkan.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 rounded-xl font-semibold bg-gray-800 text-gray-200 hover:bg-gray-700 transition border border-gray-700/50"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteHabit(deleteConfirmId)}
                  className="flex-1 py-3 rounded-xl font-semibold bg-red-600/90 text-white hover:bg-red-500 transition shadow-lg shadow-red-500/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50 px-4 md:px-6 py-3 sticky top-0 z-20 shadow-sm pt-[max(env(safe-area-inset-top),0.75rem)] pb-[0.75rem]">
        <div className="flex items-center justify-between max-w-5xl mx-auto gap-3">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 rounded-xl transition text-gray-300 hover:text-white flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </a>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-emerald-400 flex items-center gap-2">
                <Flame size={21} /> Habits Tracker
              </h1>
            </div>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 font-semibold text-sm flex-shrink-0"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Kebiasaan Baru</span>
            <span className="sm:hidden">Baru</span>
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 md:p-6 space-y-8">

        {/* ── Today's Progress Overview ── */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div className="bg-gray-900/70 backdrop-blur-xl p-6 border border-gray-700/40 border-t-0 rounded-b-2xl">
            <div className="flex items-start justify-between mb-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Target size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Progress Hari Ini</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-4xl font-extrabold text-white leading-none">
                  {totalToday}
                  <span className="text-gray-500 text-xl font-normal">/{totalHabits}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{todayPercent}% selesai</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-800/80 rounded-full h-3 overflow-hidden border border-gray-700/40">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${todayPercent}%` }}
              />
            </div>

            {totalHabits > 0 && (
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0</span>
                <span className={todayPercent === 100 ? 'text-emerald-400 font-bold' : ''}>
                  {todayPercent === 100 ? '🎉 Semua selesai!' : `${totalHabits - totalToday} tersisa`}
                </span>
                <span>{totalHabits}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Habits Check-in List ── */}
        {habits.length === 0 ? (
          <div className="bg-gray-900/60 backdrop-blur-md border-2 border-dashed border-gray-700/50 rounded-3xl p-14 flex flex-col items-center justify-center text-center">
            <Flame size={60} className="mb-4 opacity-15 text-emerald-400" />
            <h3 className="text-xl font-bold text-white mb-2">Belum Ada Kebiasaan</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs leading-relaxed">
              Mulai tambahkan kebiasaan baik yang ingin kamu lakukan setiap harinya.
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-6 py-3 rounded-xl transition font-bold shadow-lg shadow-emerald-500/20"
            >
              <Plus size={18} /> Tambah Kebiasaan Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare size={22} className="text-emerald-400" /> Centang Hari Ini
            </h2>
            {habits.map((habit) => {
              const color = COLOR_CONFIG[habit.color as HabitColor] || COLOR_CONFIG.emerald;
              const isDone = todayCompletedIds.has(habit.id);
              const isToggling = togglingIds.has(habit.id);
              const isExpanded = expandedHabit === habit.id;
              const sd = streakData.find((s) => s.habitId === habit.id);
              const isMilestone = (sd?.current ?? 0) >= 7;

              return (
                <div
                  key={habit.id}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
                    isDone
                      ? `${color.bgMuted} ${color.border} shadow-emerald-500/5`
                      : 'bg-gray-900/60 border-gray-700/50 backdrop-blur-md'
                  }`}
                >
                  <div className="p-4 flex items-center gap-4">
                    {/* Check toggle button */}
                    <button
                      onClick={() => toggleToday(habit)}
                      disabled={isToggling}
                      aria-label={isDone ? `Batalkan ${habit.name}` : `Selesaikan ${habit.name}`}
                      className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 border-2 ${
                        isToggling
                          ? 'opacity-50 cursor-wait bg-gray-800 border-gray-600'
                          : isDone
                          ? `${color.bg} border-transparent shadow-lg shadow-emerald-500/20 scale-105`
                          : 'bg-gray-800/80 border-gray-600/50 hover:border-emerald-500/60 hover:scale-105 active:scale-95 hover:shadow-lg'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 size={22} className="animate-spin text-gray-400" />
                      ) : (
                        habit.icon
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-base md:text-lg leading-tight ${isDone ? 'text-white' : 'text-gray-200'}`}>
                          {habit.name}
                        </h3>
                        {isDone && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color.bgMuted} ${color.text} border ${color.border}`}>
                            ✓ Selesai
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className={`flex items-center gap-1 text-sm font-bold ${isMilestone ? 'text-orange-400' : 'text-gray-400'}`}>
                          🔥 {sd?.current || 0}
                          <span className="font-normal text-xs text-gray-500">hari</span>
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Trophy size={11} className="text-amber-400/70" /> {sd?.best || 0} terbaik
                        </span>
                        <span className="text-xs text-gray-600">
                          {sd?.total || 0}× total
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                        className={`p-2 rounded-xl transition ${
                          isExpanded
                            ? `${color.text} bg-gray-700/60`
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                        }`}
                        title="Lihat heatmap"
                      >
                        <BarChart2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (reminderEditHabitId === habit.id) {
                            setReminderEditHabitId(null);
                          } else {
                            setReminderEditHabitId(habit.id);
                            setReminderInput(habit.reminder_time || '');
                          }
                        }}
                        className={`p-2 rounded-xl transition ${
                          habit.reminder_time
                            ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                            : reminderEditHabitId === habit.id
                            ? 'text-yellow-400 bg-gray-700/60'
                            : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10'
                        }`}
                        title={habit.reminder_time ? `Pengingat: ${habit.reminder_time}` : 'Set pengingat'}
                      >
                        <Bell size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(habit.id)}
                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                        title="Hapus kebiasaan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* ── Daily check-in bar ── */}
                  <div className={`border-t px-4 py-3 transition-colors ${isDone ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-gray-700/40 bg-gray-900/20'}`}>
                    <button
                      onClick={() => toggleToday(habit)}
                      disabled={isToggling}
                      className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] select-none ${
                        isDone
                          ? `${color.bgMuted} ${color.text} border ${color.border} hover:opacity-80`
                          : 'bg-gray-800/60 text-gray-300 border border-gray-600/50 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isDone ? (
                        <>
                          <CheckCircle2 size={16} className="flex-shrink-0" />
                          <span>Selesai hari ini! — Ketuk untuk batal</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} className="flex-shrink-0 text-gray-500" />
                          <span>Centang Selesai Hari Ini</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ── Reminder time editor (expanded) ── */}
                  {reminderEditHabitId === habit.id && (
                    <div className="border-t border-yellow-500/20 p-4 bg-yellow-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Bell size={12} /> Pengingat Harian
                      </p>
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                        Notifikasi akan muncul setiap hari pada waktu yang dipilih, jika kebiasaan belum dicentang.
                        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
                          <span className="text-red-400 block mt-1">⚠️ Notifikasi diblokir di browser — aktifkan di pengaturan browser dulu.</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="time"
                          value={reminderInput}
                          onChange={(e) => setReminderInput(e.target.value)}
                          className="bg-gray-800/80 border border-yellow-500/30 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition"
                        />
                        <button
                          onClick={() => updateReminderTime(habit.id, reminderInput)}
                          disabled={!reminderInput}
                          className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-xl text-sm font-semibold hover:bg-yellow-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Simpan
                        </button>
                        {habit.reminder_time && (
                          <button
                            onClick={() => updateReminderTime(habit.id, null)}
                            className="px-4 py-2 bg-gray-800/60 border border-gray-700/40 text-gray-400 rounded-xl text-sm hover:text-red-400 hover:border-red-500/30 transition"
                          >
                            Hapus Pengingat
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Per-habit heatmap (expanded) ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-700/40 p-4 bg-gray-900/40 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Calendar size={12} /> Riwayat 365 Hari Terakhir
                      </p>
                      <HeatmapGrid
                        weeks={heatmapWeeks}
                        todayStr={todayStr}
                        getCellClass={getHabitCellClass(habit.id, habit.color as HabitColor)}
                        getTooltip={(dateStr) => {
                          const done = logsByHabit[habit.id]?.has(dateStr);
                          return `${dateStr} — ${done ? '✓ Selesai' : 'Belum'}`;
                        }}
                      />
                      {/* Legend */}
                      <div className="flex items-center gap-2 mt-3 justify-end">
                        <span className="text-[10px] text-gray-500">Belum</span>
                        {(COLOR_CONFIG[habit.color as HabitColor] || COLOR_CONFIG.emerald).heatmap.map((cls, i) => (
                          <div key={i} className={`w-[11px] h-[11px] rounded-sm ${cls}`} />
                        ))}
                        <span className="text-[10px] text-gray-500">Selesai</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Overall 365-day Heatmap ── */}
        {habits.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
            <div className="bg-gray-900/70 backdrop-blur-xl p-6 border border-gray-700/40 border-t-0 rounded-b-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Kontribusi Harian</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Semua {totalHabits} kebiasaan — 365 hari terakhir
                  </p>
                </div>
              </div>

              <HeatmapGrid
                weeks={heatmapWeeks}
                todayStr={todayStr}
                getCellClass={getOverallCellClass}
                getTooltip={(dateStr) => {
                  const count = completionsByDate[dateStr] || 0;
                  return `${dateStr} — ${count}/${habits.length} kebiasaan selesai`;
                }}
              />

              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-[10px] text-gray-500">Tidak ada</span>
                {[
                  'bg-gray-800/50',
                  'bg-emerald-900/80',
                  'bg-emerald-700/80',
                  'bg-emerald-500',
                  'bg-emerald-400',
                ].map((cls, i) => (
                  <div key={i} className={`w-[11px] h-[11px] rounded-sm ${cls}`} />
                ))}
                <span className="text-[10px] text-gray-500">Semua selesai</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Streak Stats Cards ── */}
        {habits.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy size={22} className="text-amber-400" /> Statistik Per Kebiasaan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {habits.map((habit) => {
                const color = COLOR_CONFIG[habit.color as HabitColor] || COLOR_CONFIG.emerald;
                const sd = streakData.find((s) => s.habitId === habit.id);
                const isDone = todayCompletedIds.has(habit.id);
                const isMilestone = (sd?.current ?? 0) >= 7;
                const consistencyPct = Math.round(((sd?.total || 0) / 365) * 100);

                return (
                  <div
                    key={habit.id}
                    className={`bg-gray-900/60 backdrop-blur-md border rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl ${
                      isDone ? `${color.border} ${color.bgMuted}` : 'border-gray-700/50'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-2 shadow-md transition-all ${
                          isDone
                            ? `${color.bg} border-transparent shadow-${habit.color}-500/20`
                            : 'bg-gray-800 border-gray-700/50'
                        }`}
                      >
                        {habit.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{habit.name}</h3>
                        <p className={`text-xs font-medium mt-0.5 ${isDone ? color.text : 'text-gray-500'}`}>
                          {isDone ? '✓ Selesai hari ini' : 'Belum hari ini'}
                        </p>
                      </div>
                    </div>

                    {/* Stat numbers */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div
                        className={`rounded-xl p-3 ${
                          isMilestone
                            ? 'bg-orange-500/10 border border-orange-500/20'
                            : 'bg-gray-800/60 border border-gray-700/30'
                        }`}
                      >
                        <p className={`text-2xl font-extrabold leading-none ${isMilestone ? 'text-orange-400' : 'text-white'}`}>
                          {isMilestone && '🔥'}{sd?.current || 0}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 font-medium uppercase tracking-wide">Streak</p>
                      </div>
                      <div className="bg-gray-800/60 border border-gray-700/30 rounded-xl p-3">
                        <p className="text-2xl font-extrabold text-amber-400 leading-none">{sd?.best || 0}</p>
                        <p className="text-[10px] text-gray-500 mt-1 font-medium uppercase tracking-wide">Terbaik</p>
                      </div>
                      <div className="bg-gray-800/60 border border-gray-700/30 rounded-xl p-3">
                        <p className={`text-2xl font-extrabold leading-none ${color.text}`}>{sd?.total || 0}</p>
                        <p className="text-[10px] text-gray-500 mt-1 font-medium uppercase tracking-wide">Total</p>
                      </div>
                    </div>

                    {/* Consistency bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1.5 font-medium">
                        <span className="flex items-center gap-1"><Zap size={10} /> Konsistensi 365 hari</span>
                        <span className={color.text}>{consistencyPct}%</span>
                      </div>
                      <div className="w-full bg-gray-800/80 rounded-full h-2 overflow-hidden border border-gray-700/30">
                        <div
                          className={`h-full ${color.bg} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${consistencyPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Create Habit Bottom Sheet Modal ── */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}
        >
          <div className="bg-gray-900/95 border border-gray-700/50 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
            <form onSubmit={handleCreateHabit} className="p-6">

              {/* Modal header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame size={20} className="text-emerald-400" /> Tambah Kebiasaan Baru
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Name field */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Nama Kebiasaan
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Contoh: Minum 8 Gelas Air..."
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/50 transition text-[16px] md:text-sm"
                />
              </div>

              {/* Icon picker */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Ikon <span className="text-emerald-400 text-base">{newHabitIcon}</span>
                </label>
                <div
                  className="grid gap-1.5 bg-gray-800/40 p-3 rounded-xl border border-gray-700/40 overflow-y-auto"
                  style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', maxHeight: '120px' }}
                >
                  {HABIT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewHabitIcon(icon)}
                      className={`text-xl p-1 rounded-lg transition hover:bg-gray-700/60 active:scale-90 ${
                        newHabitIcon === icon ? 'bg-emerald-500/20 ring-1 ring-emerald-400 scale-110 shadow-sm' : ''
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Warna Tema
                </label>
                <div className="flex gap-3 flex-wrap">
                  {HABIT_COLORS.map((c) => {
                    const cfg = COLOR_CONFIG[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewHabitColor(c)}
                        title={c}
                        className={`w-9 h-9 rounded-full border-4 transition-all duration-200 ${cfg.bg} ${
                          newHabitColor === c
                            ? 'border-white scale-125 shadow-xl'
                            : 'border-transparent opacity-50 hover:opacity-90 hover:scale-110'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Reminder time (optional) */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5"><Clock size={11} /> Pengingat Harian <span className="text-gray-600 font-normal normal-case">(opsional)</span></span>
                </label>
                <input
                  type="time"
                  value={newHabitReminderTime}
                  onChange={(e) => setNewHabitReminderTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition text-sm"
                />
                {newHabitReminderTime && (
                  <p className="text-xs text-yellow-400/70 mt-1.5">⏰ Notifikasi akan muncul tiap hari jam {newHabitReminderTime} jika belum dicentang</p>
                )}
              </div>

              {/* Preview + Submit */}
              <div className="flex gap-3">
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border flex-shrink-0 ${
                    COLOR_CONFIG[newHabitColor].bgMuted
                  } ${COLOR_CONFIG[newHabitColor].border}`}
                >
                  <span className="text-2xl">{newHabitIcon}</span>
                  <span className={`text-sm font-semibold ${COLOR_CONFIG[newHabitColor].text} max-w-[80px] truncate`}>
                    {newHabitName || 'Preview'}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isSaving || !newHabitName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {isSaving ? 'Menyimpan...' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

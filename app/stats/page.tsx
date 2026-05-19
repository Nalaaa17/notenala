"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, CheckCircle2, Target, Calendar,
  TrendingUp, BarChart2, Zap, Award, Activity, Star,
} from 'lucide-react';

// ─────────────────────────── Types ───────────────────────────
interface Task {
  id: number;
  title: string;
  completed: boolean;
  completed_at?: string | null;
  due_date?: string | null;
  category?: string;
  created_at?: string;
}

// ─────────────────────────── Constants ───────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  Biasa:     { label: 'Biasa',     color: 'text-gray-400',    bg: 'bg-gray-500/10',    bar: 'bg-gray-500' },
  Urgent:    { label: 'Urgent',    color: 'text-red-400',     bg: 'bg-red-500/10',     bar: 'bg-red-500' },
  Kuliah:    { label: 'Kuliah',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    bar: 'bg-blue-500' },
  Pribadi:   { label: 'Pribadi',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' },
  Pekerjaan: { label: 'Pekerjaan', color: 'text-amber-400',   bg: 'bg-amber-500/10',   bar: 'bg-amber-500' },
};

// ─────────────────────────── Utilities ───────────────────────────
function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

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

function buildHeatmapWeeks(days: string[]): (string | null)[][] {
  const firstDow = new Date(days[0]).getDay(); // 0 = Sunday
  const padded: (string | null)[] = Array(firstDow).fill(null).concat(days as (string | null)[]);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}


/** Priority: completed_at > due_date > created_at — ensures old tasks show up */
function getEffectiveDate(task: Task): string | null {
  if (task.completed_at) return toLocalDateStr(new Date(task.completed_at));
  if (task.due_date) return task.due_date;
  if (task.created_at) return toLocalDateStr(new Date(task.created_at));
  return null;
}

function MonthLabels({ weeks }: { weeks: (string | null)[][] }) {
  const labels: { label: string; wi: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const d = week.find((x) => x !== null);
    if (!d) return;
    const m = new Date(d).getMonth();
    if (m !== lastMonth) { labels.push({ label: MONTH_NAMES[m], wi }); lastMonth = m; }
  });
  return (
    <div className="relative h-4 mb-1.5" style={{ minWidth: `${weeks.length * 13}px` }}>
      {labels.map(({ label, wi }) => (
        <span
          key={`${label}-${wi}`}
          className="absolute text-[10px] text-gray-500 font-medium select-none"
          style={{ left: `${wi * 13}px` }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────── Main Component ───────────────────────────
export default function StatsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { window.location.href = '/login'; return; }

      // Fetch last 365 days of data — only need completed tasks
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 364);

      const { data } = await supabase
        .from('tasks')
        .select('id, title, completed, completed_at, due_date, category, created_at')
        .eq('user_id', user.id)
        .eq('completed', true);

      setTasks(data || []);
      setIsLoading(false);
    };
    load();
  }, []);

  // ── Memoised derivations ──
  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const last365 = useMemo(() => buildLast365Days(), []);
  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(last365), [last365]);

  /** Count completions per date — uses completed_at, falls back to due_date or created_at */
  const completionsByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      const ds = getEffectiveDate(t);
      if (!ds) return;
      if (!map[ds]) map[ds] = [];
      map[ds].push(t);
    });
    return map;
  }, [tasks]);

  const completionDatesSet = useMemo(
    () => new Set(Object.keys(completionsByDate)),
    [completionsByDate]
  );

  // Time-range stats — use effective date (falls back to due_date / created_at)
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalCompleted = tasks.length; // all fetched tasks are completed=true
  const completedThisWeek = tasks.filter((t) => {
    const ds = getEffectiveDate(t);
    return ds && new Date(ds) >= startOfWeek;
  }).length;
  const completedThisMonth = tasks.filter((t) => {
    const ds = getEffectiveDate(t);
    return ds && new Date(ds) >= startOfMonth;
  }).length;
  const completedToday = (completionsByDate[todayStr] || []).length;

  // Category breakdown — uses all completed tasks
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t) => {
      const cat = t.category || 'Biasa';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  // Weekday productivity — uses effective date
  const weekdayBreakdown = useMemo(() => {
    const counts = Array(7).fill(0);
    tasks.forEach((t) => {
      const ds = getEffectiveDate(t);
      if (!ds) return;
      counts[new Date(ds).getDay()]++;
    });
    return counts;
  }, [tasks]);
  const maxWeekday = Math.max(...weekdayBreakdown, 1);

  // Heatmap color based on count
  const getHeatmapClass = (dateStr: string): string => {
    const count = (completionsByDate[dateStr] || []).length;
    if (count === 0) return 'bg-gray-800/60';
    if (count === 1) return 'bg-emerald-900/90';
    if (count === 2) return 'bg-emerald-700/90';
    if (count <= 4) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Activity size={52} className="text-cyan-400 opacity-60" />
          <p className="text-gray-300 text-lg font-semibold">Menganalisis aktivitasmu...</p>
        </div>
      </div>
    );
  }

  const hasData = totalCompleted > 0;

  return (
    <div className="min-h-screen bg-transparent text-gray-100 font-sans pb-16">

      {/* ── Navbar ── */}
      <nav className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50 px-4 md:px-6 py-3 sticky top-0 z-20 shadow-sm pt-[max(env(safe-area-inset-top),0.75rem)] pb-[0.75rem]">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <a
            href="/"
            className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 rounded-xl transition text-gray-300 hover:text-white flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </a>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-cyan-400 flex items-center gap-2">
              <Activity size={21} /> Statistik Aktivitas
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 md:p-6 space-y-8">

        {/* ── Empty state / onboarding banner ── */}
        {!hasData && (
          <div className="relative rounded-2xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500" />
            <div className="bg-cyan-500/5 border border-cyan-500/20 border-t-0 rounded-b-2xl p-6 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <Zap size={24} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-cyan-300 font-bold text-base">Data heatmap mulai terbentuk otomatis!</p>
                <p className="text-cyan-400/70 text-sm mt-1 leading-relaxed">
                  Setiap kali kamu centang tugas selesai di halaman utama, hari itu langsung dapat kotak hijau di heatmap ini.
                  Tidak perlu centang manual — cukup kerjakan tugasmu seperti biasa!
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-cyan-300 hover:text-white transition"
                >
                  <CheckCircle2 size={16} /> Selesaikan tugas pertama sekarang →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Summary Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Hari Ini',     value: completedToday,       icon: Target,       color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Minggu Ini',   value: completedThisWeek,    icon: Calendar,     color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
            { label: 'Bulan Ini',    value: completedThisMonth,   icon: BarChart2,    color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20'  },
            { label: 'Total Pernah', value: tasks.length,         icon: CheckCircle2, color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className={`${bg} border ${border} rounded-2xl p-4 md:p-5 backdrop-blur-md`}
            >
              <div className={`inline-flex p-2 rounded-xl ${bg} border ${border} mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-3xl font-extrabold text-white leading-none">{value}</p>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* ── GitHub-style Heatmap ── */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div className="bg-gray-900/70 backdrop-blur-xl p-5 md:p-6 border border-gray-700/40 border-t-0 rounded-b-2xl">
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Kontribusi Harian</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {completionDatesSet.size} hari aktif dari 365 hari terakhir
                  </p>
                </div>
              </div>
              {hasData && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <Star size={12} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    {Math.round((completionDatesSet.size / 365) * 100)}% aktif
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto pb-2">
              <MonthLabels weeks={heatmapWeeks} />

              {/* Grid with day labels */}
              <div className="flex gap-1">
                {/* Y-axis labels (Mon / Wed / Fri) */}
                <div className="flex flex-col gap-[3px] mr-1 flex-shrink-0" style={{ paddingTop: '1px' }}>
                  {[null, 'Sen', null, 'Rab', null, 'Jum', null].map((d, i) => (
                    <div key={i} className="w-5 h-[11px] flex items-center justify-end">
                      {d && <span className="text-[8px] text-gray-600 leading-none">{d}</span>}
                    </div>
                  ))}
                </div>

                {/* Heatmap grid */}
                <div className="flex gap-[3px]" style={{ minWidth: `${heatmapWeeks.length * 13}px` }}>
                  {heatmapWeeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((dateStr, di) => {
                        if (!dateStr) return <div key={di} className="w-[11px] h-[11px] rounded-sm opacity-0" />;
                        const count = (completionsByDate[dateStr] || []).length;
                        const isToday = dateStr === todayStr;
                        const titles = (completionsByDate[dateStr] || []).map(t => `• ${t.title}`).join('\n');
                        const tooltip = count > 0
                          ? `${dateStr} — ${count} tugas selesai:\n${titles}`
                          : `${dateStr} — tidak ada aktivitas`;
                        return (
                          <div
                            key={di}
                            title={tooltip}
                            className={`w-[11px] h-[11px] rounded-sm transition-colors duration-300 cursor-default ${getHeatmapClass(dateStr)} ${
                              isToday ? 'ring-1 ring-white/60 ring-offset-1 ring-offset-gray-900' : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end flex-wrap">
              <span className="text-[10px] text-gray-500">Tidak ada</span>
              {[
                'bg-gray-800/60',
                'bg-emerald-900/90',
                'bg-emerald-700/90',
                'bg-emerald-500',
                'bg-emerald-400',
              ].map((cls, i) => (
                <div key={i} className={`w-[11px] h-[11px] rounded-sm ${cls}`} />
              ))}
              <span className="text-[10px] text-gray-500">5+ tugas</span>
            </div>
          </div>
        </div>

        {/* ── Weekday Productivity Chart ── */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-black/20">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <div className="bg-gray-900/70 backdrop-blur-xl p-5 md:p-6 border border-gray-700/40 border-t-0 rounded-b-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <BarChart2 size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Produktivitas Per Hari</h2>
                <p className="text-xs text-gray-400 mt-0.5">Hari mana kamu paling sering menyelesaikan tugas</p>
              </div>
            </div>

            <div className="flex items-end gap-2 md:gap-4" style={{ height: '140px' }}>
              {weekdayBreakdown.map((count, dayIdx) => {
                const pct = count / maxWeekday;
                const isToday = new Date().getDay() === dayIdx;
                const isMax = count > 0 && count === maxWeekday;
                const barH = count > 0 ? Math.max(pct * 100, 6) : 3;

                return (
                  <div key={dayIdx} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                    <div className="flex-1 flex flex-col justify-end w-full">
                      {count > 0 && (
                        <span className={`text-[11px] font-bold text-center mb-1 ${isMax ? 'text-blue-400' : 'text-gray-500'}`}>
                          {count}
                        </span>
                      )}
                      <div
                        title={`${DAY_NAMES_SHORT[dayIdx]}: ${count} tugas`}
                        className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                          isMax
                            ? 'bg-gradient-to-t from-blue-700 to-blue-400 shadow-lg shadow-blue-500/30'
                            : isToday
                            ? 'bg-blue-500/50'
                            : count > 0
                            ? 'bg-gray-600/60'
                            : 'bg-gray-800/40'
                        }`}
                        style={{ height: `${barH}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-semibold ${isToday ? 'text-blue-400' : 'text-gray-500'}`}>
                      {DAY_NAMES_SHORT[dayIdx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Category Breakdown ── */}
        {categoryBreakdown.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <div className="bg-gray-900/70 backdrop-blur-xl p-5 md:p-6 border border-gray-700/40 border-t-0 rounded-b-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Award size={20} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Breakdown Kategori</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Jenis tugas yang paling banyak kamu selesaikan</p>
                </div>
              </div>

              <div className="space-y-4">
                {categoryBreakdown.map(([cat, count]) => {
                  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['Biasa'];
                  const pct = totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className={`flex items-center gap-2 text-sm font-semibold ${cfg.color}`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${cfg.bar}`} />
                          {cfg.label}
                        </div>
                        <div className="text-sm text-right">
                          <span className="text-white font-bold">{count}</span>
                          <span className="text-gray-500 text-xs ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-800/80 rounded-full h-2.5 overflow-hidden border border-gray-700/30">
                        <div
                          className={`h-full ${cfg.bar} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

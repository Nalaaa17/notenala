"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Trash2, Calendar, BookHeart, Clock, Activity, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const MOODS = [
  { id: 'rad', emoji: '🤩', label: 'Luar Biasa', color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
  { id: 'good', emoji: '🙂', label: 'Senang', color: 'bg-green-400', glow: 'shadow-green-400/50' },
  { id: 'meh', emoji: '😐', label: 'Biasa', color: 'bg-yellow-400', glow: 'shadow-yellow-400/50' },
  { id: 'bad', emoji: '☹️', label: 'Buruk', color: 'bg-orange-500', glow: 'shadow-orange-500/50' },
  { id: 'awful', emoji: '😭', label: 'Hancur', color: 'bg-red-500', glow: 'shadow-red-500/50' },
];

const ACTIVITIES = [
  { id: 'work', emoji: '💼', label: 'Kerja' },
  { id: 'study', emoji: '📚', label: 'Belajar' },
  { id: 'coding', emoji: '💻', label: 'Ngoding' },
  { id: 'reading', emoji: '📖', label: 'Membaca' },
  { id: 'writing', emoji: '📝', label: 'Menulis' },
  { id: 'exercise', emoji: '🏃‍♂️', label: 'Olahraga' },
  { id: 'meditation', emoji: '🧘‍♂️', label: 'Meditasi' },
  { id: 'gaming', emoji: '🎮', label: 'Main Game' },
  { id: 'music', emoji: '🎵', label: 'Musik' },
  { id: 'movies', emoji: '🍿', label: 'Nonton' },
  { id: 'social', emoji: '👫', label: 'Nongkrong' },
  { id: 'date', emoji: '👩‍❤️‍👨', label: 'Kencan' },
  { id: 'cleaning', emoji: '🧹', label: 'Bersih-bersih' },
  { id: 'cooking', emoji: '🍳', label: 'Memasak' },
  { id: 'food', emoji: '🍔', label: 'Makan Enak' },
  { id: 'coffee', emoji: '☕', label: 'Ngopi' },
  { id: 'shopping', emoji: '🛒', label: 'Belanja' },
  { id: 'commute', emoji: '🚗', label: 'Jalan-jalan' },
  { id: 'sleep', emoji: '😴', label: 'Tidur' },
  { id: 'sick', emoji: '🤒', label: 'Sakit' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Keluarga' },
  { id: 'hobby', emoji: '🎨', label: 'Hobi' }
];

interface JournalEntry {
    id: number;
    mood: string;
    activities: string[];
    note: string;
    created_at: string;
}

export default function JournalPage() {
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Kustom Pop-up Alert Modal (Menghindari alert() bawaan browser)
    const [alertModal, setAlertModal] = useState<{isOpen: boolean, message: string, type: 'success'|'error'|'info'}>({isOpen: false, message: '', type: 'info'});
    const showAlert = (message: string, type: 'success'|'error'|'info' = 'info') => {
        setAlertModal({ isOpen: true, message, type });
        if (type !== 'error') {
            setTimeout(() => setAlertModal(prev => ({...prev, isOpen: false})), 3000); // Auto close success
        }
    };

    // Kustom Confirm Modal (Mengganti confirm() hapus data)
    const [idToDelete, setIdToDelete] = useState<number | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        const fetchUserAndJournals = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                window.location.href = "/login";
                return;
            }
            setUser(user);

            const { data, error } = await supabase
                .from('journals')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) setJournals(data);
            setIsLoading(false);
        };

        fetchUserAndJournals();
    }, []);

    const toggleActivity = (id: string) => {
        if (selectedActivities.includes(id)) {
            setSelectedActivities(selectedActivities.filter(a => a !== id));
        } else {
            setSelectedActivities([...selectedActivities, id]);
        }
    };

    const handleSaveJournal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMood) {
            showAlert("Sst! Kamu lupa memilih bagaimana perasaanmu (Mood) hari ini.", "error");
            return;
        }

        setIsSubmitting(true);
        const { data, error } = await supabase
            .from('journals')
            .insert([{
                user_id: user.id,
                mood: selectedMood,
                activities: selectedActivities,
                note: note.trim()
            }])
            .select();

        if (!error && data) {
            setJournals([data[0], ...journals]);
            // Reset form
            setSelectedMood(null);
            setSelectedActivities([]);
            setNote("");
            showAlert("Berhasil! Jurnal hari ini telah disimpan dengan rapi.", "success");
        } else {
            showAlert("Oups, gagal menyimpan jurnal! Pastikan database kamu merespon.", "error");
            console.error(error);
        }
        setIsSubmitting(false);
    };

    const confirmDelete = (id: number) => {
        setIdToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (idToDelete !== null) {
            const { error } = await supabase.from('journals').delete().eq('id', idToDelete);
            if (!error) {
                setJournals(journals.filter(j => j.id !== idToDelete));
            }
            setIsDeleteModalOpen(false);
            setIdToDelete(null);
        }
    };

    // ---- LOGIKA CHART (GRAFIK GARIS) ----
    const chartData = [...journals].reverse().slice(-14); // Mengambil maksimal 14 entri terbaru & dibalik dari terlama ke terbaru
    const moodValues: Record<string, number> = { rad: 5, good: 4, meh: 3, bad: 2, awful: 1 };
    
    // Konfigurasi SVG Virtual Viewbox
    const svgWidth = 800; // Lebar standar
    const svgHeight = 220; // Tinggi standar
    
    const points = chartData.map((j, i) => {
        const x = chartData.length > 1 ? (i / (chartData.length - 1)) * (svgWidth - 60) + 30 : svgWidth / 2;
        const val = moodValues[j.mood] || 3;
        const y = svgHeight - 40 - ((val - 1) / 4) * (svgHeight - 80);
        return { x, y, mood: j.mood, date: new Date(j.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) };
    });

    const pathD = points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : "";

    return (
        <div className="min-h-screen bg-transparent text-gray-100 font-sans pb-12 relative">
            
            {/* Navigasi Atas */}
            <nav className="bg-gray-900/70 backdrop-blur-md border-b border-gray-700/50 px-6 py-4 flex flex-wrap justify-between items-center sticky top-0 z-10 shadow-md gap-3">
                <h1 className="text-xl font-bold text-pink-400 flex items-center gap-2 drop-shadow-md">
                    <BookHeart size={24} /> NoteNala Jurnal
                </h1>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <a href="/calendar" className="flex items-center gap-2 bg-purple-600/90 hover:bg-purple-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-purple-500/30 font-medium backdrop-blur-sm flex-1 sm:flex-auto justify-center">
                        <Calendar size={18} /> Kalender
                    </a>
                    <a href="/" className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition border border-gray-700/50 backdrop-blur-sm shadow-md flex-1 sm:flex-auto justify-center">
                        <ArrowLeft size={18} /> Kembali
                    </a>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-4 md:p-6 relative z-0 mt-4">

                {/* GRAFIK STATISTIK MOOD */}
                {!isLoading && journals.length > 0 && (
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30 mb-10">
                        {/* Gradient accent top bar */}
                        <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
                        
                        <div className="bg-gray-900/70 backdrop-blur-xl p-6 md:p-8 border border-gray-700/40 border-t-0">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20">
                                    <Activity size={20} className="text-pink-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Tren Mood Kamu</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Fluktuasi perasaanmu dari hari ke hari</p>
                                </div>
                            </div>
                            
                            {/* Mood Scale Labels */}
                            <div className="flex items-center gap-4 mt-5 mb-3">
                                {MOODS.map(m => (
                                    <div key={m.id} className="flex items-center gap-1 text-xs text-gray-500">
                                        <span>{m.emoji}</span>
                                        <span className="hidden sm:inline">{m.label}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="w-full overflow-x-auto custom-scrollbar rounded-xl bg-gray-800/30 border border-gray-700/30 p-3">
                                <div className="min-w-[600px] h-48 md:h-56 relative w-full">
                                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#ec4899" />
                                                <stop offset="50%" stopColor="#a855f7" />
                                                <stop offset="100%" stopColor="#6366f1" />
                                            </linearGradient>
                                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.02" />
                                            </linearGradient>
                                            <filter id="glow">
                                                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur"/>
                                                    <feMergeNode in="SourceGraphic"/>
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        
                                        {/* Grid lines */}
                                        {[1, 2, 3, 4, 5].map(v => {
                                            const y = svgHeight - 40 - ((v - 1) / 4) * (svgHeight - 80);
                                            return (
                                                <g key={`grid-${v}`}>
                                                    <line x1="30" y1={y} x2={svgWidth} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 6" />
                                                </g>
                                            );
                                        })}
                                        
                                        {/* Area fill under line */}
                                        {points.length > 1 && (
                                            <path 
                                                d={`${pathD} L ${points[points.length-1].x},${svgHeight - 40} L ${points[0].x},${svgHeight - 40} Z`} 
                                                fill="url(#areaGradient)" 
                                            />
                                        )}
                                        
                                        {/* Main line */}
                                        {points.length > 1 && (
                                            <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                                        )}

                                        {/* Data points */}
                                        {points.map((p, i) => {
                                            const moodObj = MOODS.find(m => m.id === p.mood) || MOODS[2];
                                            return (
                                                <g key={`point-${i}`} className="cursor-crosshair">
                                                    {/* Outer glow ring */}
                                                    <circle cx={p.x} cy={p.y} r="12" fill="rgba(236,72,153,0.1)" />
                                                    {/* Main dot */}
                                                    <circle cx={p.x} cy={p.y} r="5" fill="#111827" stroke="url(#lineGradient)" strokeWidth="2.5" />
                                                    {/* Emoji above */}
                                                    <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="18">{moodObj.emoji}</text>
                                                    {/* Date below */}
                                                    <text x={p.x} y={svgHeight - 8} textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">{p.date}</text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FORM INPUT JURNAL HARI INI */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30 mb-10 max-w-3xl mx-auto">
                    {/* Gradient accent top bar */}
                    <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500" />
                    
                    <div className="bg-gray-900/70 backdrop-blur-xl p-6 md:p-8 border border-gray-700/40 border-t-0 rounded-b-2xl">
                        
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 mb-3">
                                <BookHeart size={24} className="text-pink-400" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-white">Bagaimana perasaanmu hari ini?</h2>
                            <p className="text-sm text-gray-400 mt-1">Pilih mood yang paling menggambarkan harimu</p>
                        </div>
                        
                        {/* MOOD SELECTOR - Premium Cards */}
                        <div className="flex justify-center gap-3 md:gap-4 mb-8 flex-wrap">
                            {MOODS.map(m => {
                                const isSelected = selectedMood === m.id;
                                return (
                                    <button 
                                        key={m.id}
                                        onClick={() => setSelectedMood(m.id)}
                                        className={`relative flex flex-col items-center gap-2 p-4 md:p-5 rounded-2xl transition-all duration-300 group ${
                                            isSelected 
                                                ? `scale-105 bg-gray-800/80 shadow-xl ${m.glow} ring-2 ring-offset-2 ring-offset-gray-900 ${
                                                    m.id === 'rad' ? 'ring-emerald-400' : 
                                                    m.id === 'good' ? 'ring-green-400' : 
                                                    m.id === 'meh' ? 'ring-yellow-400' : 
                                                    m.id === 'bad' ? 'ring-orange-400' : 'ring-red-400'
                                                  }` 
                                                : 'bg-gray-800/30 border border-gray-700/40 hover:bg-gray-800/60 hover:border-gray-600/60 hover:scale-105 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        {/* Selection indicator dot */}
                                        {isSelected && (
                                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${m.color} shadow-lg ${m.glow} flex items-center justify-center`}>
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                        )}
                                        <span className={`text-4xl md:text-5xl transition-all duration-300 ${isSelected ? 'drop-shadow-xl scale-110' : 'grayscale group-hover:grayscale-0 drop-shadow-sm'}`}>{m.emoji}</span>
                                        <span className={`text-xs md:text-sm font-bold transition-colors ${isSelected ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{m.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedMood && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                {/* Divider with gradient */}
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-700/40" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-gray-900/70 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Aktivitas Hari Ini</span>
                                    </div>
                                </div>
                                
                                {/* ACTIVITY CHIPS - Premium Style */}
                                <div className="flex flex-wrap justify-center gap-2.5 mb-8">
                                    {ACTIVITIES.map(act => {
                                        const isSelected = selectedActivities.includes(act.id);
                                        return (
                                            <button
                                                key={act.id}
                                                onClick={() => toggleActivity(act.id)}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium ${
                                                    isSelected 
                                                        ? 'bg-gradient-to-r from-pink-600 to-rose-500 border-pink-400/50 text-white shadow-lg shadow-pink-500/20 scale-105' 
                                                        : 'bg-gray-800/50 border-gray-600/40 text-gray-400 hover:bg-gray-800/80 hover:text-gray-200 hover:border-gray-500/50'
                                                }`}
                                            >
                                                <span className={`text-base transition-transform ${isSelected ? 'scale-110' : ''}`}>{act.emoji}</span>
                                                {act.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* NOTE - Premium textarea */}
                                <div className="mb-6">
                                    <div className="relative my-6">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-700/40" />
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-gray-900/70 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan Harian</span>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/40 focus:bg-gray-800/70 text-white placeholder-gray-500 transition-all resize-none text-sm"
                                        rows={3}
                                        placeholder="Hari ini aku merasa..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    ></textarea>
                                </div>

                                <button
                                    onClick={handleSaveJournal}
                                    disabled={isSubmitting}
                                    className={`relative w-full font-bold py-4 rounded-xl flex justify-center items-center gap-2.5 transition-all overflow-hidden group text-white ${
                                        isSubmitting 
                                            ? 'bg-pink-800 cursor-not-allowed' 
                                            : 'bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 shadow-lg shadow-pink-500/25'
                                    }`}
                                >
                                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative flex items-center gap-2">
                                        <Send size={20} />
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal Hari Ini'}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* TIMELINE RIWAYAT */}
                <div className="max-w-3xl mx-auto">
                    <h3 className="text-2xl font-bold mb-6 text-white border-b border-gray-700/50 pb-3 drop-shadow-md flex items-center gap-2">
                        <Calendar size={24} className="text-pink-400" /> Riwayat Jurnal
                    </h3>

                    {isLoading ? (
                        <p className="text-center text-gray-300 py-10 animate-pulse drop-shadow">Memuat riwayatmu...</p>
                    ) : journals.length === 0 ? (
                        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-3xl p-10 flex flex-col items-center justify-center text-gray-400 text-center">
                            <BookHeart size={56} className="mb-4 opacity-40 text-pink-500" />
                            <p className="text-lg">Belum ada jurnal yang dicatat.<br/>Mulai catat perasaanmu hari ini!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {journals.map(journal => {
                                const moodData = MOODS.find(m => m.id === journal.mood) || MOODS[2];
                                const dateObj = new Date(journal.created_at);
                                const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={journal.id} className="relative pl-8 sm:pl-10 py-2">
                                        {/* Garis vertikal timeline */}
                                        <div className="absolute left-[15px] sm:left-[19px] top-0 bottom-0 w-0.5 bg-gray-700/50 z-0"></div>
                                        
                                        {/* Titik timeline (emoji mood) */}
                                        <div className={`absolute left-0 top-6 w-8 h-8 rounded-full flex items-center justify-center text-base z-10 ${moodData.color} shadow-lg ${moodData.glow}`}>
                                            {moodData.emoji}
                                        </div>

                                        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-5 shadow-lg ml-2 hover:border-pink-500/30 transition group shadow-black/20">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-white text-lg flex items-center gap-2 drop-shadow-sm">
                                                        {moodData.label} 
                                                    </h4>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                        <Clock size={12} /> {dateStr} pukul {timeStr}
                                                    </p>
                                                </div>
                                                <button onClick={() => confirmDelete(journal.id)} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition sm:opacity-0 sm:group-hover:opacity-100" title="Hapus Jurnal">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {journal.activities && journal.activities.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {journal.activities.map(actId => {
                                                        const actData = ACTIVITIES.find(a => a.id === actId);
                                                        if (!actData) return null;
                                                        return (
                                                            <span key={actId} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-800/80 border border-gray-600/50 text-gray-300 text-xs font-medium rounded-full backdrop-blur-sm">
                                                                <span>{actData.emoji}</span> {actData.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {journal.note && (
                                                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/30 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                    "{journal.note}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* CUSTOM ALERT MODAL (Replaces window.alert) */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-gray-900/90 border border-gray-700/50 p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl flex flex-col items-center text-center">
                        <div className={`p-4 rounded-full mb-4 border ${alertModal.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : alertModal.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                            {alertModal.type === 'error' ? <AlertTriangle size={36} /> : alertModal.type === 'success' ? <CheckCircle2 size={36} /> : <Info size={36} />}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Informasi</h3>
                        <p className="text-gray-300 mb-6 text-sm">{alertModal.message}</p>
                        <button onClick={() => setAlertModal({...alertModal, isOpen: false})} className="w-full py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-500 text-white transition shadow-lg shadow-pink-500/20">Siap, Paham!</button>
                    </div>
                </div>
            )}

            {/* CUSTOM DELETE CONFIRM MODAL (Replaces window.confirm) */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
                    <div className="bg-gray-900/90 border border-gray-700/50 p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-orange-500/10 p-4 rounded-full mb-4 border border-orange-500/20">
                                <AlertTriangle size={36} className="text-orange-500 drop-shadow-md" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Yakin Ingin Menghapus?</h3>
                            <p className="text-gray-300 mb-6 text-sm">
                                Catatan jurnal ini beserta seluruh memori hari tersebut akan terhapus selamanya secara permanen.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl font-semibold bg-gray-800 text-gray-200 hover:bg-gray-700 transition border border-gray-700/50">Urungkan</button>
                                <button onClick={executeDelete} className="flex-1 py-3 rounded-xl font-semibold bg-red-600/90 text-white hover:bg-red-500 transition shadow-lg shadow-red-500/20">Ya, Hapus Saja</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

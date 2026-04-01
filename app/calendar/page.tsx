"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, BookHeart, ListTodo, X, FileText, Clock, PlusCircle, Send } from 'lucide-react';

const MOODS = [
  { id: 'rad', emoji: '🤩', label: 'Luar Biasa', color: 'bg-emerald-500' },
  { id: 'good', emoji: '🙂', label: 'Senang', color: 'bg-green-400' },
  { id: 'meh', emoji: '😐', label: 'Biasa', color: 'bg-yellow-400' },
  { id: 'bad', emoji: '☹️', label: 'Buruk', color: 'bg-orange-500' },
  { id: 'awful', emoji: '😭', label: 'Hancur', color: 'bg-red-500' },
];

const ACTIVITIES = [
  { id: 'work', emoji: '💼', label: 'Kerja' }, { id: 'study', emoji: '📚', label: 'Belajar' },
  { id: 'coding', emoji: '💻', label: 'Ngoding' }, { id: 'reading', emoji: '📖', label: 'Membaca' },
  { id: 'writing', emoji: '📝', label: 'Menulis' }, { id: 'exercise', emoji: '🏃‍♂️', label: 'Olahraga' },
  { id: 'meditation', emoji: '🧘‍♂️', label: 'Meditasi' }, { id: 'gaming', emoji: '🎮', label: 'Main Game' },
  { id: 'music', emoji: '🎵', label: 'Musik' }, { id: 'movies', emoji: '🍿', label: 'Nonton' },
  { id: 'social', emoji: '👫', label: 'Nongkrong' }, { id: 'date', emoji: '👩‍❤️‍👨', label: 'Kencan' },
  { id: 'cleaning', emoji: '🧹', label: 'Bersih-bersih' }, { id: 'cooking', emoji: '🍳', label: 'Memasak' },
  { id: 'food', emoji: '🍔', label: 'Makan Enak' }, { id: 'coffee', emoji: '☕', label: 'Ngopi' },
  { id: 'shopping', emoji: '🛒', label: 'Belanja' }, { id: 'commute', emoji: '🚗', label: 'Jalan-jalan' },
  { id: 'sleep', emoji: '😴', label: 'Tidur' }, { id: 'sick', emoji: '🤒', label: 'Sakit' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Keluarga' }, { id: 'hobby', emoji: '🎨', label: 'Hobi' }
];

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<any[]>([]);
    const [journals, setJournals] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [dayData, setDayData] = useState<{ tasks: any[], journals: any[] }>({ tasks: [], journals: [] });

    // New Task Form State di dalam modal
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskNote, setNewTaskNote] = useState("");
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                window.location.href = "/login";
                return;
            }
            setUser(user);

            // Ambil semua Tasks user ini
            const { data: taskData } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('due_date', { ascending: true });
            if (taskData) setTasks(taskData);

            // Ambil semua Jurnal user ini
            const { data: journalData } = await supabase.from('journals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (journalData) setJournals(journalData);

            setIsLoading(false);
        };

        fetchData();
    }, []);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    // Konversi hari 0 (Minggu) agar Senin (1) jadi awal minggu jika diinginkan, tapi default AS (0=Minggu) juga ok. 
    // Kita pakai default JS 0 = Minggu
    const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const checkDateData = (day: number) => {
        const compareDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayJournals = journals.filter(j => {
            const jDate = new Date(j.created_at);
            return `${jDate.getFullYear()}-${String(jDate.getMonth() + 1).padStart(2, '0')}-${String(jDate.getDate()).padStart(2, '0')}` === compareDateStr;
        });

        const dayTasks = tasks.filter(t => t.due_date === compareDateStr);

        return { dayJournals, dayTasks };
    };

    const handleDayClick = (day: number) => {
        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const { dayJournals, dayTasks } = checkDateData(day);
        
        setSelectedDate(dateObj);
        setDayData({ tasks: dayTasks, journals: dayJournals });
        setIsAddingTask(false); // Reset form state
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !user || !selectedDate) return;
        
        setIsSubmittingTask(true);
        // Format tanggal sesuai standar YYYY-MM-DD lokal
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${selectedDate.getFullYear()}-${month}-${day}`;

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                title: newTaskTitle,
                note: newTaskNote,
                due_date: dateStr,
                completed: false,
                user_id: user.id
            }])
            .select();

        if (!error && data) {
            const newTask = data[0];
            setTasks([...tasks, newTask]); // Update state global calendar
            setDayData(prev => ({
                ...prev,
                tasks: [...prev.tasks, newTask].sort((a,b) => a.id - b.id) // Update list di modal
            }));
            setIsAddingTask(false);
            setNewTaskTitle("");
            setNewTaskNote("");
        } else {
            alert("Gagal menambahkan pengingat.");
            console.error(error);
        }
        setIsSubmittingTask(false);
    };

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    return (
        <div className="min-h-screen bg-transparent text-gray-100 font-sans pb-12 relative overflow-hidden">
            <nav className="bg-gray-900/70 backdrop-blur-md border-b border-gray-700/50 px-6 py-4 flex flex-wrap justify-between items-center sticky top-0 z-10 shadow-md gap-3">
                <h1 className="text-xl font-bold text-purple-400 flex items-center gap-2 drop-shadow-md">
                    <CalendarIcon size={24} /> Kalender NoteNala
                </h1>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <a href="/journal" className="flex items-center gap-2 bg-pink-600/90 hover:bg-pink-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-pink-500/30 font-medium backdrop-blur-sm flex-1 sm:flex-auto justify-center">
                        <BookHeart size={18} /> Jurnal
                    </a>
                    <a href="/" className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition border border-gray-700/50 backdrop-blur-sm shadow-md flex-1 sm:flex-auto justify-center">
                        <ArrowLeft size={18} /> Catatan Tugas
                    </a>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto p-4 md:p-6 relative z-0 mt-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse text-purple-400">
                        <CalendarIcon size={64} className="mb-4 opacity-50" />
                        <p className="text-xl font-semibold">Mengambil Data Waktu...</p>
                    </div>
                ) : (
                    <div className="bg-gray-900/60 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-700/50 mb-10">
                        {/* Header Kalender */}
                        <div className="flex justify-between items-center mb-8 border-b border-gray-700/50 pb-4">
                            <h2 className="text-3xl font-extrabold text-white flex items-center gap-3 drop-shadow-md">
                                {monthNames[currentDate.getMonth()]} <span className="text-purple-400">{currentDate.getFullYear()}</span>
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={prevMonth} className="p-3 bg-gray-800/80 hover:bg-purple-600 border border-gray-700/50 hover:border-purple-500 rounded-xl transition text-white backdrop-blur-sm shadow-lg"><ChevronLeft size={24} /></button>
                                <button onClick={nextMonth} className="p-3 bg-gray-800/80 hover:bg-purple-600 border border-gray-700/50 hover:border-purple-500 rounded-xl transition text-white backdrop-blur-sm shadow-lg"><ChevronRight size={24} /></button>
                            </div>
                        </div>

                        {/* Grid Kalender */}
                        <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
                            {weekDays.map(day => (
                                <div key={day} className="text-center font-bold text-gray-400 uppercase tracking-widest text-xs md:text-sm py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2 md:gap-4">
                            {blanksArray.map(b => (
                                <div key={`blank-${b}`} className="aspect-square bg-gray-800/20 rounded-2xl border border-dashed border-gray-700/30"></div>
                            ))}
                            {daysArray.map(day => {
                                const { dayJournals, dayTasks } = checkDateData(day);
                                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                                
                                return (
                                    <button 
                                        key={`day-${day}`} 
                                        onClick={() => handleDayClick(day)}
                                        className={`aspect-square flex flex-col items-center justify-start p-1 md:p-2 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${isToday ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/60 hover:border-purple-400/50'}`}
                                    >
                                        <span className={`font-bold text-sm md:text-lg mb-1 md:mb-2 ${isToday ? 'text-purple-300' : 'text-gray-300'}`}>{day}</span>
                                        
                                        <div className="flex flex-wrap justify-center gap-1 w-full h-full">
                                            {/* Indikator Jurnal */}
                                            {dayJournals.map((j, idx) => {
                                                const moodData = MOODS.find(m => m.id === j.mood);
                                                if (!moodData || idx > 2) return null; // Maksimal tampilkan 3 emoji agar tidak pecah
                                                return (
                                                    <span key={`j-${idx}`} className="text-sm md:text-2xl drop-shadow-md md:hover:scale-125 transition-transform" title={moodData.label}>
                                                        {moodData.emoji}
                                                    </span>
                                                );
                                            })}
                                            {/* Indikator Tugas/Pengingat */}
                                            {dayTasks.length > 0 && (
                                                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2" title={`${dayTasks.length} Tugas Menunggu`}>
                                                    <div className="flex items-center justify-center w-4 h-4 md:w-6 md:h-6 bg-blue-500 rounded-full text-[10px] md:text-xs font-bold text-white shadow-lg drop-shadow-sm border-2 border-gray-900 border-opacity-50">
                                                        {dayTasks.length}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL DETIL HARI */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-8">
                    <div className="bg-gray-900/90 border border-gray-700/50 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                        
                        <div className="flex justify-between items-center p-6 border-b border-gray-700/50 bg-gray-800/30">
                            <div>
                                <h3 className="text-2xl font-extrabold text-white flex items-center gap-3">
                                    <CalendarIcon className="text-purple-400"/> 
                                    {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                {(dayData.journals.length === 0 && dayData.tasks.length === 0) && (
                                    <p className="text-gray-400 mt-1">Belum ada peristiwa atau tugas di hari ini.</p>
                                )}
                            </div>
                            <button onClick={() => setSelectedDate(null)} className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700/50 rounded-xl transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            
                            {/* TOMBOL TAMBAH PENGINGAT (TASKS) */}
                            {!isAddingTask ? (
                                <button onClick={() => setIsAddingTask(true)} className="w-full py-4 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:text-blue-400 font-bold transition">
                                    <PlusCircle size={22} /> Buat Pengingat/Tugas di Hari Ini
                                </button>
                            ) : (
                                <form onSubmit={handleSaveTask} className="bg-gray-800/80 p-5 rounded-2xl border border-gray-600/50 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-200">
                                    <h4 className="font-bold text-white mb-2 flex flex-col text-lg">📝 Pengingat Baru</h4>
                                    <input 
                                        type="text" 
                                        placeholder="Judul Pengingat (Misal: Bayar Listrik)" 
                                        required 
                                        value={newTaskTitle} 
                                        onChange={e => setNewTaskTitle(e.target.value)} 
                                        className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition" 
                                    />
                                    <textarea 
                                        placeholder="Catatan tambahan (Opsional)" 
                                        rows={2} 
                                        value={newTaskNote} 
                                        onChange={e => setNewTaskNote(e.target.value)} 
                                        className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white resize-none transition" 
                                    />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setIsAddingTask(false)} disabled={isSubmittingTask} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition font-medium border border-gray-600">Batal</button>
                                        <button type="submit" disabled={isSubmittingTask} className={`flex-[2] py-3 text-white rounded-xl transition font-bold flex justify-center items-center gap-2 ${isSubmittingTask ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'}`}>
                                            <Send size={18} /> {isSubmittingTask ? 'Menyimpan...' : 'Simpan Pengingat'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* SECTION TUGAS (PENGINGAT) */}
                            {dayData.tasks.length > 0 && (
                                <section>
                                    <h4 className="text-lg font-bold text-blue-400 border-b border-gray-700/50 pb-2 mb-4 flex items-center gap-2">
                                        <ListTodo size={20} /> Pengingat Tugas Deadline
                                    </h4>
                                    <div className="space-y-3">
                                        {dayData.tasks.map(task => (
                                            <div key={task.id} className={`p-4 rounded-xl border border-gray-700/50 flex flex-col gap-1 ${task.completed ? 'bg-gray-800/30 opacity-60' : 'bg-gray-800/80 shadow-md'}`}>
                                                <div className="flex justify-between items-start">
                                                    <h5 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</h5>
                                                    {task.completed && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full border border-emerald-500/20">Selesai</span>}
                                                </div>
                                                {task.note && <p className="text-sm text-gray-400 line-clamp-2">{task.note}</p>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4">
                                        <a href="/" className="inline-block px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white rounded-lg transition text-sm font-medium border border-blue-500/30">
                                           Kelola Tugas Ini di Catatan &rarr;
                                        </a>
                                    </div>
                                </section>
                            )}

                            {/* SECTION JURNAL */}
                            {dayData.journals.length > 0 && (
                                <section>
                                    <h4 className="text-lg font-bold text-pink-400 border-b border-gray-700/50 pb-2 mb-4 flex items-center gap-2">
                                        <BookHeart size={20} /> Riwayat Emosi & Jurnal
                                    </h4>
                                    <div className="space-y-4">
                                        {dayData.journals.map(journal => {
                                            const moodObj = MOODS.find(m => m.id === journal.mood) || MOODS[2];
                                            const timeStr = new Date(journal.created_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
                                            
                                            return (
                                                <div key={journal.id} className="bg-gray-800/60 p-5 rounded-2xl border border-gray-700/50 shadow-md">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-gray-700 ${moodObj.color}`}>
                                                            {moodObj.emoji}
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-white">{moodObj.label}</h5>
                                                            <p className="text-xs text-gray-400"><Clock size={10} className="inline mr-1"/>Pukul {timeStr}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {journal.activities?.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {journal.activities.map((actId: string) => {
                                                                const act = ACTIVITIES.find(a => a.id === actId);
                                                                if(!act) return null;
                                                                return (
                                                                    <span key={actId} className="px-3 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300 font-medium border border-gray-600/50">
                                                                        {act.emoji} {act.label}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    
                                                    {journal.note && (
                                                        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/30 text-gray-300 text-sm whitespace-pre-wrap">
                                                            {journal.note}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

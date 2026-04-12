"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Sesuaikan path ini jika perlu
import {
  PlusCircle, FileText, FolderOpen, Send, Calendar, CheckCircle2,
  Circle, Pencil, Trash2, X, AlertTriangle, Clock, Search, User, LogOut, Coffee, BookHeart, Menu, Bot, Sparkles
} from 'lucide-react';

// Struktur data
interface Task {
  id: number;
  title: string;
  note: string;
  due_date: string | null;
  completed: boolean;
  user_id?: string;
}

export default function LandingPage() {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // STATE: Autentikasi & UI Profil
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // State untuk pencarian & Modal Hapus
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  // --- CEK LOGIN & AMBIL DATA SAAT DIBUKA ---
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      supabase.auth.onAuthStateChange(async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          window.location.href = "/reset-password";
          return;
        }
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        if (!window.location.hash.includes('type=recovery')) {
          window.location.href = "/login";
        }
        return;
      }

      setUser(user);

      setIsLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) setTasks(data);
      setIsLoading(false);
    };

    checkUserAndFetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getDaysLeftInfo = (dateString: string | null) => {
    if (!dateString) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: "Tenggat Hari Ini! 🚨", color: "text-red-400 bg-red-400/10 border-red-400/20" };
    if (diffDays === 1) return { text: "Besok! ⏰", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" };
    if (diffDays > 1 && diffDays <= 3) return { text: `${diffDays} hari lagi`, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
    if (diffDays > 3) return { text: `${diffDays} hari lagi`, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    return { text: `Terlambat ${Math.abs(diffDays)} hari ❌`, color: "text-red-500 bg-red-500/10 border-red-500/20" };
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !user) return;
    const finalDueDate = dueDate === "" ? null : dueDate;

    if (editingId !== null) {
      const { error } = await supabase
        .from('tasks')
        .update({ title, note, due_date: finalDueDate })
        .eq('id', editingId);

      if (!error) {
        setTasks(tasks.map(task =>
          task.id === editingId ? { ...task, title, note, due_date: finalDueDate } : task
        ));
        setEditingId(null);
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title, note, due_date: finalDueDate, completed: false, user_id: user.id }])
        .select();

      if (!error && data) setTasks([data[0], ...tasks]);
      else alert("Gagal menyimpan tugas. Pastikan RLS di database sudah diatur.");
    }

    setTitle("");
    setNote("");
    setDueDate("");
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setNote(task.note);
    setDueDate(task.due_date || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setNote("");
    setDueDate("");
  };

  const confirmDelete = (id: number) => {
    setTaskToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (taskToDelete !== null) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete);
      if (!error) setTasks(tasks.filter(task => task.id !== taskToDelete));
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const toggleTask = async (task: Task) => {
    const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    if (!error) setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <FileText size={48} className="text-blue-500 mb-4 opacity-50" />
          <p className="text-gray-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  return (
    // PERUBAHAN 1: bg-gray-900 diubah menjadi bg-transparent agar background wrapper terlihat
    <div className="min-h-screen bg-transparent text-gray-100 font-sans pb-12 relative">

      {/* PERUBAHAN 2: Navbar diberi efek kaca transparan & optimalisasi Mobile PWA */}
      <nav className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50 px-4 md:px-6 py-3 sticky top-0 z-20 shadow-sm pt-[max(env(safe-area-inset-top),0.75rem)] pb-[0.75rem]">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          
          {/* Kiri: Logo */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-blue-500/50 p-[2px] shadow-sm flex items-center justify-center bg-white/5">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full rounded-full object-cover object-center" />
            </div>
          </div>

          {/* Tengah: Search (Pindah ke bawah di mobile) */}
          <div className="order-last sm:order-none w-full sm:w-auto sm:flex-1 max-w-lg mt-3 sm:mt-0 relative group">
            <Search className="absolute left-3 top-2.5 md:top-3 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Cari tugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950/50 sm:bg-gray-900/80 border border-gray-600/70 text-gray-100 placeholder-gray-400 text-[16px] md:text-sm px-10 py-2.5 md:py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-900/90 transition-all touch-manipulation"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 md:top-3 text-gray-400 hover:text-white transition-colors touch-manipulation">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Kanan: Profil & Hamburger */}
          <div className="flex gap-2.5 md:gap-3 items-center flex-shrink-0">
          
          {/* Ikon Profil */}
          <div className="relative">
            <button
              onClick={() => { setIsProfileOpen(!isProfileOpen); setIsMenuOpen(false); }}
              className="p-1 border-2 border-transparent hover:border-blue-500 rounded-full transition overflow-hidden"
              title="Menu Akun"
            >
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profil" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center border border-gray-600">
                  <User size={18} className="text-gray-200" />
                </div>
              )}
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 border-b border-gray-700/50 bg-gray-900/50 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-xl font-bold text-white mb-2 shadow-lg border-2 border-gray-700">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Profil" className="w-full h-full object-cover" />
                      ) : (
                        user.email?.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <p className="text-sm text-white font-semibold truncate w-full text-center">{user.email}</p>
                  </div>
                  <a href="/profile" className="w-full text-left px-5 py-4 text-gray-300 hover:bg-gray-700/70 hover:text-white flex items-center gap-3 transition font-medium border-b border-gray-700/50">
                    <User size={18} /> Pengaturan Profil
                  </a>
                  <button onClick={handleLogout} className="w-full text-left px-5 py-4 text-red-400 hover:bg-gray-700/70 flex items-center gap-3 transition font-medium">
                    <LogOut size={18} /> Keluar Akun
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Ikon Hamburger (App Menu) di paling ujung kanan */}
          <div className="relative">
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsProfileOpen(false); }}
              className="p-2 border border-gray-700 hover:border-blue-500 bg-gray-800/80 hover:bg-gray-700 rounded-xl transition text-white shadow-md backdrop-blur-sm"
              title="Menu Aplikasi"
            >
              <Menu size={20} />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-gray-700/50 bg-gray-900/40">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-2">Navigasi Fitur</p>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    <a href="/chat" className="w-full px-4 py-3 bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/40 hover:to-purple-600/40 text-gray-200 hover:text-white rounded-xl transition flex items-center justify-between gap-3 border border-pink-500/30 font-semibold shadow-lg shadow-purple-500/10 mb-1 group">
                      <div className="flex items-center gap-3">
                        <Bot size={18} className="text-pink-400 group-hover:scale-110 transition" /> Nala AI Hub
                      </div>
                      <Sparkles size={14} className="text-yellow-400 animate-pulse" />
                    </a>
                    <a href="/calendar" className="w-full px-4 py-3 bg-gray-900/30 hover:bg-purple-600/20 text-gray-200 hover:text-purple-300 rounded-xl transition flex items-center gap-3 border border-transparent hover:border-purple-500/30">
                      <Calendar size={18} className="text-purple-400" /> Kalender Misi
                    </a>
                    <a href="/journal" className="w-full px-4 py-3 bg-gray-900/30 hover:bg-pink-600/20 text-gray-200 hover:text-pink-300 rounded-xl transition flex items-center gap-3 border border-transparent hover:border-pink-500/30">
                      <BookHeart size={18} className="text-pink-400" /> Jurnal Harian
                    </a>
                    <a href="/drive" className="w-full px-4 py-3 bg-gray-900/30 hover:bg-blue-600/20 text-gray-200 hover:text-blue-300 rounded-xl transition flex items-center gap-3 border border-transparent hover:border-blue-500/30">
                      <FolderOpen size={18} className="text-blue-400" /> NoteNala Drive
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
          
        </div>
      </div>
    </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 md:p-6 relative z-0 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {!searchQuery && (
          <>
            <section className="mb-8 mt-4 text-center">
              <h2 className="text-3xl font-extrabold mb-2 text-white drop-shadow-md">Tugas Tugas Mendatang</h2>
              <p className="text-gray-200 text-lg drop-shadow">Jangan Ditunda tunda selesaikan yang mudah dulu :D</p>
            </section>

            <div className="space-y-10 mb-10">
              {/* PERUBAHAN 3: Kartu form input diberi efek transparan glassmorphism */}
              <div className="bg-gray-900/60 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-gray-700/50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                    {editingId !== null ? (
                      <><Pencil size={22} className="text-yellow-400" /> Edit Catatan</>
                    ) : (
                      <><PlusCircle size={22} className="text-blue-400" /> Buat Catatan Baru</>
                    )}
                  </h3>
                  {editingId !== null && (
                    <button onClick={handleCancelEdit} className="text-gray-400 hover:text-red-400 flex items-center gap-1 text-sm transition">
                      <X size={16} /> Batal Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveNote} className="space-y-4 md:space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Judul Tugas..."
                      className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition text-[16px] md:text-sm touch-manipulation"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition pl-10 custom-date-input text-[16px] md:text-sm touch-manipulation"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                      <Calendar size={18} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <textarea
                    placeholder="Tulis detail atau instruksi tugas di sini..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition resize-none text-[16px] md:text-sm touch-manipulation"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  ></textarea>

                  <button
                    type="submit"
                    className={`w-full font-semibold py-3 rounded-xl flex justify-center items-center gap-2 transition shadow-lg ${editingId !== null
                      ? 'bg-yellow-600/90 hover:bg-yellow-500 text-white shadow-yellow-500/20 backdrop-blur-sm'
                      : 'bg-blue-600/90 hover:bg-blue-500 text-white shadow-blue-500/20 backdrop-blur-sm'
                      }`}
                  >
                    {editingId !== null ? <Pencil size={18} /> : <Send size={18} />}
                    {editingId !== null ? 'Simpan Perubahan' : 'Simpan ke Daftar'}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        <div>
          <h3 className="text-2xl font-bold mb-6 text-white border-b border-gray-700/50 pb-3 drop-shadow-md">
            {searchQuery ? `Hasil Pencarian: "${searchQuery}"` : 'Daftar Tugasmu'}
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <p className="text-center text-gray-300 py-10 animate-pulse drop-shadow">Memuat tugas...</p>
            ) : filteredTasks.length === 0 ? (
              // PERUBAHAN 4: State kosong transparan
              <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-10 flex flex-col items-center justify-center text-gray-400">
                {searchQuery ? (
                  <>
                    <Search size={48} className="mb-3 opacity-40" />
                    <p>Tugas "{searchQuery}" tidak ditemukan.</p>
                  </>
                ) : (
                  <>
                    <FileText size={48} className="mb-3 opacity-40" />
                    <p>Belum ada tugas yang dicatat. Santai dulu! ☕</p>
                  </>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const daysLeft = getDaysLeftInfo(task.due_date);

                return (
                  // PERUBAHAN 5: Kartu list tugas transparan & optimal untuk Mobile
                  <div
                    key={task.id}
                    className={`p-4 md:p-5 rounded-2xl border flex gap-3 md:gap-4 transition shadow-sm backdrop-blur-md ${task.completed
                      ? 'bg-gray-900/50 border-gray-800/50 opacity-80'
                      : 'bg-gray-900/80 border-gray-700/60 hover:border-blue-500/50 hover:bg-gray-800/90'
                      }`}
                  >
                    <div className="pt-0.5">
                      <button onClick={() => toggleTask(task)} className="focus:outline-none flex-shrink-0 touch-manipulation active:scale-95 transition-transform">
                        {task.completed ? (
                          <CheckCircle2 size={24} className="text-green-500 drop-shadow-sm" />
                        ) : (
                          <Circle size={24} className="text-gray-400 hover:text-blue-400 transition" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row md:items-center min-w-0">
                      <div className="flex-1 min-w-0 md:pr-4">
                        <h4 className={`text-base md:text-lg font-semibold truncate ${task.completed ? 'line-through text-gray-500' : 'text-gray-100 drop-shadow-sm'}`}>
                          {task.title}
                        </h4>
                        {task.note && (
                          <p className={`mt-1 text-sm ${task.completed ? 'text-gray-600' : 'text-gray-300'} line-clamp-2 md:line-clamp-none`}>
                            {task.note}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2.5 md:mt-3 text-xs md:text-sm font-medium">
                          {task.due_date ? (
                            <>
                              <span className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-full ${task.completed ? 'bg-gray-800/60 text-gray-500' : 'bg-gray-800/80 text-gray-300 border border-gray-700/50'}`}>
                                <Calendar size={13} />
                                {new Date(task.due_date).toLocaleDateString('id-ID', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </span>

                              {!task.completed && daysLeft && (
                                <span className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-full border ${daysLeft.color} backdrop-blur-sm`}>
                                  <Clock size={13} />
                                  {daysLeft.text}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-full bg-gray-800/60 text-gray-400 border border-gray-700/50">
                              <Coffee size={13} /> Kapan saja
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-end gap-1.5 md:gap-2 pt-3 mt-3 md:pt-0 md:mt-0 border-t border-gray-700/30 md:border-t-0 md:border-l md:border-gray-700/50 md:pl-4">
                        <button
                          onClick={() => handleEdit(task)}
                          disabled={task.completed}
                          className={`p-2 lg:p-2.5 rounded-xl transition touch-manipulation ${task.completed ? 'text-gray-600 cursor-not-allowed hidden md:block' : 'text-yellow-500 hover:bg-yellow-500/10 active:bg-yellow-500/20 bg-gray-800/40 md:bg-transparent'}`}
                          title="Edit Tugas"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => confirmDelete(task.id)}
                          className={`p-2 lg:p-2.5 rounded-xl transition touch-manipulation ${task.completed ? 'text-red-500/50 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20 bg-gray-800/40 md:bg-transparent'}`}
                          title="Hapus Tugas"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* CUSTOM MODAL HAPUS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-gray-900/90 border border-gray-700/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500/10 p-4 rounded-full mb-4 border border-red-500/20">
                <AlertTriangle size={36} className="text-red-500 drop-shadow-md" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Hapus Tugas?</h3>
              <p className="text-gray-300 mb-6 text-sm">
                Tugas ini akan dihapus secara permanen dan tidak dapat dikembalikan.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-medium bg-gray-800 text-gray-200 hover:bg-gray-700 transition border border-gray-700/50"
                >
                  Batal
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-2.5 rounded-xl font-medium bg-red-600/90 text-white hover:bg-red-500 transition shadow-lg shadow-red-500/20 backdrop-blur-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        ::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
      `}} />
    </div>
  );
}
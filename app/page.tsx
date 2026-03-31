"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Sesuaikan path ini jika perlu
import {
  PlusCircle, FileText, FolderOpen, Send, Calendar, CheckCircle2,
  Circle, Pencil, Trash2, X, AlertTriangle, Clock, Search, User, LogOut
} from 'lucide-react';

// Struktur data (menyesuaikan kolom di database)
interface Task {
  id: number;
  title: string;
  note: string;
  due_date: string;
  completed: boolean;
  user_id?: string; // Menambahkan opsional user_id
}

export default function LandingPage() {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // STATE BARU: Autentikasi & UI Profil
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // State untuk menyimpan teks pencarian
  const [searchQuery, setSearchQuery] = useState("");

  // State untuk Custom Modal Hapus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  // --- CEK LOGIN & AMBIL DATA SAAT DIBUKA ---
  // --- CEK LOGIN & AMBIL DATA SAAT DIBUKA ---
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      // 1. Tambahkan Listener untuk mendeteksi event PASSWORD_RECOVERY
      supabase.auth.onAuthStateChange(async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          window.location.href = "/reset-password";
          return;
        }
      });

      // 2. Cek apakah ada user yang sedang login
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Cek apakah URL mengandung link recovery (agar tidak mental ke login saat proses reset)
        if (!window.location.hash.includes('type=recovery')) {
          window.location.href = "/login";
        }
        return;
      }

      setUser(user);

      // 3. Ambil data tugas
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
  // --- FUNGSI LOGOUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Fungsi menghitung sisa hari
  const getDaysLeftInfo = (dateString: string) => {
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

  // --- SIMPAN / UPDATE KE DATABASE ---
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate || !user) return;

    if (editingId !== null) {
      // Update
      const { error } = await supabase
        .from('tasks')
        .update({ title, note, due_date: dueDate })
        .eq('id', editingId);

      if (!error) {
        setTasks(tasks.map(task =>
          task.id === editingId ? { ...task, title, note, due_date: dueDate } : task
        ));
        setEditingId(null);
      }
    } else {
      // Simpan Baru dengan menyisipkan user_id
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title,
          note,
          due_date: dueDate,
          completed: false,
          user_id: user.id // <-- PENTING: Menambahkan pemilik tugas
        }])
        .select();

      if (!error && data) {
        setTasks([data[0], ...tasks]);
      } else {
        alert("Gagal menyimpan tugas. Pastikan RLS di database sudah diatur.");
      }
    }

    setTitle("");
    setNote("");
    setDueDate("");
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setNote(task.note);
    setDueDate(task.due_date);
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

  // --- HAPUS DARI DATABASE ---
  const executeDelete = async () => {
    if (taskToDelete !== null) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete);

      if (!error) {
        setTasks(tasks.filter(task => task.id !== taskToDelete));
      }
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  // --- UPDATE STATUS SELESAI ---
  const toggleTask = async (task: Task) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id);

    if (!error) {
      setTasks(tasks.map(t =>
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ));
    }
  };

  // LOGIKA PENCARIAN (Filter data secara real-time)
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Jika user belum dimuat, tampilkan loading layar penuh
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <FileText size={48} className="text-blue-500 mb-4 opacity-50" />
          <p className="text-gray-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans pb-12 relative">

      {/* Navbar Diperbarui dengan Search Bar & Profile */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-10 shadow-md gap-4 sm:gap-0">
        <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2 whitespace-nowrap">
          <FileText size={24} /> NoteNala
        </h1>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-md md:mx-4">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari tugas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 text-white px-10 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Menu Kanan: Tombol Drive & Profil */}
        <div className="flex gap-3 w-full sm:w-auto items-center justify-end">
          <a
            href="/drive"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/30 font-medium"
          >
            <FolderOpen size={18} /> Drive
          </a>

          {/* DROPDOWN PROFIL BARU */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="p-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl transition border border-gray-600 flex items-center justify-center"
              title="Menu Akun"
            >
              <User size={18} className="text-gray-200" />
            </button>

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-700 bg-gray-900/50">
                    <p className="text-xs text-gray-400 font-medium mb-1">Masuk sebagai:</p>
                    <p className="text-sm text-white font-semibold truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-700 flex items-center gap-3 transition font-medium"
                  >
                    <LogOut size={18} /> Keluar Akun
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">

        {/* Sembunyikan Header & Form jika sedang mencari, agar fokus ke hasil pencarian */}
        {!searchQuery && (
          <>
            <section className="mb-8 mt-4 text-center">
              <h2 className="text-3xl font-extrabold mb-2 text-white">Tugas Tugas Mendatang</h2>
              <p className="text-gray-400 text-lg">Jangan Ditunda tunda selesaikan yang mudah dulu :D</p>
            </section>

            <div className="space-y-10 mb-10">
              {/* Form Buat/Edit */}
              <div className="bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg border border-gray-700">
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

                <form onSubmit={handleSaveNote} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Judul Tugas..."
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition pl-10 custom-date-input"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                      />
                      <Calendar size={18} className="absolute left-3 top-3.5 text-gray-400" />
                    </div>
                  </div>

                  <textarea
                    placeholder="Tulis detail atau instruksi tugas di sini..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition resize-none"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  ></textarea>

                  <button
                    type="submit"
                    className={`w-full font-semibold py-3 rounded-xl flex justify-center items-center gap-2 transition shadow-lg ${editingId !== null
                      ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-500/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
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

        {/* Daftar Tugas (Menggunakan filteredTasks) */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-white border-b border-gray-700 pb-3">
            {searchQuery ? `Hasil Pencarian: "${searchQuery}"` : 'Daftar Tugasmu'}
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <p className="text-center text-gray-400 py-10 animate-pulse">Memuat tugas...</p>
            ) : filteredTasks.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 flex flex-col items-center justify-center text-gray-500">
                {searchQuery ? (
                  <>
                    <Search size={48} className="mb-3 opacity-20" />
                    <p>Tugas "{searchQuery}" tidak ditemukan.</p>
                  </>
                ) : (
                  <>
                    <FileText size={48} className="mb-3 opacity-20" />
                    <p>Belum ada tugas yang dicatat. Santai dulu! ☕</p>
                  </>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const daysLeft = getDaysLeftInfo(task.due_date);

                return (
                  <div
                    key={task.id}
                    className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center gap-4 transition ${task.completed
                      ? 'bg-gray-900 border-gray-700 opacity-60'
                      : 'bg-gray-800 border-gray-600 hover:border-blue-500'
                      }`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <button onClick={() => toggleTask(task)} className="mt-1 focus:outline-none flex-shrink-0">
                        {task.completed ? (
                          <CheckCircle2 size={26} className="text-green-400" />
                        ) : (
                          <Circle size={26} className="text-gray-400 hover:text-blue-400 transition" />
                        )}
                      </button>

                      <div className="flex-1">
                        <h4 className={`text-lg font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                          {task.title}
                        </h4>
                        {task.note && (
                          <p className={`mt-1 text-sm ${task.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                            {task.note}
                          </p>
                        )}

                        {/* Info Tanggal & Sisa Hari */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm font-medium">
                          <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${task.completed ? 'bg-gray-800 text-gray-600' : 'bg-gray-700 text-gray-300'}`}>
                            <Calendar size={14} />
                            {new Date(task.due_date).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </span>

                          {/* Label Sisa Hari */}
                          {!task.completed && (
                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full border ${daysLeft.color}`}>
                              <Clock size={14} />
                              {daysLeft.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi */}
                    <div className="flex items-center gap-2 md:pl-4 md:border-l md:border-gray-700 pt-4 md:pt-0 border-t border-gray-700 mt-2 md:mt-0 w-full md:w-auto justify-end">
                      <button
                        onClick={() => handleEdit(task)}
                        disabled={task.completed}
                        className={`p-2 rounded-lg transition ${task.completed ? 'text-gray-600 cursor-not-allowed' : 'text-yellow-400 hover:bg-gray-700'}`}
                        title="Edit Tugas"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => confirmDelete(task.id)}
                        className="p-2 text-red-400 hover:bg-gray-700 hover:text-red-300 rounded-lg transition"
                        title="Hapus Tugas"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* CUSTOM MODAL HAPUS TUGAS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500/10 p-4 rounded-full mb-4">
                <AlertTriangle size={36} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Hapus Tugas?</h3>
              <p className="text-gray-400 mb-6 text-sm">
                Tugas ini akan dihapus secara permanen dan tidak dapat dikembalikan.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition"
                >
                  Batal
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-2.5 rounded-xl font-medium bg-red-600 text-white hover:bg-red-500 transition shadow-lg shadow-red-500/20"
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
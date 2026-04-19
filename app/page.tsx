"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; // Sesuaikan path ini jika perlu
import { getCachedTasks, saveTasksToCache, addSyncQueue, getSyncQueue, removeSyncQueueItem } from './utils/db';
import {
  PlusCircle, FileText, FolderOpen, Send, Calendar, CheckCircle2,
  Circle, Pencil, Trash2, X, AlertTriangle, Clock, Search, User, LogOut, Coffee, BookHeart, Menu, Bot, Sparkles,
  ListChecks, Plus, ChevronDown, ChevronUp, Square, CheckSquare,
  Tag, AlertCircle, GraduationCap, Briefcase, Loader2, Mic, Wifi, WifiOff, ImagePlus
} from 'lucide-react';

// Struktur data
interface Task {
  id: number;
  title: string;
  note: string;
  due_date: string | null;
  completed: boolean;
  user_id?: string;
  category?: string;
}

const CATEGORIES = [
  { id: 'Biasa', label: 'Biasa', icon: Tag, color: 'text-gray-400', bg: 'bg-gray-800/60', border: 'border-gray-600/50', ring: 'ring-gray-400' },
  { id: 'Urgent', label: 'Urgent', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', ring: 'ring-red-500/50' },
  { id: 'Kuliah', label: 'Kuliah', icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', ring: 'ring-blue-500/50' },
  { id: 'Pribadi', label: 'Pribadi', icon: User, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'ring-emerald-500/50' },
  { id: 'Pekerjaan', label: 'Pekerjaan', icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', ring: 'ring-amber-500/50' },
];

interface SubTask {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
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

  // STATE: Sub-tasks & Categories
  const [taskCategory, setTaskCategory] = useState("Biasa");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [subtasksMap, setSubtasksMap] = useState<Record<number, SubTask[]>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [newSubtaskText, setNewSubtaskText] = useState<Record<number, string>>({});
  const [breakingTaskIds, setBreakingTaskIds] = useState<Set<number>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // AI Vision
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingVision, setIsProcessingVision] = useState(false);
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);

  // STATE: Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // OFFLINE INDICATOR DETECTOR
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); flushSyncQueue(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flushSyncQueue = async () => {
    const queue = await getSyncQueue();
    if (queue.length === 0) return;
    
    showToast(`Mensinkronisasi ${queue.length} tugas ke database...`, "success");
    let hasError = false;

    for (const item of queue) {
      try {
        if (item.action === 'INSERT') {
          const { id: _, ...payloadWithoutId } = item.payload; // Buang ID temporary
          const { error } = await supabase.from('tasks').insert([payloadWithoutId]);
          if (error) throw error;
        } else if (item.action === 'UPDATE') {
          if (item.payload.id > 0) {
              const { error } = await supabase.from('tasks').update(item.payload).eq('id', item.payload.id);
              if (error) throw error;
          }
        } else if (item.action === 'DELETE') {
          if (item.payload.id > 0) {
             const { error } = await supabase.from('tasks').delete().eq('id', item.payload.id);
             if (error) throw error;
          }
        }
        await removeSyncQueueItem(item.id!);
      } catch (err) {
        console.error("Flush queue error for item", item, err);
        hasError = true;
      }
    }
    
    if (!hasError) {
      showToast("Tugas luring berhasil disinkronkan ke server!", "success");
      // Refetch from supabase to get real IDs
      if (user) {
        const { data } = await supabase.from('tasks').select('*').order('id', { ascending: false });
        if (data) {
            setTasks(data);
            saveTasksToCache(data);
        }
      }
    } else {
      showToast("Sebagian tugas gagal tersinkronisasi.", "error");
    }
  };

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
          window.location.href = "/landing";
        }
        return;
      }

      setUser(user);
      setIsLoading(true);

      // Ambil lokal cache IDB dulu biar PWA cepat! Ajaib!!
      const localTasks = await getCachedTasks();
      if (localTasks && localTasks.length > 0) {
        setTasks(localTasks);
      }

      // Selalu cek backend jika tersambung internet untuk memastikan up-to-date
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('id', { ascending: false });

        if (!error && data) {
          setTasks(data);
          saveTasksToCache(data); // Pertahankan Cache yang terbaru
        }
      }

      // Subtasks Fetching (Sederhana, offline subtasks tidak sepenuhnya dikelola versi ini)
      if (navigator.onLine) {
        const { data: subData } = await supabase
          .from('subtasks')
          .select('*')
          .order('id', { ascending: true });

        if (subData) {
          const grouped: Record<number, SubTask[]> = {};
          subData.forEach((s: SubTask) => {
            if (!grouped[s.task_id]) grouped[s.task_id] = [];
            grouped[s.task_id].push(s);
          });
          setSubtasksMap(grouped);
        }
      }
      setIsLoading(false);
    };

    checkUserAndFetchData();
  }, [user?.id]);

  // --- SET APP BADGE INDIKATOR PWA ---
  useEffect(() => {
    if ('setAppBadge' in navigator && 'clearAppBadge' in navigator && user) {
      const pendingCount = tasks.filter(task => !task.completed).length;
      try {
        if (pendingCount > 0) {
          navigator.setAppBadge(pendingCount);
        } else {
          navigator.clearAppBadge();
        }
      } catch (err) {
        console.error("Gagal memasang App Badge:", err);
      }
    }
  }, [tasks, user]);

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
        .update({ title, note, due_date: finalDueDate, category: taskCategory })
        .eq('id', editingId);

      if (!error) {
        setTasks(tasks.map(task =>
          task.id === editingId ? { ...task, title, note, due_date: finalDueDate, category: taskCategory } : task
        ));
        saveTasksToCache(tasks.map(task =>
          task.id === editingId ? { ...task, title, note, due_date: finalDueDate, category: taskCategory } : task
        ));
        setEditingId(null);
      }
    } else {
      const newTaskData = { title, note, due_date: finalDueDate, completed: false, user_id: user.id, category: taskCategory, created_at: new Date().toISOString() };
      
      if (!isOnline) {
        const tempId = -Math.round(Math.random() * 1000000000);
        const optimisticTask = { id: tempId, ...newTaskData };
        setTasks([optimisticTask, ...tasks]);
        saveTasksToCache([optimisticTask, ...tasks]);
        await addSyncQueue('INSERT', optimisticTask, tempId);
        showToast("Disimpan lokal saat luring.", "success");
        setTitle("");
        setNote("");
        setDueDate("");
        setTaskCategory("Biasa");
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTaskData])
        .select();

      if (!error && data) {
        const newTaskId = data[0].id;
        setTasks([data[0], ...tasks]);
        saveTasksToCache([data[0], ...tasks]);

        if (draftSubtasks.length > 0) {
           const newSubs = draftSubtasks.map(t => ({ task_id: newTaskId, title: t, completed: false }));
           const { data: insertedSubs } = await supabase.from('subtasks').insert(newSubs).select();
           if (insertedSubs) {
               setSubtasksMap(prev => ({ ...prev, [newTaskId]: insertedSubs }));
               setExpandedTasks(prev => new Set(prev).add(newTaskId));
           }
        }

        showToast("Tugas berhasil ditambahkan!", "success");
      } else {
        showToast("Gagal menyimpan tugas. Pastikan koneksi aman.", "error");
      }
    }

    setTitle("");
    setNote("");
    setDueDate("");
    setTaskCategory("Biasa");
    setDraftSubtasks([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
       showToast("Format file tidak didukung. Harap unggah gambar.", "error");
       return;
    }

    setIsProcessingVision(true);
    showToast("Menganalisis gambar dengan AI Vision...", "success");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
       const base64Str = reader.result as string;
       const pureBase64 = base64Str.split(',')[1];
       
       try {
          const response = await fetch('/api/parse-vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: pureBase64, mimeType: file.type })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);

          if (data.title) setTitle(data.title);
          if (data.due_date) setDueDate(data.due_date);
          if (data.category) setTaskCategory(data.category);
          if (data.note) setNote(data.note);
          if (data.subtasks && Array.isArray(data.subtasks) && data.subtasks.length > 0) {
             setDraftSubtasks(data.subtasks);
          }
          
          showToast("AI Vision berhasil mengurai gambar!", "success");
       } catch (err: any) {
          console.error("Vision AI Error:", err);
          showToast(err.message || "Gagal memproses gambar dengan AI.", "error");
       } finally {
          setIsProcessingVision(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
       }
    };
  };

  const startRecording = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Browser Anda tidak mendukung perekaman suara (Web Speech API).", "error");
      return;
    }

    if (isRecording || isProcessingVoice) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      setIsProcessingVoice(true);
      showToast("Menganalisis suaramu dengan AI...", "success");
      
      try {
        const response = await fetch('/api/parse-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (data.title) setTitle(data.title);
        if (data.due_date) setDueDate(data.due_date);
        if (data.category) setTaskCategory(data.category);
        
        // Gabungkan catatan jika ada, biarkan yang sebelumnya
        if (data.note) {
           setNote(prev => prev ? `${prev} ${data.note}` : data.note);
        }

        showToast(`Voila! Sihir AI berhasil mengisi formmu.`, "success");
      } catch (err: any) {
        console.error("Parse Voice Error:", err);
        showToast(err.message || "Gagal mengisi form otomatis dengan AI.", "error");
        // Kalau gagal, minimal teks masuk ke note
        setNote(prev => prev ? `${prev} ${transcript}` : transcript);
      } finally {
        setIsProcessingVoice(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        showToast("Akses mikrofon ditolak. Periksa izin browser Anda.", "error");
      } else {
        showToast(`Kesalahan merekam suara: ${event.error}`, "error");
      }
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setNote(task.note);
    setDueDate(task.due_date || "");
    setTaskCategory(task.category || "Biasa");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setNote("");
    setDueDate("");
    setTaskCategory("Biasa");
  };

  const confirmDelete = (id: number) => {
    setTaskToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (taskToDelete !== null) {
      if (!isOnline) {
        setTasks(tasks.filter(task => task.id !== taskToDelete));
        saveTasksToCache(tasks.filter(task => task.id !== taskToDelete));
        await addSyncQueue('DELETE', { id: taskToDelete });
        setIsDeleteModalOpen(false);
        setTaskToDelete(null);
        showToast("Dihapus sementara luring.", "success");
        return;
      }

      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete);
      if (!error) {
        setTasks(tasks.filter(task => task.id !== taskToDelete));
        saveTasksToCache(tasks.filter(task => task.id !== taskToDelete));
      }
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const toggleTask = async (task: Task) => {
    const updated = { ...task, completed: !task.completed };
    if (!isOnline) {
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
      saveTasksToCache(tasks.map(t => t.id === task.id ? updated : t));
      await addSyncQueue('UPDATE', updated);
      showToast("Status tersimpan saat luring.", "success");
      return;
    }

    const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
      saveTasksToCache(tasks.map(t => t.id === task.id ? updated : t));
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "Semua" || (task.category || "Biasa") === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // --- SUB-TASK FUNCTIONS ---
  const toggleExpandTask = (taskId: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const addSubtask = async (taskId: number) => {
    const text = (newSubtaskText[taskId] || "").trim();
    if (!text) return;

    const { data, error } = await supabase
      .from('subtasks')
      .insert([{ task_id: taskId, title: text, completed: false }])
      .select();

    if (!error && data) {
      setSubtasksMap(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), data[0]]
      }));
      setNewSubtaskText(prev => ({ ...prev, [taskId]: "" }));
    }
  };

  const toggleSubtask = async (subtask: SubTask) => {
    const { error } = await supabase
      .from('subtasks')
      .update({ completed: !subtask.completed })
      .eq('id', subtask.id);

    if (!error) {
      setSubtasksMap(prev => ({
        ...prev,
        [subtask.task_id]: (prev[subtask.task_id] || []).map(s =>
          s.id === subtask.id ? { ...s, completed: !s.completed } : s
        )
      }));
    }
  };

  const deleteSubtask = async (subtask: SubTask) => {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtask.id);

    if (!error) {
      setSubtasksMap(prev => ({
        ...prev,
        [subtask.task_id]: (prev[subtask.task_id] || []).filter(s => s.id !== subtask.id)
      }));
    }
  };

  const getSubtaskProgress = (taskId: number) => {
    const subs = subtasksMap[taskId] || [];
    if (subs.length === 0) return null;
    const done = subs.filter(s => s.completed).length;
    const percent = Math.round((done / subs.length) * 100);
    return { done, total: subs.length, percent };
  };

  const handleAIBreakdown = async (task: Task) => {
    setBreakingTaskIds(prev => new Set(prev).add(task.id));

    try {
      const response = await fetch('/api/ai-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: task.title, taskNote: task.note })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const subtasksText = data.subtasks as string[];
      if (!subtasksText || subtasksText.length === 0) throw new Error("AI tidak mengembalikan subtask.");
      
      const newSubs = subtasksText.map(t => ({
        task_id: task.id,
        title: t,
        completed: false
      }));

      const { data: inserted, error } = await supabase
        .from('subtasks')
        .insert(newSubs)
        .select();

      if (!error && inserted) {
        setSubtasksMap(prev => ({
          ...prev,
          [task.id]: [...(prev[task.id] || []), ...inserted]
        }));
        
        setExpandedTasks(prev => {
           const next = new Set(prev);
           next.add(task.id);
           return next;
        });
        showToast("AI berhasil menambahkan langkah-langkah!", "success");
      }
    } catch (err: any) {
      console.error("AI Breakdown Error:", err);
      showToast(err.message || "Gagal memecah tugas menggunakan AI.", "error");
    } finally {
      setBreakingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-xl max-w-sm backdrop-blur-md ${toastType === 'error' ? 'bg-red-900/80 border-red-700/50 text-red-100' : 'bg-emerald-900/80 border-emerald-700/50 text-emerald-100'}`}>
            {toastType === 'error' ? <AlertTriangle size={20} className="text-red-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
            <span className="text-sm font-medium leading-tight">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* PERUBAHAN 2: Navbar diberi efek kaca transparan & optimalisasi Mobile PWA */}
      <nav className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50 px-4 md:px-6 py-3 sticky top-0 z-20 shadow-sm pt-[max(env(safe-area-inset-top),0.75rem)] pb-[0.75rem]">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          
          {/* Kiri: Logo */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-blue-500/50 shadow-sm shadow-blue-500/20 flex items-center justify-center overflow-hidden bg-white/5">
              <img src="/logo-v2.png" alt="Logo" className="w-full h-full rounded-full object-cover object-center" />
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
              {/* Form Catatan Premium */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
                {/* Gradient accent top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                
                <div className="bg-gray-900/70 backdrop-blur-xl p-6 md:p-8 border border-gray-700/40 border-t-0 rounded-b-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${editingId !== null ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                        {editingId !== null ? (
                          <Pencil size={20} className="text-yellow-400" />
                        ) : (
                          <PlusCircle size={20} className="text-blue-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {editingId !== null ? 'Edit Catatan' : 'Buat Catatan Baru'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {editingId !== null ? 'Perbarui detail tugasmu' : 'Tambahkan tugas baru ke daftarmu'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {/* AI Vision Kamera */}
                      <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isProcessingVoice || isProcessingVision} className={`p-2 md:p-2.5 rounded-xl transition shadow-sm ${isProcessingVision ? "bg-purple-500/20 text-purple-400 border border-purple-500/50 cursor-wait animate-pulse" : "bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:text-blue-400 hover:border-blue-500/30 hover:bg-gray-800"}`} title="Pindai Gambar Tugas (AI Vision)">
                         <ImagePlus size={18} />
                      </button>
                      
                      {/* Dikte Suara */}
                      <button type="button" onClick={startRecording} disabled={isProcessingVoice || isProcessingVision} className={`p-2 md:p-2.5 rounded-xl transition shadow-sm ${isRecording ? "bg-red-500/20 text-red-500 border border-red-500/50 animate-pulse" : isProcessingVoice ? "bg-purple-500/20 text-purple-400 border border-purple-500/50 cursor-wait" : "bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:text-red-400 hover:border-red-500/30 hover:bg-gray-800"}`} title="Dikte Suara (Auto Fill)">
                         {isProcessingVoice || isProcessingVision ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                      </button>

                      {editingId !== null && (
                        <button onClick={handleCancelEdit} className="text-gray-400 hover:text-red-400 flex items-center gap-1.5 text-sm md:text-base transition bg-gray-800/60 hover:bg-red-500/10 px-3 py-1.5 md:py-2.5 rounded-lg border border-gray-700/50 hover:border-red-500/30 ml-2">
                          <X size={16} className="hidden md:block" /> Batal
                        </button>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSaveNote} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <FileText size={16} className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="text"
                          placeholder="Judul Tugas..."
                          className="w-full pl-10 pr-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/50 focus:bg-gray-800/80 text-white placeholder-gray-500 transition-all text-[16px] md:text-sm touch-manipulation"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="relative group">
                        <Calendar size={16} className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
                        <input
                          type="date"
                          className="w-full pl-10 pr-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 focus:bg-gray-800/80 text-white transition-all custom-date-input text-[16px] md:text-sm touch-manipulation"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="relative group">
                      <textarea
                        placeholder="Tulis detail atau instruksi tugas di sini..."
                        rows={4}
                        className={`w-full px-4 py-3 bg-gray-800/60 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/50 focus:bg-gray-800/80 text-white placeholder-gray-500 transition-all resize-none text-[16px] md:text-sm touch-manipulation ${
                          isRecording ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/70" : isProcessingVoice || isProcessingVision ? "border-purple-500/50" : "border-gray-600/50"
                        }`}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={isProcessingVoice || isProcessingVision}
                      ></textarea>
                    </div>

                    {/* DRAFT SUBTASKS RENDERER */}
                    {draftSubtasks.length > 0 && (
                      <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                         <p className="text-xs font-semibold text-indigo-300 mb-2 flex items-center gap-1.5"><Sparkles size={12} /> AI menemukan {draftSubtasks.length} langkah rahasia di gambar (Draf):</p>
                         <ul className="space-y-1.5">
                            {draftSubtasks.map((ds, idx) => (
                               <li key={idx} className="flex gap-2 items-start text-sm text-gray-300 bg-black/20 p-2 rounded-lg">
                                  <CheckSquare size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                  <span>{ds}</span>
                                  <button type="button" onClick={() => setDraftSubtasks(prev => prev.filter((_, i) => i !== idx))} className="ml-auto opacity-50 hover:opacity-100 hover:text-red-400 text-gray-400"><X size={14} /></button>
                               </li>
                            ))}
                         </ul>
                      </div>
                    )}

                    {/* Category Selector */}
                    <div className="mb-2">
                       <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Kategori Tugas</p>
                       <div className="flex flex-wrap gap-2">
                         {CATEGORIES.map(cat => {
                           const isSelected = taskCategory === cat.id;
                           const Icon = cat.icon;
                           return (
                             <button
                               type="button"
                               key={cat.id}
                               onClick={() => setTaskCategory(cat.id)}
                               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
                                 isSelected ? `${cat.bg} ${cat.border} ${cat.color} ring-1 ${cat.ring} scale-105 shadow-sm` : 'bg-gray-800/40 border-gray-700/50 text-gray-500 hover:bg-gray-800/70 hover:text-gray-300'
                               }`}
                             >
                               <Icon size={14} />
                               {cat.label}
                             </button>
                           )
                         })}
                       </div>
                    </div>

                    <button
                      type="submit"
                      className={`relative w-full font-semibold py-3.5 rounded-xl flex justify-center items-center gap-2.5 transition-all overflow-hidden group ${
                        editingId !== null
                          ? 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white shadow-lg shadow-yellow-500/25'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-lg shadow-blue-500/25'
                      }`}
                    >
                      <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative flex items-center gap-2">
                        {editingId !== null ? <Pencil size={18} /> : <Send size={18} />}
                        {editingId !== null ? 'Simpan Perubahan' : 'Simpan ke Daftar'}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        <div>
          <h3 className="text-2xl font-bold mb-4 text-white drop-shadow-md">
            {searchQuery ? `Hasil Pencarian: "${searchQuery}"` : 'Daftar Tugasmu'}
          </h3>

          {/* Filter Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
            <button
              onClick={() => setFilterCategory("Semua")}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border touch-manipulation ${
                filterCategory === "Semua" ? 'bg-gray-800 border-gray-600 text-white shadow-md' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              Semua Tugas
            </button>
            {CATEGORIES.map(cat => {
              const isSelected = filterCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border touch-manipulation ${
                    isSelected ? `${cat.bg} ${cat.border} ${cat.color} shadow-md` : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                   <Icon size={16} />
                   {cat.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-gray-700/50 pt-4">
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

                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center min-w-0">
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

                            {/* Category Badge */}
                            {(() => {
                              const catName = task.category || 'Biasa';
                              if (catName === 'Biasa') return null;
                              const catConfig = CATEGORIES.find(c => c.id === catName);
                              if (!catConfig) return null;
                              const Icon = catConfig.icon;
                              return (
                                <span className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-full border ${task.completed ? 'opacity-50 grayscale' : ''} ${catConfig.bg} ${catConfig.border} ${catConfig.color} backdrop-blur-sm`}>
                                  <Icon size={13} />
                                  {catConfig.label}
                                </span>
                              );
                            })()}
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

                      {/* SUB-TASKS / CHECKLIST SECTION */}
                      {(() => {
                        const progress = getSubtaskProgress(task.id);
                        const isExpanded = expandedTasks.has(task.id);
                        const taskSubtasks = subtasksMap[task.id] || [];

                        return (
                          <div className="mt-3 pt-3 border-t border-gray-700/30">
                            {/* Progress bar + toggle button */}
                            <button
                              onClick={() => toggleExpandTask(task.id)}
                              className="w-full flex items-center gap-3 group/sub hover:bg-gray-800/40 rounded-lg px-2 py-1.5 -mx-2 transition"
                            >
                              <ListChecks size={15} className="text-indigo-400 flex-shrink-0" />
                              
                              {progress ? (
                                <>
                                  {/* Progress bar */}
                                  <div className="flex-1 h-2 bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/40">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                                        progress.percent >= 100 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                        progress.percent >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                        progress.percent >= 30 ? 'bg-gradient-to-r from-blue-500 to-indigo-400' :
                                        'bg-gradient-to-r from-orange-500 to-amber-400'
                                      }`}
                                      style={{ width: `${progress.percent}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-bold flex-shrink-0 ${
                                    progress.percent >= 100 ? 'text-emerald-400' :
                                    progress.percent >= 70 ? 'text-teal-400' :
                                    progress.percent >= 30 ? 'text-blue-400' :
                                    'text-orange-400'
                                  }`}>
                                    {progress.done}/{progress.total}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-gray-500 flex-1">Tambah langkah-langkah</span>
                              )}

                              {isExpanded ? (
                                <ChevronUp size={14} className="text-gray-500 group-hover/sub:text-gray-300 transition flex-shrink-0" />
                              ) : (
                                <ChevronDown size={14} className="text-gray-500 group-hover/sub:text-gray-300 transition flex-shrink-0" />
                              )}
                            </button>

                            {/* Expanded checklist */}
                            {isExpanded && (
                              <div className="mt-2 ml-1 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                {taskSubtasks.map(sub => (
                                  <div key={sub.id} className="flex items-center gap-2.5 group/item rounded-lg px-2 py-1.5 hover:bg-gray-800/40 transition">
                                    <button
                                      onClick={() => toggleSubtask(sub)}
                                      className="flex-shrink-0 touch-manipulation active:scale-90 transition-transform"
                                    >
                                      {sub.completed ? (
                                        <CheckSquare size={16} className="text-emerald-400" />
                                      ) : (
                                        <Square size={16} className="text-gray-500 hover:text-blue-400 transition" />
                                      )}
                                    </button>
                                    <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                                      {sub.title}
                                    </span>
                                    <button
                                      onClick={() => deleteSubtask(sub)}
                                      className="opacity-0 group-hover/item:opacity-100 text-gray-600 hover:text-red-400 p-0.5 rounded transition touch-manipulation"
                                      title="Hapus"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ))}

                                {/* Add new subtask input */}
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Plus size={14} className="text-gray-600 flex-shrink-0 ml-0.5" />
                                  <input
                                    type="text"
                                    placeholder="Tambah langkah baru..."
                                    className="flex-1 bg-transparent border-b border-gray-700/50 focus:border-blue-500/70 text-sm text-gray-300 placeholder-gray-600 py-1.5 outline-none transition text-[16px] md:text-sm touch-manipulation"
                                    value={newSubtaskText[task.id] || ""}
                                    onChange={(e) => setNewSubtaskText(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addSubtask(task.id);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => addSubtask(task.id)}
                                    disabled={!(newSubtaskText[task.id] || "").trim()}
                                    className="text-blue-400 hover:text-blue-300 disabled:text-gray-700 disabled:cursor-not-allowed p-1 rounded transition touch-manipulation"
                                    title="Tambah"
                                  >
                                    <PlusCircle size={16} />
                                  </button>
                                </div>
                                
                                {/* AI Breaker Button */}
                                <div className="mt-2 text-right">
                                  <button
                                    onClick={() => handleAIBreakdown(task)}
                                    disabled={breakingTaskIds.has(task.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800/80 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 hover:border-indigo-500/50 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed group/ai"
                                  >
                                    {breakingTaskIds.has(task.id) ? (
                                      <Loader2 size={13} className="animate-spin text-indigo-400" />
                                    ) : (
                                      <Sparkles size={13} className="text-amber-400 group-hover/ai:animate-pulse" />
                                    )}
                                    {breakingTaskIds.has(task.id) ? 'AI sedang bekerja...' : 'Pecah dengan AI'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
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

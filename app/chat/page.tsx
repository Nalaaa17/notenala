"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Halo! Aku Nala, asisten khusus kamu di NoteNala ✨. Ada yang bisa aku bantu hari ini? Mau diskusi soal rencana kerja (tugas) atau cuman mau ngobrol nyantai?' }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // State untuk Context Injection
    const [userProfile, setUserProfile] = useState<any>(null);
    const [contextData, setContextData] = useState<{ tasks: any[], journals: any[] }>({ tasks: [], journals: [] });

    // Fetch Profil dan Data User
    const fetchContext = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserProfile(user);

            // Ambil Tugas yang belum selesai
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, title, due_date, completed, note')
                .eq('user_id', user.id)
                .eq('completed', false);

            // Ambil 5 Jurnal terakhir
            const { data: journals } = await supabase
                .from('journals')
                .select('id, mood, note, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setContextData({
                tasks: tasks || [],
                journals: journals || []
            });
        }
    };

    useEffect(() => {
        fetchContext();
    }, []);

    // Auto-scroll ke bawah setiap ada pesan baru
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: [...messages, userMsg],
                    contextData: contextData, // Injeksi konteks (tugas & jurnal)
                    userName: userProfile?.user_metadata?.full_name || userProfile?.email || "Pengguna"
                })
            });
            const data = await response.json();

            if (!response.ok) {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `[Sistem Error]: ${data.error}` 
                }]);
            } else {
                let responseText = data.text;
                let isTaskCreated = false;

                // TANGKAP PERINTAH SULAP (ACTION) DARI NALA
                const actionRegex = /```json\s*(\{[\s\S]*?"_action_":\s*"create_task"[\s\S]*?\})\s*```/;
                const match = responseText.match(actionRegex);

                if (match && userProfile) {
                    try {
                        const parsedObj = JSON.parse(match[1]);
                        const { title, due_date, note } = parsedObj;

                        // Eksekusi penambahan ke Database Suapbase secara diam-diam
                        const { error: insertErr } = await supabase.from('tasks').insert([{
                            title: title || "Tugas dari Nala",
                            due_date: due_date || new Date().toISOString().split('T')[0],
                            note: note || "",
                            completed: false,
                            user_id: userProfile.id
                        }]);

                        if (!insertErr) {
                            // Hapus serpihan rahasia blok JSON dari tulisan Nala yang akan ditampilkan
                            responseText = responseText.replace(match[0], "").trim();
                            // Tambahkan notifikasi UI keren yang memberitahu bahwa Magic-nya sukses
                            responseText += "\n\n✅ *(Sistem: Nala baru saja berhasil memastikan jadwal ini tercatat di panel tugasmu!)*";
                            isTaskCreated = true;
                        }
                    } catch (e) {
                        console.error("Gagal membaca instruksi rahasia JSON dari AI:", e);
                    }
                }

                setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

                // Segarkan ingatan Nala kalau tugas beneran terbuat
                if (isTaskCreated) {
                    fetchContext();
                }
            }

        } catch (err: any) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "[Sistem Error]: Gagal terhubung ke Nala. Coba priksa koneksi internetmu atau pastikan API Key di `.env.local` sudah benar." 
            }]);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-transparent text-gray-100 font-sans flex flex-col relative overflow-hidden">
            
            {/* Navbar Obrolan */}
            <nav className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
                <div className="flex items-center gap-3 md:gap-4">
                    <a href="/" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition border border-gray-700/50">
                        <ArrowLeft size={20} />
                    </a>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center p-0.5 shadow-lg shadow-purple-500/20 border-2 border-gray-800">
                            <Bot size={22} className="text-white drop-shadow-md" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold font-sans text-white flex items-center gap-2 drop-shadow-sm">
                                Nala AI <Sparkles size={16} className="text-yellow-400" />
                            </h1>
                            <p className="text-xs text-purple-300 font-medium">✨ Selalu Aktif Membantu</p>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Area Ruang Pesan */}
            <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 relative z-10 scroll-smooth">
                {messages.map((msg, idx) => {
                    const isNala = msg.role === 'assistant';
                    
                    return (
                        <div key={idx} className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isNala ? 'self-start' : 'self-end flex-row-reverse'}`}>
                            
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-1">
                                {isNala ? (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center p-0.5 shadow-md mask mask-squircle">
                                         <Bot size={16} className="text-white" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md border border-gray-700 overflow-hidden">
                                         {userProfile?.user_metadata?.avatar_url ? (
                                             <img src={userProfile.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                         ) : (
                                             <User size={16} className="text-white" />
                                         )}
                                    </div>
                                )}
                            </div>

                            {/* Gelembung Pesan (Bubble) */}
                            <div className={`p-4 rounded-2xl md:rounded-3xl shadow-lg border relative ${
                                isNala 
                                 ? 'bg-gray-800/80 backdrop-blur-md rounded-tl-sm border-gray-700/50 text-gray-200' 
                                 : 'bg-blue-600/90 backdrop-blur-md rounded-tr-sm border-blue-500/30 text-white'
                            }`}>
                                <div className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Indikator Mode Berpikir / Mengetik */}
                {isLoading && (
                    <div className="flex gap-3 max-w-[80%] self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-md opacity-80">
                                <Bot size={16} className="text-white" />
                            </div>
                        </div>
                        <div className="px-5 py-4 border border-gray-700/50 rounded-2xl bg-gray-800/80 rounded-tl-sm flex items-center gap-2">
                            <Loader2 size={16} className="text-pink-400 animate-spin" />
                            <span className="text-sm font-medium text-purple-300 animate-pulse">Nala sedang mengetik balasan...</span>
                        </div>
                    </div>
                )}
                
                {/* Referensi titik bawah untuk auto-scroll */}
                <div ref={messagesEndRef} className="h-2" />
            </main>

            {/* Bar Input Fixed di Bawah */}
            <div className="w-full bg-gray-900/90 backdrop-blur-xl border-t border-gray-700/60 p-4 sticky bottom-0 z-20">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-3 relative">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            // Kirim jika tekan Enter (tanpa Shift)
                            if(e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                        placeholder="Tanya apapun pada Nala... (Pencet 'Enter' buat nanya)"
                        rows={1}
                        className="flex-1 min-h-[56px] max-h-32 px-5 py-4 bg-gray-800/80 border border-gray-700/80 focus:border-purple-500/50 text-white rounded-3xl outline-none resize-none shadow-inner placeholder-gray-500 transition-all custom-scrollbar"
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim() || isLoading}
                        className={`p-3 md:p-4 rounded-full flex-shrink-0 transition-all shadow-xl ${(!input.trim() || isLoading) ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white hover:scale-105 hover:shadow-purple-500/30'}`}
                        title="Kirim Pesan"    
                    >
                        {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="ml-0.5" />}
                    </button>
                </form>
                <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-2 font-medium">Nala AI dapat memberikan jawaban yang tidak akurat. Cek kembali jadwal pentingmu secara manual.</p>
            </div>
        </div>
    );
}

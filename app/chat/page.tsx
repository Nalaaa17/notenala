"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, Bot, User, Loader2, ImagePlus, X, FileText, Paperclip } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
  pdfUrl?: string | null;
}

function ChatContent() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Halo! Aku Nala, asisten khusus kamu di NoteNala ✨. Ada yang bisa aku bantu hari ini? Mau diskusi soal rencana kerja (tugas) atau cuman mau ngobrol nyantai?' }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ base64: string, type: string, name: string } | null>(null);
    const [attachedPdf, setAttachedPdf] = useState<{ url: string, name: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const searchParams = useSearchParams();
    const pdfUrlParam = searchParams.get('pdfUrl');
    const pdfNameParam = searchParams.get('pdfName');

    useEffect(() => {
        if (pdfUrlParam && pdfNameParam) {
            setAttachedPdf({ url: pdfUrlParam, name: pdfNameParam });
        }
    }, [pdfUrlParam, pdfNameParam]);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validasi ukuran agar tidak melebihi 10MB (menjaga performa Base64)
            if (file.size > 10 * 1024 * 1024) {
                alert("Maksimal ukuran file adalah 10MB.");
                if (imageInputRef.current) imageInputRef.current.value = "";
                if (docInputRef.current) docInputRef.current.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedFile({
                    base64: reader.result as string,
                    type: file.type,
                    name: file.name
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!input.trim() && !selectedFile && !attachedPdf) || isLoading) return;

        const userMsg: Message = { 
            role: 'user', 
            content: input.trim() || (selectedFile?.type.includes('pdf') ? 'Tolong rangkum/analisis dokumen ini.' : 'Tolong proses dokumen/gambar yang saya kirimkan.'),
            image: selectedFile?.base64,
            pdfUrl: attachedPdf?.url
        };
        
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setSelectedFile(null);
        setAttachedPdf(null);
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
                                {msg.image && (
                                    msg.image.startsWith('data:application/pdf') || msg.image.startsWith('data:application/doc') ? (
                                        <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl mb-3 border border-white/10">
                                            <FileText size={20} className="text-purple-300 flex-shrink-0" />
                                            <span className="text-sm font-medium">Dokumen File</span>
                                        </div>
                                    ) : (
                                        <img src={msg.image} alt="Attachment" className="w-full max-w-sm rounded-xl mb-3 border border-gray-500/30 shadow-sm" />
                                    )
                                )}
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
                <div className="max-w-4xl mx-auto relative flex flex-col gap-2">
                    {/* Antarmuka Lampiran Foto / PDF */}
                    <div className="flex flex-wrap gap-2 ml-2 md:ml-12 mb-2">
                        {selectedFile && (
                            selectedFile.type.includes('image') ? (
                                <div className="relative inline-block w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-gray-700 shadow-lg bg-gray-800 flex-shrink-0">
                                    <img src={selectedFile.base64} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => {
                                            setSelectedFile(null);
                                            if(imageInputRef.current) imageInputRef.current.value = "";
                                            if(docInputRef.current) docInputRef.current.value = "";
                                        }} 
                                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative inline-flex items-center gap-3 p-3 pr-8 rounded-2xl border border-blue-500/50 shadow-lg bg-gray-800/80 backdrop-blur w-fit max-w-[200px] md:max-w-xs flex-shrink-0">
                                    <div className="bg-blue-500/20 p-2 rounded-xl">
                                        <FileText size={24} className="text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider mb-0.5">Dokumen</p>
                                        <p className="text-sm font-medium text-white truncate drop-shadow-sm">{selectedFile.name}</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            if(imageInputRef.current) imageInputRef.current.value = "";
                                            if(docInputRef.current) docInputRef.current.value = "";
                                        }} 
                                        className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-black/40 hover:bg-red-500 text-gray-300 hover:text-white rounded-full transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )
                        )}

                        {attachedPdf && (
                            <div className="relative inline-flex items-center gap-3 p-3 pr-8 rounded-2xl border border-purple-500/50 shadow-lg bg-gray-800/80 backdrop-blur w-fit max-w-[200px] md:max-w-xs flex-shrink-0">
                                <div className="bg-purple-500/20 p-2 rounded-xl">
                                    <FileText size={24} className="text-purple-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider mb-0.5">PDF Dilampirkan</p>
                                    <p className="text-sm font-medium text-white truncate drop-shadow-sm">{attachedPdf.name}</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setAttachedPdf(null)} 
                                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-black/40 hover:bg-red-500 text-gray-300 hover:text-white rounded-full transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="flex items-end gap-1.5 md:gap-2">
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={imageInputRef} 
                            className="hidden" 
                            onChange={handleFileSelect} 
                        />
                        <input 
                            type="file" 
                            accept=".pdf, .doc, .docx" 
                            ref={docInputRef} 
                            className="hidden" 
                            onChange={handleFileSelect} 
                        />
                        
                        <div className="flex gap-1 mb-1 md:mb-1.5 mr-1">
                            <button 
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className="p-2 md:p-2.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-full transition-colors flex-shrink-0 touch-manipulation"
                                title="Lampirkan Gambar Observasi"
                            >
                                <ImagePlus size={22} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => docInputRef.current?.click()}
                                className="p-2 md:p-2.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-full transition-colors flex-shrink-0 touch-manipulation"
                                title="Lampirkan Dokumen PDF/Word"
                            >
                                <Paperclip size={22} />
                            </button>
                        </div>

                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                // Kirim jika tekan Enter (tanpa Shift)
                                if(e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e as unknown as React.FormEvent);
                                }
                            }}
                            placeholder="Tanya Nala atau lampirkan dokumen/foto..."
                            rows={1}
                            className="flex-1 min-h-[50px] md:min-h-[56px] max-h-32 px-4 md:px-5 py-3 md:py-4 bg-gray-800/80 border border-gray-700/80 focus:border-purple-500/50 text-white text-[16px] md:text-sm rounded-3xl outline-none resize-none shadow-inner placeholder-gray-500 transition-all custom-scrollbar touch-manipulation"
                        />
                        <button 
                            type="submit" 
                            disabled={(!input.trim() && !selectedFile && !attachedPdf) || isLoading}
                            className={`p-3 md:p-4 rounded-full flex-shrink-0 transition-all shadow-xl touch-manipulation ${(!input.trim() && !selectedFile && !attachedPdf) || isLoading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white hover:scale-105 hover:shadow-purple-500/30'}`}
                            title="Kirim Pesan"    
                        >
                            {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="ml-0.5 md:ml-0.5" />}
                        </button>
                    </form>
                </div>
                <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-2 font-medium">Nala AI dapat memberikan jawaban yang tidak akurat. Cek kembali jadwal pentingmu secara manual.</p>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <React.Suspense fallback={<div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white gap-4"><Loader2 className="animate-spin text-purple-500" size={32} /><p className="text-purple-300 font-medium animate-pulse">Menyiapkan Otak Nala...</p></div>}>
            <ChatContent />
        </React.Suspense>
    );
}

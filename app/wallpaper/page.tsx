"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Loader2, CheckCircle2, Palette, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export default function WallpaperPage() {
    const { setTheme } = useThemeStore();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // State untuk TEMA / BACKGROUND
    const [bgColor, setBgColor] = useState("#111827"); 
    const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
    const [uploadingBg, setUploadingBg] = useState(false);

    // State untuk loading & notifikasi
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }
            setUser(user);

            const { data: profile } = await supabase
                .from('profiles')
                .select('bg_color, bg_image_url')
                .eq('id', user.id)
                .single();

            if (profile) {
                setBgColor(profile.bg_color || "#111827");
                setBgImageUrl(profile.bg_image_url || null);
            }

            setLoading(false);
        };

        fetchUserAndProfile();
    }, []);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    };

    // --- FUNGSI UPLOAD GAMBAR BACKGROUND ---
    const uploadBackground = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploadingBg(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Pilih gambar latar belakang terlebih dahulu.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `bg-${user.id}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setBgImageUrl(publicUrl);
            showMessage("Gambar latar siap disimpan. Jangan lupa klik 'Terapkan Wallpaper'.", "success");
        } catch (error: any) {
            showMessage(error.message || "Gagal mengunggah gambar latar.", "error");
        } finally {
            setUploadingBg(false);
        }
    };

    // --- FUNGSI SIMPAN PERUBAHAN WALPAPER ---
    const handleUpdateWallpaper = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    bg_color: bgColor,
                    bg_image_url: bgImageUrl,
                    updated_at: new Date(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Update Zustand Store agar UI langsung berubah seketika
            setTheme(bgColor, bgImageUrl || "");

            showMessage("Wallpaper berhasil diperbarui dan diterapkan!", "success");

        } catch (error: any) {
            showMessage(error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-gray-100 font-sans p-6">
            <div className="max-w-2xl mx-auto mt-10">

                <div className="flex items-center gap-4 mb-8">
                    <a href="/profile" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition border border-gray-700 shadow-md">
                        <ArrowLeft size={20} className="text-gray-300" />
                    </a>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <ImageIcon className="text-purple-400" size={32} /> Wallpaper Studio
                    </h1>
                </div>

                {message.text && (
                    <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 border shadow-lg ${message.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
                        <CheckCircle2 size={20} />
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                <form onSubmit={handleUpdateWallpaper} className="bg-gray-800/90 rounded-3xl shadow-2xl border border-gray-700 p-8 space-y-8 backdrop-blur-md">
                    
                    <div className="space-y-6">
                        {/* Preview Latar */}
                        <div 
                            className="w-full h-48 sm:h-64 rounded-2xl border-2 border-gray-600 shadow-inner flex items-center justify-center relative overflow-hidden transition-all duration-500"
                            style={{ 
                                backgroundColor: bgColor,
                                backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {!bgImageUrl && <p className="text-white/50 text-xl font-bold font-sans drop-shadow-md">Area Pratinjau Wallpaper</p>}
                        </div>

                        {/* Pengatur Warna */}
                        <div className="flex items-center justify-between p-5 bg-gray-900/60 rounded-2xl border border-gray-700/50">
                            <div className="flex gap-4 items-center">
                                <Palette className="text-purple-400" size={24}/>
                                <div>
                                    <label className="block text-md font-bold text-gray-200">Warna Solid</label>
                                    <p className="text-xs text-gray-400">Pilih warna dasar latar aplikasimu.</p>
                                </div>
                            </div>
                            <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="w-14 h-14 rounded-xl cursor-pointer border-2 border-gray-600 bg-transparent p-0 transition hover:scale-105"
                                title="Pilih Warna"
                            />
                        </div>

                        {/* Pengatur Gambar */}
                        <div className="p-5 bg-gray-900/60 rounded-2xl border border-gray-700/50">
                            <label className="block text-md font-bold text-gray-200 mb-4">Gambar Latar Belakang (HD)</label>

                            {bgImageUrl ? (
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 py-3 px-6 rounded-xl text-white font-bold transition flex items-center gap-2 w-full sm:w-auto shadow-lg shadow-blue-500/20">
                                        <ImageIcon size={18} /> Ganti Gambar
                                        <input type="file" accept="image/*" onChange={uploadBackground} className="hidden" disabled={uploadingBg} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setBgImageUrl(null)}
                                        className="bg-red-600/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 w-full sm:w-auto font-bold"
                                    >
                                        <Trash2 size={18} /> Hapus Gambar
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-500 transition group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {uploadingBg ? (
                                            <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                                        ) : (
                                            <ImageIcon className="text-gray-400 group-hover:text-blue-400 transition mb-2" size={32} />
                                        )}
                                        <p className="text-sm font-semibold text-gray-400 group-hover:text-gray-300">
                                            {uploadingBg ? "Mengunggah resolusi HD..." : <span className="text-blue-400">Klik di sini untuk upload gambar</span>}
                                        </p>
                                    </div>
                                    <input type="file" accept="image/*" onChange={uploadBackground} className="hidden" disabled={uploadingBg} />
                                </label>
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={saving || uploadingBg} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-purple-500/20 transition flex items-center justify-center gap-2 mt-4 text-lg">
                        {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                        {saving ? "Menerapkan Wallpaper..." : "Terapkan Wallpaper"}
                    </button>
                </form>
            </div>
        </div>
    );
}

"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Mail, Lock, Camera, ArrowLeft, Save, Loader2, CheckCircle2, Phone, FileText, Palette, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import PushNotificationManager from '../components/PushNotificationManager';

export default function ProfilePage() {
    const { setTheme } = useThemeStore();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // State untuk form utama (di tabel 'profiles')
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // State untuk Auth (Email & Password)
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // State untuk loading & notifikasi
    const [uploading, setUploading] = useState(false);
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
            setNewEmail(user.email || "");

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile && !error) {
                setFullName(profile.full_name || "");
                setPhoneNumber(profile.phone_number || "");
                setBio(profile.bio || "");
                setAvatarUrl(profile.avatar_url || null);

            } else {
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ id: user.id }]);
                if (!insertError) console.log("Profile awal dibuat.");
            }

            setLoading(false);
        };

        fetchUserAndProfile();
    }, []);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    };

    // --- FUNGSI UPLOAD FOTO PROFIL ---
    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Anda harus memilih gambar untuk diunggah.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar-${user.id}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl, updated_at: new Date() })
                .eq('id', user.id);

            await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            showMessage("Foto profil berhasil diperbarui!", "success");
        } catch (error: any) {
            showMessage(error.message || "Gagal mengunggah foto.", "error");
        } finally {
            setUploading(false);
        }
    };

    // --- FUNGSI SIMPAN SEMUA PERUBAHAN ---
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // 1. UPDATE KE TABEL 'PROFILES'
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone_number: phoneNumber,
                    bio: bio,
                    updated_at: new Date(),
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. UPDATE KE AUTH (Email & Password)
            let authUpdates: any = {};
            if (newEmail !== user.email) authUpdates.email = newEmail;
            if (newPassword) {
                if (newPassword !== confirmPassword) throw new Error("Password baru dan konfirmasi tidak cocok!");
                if (newPassword.length < 6) throw new Error("Password minimal 6 karakter.");
                authUpdates.password = newPassword;
            }

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError) throw authError;
            }

            showMessage("Semua perubahan profil berhasil disimpan!", "success");
            setNewPassword("");
            setConfirmPassword("");

        } catch (error: any) {
            showMessage(error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-gray-100 font-sans p-6">
            {/* Note: bg-transparent digunakan di sini jika kamu menggunakan BackgroundWrapper di layout.tsx */}
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8 mt-4">
                    <a href="/" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition border border-gray-700">
                        <ArrowLeft size={20} className="text-gray-300" />
                    </a>
                    <h1 className="text-3xl font-extrabold text-white">Pengaturan Akun</h1>
                </div>

                {/* Notifikasi */}
                {message.text && (
                    <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <User size={20} />}
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* KOLOM KIRI: Foto Profil */}
                    <div className="lg:col-span-1">
                        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-8 flex flex-col items-center sticky top-6">
                            <div className="relative group cursor-pointer mb-4">
                                <div className="w-40 h-40 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-4 border-gray-800">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.email?.substring(0, 2).toUpperCase()
                                    )}
                                </div>

                                <label className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm">
                                    {uploading ? <Loader2 className="animate-spin text-white mb-1" size={28} /> : <Camera className="text-white mb-1" size={28} />}
                                    <span className="text-sm font-medium text-white">{uploading ? 'Mengunggah...' : 'Ubah Foto'}</span>
                                    <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                                </label>
                            </div>
                            <h3 className="text-xl font-bold text-white text-center">{fullName || "Pengguna NoteNala"}</h3>
                            <p className="text-sm text-gray-400 text-center mt-1 truncate w-full">{user?.email}</p>
                        </div>
                    </div>

                    {/* KOLOM KANAN: Form Data */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleUpdateProfile} className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-8 space-y-8 backdrop-blur-md bg-opacity-90">

                            {/* Seksi 1: Data Diri */}
                            <section>
                                <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-gray-700 pb-2">Data Diri</h3>
                                <div className="space-y-4">
                                    {/* ... (Input Data Diri Sama Seperti Sebelumnya) ... */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Nama Lengkap</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                            <input type="text" placeholder="Masukkan nama Anda..." value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Nomor Telepon</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                            <input type="tel" placeholder="Contoh: 08123456789" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Bio Singkat</label>
                                        <div className="relative">
                                            <FileText className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                            <textarea placeholder="Ceritakan sedikit tentang dirimu..." rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Seksi 2: Kustomisasi Tampilan (BARU - DIPINDAHKAN) */}
                            <section>
                                <h3 className="text-lg font-bold text-purple-400 mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                                    <Palette size={20} /> Kustomisasi Resolusi Tinggi
                                </h3>
                                <a 
                                    href="/wallpaper" 
                                    className="block w-full bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-600/50 hover:to-blue-600/50 border border-purple-500/30 hover:border-blue-400/50 p-6 rounded-2xl transition group shadow-lg cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-900 rounded-xl group-hover:bg-gray-800 transition shadow-inner">
                                                <ImageIcon size={28} className="text-purple-400 group-hover:text-blue-400 transition" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition">Wallpaper Studio</h4>
                                                <p className="text-sm text-gray-400 max-w-sm mt-1">Ubah warna dasar dan atur gambar latar beresolusi tinggi (*High Definition*) di studionya langsung agar lebih rapih.</p>
                                            </div>
                                        </div>
                                        <ArrowLeft size={24} className="text-gray-500 group-hover:text-white transition transform rotate-180" />
                                    </div>
                                </a>
                            </section>

                            {/* Seksi 3: Keamanan Akun */}
                            <section>
                                <h3 className="text-lg font-bold text-red-400 mb-4 border-b border-gray-700 pb-2">Keamanan Akun</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Alamat Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Ganti Password (Biarkan kosong jika tidak ingin ganti)</label>
                                        <div className="relative mb-3">
                                            <Lock className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                            <input type="password" placeholder="Password baru..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                            <input type="password" placeholder="Konfirmasi password baru..." value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Seksi 4: Notifikasi PWA */}
                            <section>
                                <h3 className="text-lg font-bold text-green-400 mb-4 border-b border-gray-700 pb-2">Notifikasi & Alarm</h3>
                                <PushNotificationManager />
                            </section>

                            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 mt-4 text-lg">
                                {saving ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                                {saving ? "Menyimpan Perubahan..." : "Simpan Semua Perubahan"}
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
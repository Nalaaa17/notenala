"use client";
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase'; // Sesuaikan path ini dengan project kamu
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true); // Toggle antara Login dan Daftar
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        if (isLogin) {
            // PROSES LOGIN
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setErrorMsg(error.message);
                setIsLoading(false);
            } else {
                window.location.href = "/";
            }
        } else {
            // PROSES DAFTAR (REGISTER)
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                setErrorMsg(error.message);
            } else {
                setSuccessMsg("Pendaftaran berhasil! Silakan cek kotak masuk email kamu untuk konfirmasi.");
                setEmail("");
                setPassword("");
            }
            setIsLoading(false);
        }
    };

    // PERBAIKAN: Menambahkan tipe React.FormEvent agar tidak error build
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setErrorMsg("Masukkan email kamu terlebih dahulu di kotak input di atas.");
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            // Memastikan user diarahkan ke halaman reset-password setelah klik link di email
            redirectTo: 'https://nala.my.id/reset-password',
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            setSuccessMsg("Link reset password telah dikirim! Silakan cek email kamu.");
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex items-center justify-center p-4">

            <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* LOGO & JUDUL */}
                <div className="text-center mb-8">
                    <div className="bg-blue-500/10 p-4 rounded-full inline-block mb-4">
                        <FileText size={40} className="text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">NoteNala</h1>
                    <p className="text-gray-400">Simpan dan atur tugasmu dengan mudah</p>
                </div>

                {/* TOGGLE TAB MASUK / DAFTAR */}
                <div className="flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-700">
                    <button
                        onClick={() => { setIsLogin(true); setErrorMsg(null); setSuccessMsg(null); }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-gray-700 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Masuk
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setErrorMsg(null); setSuccessMsg(null); }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-gray-700 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Daftar Baru
                    </button>
                </div>

                {/* PESAN ERROR & SUCCESS */}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <p>{errorMsg}</p>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-start gap-3 text-emerald-400 text-sm">
                        <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                        <p>{successMsg}</p>
                    </div>
                )}

                {/* FORM */}
                <form onSubmit={handleAuth} className="space-y-5">

                    {/* INPUT EMAIL */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nama@email.com"
                                className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition"
                                required
                            />
                        </div>
                    </div>

                    {/* INPUT PASSWORD */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition"
                                required={!successMsg}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* FITUR TAMBAHAN (Hanya tampil di tab Login) */}
                    {isLogin && (
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="appearance-none w-5 h-5 border-2 border-gray-600 rounded bg-gray-900 checked:bg-blue-500 checked:border-blue-500 transition cursor-pointer"
                                    />
                                    {rememberMe && <CheckCircle2 size={14} className="absolute text-white pointer-events-none" />}
                                </div>
                                <span className="text-gray-400 group-hover:text-gray-200 transition">Ingat saya</span>
                            </label>

                            <button
                                type="button"
                                onClick={handleResetPassword}
                                className="text-blue-400 hover:text-blue-300 hover:underline transition"
                            >
                                Lupa password?
                            </button>
                        </div>
                    )}

                    {/* TOMBOL SUBMIT */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 rounded-xl font-bold text-white transition shadow-lg ${isLoading ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
                    >
                        {isLoading ? 'Memproses...' : isLogin ? 'Masuk ke NoteNala' : 'Buat Akun Sekarang'}
                    </button>
                </form>

            </div>
        </div>
    );
}
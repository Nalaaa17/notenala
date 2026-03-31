"use client";
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase'; // Sesuaikan path ini
import { Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            setErrorMsg("Password minimal 6 karakter.");
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);
        setMessage(null);

        // Fungsi Supabase untuk update password user yang sedang memiliki token reset
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            setMessage("Password berhasil diperbarui! Mengalihkan ke halaman login...");
            // Tunggu 3 detik lalu arahkan ke halaman login
            setTimeout(() => {
                window.location.href = "/login";
            }, 3000);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

                <div className="text-center mb-8">
                    <div className="bg-blue-500/10 p-4 rounded-full inline-block mb-4">
                        <Lock size={36} className="text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Buat Password Baru</h1>
                    <p className="text-gray-400 text-sm">Silakan masukkan password baru untuk akun NoteNala kamu.</p>
                </div>

                {/* Pesan Error */}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <p>{errorMsg}</p>
                    </div>
                )}

                {/* Pesan Sukses */}
                {message && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-start gap-3 text-emerald-400 text-sm">
                        <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                        <p>{message}</p>
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300 ml-1">Password Baru</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimal 6 karakter"
                                className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !!message}
                        className={`w-full py-3.5 rounded-xl font-bold text-white transition shadow-lg flex justify-center items-center gap-2 ${isLoading || message ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
                    >
                        {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'} {!isLoading && <ArrowRight size={18} />}
                    </button>
                </form>

            </div>
        </div>
    );
}
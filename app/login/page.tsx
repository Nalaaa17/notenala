"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

/** Harus di luar LoginPage — jika di dalam, tiap render = tipe baru → input remount & fokus hilang per huruf */
function FieldBlock({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function OverlayFace({
  show,
  title,
  body,
  actionLabel,
  onAction,
}: {
  show: boolean;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-300 ${
        show ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
      }`}
      aria-hidden={!show}
    >
      <div className="flex w-full max-w-[240px] flex-col items-center justify-center gap-4 text-center sm:max-w-[260px]">
        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h2>
        <p className="text-xs leading-relaxed text-gray-200 sm:text-sm">{body}</p>
        <button
          type="button"
          onClick={onAction}
          className="w-full rounded-full border-2 border-white/80 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchMode = (login: boolean) => {
    setIsLogin(login);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isLogin) {
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
      redirectTo: "https://nala.my.id/reset-password",
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Link reset password telah dikirim! Silakan cek email kamu.");
    }
    setIsLoading(false);
  };

  const inputClass =
    "w-full rounded-xl border border-gray-700 bg-gray-900 py-2.5 sm:py-3 pl-10 pr-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 min-w-0";

  const formShell =
    "flex h-full min-h-0 w-full md:w-1/2 shrink-0 flex-col justify-center px-5 py-6 sm:px-7 sm:py-8 overflow-y-auto";

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-gray-900 p-4 text-gray-100">
      <div className="flex w-full max-w-[760px] flex-col items-center gap-4">
        {errorMsg && (
          <div className="flex w-full gap-3 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex w-full gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        <div
          className="relative flex h-auto min-h-[550px] md:h-[520px] md:min-h-[400px] w-full max-h-[90dvh] flex-col overflow-hidden rounded-3xl border border-gray-700 bg-gray-800 shadow-2xl motion-safe:animate-[login-mobile-enter_0.5s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none"
        >
          <div className="relative z-30 flex h-12 shrink-0 items-center border-b border-gray-700/60 px-3 sm:px-4">
            <Link
              href="/landing"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition hover:text-white sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Beranda
            </Link>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 flex">
              {/* Kolom kiri: form masuk di mobile atau flex kiri di desktop */}
              <div className={`${formShell} md:border-r border-gray-700/50 ${isLogin ? "flex" : "hidden md:flex"}`}>
                {isLogin ? (
                  <>
                    <div className="mb-4 flex flex-col items-center sm:mb-5">
                      <div className="relative mb-3 h-14 w-14 overflow-hidden rounded-full border-[3px] border-blue-500/30 shadow-lg sm:h-16 sm:w-16">
                        <Image src="/logo-v2.png" alt="NoteNala" fill className="object-cover" sizes="64px" />
                      </div>
                      <h1 className="text-center text-lg font-bold text-white sm:text-xl">Masuk</h1>
                      <p className="mt-1 text-center text-xs text-gray-400 sm:text-sm">Gunakan email dan passwordmu</p>
                    </div>
                    <form onSubmit={handleAuth} className="mx-auto w-full max-w-[280px] space-y-3.5 sm:max-w-none sm:space-y-4">
                      <FieldBlock>
                        <label className="text-xs font-medium text-gray-300">Email</label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nama@email.com"
                            className={inputClass}
                            required
                            autoComplete="email"
                          />
                        </div>
                      </FieldBlock>
                      <FieldBlock>
                        <label className="text-xs font-medium text-gray-300">Password</label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`${inputClass} pr-11`}
                            required
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-300"
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FieldBlock>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <label className="flex cursor-pointer items-center gap-2 text-gray-400">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500/40"
                          />
                          Ingat saya
                        </label>
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="font-medium text-blue-400 transition hover:text-blue-300"
                        >
                          Lupa password?
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                      >
                        {isLoading ? "Memproses…" : "Masuk ke NoteNala"}
                        {!isLoading && <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
                      </button>
                    </form>
                    {/* Toggle Mode Register di Mobile */}
                    <div className="mt-6 flex justify-center md:hidden">
                      <p className="text-xs text-gray-400">
                        Baru di NoteNala?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode(false)}
                          className="font-bold text-blue-400 hover:text-blue-300"
                        >
                          Daftar di sini
                        </button>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="hidden flex-1 flex-col items-center justify-center opacity-30 md:flex" aria-hidden>
                    <p className="text-xs text-gray-500">← Geser panel untuk masuk</p>
                  </div>
                )}
              </div>

              {/* Kolom kanan: form daftar di mobile atau flex kanan di desktop  */}
              <div className={`${formShell} ${!isLogin ? "flex" : "hidden md:flex"}`}>
                {!isLogin ? (
                  <>
                    <div className="mb-4 flex flex-col items-center sm:mb-5">
                      <div className="relative mb-3 h-14 w-14 overflow-hidden rounded-full border-[3px] border-blue-500/30 shadow-lg sm:h-16 sm:w-16">
                        <Image src="/logo-v2.png" alt="NoteNala" fill className="object-cover" sizes="64px" />
                      </div>
                      <h1 className="text-center text-lg font-bold text-white sm:text-xl">Buat akun</h1>
                      <p className="mt-1 text-center text-xs text-gray-400 sm:text-sm">Mulai catat tugas di NoteNala</p>
                    </div>
                    <form onSubmit={handleAuth} className="mx-auto w-full max-w-[280px] space-y-3.5 sm:max-w-none sm:space-y-4">
                      <FieldBlock>
                        <label className="text-xs font-medium text-gray-300">Email</label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nama@email.com"
                            className={inputClass}
                            required
                            autoComplete="email"
                          />
                        </div>
                      </FieldBlock>
                      <FieldBlock>
                        <label className="text-xs font-medium text-gray-300">Password</label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className={`${inputClass} pr-11`}
                            required={!successMsg}
                            minLength={6}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-300"
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FieldBlock>
                      <p className="text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                        Dengan mendaftar, kamu menyetujui penggunaan layanan di nala.my.id.
                      </p>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                      >
                        {isLoading ? "Memproses…" : "Buat Akun Sekarang"}
                        {!isLoading && <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
                      </button>
                    </form>
                    {/* Toggle Mode Login di Mobile */}
                    <div className="mt-6 flex justify-center md:hidden">
                      <p className="text-xs text-gray-400">
                        Sudah punya akun?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode(true)}
                          className="font-bold text-blue-400 hover:text-blue-300"
                        >
                          Masuk di sini
                        </button>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="hidden flex-1 flex-col items-center justify-center opacity-30 md:flex" aria-hidden>
                    <p className="text-xs text-gray-500">Geser panel untuk daftar →</p>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`absolute inset-0 z-20 w-1/2 bg-blue-600 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none hidden md:block ${
                isLogin ? "left-1/2 translate-x-0" : "left-1/2 -translate-x-full"
              }`}
            >
              <div className="relative h-full w-full overflow-hidden">
                <OverlayFace
                  show={isLogin}
                  title="Baru di NoteNala?"
                  body="Buat akun gratis dan mulai atur tugas, tenggat, serta langkah kecilmu."
                  actionLabel="Daftar"
                  onAction={() => switchMode(false)}
                />
                <OverlayFace
                  show={!isLogin}
                  title="Sudah punya akun?"
                  body="Masuk untuk melanjutkan tugas dan sinkronmu."
                  actionLabel="Masuk"
                  onAction={() => switchMode(true)}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          <Link href="/landing" className="font-medium text-gray-400 transition hover:text-white hover:underline">
            Tentang NoteNala
          </Link>
          <span className="mx-2 text-gray-600">·</span>
          <span className="text-gray-500">nala.my.id</span>
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Sparkles,
  ImagePlus,
  ListChecks,
  WifiOff,
  Calendar,
  BookHeart,
  FolderOpen,
  Bot,
  Play,
  ChevronRight,
  Check,
  Search,
  User,
  Menu,
  PlusCircle,
  FileText,
  Send,
  Circle,
  Clock,
  GraduationCap,
  Tag,
  AlertCircle,
  ChevronDown,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

function GradientBlob({ className, delay = "0s" }: { className: string; delay?: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-3xl opacity-40 motion-safe:animate-[landing-blob_22s_ease-in-out_infinite] ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden
    />
  );
}

/** Fade + slide in when section enters viewport */
function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold: 0.06, rootMargin: "0px 0px -32px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:duration-150 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/** Miniatur UI sesuai halaman utama NoteNala (app/page.tsx) — teks & pola komponen asli */
function AppWindowMockup() {
  return (
    <div className="relative w-full min-w-0 max-w-[min(100%,420px)] mx-auto px-1 sm:px-0">
      <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-tr from-blue-500/20 via-purple-500/25 to-pink-500/20 rounded-[1.5rem] sm:rounded-[2rem] blur-xl motion-safe:animate-[landing-blob_26s_ease-in-out_infinite]" />
      <div className="relative rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50/90">
          <span className="h-2 w-2 rounded-full bg-red-400/90" />
          <span className="h-2 w-2 rounded-full bg-amber-400/90" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
          <span className="ml-1.5 text-[10px] text-slate-500 font-medium truncate tabular-nums">
            nala.my.id
          </span>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="bg-slate-950 text-gray-100 text-[10px] leading-tight max-h-[min(62vh,480px)] sm:max-h-[min(72vh,540px)] lg:max-h-[min(78vh,560px)] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
          {/* Navbar seperti app */}
          <nav className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
            <div className="h-7 w-7 rounded-full border-2 border-blue-500/50 overflow-hidden shrink-0 bg-white/5">
              <Image src="/logo.png" alt="" width={28} height={28} className="object-cover w-full h-full" />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-1 rounded-xl bg-gray-950/50 border border-gray-600/70 px-2 py-1">
              <Search className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-gray-500 truncate">Cari tugas...</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="p-1 rounded-full border border-transparent hover:border-blue-500/50">
                <User className="w-3.5 h-3.5 text-gray-200" />
              </span>
              <span className="p-1 rounded-lg border border-gray-700 bg-gray-800/80">
                <Menu className="w-3.5 h-3.5 text-white" />
              </span>
            </div>
          </nav>

          <main className="px-2.5 py-2.5 space-y-2.5">
            <div className="text-center pt-1">
              <h2 className="text-[11px] font-extrabold text-white drop-shadow-sm">Tugas Tugas Mendatang</h2>
              <p className="text-[9px] text-gray-200 mt-0.5">Jangan Ditunda tunda selesaikan yang mudah dulu :D</p>
            </div>

            {/* Form Buat Catatan Baru */}
            <div className="rounded-xl overflow-hidden border border-gray-700/40 shadow-lg shadow-black/20">
              <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              <div className="bg-gray-900/70 backdrop-blur-sm p-2.5 space-y-2 border-t-0 rounded-b-xl border-x border-b border-gray-700/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[10px] font-bold text-white leading-tight">Buat Catatan Baru</h3>
                      <p className="text-[8px] text-gray-400">Tambahkan tugas baru ke daftarmu</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <span className="p-1 rounded-lg bg-gray-800/80 border border-gray-700/50">
                      <ImagePlus className="w-3 h-3 text-gray-300" />
                    </span>
                    <span className="p-1 rounded-lg bg-gray-800/80 border border-gray-700/50">
                      <Mic className="w-3 h-3 text-gray-300" />
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="relative flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-lg bg-gray-800/60 border border-gray-600/50">
                    <FileText className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                    <span className="text-[8px] text-gray-500 truncate">Judul Tugas...</span>
                  </div>
                  <div className="relative flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-lg bg-gray-800/60 border border-gray-600/50">
                    <Calendar className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                    <span className="text-[8px] text-gray-500">Tenggat</span>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-800/60 border border-gray-600/50 px-1.5 py-1 min-h-[28px]">
                  <span className="text-[8px] text-gray-500">Tulis detail atau instruksi tugas di sini...</span>
                </div>
                <p className="text-[7px] font-semibold text-gray-400 uppercase tracking-wider">Kategori Tugas</p>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[7px] font-medium bg-gray-800/40 border border-gray-700/50 text-gray-500">
                    <Tag className="w-2 h-2" /> Biasa
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[7px] font-medium bg-red-500/10 border border-red-500/20 text-red-400 ring-1 ring-red-500/50 scale-105">
                    <AlertCircle className="w-2 h-2" /> Urgent
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[7px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <GraduationCap className="w-2 h-2" /> Kuliah
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-semibold text-[9px] shadow-md shadow-blue-500/20">
                  <Send className="w-3 h-3" />
                  Simpan ke Daftar
                </div>
              </div>
            </div>

            {/* Daftar tugas */}
            <div>
              <h3 className="text-[10px] font-bold text-white mb-1.5">Daftar Tugasmu</h3>
              <div className="flex gap-1 overflow-x-auto pb-1 mb-1.5 scroll-smooth">
                <span className="shrink-0 px-2 py-0.5 rounded-lg text-[8px] font-bold bg-gray-800 border border-gray-600 text-white">
                  Semua Tugas
                </span>
                <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[8px] font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-2.5 h-2.5" /> Urgent
                </span>
                <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[8px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <GraduationCap className="w-2.5 h-2.5" /> Kuliah
                </span>
              </div>

              <div className="rounded-xl border border-gray-700/60 bg-gray-900/80 p-2 flex gap-2">
                <Circle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[10px] font-semibold text-gray-100 truncate">Kumpulkan tugas OS modul 4</p>
                  <p className="text-[8px] text-gray-300 line-clamp-2">
                    Bab deadlock & scheduling, kirim PDF ke grup lab.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-medium bg-gray-800/80 text-gray-300 border border-gray-700/50">
                      <Calendar className="w-2 h-2" />
                      22 Apr 2026
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] border text-yellow-400 bg-yellow-400/10 border-yellow-400/20">
                      <Clock className="w-2 h-2" />2 hari lagi
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] border text-blue-400 bg-blue-500/10 border-blue-500/20">
                      <GraduationCap className="w-2 h-2" />
                      Kuliah
                    </span>
                  </div>
                  <button type="button" className="w-full flex items-center gap-1.5 mt-1 px-1 py-1 rounded-lg bg-gray-800/40 border-t border-gray-700/30">
                    <ListChecks className="w-3 h-3 text-indigo-400 shrink-0" />
                    <div className="flex-1 h-1 rounded-full bg-gray-800/80 border border-gray-700/40 overflow-hidden">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400" />
                    </div>
                    <span className="text-[7px] font-bold text-blue-400">2/3</span>
                    <ChevronDown className="w-3 h-3 text-gray-500 ml-auto" />
                  </button>
                  <div className="pl-0.5 space-y-0.5 pt-0.5">
                    <div className="flex items-center gap-1 text-[8px] text-gray-300">
                      <CheckSquare className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span className="line-through text-gray-500">Baca slide minggu 7</span>
                    </div>
                    <div className="flex items-center gap-1 text-[8px] text-gray-300">
                      <Square className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                      <span>Run demo & screenshot</span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-0.5">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[7px] font-semibold bg-gray-800/80 border border-indigo-500/30 text-indigo-300">
                      <Sparkles className="w-2 h-2 text-amber-400" />
                      Pecah dengan AI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,280px)] sm:max-w-[300px]">
      <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-blue-500/15 via-purple-500/20 to-pink-500/15 rounded-[2.5rem] sm:rounded-[3rem] blur-2xl motion-safe:animate-[landing-blob_24s_ease-in-out_infinite]" />
      <div
        className="relative rotate-0 sm:-rotate-6 lg:-rotate-[8deg] rounded-[1.75rem] sm:rounded-[2.25rem] border-[8px] sm:border-[10px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden text-gray-100 scale-[0.96] sm:scale-100 motion-safe:transition-transform motion-safe:duration-500"
        style={{ aspectRatio: "9/19" }}
      >
        <div className="h-1.5 w-20 mx-auto mt-2 rounded-full bg-slate-800" />
        <div className="px-2.5 pt-2 pb-3 space-y-2 text-[9px] leading-snug max-h-[88%] overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
          <div className="flex items-center gap-1.5 py-1 border-b border-gray-700/50">
            <div className="h-6 w-6 rounded-full border border-blue-500/40 overflow-hidden shrink-0">
              <Image src="/logo.png" alt="" width={24} height={24} className="object-cover w-full h-full" />
            </div>
            <div className="flex-1 flex items-center gap-1 rounded-lg bg-gray-950/50 border border-gray-600/60 px-1.5 py-0.5 min-w-0">
              <Search className="w-2.5 h-2.5 text-gray-400 shrink-0" />
              <span className="text-gray-500 truncate text-[8px]">Cari tugas...</span>
            </div>
            <Menu className="w-3.5 h-3.5 text-white shrink-0" />
          </div>
          <p className="text-center font-extrabold text-white text-[10px]">Tugas Tugas Mendatang</p>
          <div className="rounded-lg overflow-hidden border border-gray-700/50">
            <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <div className="bg-gray-900/80 p-1.5 space-y-1">
              <div className="flex items-center gap-1">
                <PlusCircle className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="font-bold text-[9px] text-white">Buat Catatan Baru</span>
              </div>
              <div className="flex gap-1 justify-end">
                <ImagePlus className="w-3 h-3 text-gray-400" />
                <Mic className="w-3 h-3 text-gray-400" />
              </div>
              <div className="rounded-md bg-gray-800/60 border border-gray-600/50 px-1 py-0.5 text-[8px] text-gray-500">
                Judul Tugas...
              </div>
              <div className="rounded-md bg-gradient-to-r from-blue-600 to-indigo-500 text-center text-white font-semibold text-[8px] py-1">
                Simpan ke Daftar
              </div>
            </div>
          </div>
          <p className="font-bold text-white text-[9px]">Daftar Tugasmu</p>
          <div className="rounded-lg border border-gray-700/60 bg-gray-900/80 p-1.5 flex gap-1.5">
            <Circle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-semibold text-white text-[9px] leading-tight">Review jurnal AI</p>
              <p className="text-[7px] text-gray-400 line-clamp-2">Ringkas 3 paper untuk minggu depan.</p>
              <div className="flex flex-wrap gap-0.5">
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[6px] bg-gray-800 text-gray-300 border border-gray-700/50">
                  <Calendar className="w-2 h-2" />
                  25 Apr 2026
                </span>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[6px] text-orange-400 bg-orange-400/10 border border-orange-400/20">
                  <Clock className="w-2 h-2" />
                  Besok! ⏰
                </span>
              </div>
              <div className="flex items-center gap-1 pt-0.5">
                <ListChecks className="w-2.5 h-2.5 text-indigo-400" />
                <div className="flex-1 h-0.5 rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full w-[40%] rounded-full bg-gradient-to-r from-blue-500 to-indigo-400" />
                </div>
                <span className="text-[6px] font-bold text-blue-400">1/3</span>
              </div>
            </div>
          </div>
          <p className="text-[7px] text-center text-gray-500 pt-0.5">nala.my.id</p>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Mic,
    title: "Catat lewat suara",
    desc: "Rekam ide singkat; AI mengurai jadi judul, catatan, tenggat, dan kategori — siap disimpan.",
    accent: "from-blue-500 to-indigo-500",
  },
  {
    icon: ImagePlus,
    title: "AI Vision dari foto",
    desc: "Foto papan tulis, selebaran, atau tugas cetak; sistem membaca gambar dan menyiapkan draf tugas.",
    accent: "from-purple-500 to-violet-600",
  },
  {
    icon: ListChecks,
    title: "Subtask & pecah tugas",
    desc: "Checklist langkah demi langkah, plus tombol pecah tugas otomatis dengan AI untuk rencana kerja.",
    accent: "from-indigo-500 to-blue-600",
  },
  {
    icon: Sparkles,
    title: "Nala AI Hub",
    desc: "Ruang chat untuk bantuan kontekstual — terhubung dengan alur kerja NoteNala kamu.",
    accent: "from-pink-500 to-rose-500",
  },
];

const whyItems = [
  {
    n: "01",
    title: "Satu tempat untuk misi harian",
    body: "Tugas, tenggat, filter kategori, dan pencarian — desain gelap yang nyaman dipakai lama.",
  },
  {
    n: "02",
    title: "Tetap produktif saat offline",
    body: "Antrean sinkron menjaga perubahan kamu; begitu kembali online, data dijajarkan ulang ke server.",
  },
  {
    n: "03",
    title: "Ekosistem lengkap",
    body: "Kalender misi, jurnal harian, dan NoteNala Drive — pelengkap di samping daftar tugas utama.",
  },
];

const modules = [
  { icon: Calendar, title: "Kalender Misi", desc: "Lihat tenggat dalam sudut pandang tanggal." },
  { icon: BookHeart, title: "Jurnal Harian", desc: "Refleksi singkat terpisah dari daftar tugas." },
  { icon: FolderOpen, title: "NoteNala Drive", desc: "Akses file dan materi pendukung pekerjaanmu." },
  { icon: Bot, title: "Nala AI Hub", desc: "Asisten percakapan untuk ide dan bantuan cepat." },
];

const benefits = [
  {
    icon: WifiOff,
    title: "Mode offline & sync",
    desc: "Kerja dari mana saja; sinkronisasi otomatis saat jaringan stabil.",
  },
  {
    icon: Check,
    title: "Kategori & prioritas",
    desc: "Urgent, kuliah, pekerjaan, pribadi — filter yang selaras dengan kebutuhanmu.",
  },
  {
    icon: Sparkles,
    title: "AI di titik input",
    desc: "Suara, gambar, dan pecah tugas mengurangi gesekan saat mencatat.",
  },
  {
    icon: ListChecks,
    title: "Progres yang terlihat",
    desc: "Batang progres subtask membuat langkah besar terasa lebih ringan.",
  },
];

const navLinks = [
  { href: "#fitur", label: "Fitur" },
  { href: "#kenapa", label: "Kenapa NoteNala" },
  { href: "#modul", label: "Modul" },
  { href: "#benefits", label: "Benefits" },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/");
    });
  }, [router]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 pt-[max(env(safe-area-inset-top),0px)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link href="/landing" className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 py-2">
            <span className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-blue-500/35 overflow-hidden shadow-md shadow-blue-500/10 shrink-0">
              <Image src="/logo.png" alt="NoteNala" fill className="object-cover" sizes="40px" />
            </span>
            <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-700 via-purple-700 to-pink-600 bg-clip-text text-transparent truncate">
              NoteNala
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-600">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-blue-700 transition-colors whitespace-nowrap">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              aria-expanded={mobileNavOpen}
              aria-controls="landing-mobile-nav"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 shadow-lg shadow-purple-500/25 hover:opacity-95 active:scale-[0.98] transition-all"
            >
              Masuk
            </Link>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" id="landing-mobile-nav" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Tutup menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-[min(100%,20rem)] bg-white shadow-2xl border-l border-slate-200 flex flex-col motion-safe:animate-[landing-drawer-in_0.28s_cubic-bezier(0.22,1,0.36,1)_both]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 pt-[max(env(safe-area-inset-top),1rem)]">
              <span className="font-bold text-slate-900">Menu</span>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col p-2 gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/login"
                className="mt-2 mx-2 py-3 rounded-xl text-center font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500"
                onClick={() => setMobileNavOpen(false)}
              >
                Masuk
              </Link>
            </nav>
          </div>
        </div>
      )}

      <section className="relative pt-10 pb-16 sm:pt-14 sm:pb-20 md:pt-20 md:pb-28">
        <GradientBlob className="-right-8 sm:right-0 top-0 h-56 w-56 sm:h-72 sm:w-72 bg-blue-400" delay="0s" />
        <GradientBlob className="left-0 sm:left-10 top-32 sm:top-40 h-48 w-48 sm:h-64 sm:w-64 bg-pink-400" delay="-4s" />
        <GradientBlob className="right-0 bottom-0 h-44 w-44 sm:h-56 sm:w-56 bg-purple-400" delay="-8s" />

        <div className="max-w-6xl mx-auto px-3 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-12 xl:gap-16 items-center relative">
          <RevealOnScroll className="order-1 lg:order-none min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-purple-700 mb-2 sm:mb-3 tracking-wide uppercase">
              Produktivitas tanpa ribet
            </p>
            <h1 className="text-[1.65rem] leading-tight sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              Aplikasi catat tugasmu biar harimu tetap{" "}
              <span className="inline-block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-[length:200%_100%] bg-clip-text text-transparent motion-safe:animate-[landing-gradient-shift_7s_ease-in-out_infinite]">
                rapi & ringan
              </span>
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              NoteNala menggabungkan daftar tugas, AI untuk suara & gambar, checklist subtask, dan
              modul pendamping.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 shadow-xl shadow-purple-500/30 overflow-hidden hover:shadow-purple-500/45 active:scale-[0.98] transition-all"
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 motion-safe:group-hover:opacity-100 motion-safe:transition-opacity">
                  <span className="absolute inset-0 motion-safe:animate-[landing-shine_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 skew-x-[-18deg]" />
                </span>
                <span className="relative">Mulai gratis</span>
                <ChevronRight className="relative w-5 h-5 motion-safe:group-hover:translate-x-1 transition-transform" />
              </Link>
              {/* <a
                href="#fitur"
                className="inline-flex items-center justify-center gap-2 text-slate-700 font-semibold hover:text-purple-700 transition-colors py-2"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-purple-200 bg-white shadow-sm motion-safe:hover:border-purple-400 motion-safe:transition-colors">
                  <Play className="w-4 h-4 text-purple-600 fill-purple-600" />
                </span>
                Lihat fitur
              </a> */}
            </div>
          </RevealOnScroll>
          <RevealOnScroll delayMs={120} className="order-2 lg:order-none min-w-0 flex justify-center lg:justify-end">
            <div className="w-full max-w-[min(100%,420px)] motion-safe:hover:scale-[1.02] motion-safe:transition-transform motion-safe:duration-500">
              <AppWindowMockup />
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section id="fitur" className="py-14 sm:py-20 bg-white border-y border-slate-100 scroll-mt-16 sm:scroll-mt-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <RevealOnScroll>
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Produktivitas dimulai dari fitur yang tepat
              </h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                Setiap blok dirancang agar kamu cepat mencatat, mudah meninjau ulang, dan punya
                bantuan AI tepat saat dibutuhkan.
              </p>
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <RevealOnScroll key={f.title} delayMs={i * 80}>
                  <div className="group h-full rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6 hover:border-purple-200/80 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-xl motion-safe:hover:shadow-purple-500/10 transition-all duration-300">
                    <div
                      className={`inline-flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-lg mb-3 sm:mb-4 motion-safe:group-hover:scale-110 motion-safe:transition-transform duration-300`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2">{f.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      <section id="kenapa" className="py-14 sm:py-20 bg-slate-50 scroll-mt-16 sm:scroll-mt-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <RevealOnScroll className="order-2 lg:order-1 flex justify-center min-w-0">
            <PhoneMockup />
          </RevealOnScroll>
          <RevealOnScroll delayMs={80} className="order-1 lg:order-2 min-w-0">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Kenapa memilih NoteNala untuk rutinitas harian?
            </h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              Kami fokus pada alur nyata: dari ide cepat di jalan, hingga tugas besar yang perlu
              dipecah jadi langkah kecil.
            </p>
            <ul className="mt-8 sm:mt-10 space-y-6 sm:space-y-8">
              {whyItems.map((item) => (
                <li key={item.n} className="flex gap-4 sm:gap-5">
                  <span className="text-2xl sm:text-3xl font-black text-transparent bg-gradient-to-b from-blue-600 to-purple-600 bg-clip-text leading-none shrink-0">
                    {item.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1.5 sm:mt-2 text-slate-600 text-xs sm:text-sm leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        </div>
      </section>

      <section id="modul" className="py-14 sm:py-20 bg-white scroll-mt-16 sm:scroll-mt-20 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <RevealOnScroll>
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Modul pendamping</h2>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Setelah tugas tersimpan, lanjutkan alur kerja lewat modul lain dalam satu ekosistem.
              </p>
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {modules.map((m, i) => {
              const Icon = m.icon;
              return (
                <RevealOnScroll key={m.title} delayMs={i * 70}>
                  <div className="group flex gap-3 sm:gap-4 rounded-2xl border border-slate-200 p-4 sm:p-6 bg-gradient-to-br from-white to-slate-50/80 hover:border-blue-200/90 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg motion-safe:transition-all duration-300 h-full">
                    <div className="shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center motion-safe:group-hover:scale-105 motion-safe:transition-transform">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{m.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="benefits"
        className="py-14 sm:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 scroll-mt-16 sm:scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <RevealOnScroll>
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-purple-700 mb-2">
                Benefits
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Manfaat yang langsung terasa
              </h2>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Nilai praktis saat kamu memakai NoteNala untuk tugas harian — terpisah dari modul
                pendamping di atas.
              </p>
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <RevealOnScroll key={b.title} delayMs={i * 90}>
                  <div className="group flex gap-3 sm:gap-4 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm p-4 sm:p-5 motion-safe:hover:border-purple-200 motion-safe:hover:shadow-md motion-safe:transition-all duration-300 h-full">
                    <div className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-slate-200 flex items-center justify-center text-purple-600 bg-purple-50 motion-safe:group-hover:bg-purple-100 motion-safe:group-hover:scale-105 motion-safe:transition-all">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg">{b.title}</h3>
                      <p className="mt-1.5 sm:mt-2 text-slate-600 text-xs sm:text-sm leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pb-[max(env(safe-area-inset-bottom),0px)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-10 sm:py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="relative h-10 w-10 rounded-full overflow-hidden border border-slate-700 ring-2 ring-blue-500/20">
                  <Image src="/logo.png" alt="" fill className="object-cover" sizes="40px" />
                </span>
                <span className="font-bold text-lg text-white tracking-tight">NoteNala</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400 max-w-md">
                Platform produktivitas untuk mencatat tugas, mengelola tenggat, dan memanfaatkan AI
                pada titik input — di-host di{" "}
                <a
                  href="https://nala.my.id"
                  className="text-slate-200 font-medium hover:text-white underline-offset-2 hover:underline"
                >
                  nala.my.id
                </a>
                .
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                Navigasi
              </p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#fitur" className="hover:text-white transition-colors">
                    Fitur
                  </a>
                </li>
                <li>
                  <a href="#kenapa" className="hover:text-white transition-colors">
                    Kenapa NoteNala
                  </a>
                </li>
                <li>
                  <a href="#modul" className="hover:text-white transition-colors">
                    Modul
                  </a>
                </li>
                <li>
                  <a href="#benefits" className="hover:text-white transition-colors">
                    Benefits
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Masuk
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                Legal & kontak
              </p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <span className="text-slate-500">Layanan:</span>{" "}
                  <a
                    href="https://nala.my.id"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    nala.my.id
                  </a>
                </li>
                <li className="text-slate-500 text-xs leading-relaxed pt-1">
                  Akses memerlukan akun. Pastikan data yang Anda simpan mematuhi kebijakan institusi
                  atau organisasi Anda.
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} NoteNala. Hak cipta dilindungi undang-undang yang
              berlaku.
            </p>
            <p className="text-center sm:text-right">Produk digital — tidak ada jaminan tersirat di luar layanan yang disediakan.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

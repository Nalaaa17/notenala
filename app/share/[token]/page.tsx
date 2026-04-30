"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Download, FileText, File, Loader2, AlertTriangle, Eye, X, Sparkles, CheckCircle } from 'lucide-react';

interface SharedFile {
  id: number;
  name: string;
  size: string;
  date: string;
  file_url: string;
  folder_name?: string;
}

interface ShareRecord {
  token: string;
  file_id: number;
  created_at: string;
  expires_at: string | null;
  shared_by_name: string;
  files: SharedFile;
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const [shareData, setShareData] = useState<ShareRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const res = await fetch(`/api/share-file?token=${token}`);
        const result = await res.json();

        if (!res.ok || !result.success || !result.data) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        const data = result.data;

      // Cek kadaluarsa
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setIsExpired(true);
        setIsLoading(false);
        return;
      }

      // Flatten folder_name dari nested object
      const file = data.files as any;
      const enriched: SharedFile = {
        ...file,
        folder_name: file?.folders?.name || null,
      };

      setShareData({ ...data, files: enriched });
      setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch share data:', err);
        setNotFound(true);
        setIsLoading(false);
      }
    };

    fetchShare();
  }, [token]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (name: string) => {
    if (name.toLowerCase().endsWith('.pdf')) return <FileText size={48} className="text-red-400" />;
    if (name.toLowerCase().endsWith('.zip')) return <File size={48} className="text-amber-400" />;
    return <FileText size={48} className="text-blue-400" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 size={48} className="animate-spin text-blue-500" />
          <p className="text-lg">Memuat file berbagi...</p>
        </div>
      </div>
    );
  }

  if (notFound || isExpired) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center border border-red-500/20">
            <AlertTriangle size={48} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {isExpired ? 'Link Sudah Kadaluarsa' : 'File Tidak Ditemukan'}
          </h1>
          <p className="text-gray-400 mb-8">
            {isExpired
              ? 'Link berbagi ini sudah tidak aktif. Minta pengirim untuk membuat link baru.'
              : 'Link ini tidak valid atau file sudah dihapus.'}
          </p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition font-medium">
            Buka NoteNala
          </a>
        </div>
      </div>
    );
  }

  const file = shareData!.files;
  const isPdf = file.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <nav className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-blue-500/50 flex items-center justify-center">
              <img src="/logo-v2.png" alt="NoteNala" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="text-lg font-bold text-white">NoteNala</span>
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-sm text-gray-400">File Berbagi</span>
          </div>
          <a href="/landing" className="text-sm text-blue-400 hover:text-blue-300 transition hidden sm:block">
            Coba NoteNala Gratis →
          </a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Card Utama File */}
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* Gradient top bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

          <div className="p-8">
            {/* Shared by info */}
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {shareData!.shared_by_name?.charAt(0)?.toUpperCase() || 'N'}
              </div>
              <span>
                Dibagikan oleh <span className="text-white font-medium">{shareData!.shared_by_name || 'Pengguna NoteNala'}</span>
              </span>
              {shareData!.files.folder_name && (
                <>
                  <span className="text-gray-600">·</span>
                  <span>Folder: <span className="text-blue-400">{shareData!.files.folder_name}</span></span>
                </>
              )}
            </div>

            {/* File info */}
            <div className="flex items-center gap-5 mb-8 bg-gray-800/40 p-5 rounded-2xl border border-gray-700/30">
              <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-700/40 flex-shrink-0">
                {getFileIcon(file.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-white leading-tight truncate">{file.name}</h1>
                <div className="flex gap-3 text-sm text-gray-400 mt-1.5">
                  <span>{file.size}</span>
                  <span>·</span>
                  <span>Diunggah {file.date}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`${file.file_url}?download=${encodeURIComponent(file.name)}`}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-500/25 text-base"
              >
                <Download size={20} />
                Download File
              </a>

              {isPdf && (
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition border border-gray-700 text-base"
                >
                  <Eye size={20} />
                  Pratinjau
                </button>
              )}
            </div>

            {/* Copy link */}
            <button
              onClick={copyLink}
              className="w-full mt-3 py-2.5 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-800/70 rounded-xl transition border border-gray-700/30"
            >
              {copied ? (
                <><CheckCircle size={15} className="text-emerald-400" /> Link disalin!</>
              ) : (
                <>📋 Salin Link Berbagi</>
              )}
            </button>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm mb-3">Ingin menyimpan dan berbagi file tugasmu sendiri?</p>
          <a
            href="/landing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-xl border border-blue-500/30 transition text-sm font-medium"
          >
            <Sparkles size={15} /> Coba NoteNala Gratis
          </a>
        </div>
      </main>

      {/* PDF Preview Modal */}
      {isPreviewOpen && isPdf && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-900/90 border-b border-gray-800 flex-shrink-0">
            <h3 className="text-sm font-medium text-white truncate max-w-xs">{file.name}</h3>
            <div className="flex items-center gap-2">
              <a
                href={`${file.file_url}?download=${encodeURIComponent(file.name)}`}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition flex items-center gap-1.5"
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <iframe
            src={file.file_url}
            className="flex-1 w-full bg-white"
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
}

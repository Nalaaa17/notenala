"use client";
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Folder, FileText, UploadCloud, Plus, ArrowLeft,
    Trash2, File, X, AlertTriangle, Eye, Download, Pencil, Search
} from 'lucide-react';

interface FolderType {
    id: number;
    name: string;
}

interface FileType {
    id: number;
    folder_id: number;
    name: string;
    size: string;
    date: string;
    file_url: string;
}

export default function DrivePage() {
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [files, setFiles] = useState<FileType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const [currentFolder, setCurrentFolder] = useState<FolderType | null>(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'file', id: number, fileUrl?: string } | null>(null);

    const [previewFile, setPreviewFile] = useState<FileType | null>(null);

    // Fitur Rename File
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [fileToRename, setFileToRename] = useState<FileType | null>(null);
    const [newFileName, setNewFileName] = useState("");

    // STATE BARU: Untuk fitur pencarian (Search)
    const [searchQuery, setSearchQuery] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchDriveData();
    }, []);

    const fetchDriveData = async () => {
        setIsLoading(true);
        const { data: folderData } = await supabase.from('folders').select('*').order('id', { ascending: false });
        if (folderData) setFolders(folderData);

        const { data: fileData } = await supabase.from('files').select('*').order('id', { ascending: false });
        if (fileData) setFiles(fileData);
        setIsLoading(false);
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        const { data, error } = await supabase.from('folders').insert([{ name: newFolderName.trim() }]).select();
        if (!error && data) setFolders([data[0], ...folders]);
        setNewFolderName("");
        setIsFolderModalOpen(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile || !currentFolder) return;

        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(uploadedFile.type)) {
            alert("Format tidak didukung! Hanya boleh upload PDF, DOC, atau DOCX.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('tugas-file').upload(fileName, uploadedFile);

        if (uploadError) {
            alert("Gagal mengunggah file ke server.");
            setIsUploading(false);
            return;
        }

        const { data: publicUrlData } = supabase.storage.from('tugas-file').getPublicUrl(fileName);

        const fileSizeInKB = uploadedFile.size / 1024;
        const sizeStr = fileSizeInKB > 1024 ? `${(fileSizeInKB / 1024).toFixed(2)} MB` : `${fileSizeInKB.toFixed(0)} KB`;

        const { data: dbData, error: dbError } = await supabase.from('files').insert([{
            folder_id: currentFolder.id,
            name: uploadedFile.name,
            size: sizeStr,
            date: new Date().toLocaleDateString('id-ID'),
            file_url: publicUrlData.publicUrl
        }]).select();

        if (!dbError && dbData) setFiles([dbData[0], ...files]);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const openRenameModal = (file: FileType) => {
        setFileToRename(file);
        setNewFileName(file.name);
        setIsRenameModalOpen(true);
    };

    const handleRenameFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fileToRename || !newFileName.trim()) return;

        const { error } = await supabase
            .from('files')
            .update({ name: newFileName.trim() })
            .eq('id', fileToRename.id);

        if (!error) {
            setFiles(files.map(f => f.id === fileToRename.id ? { ...f, name: newFileName.trim() } : f));
            setIsRenameModalOpen(false);
            setFileToRename(null);

            if (previewFile && previewFile.id === fileToRename.id) {
                setPreviewFile({ ...previewFile, name: newFileName.trim() });
            }
        } else {
            alert("Terjadi kesalahan saat mengubah nama file.");
        }
    };

    const confirmDeleteFolder = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteTarget({ type: 'folder', id });
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteFile = (id: number, fileUrl: string) => {
        setDeleteTarget({ type: 'file', id, fileUrl });
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;

        if (deleteTarget.type === 'folder') {
            const { error } = await supabase.from('folders').delete().eq('id', deleteTarget.id);
            if (!error) {
                setFolders(folders.filter(f => f.id !== deleteTarget.id));
                setFiles(files.filter(file => file.folder_id !== deleteTarget.id));
            }
        } else if (deleteTarget.type === 'file') {
            const fileName = deleteTarget.fileUrl?.split('/').pop();
            if (fileName) await supabase.storage.from('tugas-file').remove([fileName]);

            const { error } = await supabase.from('files').delete().eq('id', deleteTarget.id);
            if (!error) setFiles(files.filter(f => f.id !== deleteTarget.id));
        }

        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
    };

    // Fungsi transisi folder untuk reset input pencarian
    const handleOpenFolder = (folder: FolderType) => {
        setCurrentFolder(folder);
        setSearchQuery(""); // Kosongkan pencarian saat masuk folder
    };

    const handleBackToFolders = () => {
        setCurrentFolder(null);
        setSearchQuery(""); // Kosongkan pencarian saat kembali
    };

    // LOGIKA FILTER PENCARIAN
    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentFiles = currentFolder ? files.filter(f => f.folder_id === currentFolder.id) : [];
    const filteredFiles = currentFiles.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-transparent text-gray-100 font-sans pb-12 relative">

            <nav className="bg-gray-900/70 backdrop-blur-md border-b border-gray-700/50 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
                <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                    <FileText size={24} /> NoteNala Drive
                </h1>
                <a href="/" className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition border border-gray-700/50 backdrop-blur-sm">
                    <ArrowLeft size={18} /> Kembali ke Catatan
                </a>
            </nav>

            <main className="max-w-5xl mx-auto p-6 mt-4">
                {isLoading ? (
                    <div className="text-center py-20 animate-pulse text-gray-400">
                        <UploadCloud size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Memuat isi Drive kamu...</p>
                    </div>
                ) : !currentFolder ? (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-700 pb-4 gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Folder className="text-blue-400" /> Semua Folder
                            </h2>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                {/* INPUT PENCARIAN FOLDER */}
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari folder..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition"
                                    />
                                </div>
                                <button onClick={() => setIsFolderModalOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-blue-500/20 whitespace-nowrap">
                                    <Plus size={18} /> Buat Folder
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {folders.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-gray-500">
                                    <Folder size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Belum ada folder. Buat folder untuk mulai menyimpan tugas!</p>
                                </div>
                            ) : filteredFolders.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-gray-500">
                                    <Search size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Folder "{searchQuery}" tidak ditemukan.</p>
                                </div>
                            ) : (
                                filteredFolders.map((folder) => (
                                    <div key={folder.id} onClick={() => handleOpenFolder(folder)} className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 p-5 rounded-2xl hover:border-blue-500/50 hover:bg-gray-800/80 transition cursor-pointer group flex flex-col justify-between h-32 relative overflow-hidden shadow-lg shadow-black/20">
                                        <div className="flex justify-between items-start">
                                            <Folder size={36} className="text-blue-400 fill-blue-400/20" />
                                            <button onClick={(e) => confirmDeleteFolder(folder.id, e)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1 bg-gray-800/80 border border-gray-700/50 rounded-lg backdrop-blur-sm" title="Hapus Folder"><Trash2 size={18} /></button>
                                        </div>
                                        <h3 className="font-semibold text-white truncate">{folder.name}</h3>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-700 pb-4 gap-4">
                            <div className="flex items-center gap-3">
                                <button onClick={handleBackToFolders} className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition border border-gray-700 hover:bg-gray-700"><ArrowLeft size={20} /></button>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2 truncate max-w-[200px] sm:max-w-xs md:max-w-md"><Folder className="text-blue-400 fill-blue-400/20 flex-shrink-0" /><span className="truncate">{currentFolder.name}</span></h2>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                {/* INPUT PENCARIAN FILE */}
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari file..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition"
                                    />
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf, .doc, .docx" className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`w-full sm:w-auto ${isUploading ? 'bg-emerald-800 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'} text-white px-5 py-2.5 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-500/20 font-medium whitespace-nowrap`}>
                                    <UploadCloud size={20} className={isUploading ? 'animate-bounce' : ''} />
                                    <span>{isUploading ? 'Mengunggah...' : 'Upload Tugas'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl shadow-black/20">
                            {currentFiles.length === 0 ? (
                                <div className="py-20 text-center text-gray-400">
                                    <UploadCloud size={48} className="mx-auto mb-3 opacity-30" />
                                    <p>Folder ini kosong.</p>
                                </div>
                            ) : filteredFiles.length === 0 ? (
                                <div className="py-20 text-center text-gray-400">
                                    <Search size={48} className="mx-auto mb-3 opacity-30" />
                                    <p>File "{searchQuery}" tidak ditemukan.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-700/50">
                                    {filteredFiles.map((file) => (
                                        <div key={file.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-800/80 transition gap-4 sm:gap-0">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 flex-shrink-0 border border-blue-500/10"><File size={24} /></div>
                                                <div className="min-w-0">
                                                    <h4 className="font-medium text-gray-100 truncate drop-shadow-sm">{file.name}</h4>
                                                    <div className="flex text-sm text-gray-400 gap-3 mt-0.5">
                                                        <span>{file.size}</span><span>•</span><span>{file.date}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 sm:ml-4">
                                                <button onClick={() => setPreviewFile(file)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition" title="Lihat Pratinjau">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => openRenameModal(file)} className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition" title="Ubah Nama">
                                                    <Pencil size={18} />
                                                </button>
                                                <a href={`${file.file_url}?download=${encodeURIComponent(file.name)}`} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition" title="Download Langsung">
                                                    <Download size={18} />
                                                </a>
                                                <button onClick={() => confirmDeleteFile(file.id, file.file_url)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800/50 hover:bg-red-500/10 rounded-lg transition" title="Hapus File">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* MODAL BUAT FOLDER */}
            {isFolderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Buat Folder Baru</h3>
                            <button onClick={() => setIsFolderModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateFolder}>
                            <input type="text" placeholder="Nama folder..." className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition mb-6" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus required />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsFolderModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">Buat</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL RENAME FILE */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-yellow-400" /> Ubah Nama File</h3>
                            <button onClick={() => setIsRenameModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRenameFile}>
                            <p className="text-sm text-gray-400 mb-2">Pastikan ekstensi file (.pdf / .docx) tidak terhapus.</p>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white transition mb-6"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                autoFocus
                                required
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsRenameModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-yellow-600 text-white hover:bg-yellow-500 transition shadow-lg shadow-yellow-500/20">Simpan Nama</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL HAPUS */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-500/10 p-4 rounded-full mb-4"><AlertTriangle size={36} className="text-red-500" /></div>
                            <h3 className="text-xl font-bold text-white mb-2">{deleteTarget?.type === 'folder' ? 'Hapus Folder?' : 'Hapus File?'}</h3>
                            <p className="text-gray-400 mb-6 text-sm">{deleteTarget?.type === 'folder' ? 'Semua file di folder ini akan terhapus permanen.' : 'File ini akan terhapus permanen.'}</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }} className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600 transition">Batal</button>
                                <button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-500 transition shadow-lg shadow-red-500/20">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PREVIEW FILE */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900">
                            <h3 className="text-lg font-bold text-white truncate flex items-center gap-2">
                                <FileText size={20} className="text-blue-400" /> {previewFile.name}
                            </h3>
                            <div className="flex gap-2">
                                <a href={`${previewFile.file_url}?download=${encodeURIComponent(previewFile.name)}`} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition" title="Download File">
                                    <Download size={18} />
                                </a>
                                <button onClick={() => setPreviewFile(null)} className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition" title="Tutup">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-900/50 p-4 flex items-center justify-center">
                            {previewFile.name.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={previewFile.file_url}
                                    className="w-full h-full rounded-xl border border-gray-700 bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="text-center p-8 bg-gray-800 border border-gray-700 rounded-2xl max-w-md">
                                    <FileText size={64} className="mx-auto text-blue-500 mb-4 opacity-80" />
                                    <h4 className="text-xl font-bold text-white mb-2">Pratinjau Tidak Tersedia</h4>
                                    <p className="text-gray-400 mb-6">
                                        Browser tidak mendukung pratinjau langsung untuk file Word. Silakan unduh untuk membukanya.
                                    </p>
                                    <a
                                        href={`${previewFile.file_url}?download=${encodeURIComponent(previewFile.name)}`}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20"
                                    >
                                        <Download size={18} /> Download Dokumen
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
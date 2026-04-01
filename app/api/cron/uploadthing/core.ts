import { createUploadthing, type FileRouter } from "uploadthing/next";
import { supabase } from "@/lib/supabase"; // Sesuaikan path

const f = createUploadthing();

export const ourFileRouter = {
    // 1. RUTE LAMA: Untuk upload dokumen/gambar di fitur Drive
    driveUploader: f({ image: { maxFileSize: "4MB" }, pdf: { maxFileSize: "8MB" } })
        .middleware(async () => {
            // Cek apakah user sudah login via Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload Drive selesai untuk user:", metadata.userId);
            console.log("URL File Drive:", file.url);
            // Di sini nanti kita bisa simpan URL ke database Supabase
        }),

    // 2. RUTE BARU: Khusus untuk upload Foto Profil (Avatar)
    profilePicture: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            // Sama seperti Drive, pastikan hanya user login yang bisa upload foto profil
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload Foto Profil selesai untuk user:", metadata.userId);
            console.log("URL Foto Baru:", file.url);

            // Kita kembalikan URL ini agar bisa ditangkap oleh Frontend (di LandingPage)
            // untuk langsung ditampilkan dan disimpan ke metadata Supabase
            return { url: file.url };
        }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
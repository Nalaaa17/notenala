import { createUploadthing, type FileRouter } from "uploadthing/next";
import { supabase } from "@/lib/supabase"; // Sesuaikan path

const f = createUploadthing();

export const ourFileRouter = {
    // Mendefinisikan rute untuk upload dokumen/gambar di Drive
    driveUploader: f({ image: { maxFileSize: "4MB" }, pdf: { maxFileSize: "8MB" } })
        .middleware(async () => {
            // Cek apakah user sudah login via Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload selesai untuk user:", metadata.userId);
            console.log("URL File:", file.url);
            // Di sini nanti kita bisa simpan URL ke database Supabase
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
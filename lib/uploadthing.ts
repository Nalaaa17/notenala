import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/cron/uploadthing/core";

// BIKIN DINAMIS: 
// Kalau lagi buka di localhost, pakai server lokal.
// Kalau lagi di-build buat APK/Vercel, otomatis pakai server nala.my.id
const serverUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/cron/uploadthing"
    : "https://nala.my.id/api/cron/uploadthing";

export const UploadButton = generateUploadButton<OurFileRouter>({ url: serverUrl });
export const UploadDropzone = generateUploadDropzone<OurFileRouter>({ url: serverUrl });
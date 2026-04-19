import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";

// BIKIN DINAMIS: 
// Kalau lagi buka di localhost, pakai server lokal.
// Kalau lagi di-build buat APK/Vercel, otomatis pakai server nala.my.id
const serverUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/cron/uploadthing"
    : "https://nala.my.id/api/cron/uploadthing";

export const UploadButton = generateUploadButton({ url: serverUrl });
export const UploadDropzone = generateUploadDropzone({ url: serverUrl });
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NoteNala — Catat tugas, jalani hari lebih ringan",
  description:
    "NoteNala: tugas, subtask, AI suara & gambar, kategori, dan sinkron — semua dalam satu alur kerja yang simpel.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

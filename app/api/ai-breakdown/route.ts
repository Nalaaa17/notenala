import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Kunci API Gemini (GEMINI_API_KEY) belum dipasang oleh admin." },
        { status: 401 }
      );
    }

    const { taskTitle, taskNote } = await req.json();

    if (!taskTitle) {
      return NextResponse.json({ error: "Judul tugas tidak boleh kosong." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Kamu adalah asisten AI pemecah tugas. Tugasmu sangat spesifik: diberikan sebuah Nama Tugas dan Detail Tugas (opsional), kamu harus memecahnya menjadi 3 sampai 6 sub-tugas (langkah-langkah kecil) yang sangat praktis dan actionable. 
      ATURAN MUTLAK: Keluaranmu HARUS berupa MURNI Array JSON yang berisi string. TIDAK BOLEH ADA TEKS LAIN. TIDAK BOLEH MENGGUNAKAN MARKDOWN \`\`\`json. 
      Contoh Output Valid:
      ["Cari referensi buku", "Buat kerangka bab 1", "Mulai menulis", "Pengecekan ejaan terakhir"]
      `
    });

    const prompt = `Nama Tugas: ${taskTitle}\nDetail: ${taskNote || 'Tidak ada detail.'}`;

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err: any) {
        retries--;
        if (err.message && err.message.includes("503") && retries > 0) {
          console.log(`Gemini API 503 error, retrying... (${retries} attempts left)`);
          await new Promise(res => setTimeout(res, 1500)); // Tunggu 1.5 detik
        } else {
          throw err;
        }
      }
    }
    
    if (!result) throw new Error("Gagal mengambil respon setelah beberapa percobaan.");
    
    let responseText = result.response.text().trim();

    // Pastikan membuang markdown json jika AI tetap bandel
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Ekstra pembersihan kalau ada teks sebelum array: "Berikut adalah langkahnya:\n["
    const firstBracket = responseText.indexOf('[');
    const lastBracket = responseText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        responseText = responseText.substring(firstBracket, lastBracket + 1);
    }
    
    let subtasks = [];
    try {
      subtasks = JSON.parse(responseText);
      if (!Array.isArray(subtasks)) throw new Error("Output dari AI bukan berformat Array");
    } catch (e: any) {
      console.error("Gagal parsing JSON dari AI:", responseText);
      return NextResponse.json({ error: `AI memberikan format yang tidak dikenali: ${e.message}. Teks: ${responseText.slice(0, 30)}...` }, { status: 500 });
    }

    return NextResponse.json({ subtasks });

  } catch (error: any) {
    console.error("Kesalahan API Gemini Breakdown:", error);
    return NextResponse.json({ error: `Terjadi error API AI: ${error.message || "Unknown Error"}` }, { status: 500 });
  }
}

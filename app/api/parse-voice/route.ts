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

    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: "Teks suara tidak boleh kosong." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Kamu adalah komponen Auto-Fill cerdas untuk NoteNala. 
      Tugasmu adalah menganalisis teks ucapan pengguna, mengekstrak niat tugas mereka, dan mengisikan data tersebut ke format JSON.
      Aturan Ekstraksi:
      - "title": Inti dari tugas yang harus dikerjakan (Singkat dan Jelas).
      - "due_date": Jika pengguna menyebut kapan tugas ini harus selesai (besok, lusa, tanggal 20 oktober, bulan depan), tebak tanggalnya ke format YYYY-MM-DD. Anggap hari ini adalah ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Jika tidak disebut, biarkan bernilai string kosong "".
      - "due_time": Jika pengguna menyebut jam/waktu untuk pengingat (jam 3 sore, pukul 09.00, jam setengah 10, jam 14, dsb.), konversi ke format HH:MM (24 jam). Contoh: "jam 3 sore" → "15:00", "setengah 10 pagi" → "09:30", "jam 9 malam" → "21:00". Jika tidak ada waktu disebutkan, biarkan bernilai string kosong "".
      - "category": Harus salah satu dari "Biasa", "Urgent", "Kuliah", "Pribadi", atau "Pekerjaan". Pilih yang paling masuk akal bedasarkan isi teks. Jika tidak jelas, gunakan "Biasa".
      - "note": Sisa detail instruksi tugas yang panjang, langkah, pesan, syarat, dsb. Jika tidak ada, gunakan "".

      Keluaranmu HARUS berupa MURNI Object JSON, TIDAK BOLEH dibungkus blok markdown \`\`\`json.
      
      Contoh:
      Berikan output seperti:
      {"title": "Meeting dengan klien", "due_date": "2023-11-20", "due_time": "14:00", "category": "Pekerjaan", "note": "Di ruang rapat lantai 3"}
      `
    });

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await model.generateContent(`Ucapan Mentah: "${transcript}"`);
        break;
      } catch (err: any) {
        retries--;
        if (err.message && err.message.includes("503") && retries > 0) {
          console.log(`Gemini API 503 error, retrying... (${retries} attempts left)`);
          await new Promise(res => setTimeout(res, 1500));
        } else {
          throw err;
        }
      }
    }
    
    if (!result) throw new Error("Gagal mengambil respon dari AI.");

    let responseText = result.response.text().trim();

    // Pastikan membuang markdown json
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        responseText = responseText.substring(firstBrace, lastBrace + 1);
    }
    
    let parsedData = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e: any) {
      console.error("Gagal parsing JSON dari AI Voice:", responseText);
      return NextResponse.json({ error: `AI memberikan format yang tidak dikenali: ${e.message}` }, { status: 500 });
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Kesalahan API Parse Voice:", error);
    return NextResponse.json({ error: `Terjadi error API AI Voice: ${error.message || "Unknown Error"}` }, { status: 500 });
  }
}

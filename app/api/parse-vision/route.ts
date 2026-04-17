import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Kunci API Gemini (GEMINI_API_KEY) belum dipasang." },
        { status: 401 }
      );
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Gambar tidak boleh kosong." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Kamu adalah komponen AI Vision Lab cerdas untuk NoteNala.
Tugasmu adalah menganalisis gambar yang diunggah pengguna (seperti papan tulis, silabus, daftar kegiatan, atau layar presentasi) dan mengubahnya menjadi format tugas.
Aturan Ekstraksi:
- "title": Judul inti dari tugas atau materi (Singkat dan Jelas).
- "due_date": Jika ada tulisan tanggal deadline/tenggat, jadikan format YYYY-MM-DD. Anggap hari ini adalah ${new Date().toLocaleDateString('id-ID')}. Jika tidak ada, "".
- "category": Harus salah satu dari "Biasa", "Urgent", "Kuliah", "Pribadi", atau "Pekerjaan". Pilih yang pas.
- "note": Catatan besar atau ringkasan paragraf instruksi.
- "subtasks": Jika gambar memiliki poin-poin (bullet points/nomor langkah), masukkan sebagai array string. Jika tidak ada, [].

Keluaranmu HARUS MURNI Object JSON tanpa blok \`\`\`json.
Contoh:
{"title": "Kerjakan Bab 2 Fisika Dasar", "due_date": "2024-11-20", "category": "Kuliah", "note": "Halaman 45-50", "subtasks": ["Baca pendahuluan", "Kerjakan soal ganjil"]}`
    });

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await model.generateContent([
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType || "image/jpeg"
            }
          },
          "Tolong ekstrak gambar ini menjadi JSON."
        ]);
        break;
      } catch (err: any) {
        retries--;
        if (err.message && err.message.includes("503") && retries > 0) {
          console.log(`Gemini API 503 error, retrying Vision API... (${retries} attempts left)`);
          await new Promise(res => setTimeout(res, 1500));
        } else {
          throw err;
        }
      }
    }
    
    if (!result) throw new Error("Gagal mengambil respon dari AI Vision.");

    let responseText = result.response.text().trim();

    // Pembersihan markdown JSON
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
      console.error("Gagal parsing JSON dari AI Vision:", responseText);
      return NextResponse.json({ error: `AI gagal membangun JSON: ${e.message}` }, { status: 500 });
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Kesalahan API Vision:", error);
    return NextResponse.json({ error: `Terjadi error API AI Vision: ${error.message || "Unknown Error"}` }, { status: 500 });
  }
}

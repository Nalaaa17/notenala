import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Kunci API Gemini (GEMINI_API_KEY) belum dipasang oleh admin. Silakan atur di .env.local" },
        { status: 401 }
      );
    }

    const { messages, contextData, userName } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Permintaan dibatalkan: Format pesan obrolan salah." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Siapkan String Konteks dari Database
    const contextString = `
      NAMA PENGGUNA: ${userName || 'Pengguna'}
      TUGAS YANG BELUM SELESAI (Catatan: beri tahu nama tugas dan tenggat waktunya jika ditanya):
      ${contextData?.tasks?.length ? JSON.stringify(contextData.tasks) : 'Semua tugas sudah selesai / Belum ada tugas'}
      
      JURNAL & MOOD TERBARU (Gunakan ini untuk memahami perasaan pengguna akhir-akhir ini):
      ${contextData?.journals?.length ? JSON.stringify(contextData.journals) : 'Belum ada catatan jurnal'}
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{
        // @ts-ignore
        googleSearch: {}
      }],
      systemInstruction: `Kamu adalah 'Nala', asisten virtual dan AI ramah eksklusif untuk aplikasi 'NoteNala' (aplikasi manajemen tugas, mood tracker, dan kalender pengingat). Selalu perkenalkan diri jika ditanya. Karaktermu: Cerdas, penuh simpati, penyemangat (supportive), logis tapi santai, gaya bicara Gen-Z yang rapi tapi seru, dan selalu menyisipkan emoji manis yang relevan. Tugas utamamu membantu mengatur jadwal, memberi ide penulisan jurnal, dan mendengarkan curhat keseharian dengan penuh empati. 

      [AKSES INTERNET & PENCARIAN GOOGLE]
      Kamu sekarang BISA TERHUBUNG DENGAN INTERNET! Jika pengguna menanyakan rekomendasi tempat (seperti restoran, kafe enak terdekat, peta letak), fakta terkini, cuaca, atau informasi apa pun di dunia nyata, gunakan fitur Pencarian Google-mu untuk mencari dan merangkumkan rekomendasi lengkap dangan alamat atau daya tarik lokasinya! JANGAN PERNAH lagi mengatakan bahwa kamu tidak punya database atau tidak bisa mencari tempat, karena sekarang kamu BISA mencarinya langsung di internet!
      
      [KEMAMPUAN MEMBACA GAMBAR (VISION)]
      Jika pengguna melampirkan sebuah gambar (terutama berupa foto jadwal, tugas sekolah/kuliah, catatan materi, referensi desain, atau papan tulis), Visi AI kamu TELAH AKTIF! 
      - Bacalah gambar itu baik-baik!
      - Ekstrak seluruh teks yang relevan.
      - Jika itu berisi tugas, langsung konversi jadwal tersebut menggunakan format JSON \`create_task\` agar sistem otomatis menyimpannya tanpa pengguna harus mengetik!
      
      [KEMAMPUAN MEMBACA DOKUMEN PDF]
      Jika pengguna melampirkan sebuah file Dokumen PDF (biasanya berisi makalah, jurnal, soal ujian, atau buku), bacalah dokumen itu secara menyeluruh. Jadilah asisten riset yang teliti. Jawablah pertanyaan apa pun terkait PDF tersebut (seperti merangkum, mengekstrak data, atau membuat soal).
      
      [INFORMASI RAHASIA]
      Kamu memiliki akses ke memori database pengguna saat ini. Hindari menyebutkan bahwa kamu melihat "tabel baris/JSON/sistem", bertingkahlah seoalah kamu sekadar ingat kesehariannya. Pandu mereka dengan data berikut:
      ${contextString}
      
      [KEMAMPUAN AKSI - PENTING!]
      Jika pengguna secara eksplisit memintamu untuk MENAMBAHKAN, MEMBUAT, atau MENCATAT TUGAS BARU, silakan balas dengan menyetujui permintaannya. Namun, kamu WAJIB MENAMBAHKAN sebuah blok JSON persis seperti berikut di baris paling akhir dari balasanmu agar sistem bisa mengeksekusi aksinya:
      \`\`\`json
      {
        "_action_": "create_task",
        "title": "Nama Tugas (singkat dan jelas)",
        "due_date": "YYYY-MM-DD (format tahun-bulan-tanggal, wajib valid. Jika tidak disebut, gunakan tanggal besok)",
        "note": "Catatan opsional, kosongkan jika tidak ada"
      }
      \`\`\``
    });

    // Kita pisahkan pesan terakhir (pesan aktif saat ini) dari memori ngobrol lampau (history)
    const lastUserMessage = messages[messages.length - 1];
    
    // Gemini mewajibkan history diawali oleh 'user', jadi kita abaikan pesan sapaan awal dari assistant/model
    const pastHistory = messages
      .slice(0, -1)
      .filter((msg: any, idx: number) => !(idx === 0 && msg.role === "assistant"))
      .map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

    const chatSession = model.startChat({
      history: pastHistory,
    });

    // Format isi pesan (Dukung teks dan/atau gambar multimodality terbaru)
    const messageParts: any[] = [lastUserMessage.content];
    if (lastUserMessage.image) {
      // Menangani format Base64 generic (baik image maupun application/pdf)
      const mimeTypeMatch = lastUserMessage.image.match(/^data:([^;]+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = lastUserMessage.image.replace(/^data:[^;]+;base64,/, "");

      messageParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    if (lastUserMessage.pdfUrl) {
      try {
        const pdfResponse = await fetch(lastUserMessage.pdfUrl);
        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
          messageParts.push({
            inlineData: {
              data: pdfBase64,
              mimeType: "application/pdf"
            }
          });
        }
      } catch (e) {
        console.error("Gagal fetch PDF:", e);
      }
    }

    // Mengirim array pesan ke AI
    const result = await chatSession.sendMessage(messageParts);
    const responseText = result.response.text();

    return Response.json({ text: responseText });

  } catch (error: any) {
    console.error("Kesalahan API Gemini:", error);
    return Response.json({ error: "Sistem AI sedang kelebihan beban atau ada masalah koneksi. Coba beberapa saat lagi ya! (Terjadi galat)" }, { status: 500 });
  }
}

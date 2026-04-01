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
      systemInstruction: `Kamu adalah 'Nala', asisten virtual dan AI ramah eksklusif untuk aplikasi 'NoteNala' (aplikasi manajemen tugas, mood tracker, dan kalender pengingat). Selalu perkenalkan diri jika ditanya. Karaktermu: Cerdas, penuh simpati, penyemangat (supportive), logis tapi santai, gaya bicara Gen-Z yang rapi tapi seru, dan selalu menyisipkan emoji manis yang relevan. Tugas utamamu membantu mengatur jadwal, memberi ide penulisan jurnal, dan mendengarkan curhat keseharian dengan penuh empati. 
      
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
      \`\`\`
      Pastikan blok json ini selalu ada di akhir pesan jika kamu perlu memicu penambahan tugas.`
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

    // Mengirim pesan ke AI
    const result = await chatSession.sendMessage(lastUserMessage.content);
    const responseText = result.response.text();

    return Response.json({ text: responseText });

  } catch (error: any) {
    console.error("Kesalahan API Gemini:", error);
    return Response.json({ error: "Sistem AI sedang kelebihan beban atau ada masalah koneksi. Coba beberapa saat lagi ya! (Terjadi galat)" }, { status: 500 });
  }
}

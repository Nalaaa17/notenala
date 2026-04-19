"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    } else {
      setLoading(false);
    }
  }, []);

  async function syncSubscription(sub: PushSubscription) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetch("/api/web-push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub, userId: user.id }),
        });
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  }

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub || null);
      
      // Sinkronisasi paksa ke Supabase jika browser sudah punya data langganan,
      // berguna jika database sempat dihapus/reset.
      if (sub) {
        syncSubscription(sub);
      }
    } catch (error) {
      console.error("Service worker registration failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function subscribeToPush() {
    setLoading(true);
    setMessage(""); // Reset pesan sebelumnya
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
      if (!publicVapidKey) {
        setMessage("Kunci VAPID belum dikonfigurasi oleh admin.");
        setLoading(false);
        return;
      }

      // HARUS dipanggil langsung setelah interaksi user, jangan di-delay oleh request network (seperti get user)
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await urlBase64ToUint8Array(publicVapidKey),
      });

      setSubscription(sub);

      // SETELAH browser memberikan izin, baru kita validasi user dan kirim ke database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Perangkat diizinkan! Namun Anda harus login agar tersambung.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/web-push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub, userId: user.id }),
      });

      if (res.ok) {
        setMessage("Berhasil mengaktifkan notifikasi perangkat!");
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage(`Gagal menyimpan ke server: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        setMessage("Anda memblokir izin notifikasi. Aktifkan dari pengaturan browser.");
      } else {
        setMessage(`Terjadi kesalahan sistem: ${error.message || "Tidak diketahui"}`);
      }
      console.error(error);
    }
    setLoading(false);
  }

  async function unsubscribeFromPush() {
    if (!subscription) return;
    setLoading(true);
    setMessage("");
    try {
      // Hapus izin langsung dari browser
      const successful = await subscription.unsubscribe();
      if (successful) {
        setSubscription(null);
        setMessage("Notifikasi berhasil dimatikan.");
        
        // Opsional: Beritahu backend untuk menghapus endpoint ini dari database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           await fetch("/api/web-push/subscribe", {
             method: "DELETE",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ endpoint: subscription.endpoint, userId: user.id }),
           }).catch(() => {});
        }
      } else {
        setMessage("Tidak dapat membatalkan langganan di browser.");
      }
    } catch (error) {
      console.error("Gagal mematikan notifikasi:", error);
      setMessage("Terjadi kesalahan saat mematikan notifikasi.");
    }
    setLoading(false);
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-sm text-gray-400">
        Browser Anda tidak mendukung Notifikasi PWA.
      </div>
    );
  }

  return (
    <div className="p-5 bg-gray-900/50 rounded-2xl border border-gray-700 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${subscription ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
          {subscription ? <Bell size={24} /> : <BellOff size={24} />}
        </div>
        <div>
          <h4 className="font-bold text-gray-200">Notifikasi PWA</h4>
          <p className="text-xs sm:text-sm text-gray-400">
            {subscription 
              ? "Perangkat ini telah diizinkan menerima notifikasi alarm tugas." 
              : "Aktifkan untuk menerima ping tenggat waktu ke layar Anda."}
          </p>
        </div>
      </div>

      <button
        onClick={subscription ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className={`px-5 py-2.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-2 shadow-lg ${
          subscription
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
        }`}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {!loading && subscription ? 'Matikan' : 'Aktifkan'}
      </button>

      {message && <p className="text-xs text-blue-400 font-medium w-full text-center mt-2">{message}</p>}
    </div>
  );
}

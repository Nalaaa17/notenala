"use client";
import React, { useRef, useState, useCallback } from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';

interface SwipeableTaskCardProps {
  children: React.ReactNode;
  onComplete: () => void;
  onDelete: () => void;
  disabled?: boolean; // task sudah selesai — non-aktifkan swipe complete
}

const SWIPE_THRESHOLD = 80;   // px minimum untuk trigger aksi
const SWIPE_MAX = 120;        // px maksimum geser (biar tidak terlalu jauh)

export default function SwipeableTaskCard({
  children,
  onComplete,
  onDelete,
  disabled = false,
}: SwipeableTaskCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [action, setAction] = useState<'complete' | 'delete' | null>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isLockedRef = useRef(false);   // lock axis setelah tentukan arah

  // ── Touch handlers ──────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isLockedRef.current = false;
    setIsDragging(false);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Kalau scroll vertikal lebih dominan, abaikan
    if (!isLockedRef.current) {
      if (Math.abs(dy) > Math.abs(dx) + 5) return; // scroll vertikal
      isLockedRef.current = true;
    }

    // Kalau swipe kanan tapi task sudah selesai, abaikan
    if (dx > 0 && disabled) return;

    // Clamp nilai translateX
    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
    setTranslateX(clamped);
    setIsDragging(true);

    // Tentukan aksi yang akan terjadi
    if (clamped >= SWIPE_THRESHOLD) setAction('complete');
    else if (clamped <= -SWIPE_THRESHOLD) setAction('delete');
    else setAction(null);
  }, [disabled]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) {
      setTranslateX(0);
      return;
    }

    if (translateX >= SWIPE_THRESHOLD && !disabled) {
      // Trigger complete — animasi dulu lalu panggil callback
      setTranslateX(300);
      setTimeout(() => {
        onComplete();
        setTranslateX(0);
        setAction(null);
      }, 250);
    } else if (translateX <= -SWIPE_THRESHOLD) {
      // Trigger delete
      setTranslateX(-300);
      setTimeout(() => {
        onDelete();
        setTranslateX(0);
        setAction(null);
      }, 250);
    } else {
      // Snap kembali
      setTranslateX(0);
      setAction(null);
    }
    setIsDragging(false);
  }, [isDragging, translateX, disabled, onComplete, onDelete]);

  // Hitung opacity background hint
  const rightOpacity = Math.min(1, Math.max(0, (translateX - 20) / (SWIPE_THRESHOLD - 20)));
  const leftOpacity = Math.min(1, Math.max(0, (-translateX - 20) / (SWIPE_THRESHOLD - 20)));

  const isTriggered = action !== null;

  return (
    <div className="relative overflow-hidden rounded-2xl select-none">
      {/* Background kanan (Complete) */}
      {!disabled && (
        <div
          className="absolute inset-0 rounded-2xl flex items-center pl-6 pointer-events-none transition-colors duration-200"
          style={{
            background: action === 'complete'
              ? 'linear-gradient(to right, rgba(16,185,129,0.35), rgba(5,150,105,0.15))'
              : 'linear-gradient(to right, rgba(16,185,129,0.15), transparent)',
            opacity: rightOpacity,
          }}
        >
          <div className={`flex items-center gap-2 transition-transform duration-200 ${action === 'complete' ? 'scale-110' : 'scale-100'}`}>
            <CheckCircle2
              size={28}
              className={`transition-colors duration-200 ${action === 'complete' ? 'text-emerald-400' : 'text-emerald-500/50'}`}
            />
            <span className={`text-sm font-bold transition-opacity ${action === 'complete' ? 'opacity-100 text-emerald-300' : 'opacity-0'}`}>
              Selesai!
            </span>
          </div>
        </div>
      )}

      {/* Background kiri (Delete) */}
      <div
        className="absolute inset-0 rounded-2xl flex items-center justify-end pr-6 pointer-events-none"
        style={{
          background: action === 'delete'
            ? 'linear-gradient(to left, rgba(239,68,68,0.35), rgba(220,38,38,0.15))'
            : 'linear-gradient(to left, rgba(239,68,68,0.15), transparent)',
          opacity: leftOpacity,
        }}
      >
        <div className={`flex items-center gap-2 transition-transform duration-200 ${action === 'delete' ? 'scale-110' : 'scale-100'}`}>
          <span className={`text-sm font-bold transition-opacity ${action === 'delete' ? 'opacity-100 text-red-300' : 'opacity-0'}`}>
            Hapus!
          </span>
          <Trash2
            size={28}
            className={`transition-colors duration-200 ${action === 'delete' ? 'text-red-400' : 'text-red-500/50'}`}
          />
        </div>
      </div>

      {/* Konten kartu yang bergerak */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  );
}

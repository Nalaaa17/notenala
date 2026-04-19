'use client';

import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { supabase } from '../../lib/supabase';

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
    const { bgColor, bgImageUrl, setTheme } = useThemeStore();

    // Tarik data saat pertama kali user load aplikasi
    useEffect(() => {
        const fetchThemePreference = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('bg_color, bg_image_url')
                    .eq('id', session.user.id)
                    .single();

                if (data && !error) {
                    setTheme(data.bg_color || '#ffffff', data.bg_image_url || '');
                }
            }
        };

        fetchThemePreference();
    }, [setTheme]);

    return (
        <div
            className="flex flex-col flex-1 w-full min-h-screen"
            style={{
                backgroundColor: bgColor,
                backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                transition: 'background-color 0.3s ease', // Biar pergantian warna lebih smooth
            }}
        >
            {children}
        </div>
    );
}

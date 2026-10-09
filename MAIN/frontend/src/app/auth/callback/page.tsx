'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      router.replace('/');
    });
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#0B1117',
        color: '#DDD7CC',
        gap: 12,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <Loader2 size={24} className="animate-spin text-[#8FA8BB]" />
      <div style={{ fontSize: 13, fontWeight: 500, color: '#8B98A5' }}>
        Completing sign-in…
      </div>
    </div>
  );
}

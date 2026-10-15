'use client';
/**
 * @file UserMenu.tsx
 * @description Google OAuth authentication button and user profile menu in Dark Navy/Slate palette.
 */
import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function UserMenu() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (isLoading) {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: '#182330',
          border: '1px solid #2A3947',
          animation: 'pulse 1.5s infinite',
        }}
      />
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => signInWithGoogle()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 5,
          background: '#263746',
          border: '1px solid #344555',
          color: '#DDD7CC',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.12s ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#344555';
          e.currentTarget.style.borderColor = '#8FA8BB';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#263746';
          e.currentTarget.style.borderColor = '#344555';
        }}
      >
        <LogIn size={12} className="text-[#8FA8BB]" />
        <span>Sign In</span>
      </button>
    );
  }

  // User is authenticated
  const email = user.email || 'Developer';
  const initial = email[0].toUpperCase();

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 7px 2px 4px',
          borderRadius: 5,
          background: menuOpen ? '#263746' : 'transparent',
          border: '1px solid #2A3947',
          cursor: 'pointer',
          transition: 'background 0.12s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          if (!menuOpen) e.currentTarget.style.background = '#182330';
        }}
        onMouseLeave={(e) => {
          if (!menuOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 3,
            background: '#263746',
            border: '1px solid #344555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#DDD7CC',
            fontFamily: 'var(--font-mono), monospace',
          }}
        >
          {initial}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#E7EBEF',
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email.split('@')[0]}
        </span>
        <ChevronDown size={11} className="text-[#8B98A5]" />
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 220,
            background: '#182330',
            border: '1px solid #2A3947',
            borderRadius: 6,
            boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 120,
          }}
        >
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #2A3947' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <ShieldCheck size={12} className="text-[#7FAF9A]" />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#7FAF9A', letterSpacing: '0.04em' }}>
                AUTHENTICATED
              </span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#E7EBEF', wordBreak: 'break-all' }}>
              {email}
            </div>
          </div>

          <button
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 4,
              background: 'transparent',
              border: 'none',
              color: '#C97878',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 120, 120, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

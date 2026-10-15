'use client';
/**
 * @file WelcomeScreen.tsx
 * @description Authentication entry gate screen for visitors.
 * Features:
 * - Primary Action: "Try Swarmly" (Instant Guest Access into IDE)
 * - Secondary Action: "Continue with Google" (Authenticated Cloud Workspace)
 * - Minimal, architectural developer IDE aesthetic in Dark Navy / Slate / Stone
 */
import React from 'react';
import { LogIn, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function WelcomeScreen() {
  const { signInWithGoogle, enterGuestMode } = useAuthStore();

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#0B1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Centered architectural card */}
      <div
        className="animate-modal"
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#111A24',
          border: '1px solid #2A3947',
          borderRadius: 8,
          padding: '40px 32px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Swarmly Monogram Mark */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            background: '#182330',
            border: '1px solid #344555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#DDD7CC',
              fontFamily: 'var(--font-mono), monospace',
            }}
          >
            S
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#DDD7CC',
            letterSpacing: '0.1em',
            margin: '0 0 6px',
            fontFamily: 'var(--font-mono), monospace',
          }}
        >
          SWARMLY
        </h1>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#8FA8BB',
            marginBottom: 14,
            letterSpacing: '-0.2px',
          }}
        >
          Visual Multi-Agent IDE
        </div>

        {/* Mission Statement */}
        <p
          style={{
            fontSize: 13,
            color: '#8B98A5',
            margin: '0 0 28px',
            lineHeight: 1.6,
            maxWidth: 290,
          }}
        >
          Build agent workflows visually.<br />
          Generate clean LangGraph Python.
        </p>

        {/* Action Group */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {/* Primary Action: Try Swarmly (Guest Access) */}
          <button
            onClick={() => enterGuestMode()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 6,
              background: '#263746',
              border: '1px solid #344555',
              color: '#DDD7CC',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
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
            <span>Try Swarmly</span>
            <ArrowRight size={14} className="text-[#8FA8BB]" />
          </button>

          {/* Secondary Action: Continue with Google */}
          <button
            onClick={() => signInWithGoogle()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 6,
              background: '#182330',
              border: '1px solid #2A3947',
              color: '#8B98A5',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1E2C3D';
              e.currentTarget.style.color = '#E7EBEF';
              e.currentTarget.style.borderColor = '#344555';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#182330';
              e.currentTarget.style.color = '#8B98A5';
              e.currentTarget.style.borderColor = '#2A3947';
            }}
          >
            <LogIn size={13} className="text-[#8FA8BB]" />
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Security badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: '#8B98A5',
          }}
        >
          <ShieldCheck size={13} className="text-[#7FAF9A]" />
          <span>PostgreSQL Row-Level Security Cloud Persistence</span>
        </div>
      </div>
    </div>
  );
}

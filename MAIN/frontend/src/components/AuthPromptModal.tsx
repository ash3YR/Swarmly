'use client';
/**
 * @file AuthPromptModal.tsx
 * @description Small, friendly modal prompting guest users to sign in when attempting to save cloud workflows or create projects.
 */
import React from 'react';
import { X, LogIn, CloudUpload } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function AuthPromptModal() {
  const { isAuthPromptOpen, setIsAuthPromptOpen, signInWithGoogle } = useAuthStore();

  if (!isAuthPromptOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(5, 9, 14, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsAuthPromptOpen(false);
      }}
    >
      <div
        className="animate-modal"
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#111A24',
          border: '1px solid #2A3947',
          borderRadius: 6,
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #1E2A36',
            background: '#182330',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudUpload size={15} className="text-[#8FA8BB]" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#DDD7CC' }}>
              Sign in to save your work
            </span>
          </div>

          <button
            onClick={() => setIsAuthPromptOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#8B98A5',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E7EBEF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8B98A5')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p
            style={{
              fontSize: 12.5,
              color: '#8B98A5',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Your workflow can be saved to your personal cloud workspace after signing in. Your current graph draft will be preserved.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              onClick={() => setIsAuthPromptOpen(false)}
              style={{
                padding: '6px 12px',
                borderRadius: 5,
                border: '1px solid #2A3947',
                background: 'transparent',
                color: '#8B98A5',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#344555';
                e.currentTarget.style.color = '#DDD7CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2A3947';
                e.currentTarget.style.color = '#8B98A5';
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => {
                setIsAuthPromptOpen(false);
                signInWithGoogle();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 5,
                border: '1px solid #344555',
                background: '#263746',
                color: '#DDD7CC',
                fontSize: 12,
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
              <LogIn size={13} className="text-[#8FA8BB]" />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

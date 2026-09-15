'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-[#fcf8f2]">
          <div className="w-16 h-16 rounded-full bg-[#f3e8d6] border border-[#d4bc8c] text-[#b45309] flex items-center justify-center mb-4 text-2xl font-bold">
            ☕
          </div>
          <h2 className="font-serif italic font-bold text-2xl text-[#b45309] mb-2">
            Terjadi Kendala Memuat Halaman
          </h2>
          <p className="text-sm text-[#735a52] max-w-md mb-6 leading-relaxed">
            Mohon maaf, halaman sedang menyegarkan data. Silakan tekan tombol di bawah untuk memuat ulang menu.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                try {
                  localStorage.removeItem('selera_sambal_cart');
                } catch (e) {}
                window.location.href = '/menu';
              }
            }}
            className="px-6 py-3 bg-[#b45309] hover:bg-[#631c1c] text-white font-bold text-xs rounded-full shadow-md transition-colors"
          >
            Muat Ulang Menu Utama
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

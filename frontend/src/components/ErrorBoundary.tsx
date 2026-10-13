import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {this.props.fallbackTitle || 'Terjadi Kendala Pada Tampilan'}
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Halaman ini mengalami kendala teknis saat memuat data. Silakan coba muat ulang halaman.
            </p>
            {this.state.error && (
              <div className="bg-red-50 p-3 rounded-lg text-left text-[11px] font-mono text-red-800 mb-6 overflow-auto max-h-32 border border-red-100">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Muat Ulang Halaman
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = '/';
                }}
                className="btn-secondary text-xs px-5 py-2"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

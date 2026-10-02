import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-neutral-900 font-sans">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-neutral-200 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Something interrupted the clearing</h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                An unexpected interface issue occurred. Your saved trips and data in Supabase remain completely safe.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-left font-mono text-[11px] text-neutral-600 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

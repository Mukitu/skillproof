
import React from 'react';
import { AlertCircle, RefreshCcw, Home, ChevronRight } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  
  title?: string;
  
  label?: string;
}

interface State {
  error: Error | null;
  info: string | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[AppErrorBoundary] caught', { error, info });
    this.setState({ info: info.componentStack ?? null });
  }

  private reset = (): void => {
    this.setState({ error: null, info: null });
  };

  private reload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  private goHome = (): void => {
    if (typeof window !== 'undefined') window.location.assign('/');
  };

  render(): React.ReactNode {
    const { error, info } = this.state;
    const { children, title, label } = this.props;
    if (!error) return children;

    return (
      <div className="min-h-screen bg-[#FFF8F6] flex items-center justify-center p-4 font-sans">
        <div className="max-w-xl w-full bg-white border border-rose-200 rounded-3xl shadow-xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-orange-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                {title ?? 'Something went wrong'}
              </h1>
              <p className="text-xs text-slate-500">
                {label ? `Section: ${label}` : 'An unexpected error prevented this page from rendering.'}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-700">
            The page failed to render. Your data is safe — this is a display issue, not a deletion.
            You can safely reload to try again.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-mono text-slate-600 max-h-32 overflow-auto">
            <p className="font-bold text-rose-700">{error.name}: {error.message}</p>
            {info && (
              <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-500">
{info.split('\n').slice(0, 6).join('\n')}
              </pre>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={this.reload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2 text-xs font-bold text-white shadow hover:opacity-95"
            >
              <RefreshCcw className="w-4 h-4" /> Reload page
            </button>
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Try to recover <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={this.goHome}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Home className="w-4 h-4" /> Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-rose-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center">
            <span className="text-5xl" role="img" aria-label="Nails">💅</span>
            <h2 className="text-2xl font-bold text-gray-800 mt-4">Something went wrong</h2>
            <p className="text-gray-600 mt-2">
              We ran into an unexpected error. Please refresh the page or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

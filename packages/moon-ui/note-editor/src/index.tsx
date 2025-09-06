// import BlockNote from './BlockNote'
import React, { ReactNode, ErrorInfo } from 'react';

// const BlockNote = React.lazy(() => import('./BlockNote'));
const EditorJs = React.lazy(() => import('./EditorJs'));

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // You can also log the error to an error reporting service here
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div>
          <h2>Something went wrong.</h2>
          {this.state.error && <pre>{this.state.error.toString()}</pre>}
          {this.state.errorInfo && (
            <pre>{this.state.errorInfo.componentStack}</pre>
          )}
          <button onClick={() => this.props.setValue(undefined)}>
            clear value
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const NoteEditor = (props: unknown) => {
  return (
    <ErrorBoundary {...props}>
      <EditorJs {...props} />
    </ErrorBoundary>
  );
};

export default NoteEditor;

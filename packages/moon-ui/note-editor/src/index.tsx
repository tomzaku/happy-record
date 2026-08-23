import React, { ReactNode, ErrorInfo, Suspense } from 'react';
const EditorJs = React.lazy(() => import('./EditorJs'));

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  setValue?: (value: any) => void;
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
          <button onClick={() => this.props.setValue?.(null)}>
            clear value
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface NoteEditorProps {
  initialData?: any;
  setValue?: (value: any) => void;
  value?: any;
  /** Defaults to editable (`false`) — pass `true` for a view-mode note with its own Edit
   * button toggling this back to `false`. See EditorJs.tsx for how this reaches Editor.js's
   * own readOnly API on an already-mounted instance. */
  readOnly?: boolean;
}

const NoteEditor = (props: NoteEditorProps) => {
  return (
    <ErrorBoundary {...props}>
      <Suspense fallback={<div>Loading editor...</div>}>
        <EditorJs {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default NoteEditor;

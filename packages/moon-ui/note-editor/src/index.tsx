import React, { ReactNode, ErrorInfo, Suspense, forwardRef } from 'react';
import type { AiNoteToolConfig } from './AiWriteTool';
import type { NoteEditorHandle } from './EditorJs';
const EditorJs = React.lazy(() => import('./EditorJs'));

export type { NoteEditorHandle };

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
  /** Opt-in "/ai" block tool — see AiWriteTool.tsx and EditorJs.tsx's own `ai` prop. Omit for
   * every consumer that doesn't want AI writing available in that editor instance. */
  ai?: AiNoteToolConfig;
}

/** `ref` exposes `{ getValue }` (see EditorJs.tsx's own `NoteEditorHandle`) — the editor's real
 * current content, read directly from Editor.js rather than trusting `setValue` to have already
 * fired. Needed for a one-shot action (e.g. a Submit button) that reads a note editor's value
 * this tick, not whatever the last debounced `onChange` happened to report — same class of
 * problem CLAUDE.md's own `getRecordFieldsByIds`/`getAllChecklistWithTemplate` solve for record
 * data. Refs pass through `React.lazy`/`Suspense` fine as long as the lazily-loaded component
 * itself is `forwardRef` (it is) — nothing extra needed here beyond forwarding it along. */
const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>((props, ref) => {
  return (
    <ErrorBoundary {...props}>
      <Suspense fallback={<div>Loading editor...</div>}>
        <EditorJs {...props} ref={ref} />
      </Suspense>
    </ErrorBoundary>
  );
});

export default NoteEditor;

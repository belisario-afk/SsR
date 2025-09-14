import React from 'react';

type Props = { fallback: React.ReactNode; children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(error, errorInfo);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
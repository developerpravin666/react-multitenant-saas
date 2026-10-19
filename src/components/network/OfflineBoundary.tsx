import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { OfflineFallbackPage } from "../../pages/OfflineFallbackPage";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasNetworkError: boolean;
  errorMessage?: string;
}

export class OfflineBoundary extends Component<Props, State> {
  public override state: State = {
    hasNetworkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isNetworkError =
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError") ||
      error.message?.includes("offline") ||
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      (error as { status?: number }).status === 0;

    if (isNetworkError) {
      return {
        hasNetworkError: true,
        errorMessage: error.message,
      };
    }

    // Let standard error boundaries handle non-network crashes
    throw error;
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("OfflineBoundary caught a network failure:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasNetworkError: false, errorMessage: undefined });
  };

  public override render() {
    if (this.state.hasNetworkError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <OfflineFallbackPage
          onRetry={this.handleRetry}
          message={this.state.errorMessage}
        />
      );
    }

    return this.props.children;
  }
}


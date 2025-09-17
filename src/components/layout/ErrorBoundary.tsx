import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 에러 로깅 (프로덕션에서는 에러 추적 서비스로 전송)
    if (process.env.NODE_ENV === 'production') {
      // 에러 추적 서비스로 전송하는 로직
      console.warn('Production error logged:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>문제가 발생했습니다</h2>
            <p>페이지를 새로고침하거나 잠시 후 다시 시도해주세요.</p>
            <button 
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              페이지 새로고침
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>에러 상세 정보 (개발자용)</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React from 'react';
import i18n from '../i18n';

// Last-resort fallback for an unhandled JS error during render (a crash,
// not an API/network error -- those are handled per-page via apiRequest).
// Without this, React unmounts the whole tree on an uncaught render error
// and the user is left looking at a blank white page with no explanation
// and no way back in except guessing to hit refresh. Inline styles only --
// this must render correctly even if the page that crashed hadn't loaded
// any of the app's regular stylesheets yet.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const t = i18n.t.bind(i18n);

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '32px 20px',
          fontFamily: '"Public Sans", system-ui, sans-serif',
          background: '#fbf8f2',
          color: '#1c1710',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{t('errorBoundary.title')}</div>
        <p style={{ fontSize: 14, color: '#6b6354', maxWidth: 420, marginBottom: 20 }}>
          {t('errorBoundary.message')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            font: 'inherit',
            fontSize: 13.5,
            fontWeight: 700,
            padding: '11px 22px',
            borderRadius: 9,
            border: 'none',
            background: '#9c6b1d',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {t('errorBoundary.reloadButton')}
        </button>
      </div>
    );
  }
}

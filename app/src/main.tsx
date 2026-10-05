import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    {/*
      The loan form is bound to the URL, so URL changes must render immediately.
      By default BrowserRouter renders them in a transition (low priority); a controlled
      input then snaps back to its old value after each event, and quick key presses on
      a slider are lost. See docs/CLAUDE_CODE_LOG.md (Phase 3).
    */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

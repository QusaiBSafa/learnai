'use client';
import Link from 'next/link';
import { useState } from 'react';
import { resetProgress, useProgress } from '@/lib/progress';

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="LearnAI home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <path d="M4 20 C 4 10, 22 16, 22 6" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="4" cy="20" r="3.5" fill="var(--surface)" stroke="var(--fg)" strokeWidth="2.2" />
        <circle cx="22" cy="6" r="3.5" fill="var(--signal)" />
      </svg>
      LearnAI
    </Link>
  );
}

export function Header() {
  const { total } = useProgress();
  return (
    <header className="site-header">
      <div className="wrap">
        <Logo />
        <nav className="nav" aria-label="Main">
          <Link href="/#roadmap">Roadmap</Link>
          <Link href="/#courses" className="hide-sm">Courses</Link>
          {total > 0 && <span className="done-pill" title="Lessons you've finished">✓ {total} done</span>}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const { total } = useProgress();
  const [confirm, setConfirm] = useState(false);
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>LearnAI is free, with no sign-up. Your progress stays in this browser. Resources belong to their creators.</span>
        {total > 0 &&
          (confirm ? (
            <span className="row">
              <span>Clear {total} finished lessons?</span>
              <button className="btn small" onClick={() => { resetProgress(); setConfirm(false); }}>Yes, reset</button>
              <button className="btn small" onClick={() => setConfirm(false)}>Cancel</button>
            </span>
          ) : (
            <button className="btn small" onClick={() => setConfirm(true)}>Reset progress</button>
          ))}
      </div>
    </footer>
  );
}

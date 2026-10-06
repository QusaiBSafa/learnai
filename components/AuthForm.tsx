'use client';
import Link from 'next/link';
import { useState } from 'react';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: f.get('username'), password: f.get('password') }),
      });
      if (res.ok) {
        window.location.assign('/');
        return;
      }
      setError((await res.json().catch(() => null))?.error ?? 'Something went wrong. Try again.');
    } catch {
      setError('Network error. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="wrap" style={{ maxWidth: 420, paddingBlock: 48 }}>
      <h1>{isRegister ? 'Create your account' : 'Log in'}</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          Username
          <input name="username" required autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+"
            title="3–24 letters, numbers or underscores" style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          Password
          <input name="password" type="password" required minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'} style={inputStyle} />
          {isRegister && <span className="muted" style={{ fontSize: '.85rem' }}>At least 8 characters.</span>}
        </label>
        {error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{error}</p>}
        <button className="btn primary" disabled={busy} type="submit">{busy ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}</button>
      </form>
      <p className="muted" style={{ marginTop: 18 }}>
        {isRegister ? <>Already have an account? <Link href="/login">Log in</Link></> : <>New here? <Link href="/register">Create an account</Link></>}
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  font: 'inherit', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--fg)',
};

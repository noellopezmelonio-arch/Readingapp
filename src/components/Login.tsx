import React, { useState } from 'react';
import type { User } from '../types';

interface LoginProps {
  authenticate: (email: string, password: string) => User | null;
  onLogin: (user: User) => void;
}

export function Login({ authenticate, onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      const u = await authenticate(email.trim(), password);
      if (u) {
        onLogin(u);
      } else {
        setError('Invalid credentials');
      }
    })();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Sign in</h2>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <label className="block text-xs text-gray-600">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 mb-3" />
        <label className="block text-xs text-gray-600">Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full border rounded px-3 py-2 mb-4" />
        <div className="flex items-center justify-between">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Sign in</button>
        </div>
      </form>
    </div>
  );
}

export default Login;

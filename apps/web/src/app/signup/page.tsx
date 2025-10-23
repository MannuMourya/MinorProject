'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Registration successful. Redirecting to login…');
        setTimeout(() => router.push('/login'), 1000);
      } else {
        setMessage(data.detail || 'Failed to register.');
      }
    } catch (err: any) {
      setMessage('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="glass p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create an account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 rounded-md text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded-md text-black"
              required
            />
          </div>
          <button type="submit" className="btn w-full" disabled={loading}>
            {loading ? 'Signing up…' : 'Sign Up'}
          </button>
        </form>
        {message && (
          <p className="mt-4 text-sm text-center text-gray-200">{message}</p>
        )}
        <p className="mt-4 text-sm text-center text-gray-200">
          Already have an account? <Link href="/login" className="underline">Log in</Link>.
        </p>
      </div>
    </div>
  );
}
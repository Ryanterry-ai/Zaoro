'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch {
      setError('Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-sm p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-light text-[#0A0A0A]">TruArtz</h1>
          <p className="text-xs text-[#6B6B6B] mt-1 tracking-widest uppercase">Admin Panel</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-[#D4D4D4] px-4 py-3 text-sm outline-none focus:border-[#0A0A0A] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border border-[#D4D4D4] px-4 py-3 text-sm outline-none focus:border-[#0A0A0A] transition-colors"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 p-3 bg-[#F8F6F3] rounded text-xs text-[#6B6B6B] text-center">
          Default: admin@truartz.com / truartz_admin_2026
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <AuthForm title="Welcome Back" subtitle="Sign in to your account" fields={[{"name":"email","label":"Email","type":"email","required":true,"placeholder":"you@example.com"},{"name":"password","label":"Password","type":"password","required":true,"placeholder":"••••••••"}]} actions={[{"label":"Sign In","action":"/api/auth","style":"primary"}]} />
    </div>
  );
}

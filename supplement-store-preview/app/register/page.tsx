'use client';

import React from 'react';
import AuthForm from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <AuthForm title="Create Account" subtitle="Get started with your free trial" fields={[{"name":"email","label":"Email","type":"email","required":true,"placeholder":"you@example.com"},{"name":"password","label":"Password","type":"password","required":true,"placeholder":"••••••••"},{"name":"name","label":"Name","type":"text","required":true,"placeholder":"Your name"}]} actions={[{"label":"Create Account","action":"/api/auth","style":"primary"}]} />
    </div>
  );
}

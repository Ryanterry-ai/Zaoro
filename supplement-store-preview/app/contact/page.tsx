'use client';

import React from 'react';
import ContactForm from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <ContactForm title="Contact Us" subtitle="Get in touch with NutriMart" fields={[{"name":"name","label":"Name","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true},{"name":"subject","label":"Subject","type":"text","required":false},{"name":"message","label":"Message","type":"textarea","required":true}]} actions={[{"label":"Send Message","action":"/api/contact","style":"primary"}]} />
    </div>
  );
}

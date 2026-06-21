'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
const faqs = [
  { q: 'How long will it take to receive my order?', a: 'Standard shipping typically takes 3–7 business days. Expedited options are available at checkout.' },
  { q: 'Can I return or exchange an item?', a: 'We accept returns and exchanges within 30 days of delivery, unused and in original packaging.' },
  { q: 'How do I track my order?', a: 'You\'ll receive a tracking email once your order ships.' },
  { q: 'What payment methods do you accept?', a: 'We accept Razorpay including UPI, credit/debit cards, and net banking.' },
  { q: 'Is my payment information secure?', a: 'Yes. We use SSL encryption and Razorpay\'s trusted payment infrastructure.' },
];
export default function FAQPage() {
  const [open, setOpen] = useState<number|null>(null);
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">Frequently Asked Questions</h1>
      <div className="space-y-0">
        {faqs.map((f,i) => (
          <div key={i} className="border-b border-[#EDE9E3]">
            <button className="flex items-center justify-between w-full py-5 text-sm font-medium text-left" onClick={()=>setOpen(open===i?null:i)}>
              {f.q}{open===i?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
            </button>
            {open===i && <div className="pb-5 text-sm text-[#6B6B6B]">{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import CheckoutForm from '@/components/CheckoutForm';
import PaymentForm from '@/components/PaymentForm';
import OrderReview from '@/components/OrderReview';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <CheckoutForm title="Checkout" subtitle="Complete your order" fields={[{"name":"email","label":"Email","type":"email","required":true,"placeholder":"you@example.com"},{"name":"fullName","label":"Full Name","type":"text","required":true,"placeholder":"John Doe"},{"name":"address","label":"Address","type":"text","required":true,"placeholder":"123 Main St"},{"name":"city","label":"City","type":"text","required":true},{"name":"state","label":"State","type":"text","required":true},{"name":"zip","label":"ZIP Code","type":"text","required":true},{"name":"country","label":"Country","type":"select","required":true,"options":[{"label":"India","value":"IN"},{"label":"United States","value":"US"},{"label":"United Kingdom","value":"GB"}]}]} actions={[{"label":"Place Order","action":"/api/checkout","style":"primary"}]} />
      <PaymentForm title="Payment Details" subtitle="UPI, Card, Net Banking, or COD" fields={[{"name":"method","label":"Payment Method","type":"select","required":true,"options":[{"label":"UPI (GPay / PhonePe / Paytm)","value":"upi"},{"label":"Credit / Debit Card","value":"card"},{"label":"Net Banking","value":"netbanking"},{"label":"Cash on Delivery","value":"cod"}]},{"name":"upiId","label":"UPI ID","type":"text","required":false,"placeholder":"user@paytm"},{"name":"cardNumber","label":"Card Number","type":"text","required":false,"placeholder":"1234 5678 9012 3456"},{"name":"cardName","label":"Name on Card","type":"text","required":false},{"name":"expiry","label":"Expiry Date","type":"text","required":false,"placeholder":"MM/YY"},{"name":"cvv","label":"CVV","type":"text","required":false,"placeholder":"123"}]} />
      <OrderReview title="Review Your Order" columns={[{"key":"name","label":"Product","type":"text","sortable":false,"filterable":false},{"key":"quantity","label":"Qty","type":"number","sortable":false,"filterable":false},{"key":"price","label":"Price","type":"number","sortable":false,"filterable":false}]} actions={[{"label":"Confirm Order","action":"/api/orders","style":"primary"}]} />
    </div>
  );
}

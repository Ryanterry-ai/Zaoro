'use client';

import React from 'react';
import CartItems from '@/components/CartItems';
import OrderSummary from '@/components/OrderSummary';
import CheckoutForm from '@/components/CheckoutForm';

export default function CartPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <CartItems title="Shopping Cart" entity="Product" columns={[{"key":"name","label":"Product","type":"text","sortable":false,"filterable":false},{"key":"price","label":"Price","type":"number","sortable":false,"filterable":false},{"key":"quantity","label":"Qty","type":"number","sortable":false,"filterable":false},{"key":"total","label":"Total","type":"number","sortable":false,"filterable":false}]} actions={[{"label":"Continue Shopping","action":"/shop","style":"ghost"},{"label":"Checkout","action":"/checkout","style":"primary"}]} />
      <OrderSummary title="Order Summary" items={[{"title":"Subtotal","metadata":{"value":"₹0"}},{"title":"Shipping","metadata":{"value":"Free delivery"}},{"title":"Tax","metadata":{"value":"₹0"}},{"title":"Total","metadata":{"value":"₹0","bold":"true"}}]} />
      <CheckoutForm title="Checkout" subtitle="Complete your order" fields={[{"name":"email","label":"Email","type":"email","required":true,"placeholder":"you@example.com"},{"name":"fullName","label":"Full Name","type":"text","required":true,"placeholder":"John Doe"},{"name":"address","label":"Address","type":"text","required":true,"placeholder":"123 Main St"},{"name":"city","label":"City","type":"text","required":true},{"name":"state","label":"State","type":"text","required":true},{"name":"zip","label":"ZIP Code","type":"text","required":true},{"name":"country","label":"Country","type":"select","required":true,"options":[{"label":"India","value":"IN"},{"label":"United States","value":"US"},{"label":"United Kingdom","value":"GB"}]}]} actions={[{"label":"Place Order","action":"/api/checkout","style":"primary"}]} />
    </div>
  );
}

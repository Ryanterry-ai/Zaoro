'use client';

import React from 'react';
import OrderStatus from '@/components/OrderStatus';
import CartItems from '@/components/CartItems';
import OrderTracking from '@/components/OrderTracking';

export default function AccountOrdersIdPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <OrderStatus title="Order Status" subtitle="Track your order" items={[{"title":"Order Placed","description":"Your order has been confirmed","icon":"check-circle","metadata":{"status":"complete"}},{"title":"Processing","description":"We are preparing your order","icon":"clock","metadata":{"status":"active"}},{"title":"Shipped","description":"Your order is on the way","icon":"truck","metadata":{"status":"pending"}},{"title":"Delivered","description":"Package delivered","icon":"package","metadata":{"status":"pending"}}]} />
      <CartItems title="Shopping Cart" entity="Product" columns={[{"key":"name","label":"Product","type":"text","sortable":false,"filterable":false},{"key":"price","label":"Price","type":"number","sortable":false,"filterable":false},{"key":"quantity","label":"Qty","type":"number","sortable":false,"filterable":false},{"key":"total","label":"Total","type":"number","sortable":false,"filterable":false}]} actions={[{"label":"Continue Shopping","action":"/shop","style":"ghost"},{"label":"Checkout","action":"/checkout","style":"primary"}]} />
      <OrderTracking title="Track Order" subtitle="Enter your order number" fields={[{"name":"orderNumber","label":"Order Number","type":"text","required":true,"placeholder":"ORD-12345"}]} actions={[{"label":"Track","action":"/api/track","style":"primary"}]} />
    </div>
  );
}

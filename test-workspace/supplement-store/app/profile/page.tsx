'use client';

import React from 'react';
import ProfileSection from '@/components/ProfileSection';
import OrderHistory from '@/components/OrderHistory';
import Wishlist from '@/components/Wishlist';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <ProfileSection title="My Profile" subtitle="Manage your account details" fields={[{"name":"name","label":"Full Name","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true},{"name":"company","label":"Company","type":"text","required":false},{"name":"address","label":"Shipping Address","type":"textarea","required":false}]} actions={[{"label":"Save Changes","action":"/api/profile","style":"primary"}]} />
      <OrderHistory title="Order History" columns={[{"key":"orderId","label":"Order ID","type":"text","sortable":true,"filterable":false},{"key":"date","label":"Date","type":"date","sortable":true,"filterable":false},{"key":"status","label":"Status","type":"status","sortable":true,"filterable":true},{"key":"total","label":"Total","type":"number","sortable":true,"filterable":false}]} />
      <Wishlist title="My Wishlist" entity="Product" items={[{"title":"Saved Item","description":"Added to wishlist","icon":"heart"}]} />
    </div>
  );
}

'use client';

import React from 'react';
import OrderHistory from '@/components/OrderHistory';
import AddressBook from '@/components/AddressBook';
import Wishlist from '@/components/Wishlist';

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <OrderHistory title="Order History" columns={[{"key":"orderId","label":"Order ID","type":"text","sortable":true,"filterable":false},{"key":"date","label":"Date","type":"date","sortable":true,"filterable":false},{"key":"status","label":"Status","type":"status","sortable":true,"filterable":true},{"key":"total","label":"Total","type":"number","sortable":true,"filterable":false}]} />
      <AddressBook title="Address Book" items={[{"title":"Home","description":"123, MG Road, Mumbai, Maharashtra 400001","icon":"home","metadata":{"default":"true"}}]} actions={[{"label":"Add Address","action":"/account/addresses/add","style":"primary"}]} />
      <Wishlist title="My Wishlist" entity="Product" items={[{"title":"Saved Item","description":"Added to wishlist","icon":"heart"}]} />
    </div>
  );
}

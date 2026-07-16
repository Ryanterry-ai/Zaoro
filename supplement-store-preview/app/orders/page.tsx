'use client';

import React from 'react';
import FilterSidebar from '@/components/FilterSidebar';
import DataTable from '@/components/DataTable';
import OrderStatus from '@/components/OrderStatus';

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <FilterSidebar title="Filters" items={[{"title":"Category","icon":"grid","metadata":{"type":"select"}},{"title":"Price Range","icon":"dollar-sign","metadata":{"type":"range"}},{"title":"Rating","icon":"star","metadata":{"type":"select"}},{"title":"Availability","icon":"package","metadata":{"type":"checkbox"}}]} />
      <DataTable title="Record Management" entity="Record" items={[{"id":"1","title":"Record #001","status":"Active","created":"2024-01-15","metadata":{"id":"1","status":"Active"}},{"id":"2","title":"Record #002","status":"Pending","created":"2024-01-20","metadata":{"id":"2","status":"Pending"}},{"id":"3","title":"Record #003","status":"Active","created":"2024-02-01","metadata":{"id":"3","status":"Active"}}]} columns={[{"key":"id","label":"ID","type":"text","sortable":true,"filterable":false},{"key":"name","label":"Name","type":"text","sortable":true,"filterable":true},{"key":"status","label":"Status","type":"text","sortable":true,"filterable":true},{"key":"created","label":"Created","type":"text","sortable":true,"filterable":false}]} actions={[{"label":"Add","action":"#","style":"primary"}]} />
      <OrderStatus title="Order Status" subtitle="Track your order" items={[{"title":"Order Placed","description":"Your order has been confirmed","icon":"check-circle","metadata":{"status":"complete"}},{"title":"Processing","description":"We are preparing your order","icon":"clock","metadata":{"status":"active"}},{"title":"Shipped","description":"Your order is on the way","icon":"truck","metadata":{"status":"pending"}},{"title":"Delivered","description":"Package delivered","icon":"package","metadata":{"status":"pending"}}]} />
    </div>
  );
}

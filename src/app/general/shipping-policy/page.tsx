export default function ShippingPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-serif text-4xl font-light mb-8">Shipping Policy</h1>
      <div className="space-y-6 text-[#6B6B6B] leading-relaxed text-sm">
        <p>We offer standard and express shipping across India.</p>
        <h2 className="text-base font-semibold text-[#0A0A0A]">Delivery Times</h2>
        <p>Standard shipping: 3–7 business days. Express shipping: 1–3 business days. Delivery times may vary during holidays.</p>
        <h2 className="text-base font-semibold text-[#0A0A0A]">Shipping Charges</h2>
        <p>Free standard shipping on orders above ₹2,000. Express shipping charges apply based on location and order weight.</p>
      </div>
    </div>
  );
}

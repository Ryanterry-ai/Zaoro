export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-serif text-4xl font-light mb-4">Contact Us</h1>
      <p className="text-[#6B6B6B] mb-10">We're here to help. Reach out to us and we'll get back to you shortly.</p>
      <div className="space-y-4">
        {[{label:'Name', type:'text'},{label:'Email',type:'email'},{label:'Subject',type:'text'}].map(f => (
          <input key={f.label} type={f.type} placeholder={f.label} className="w-full border border-[#D4D4D4] px-4 py-3 text-sm outline-none focus:border-[#0A0A0A] transition-colors" />
        ))}
        <textarea rows={5} placeholder="Message" className="w-full border border-[#D4D4D4] px-4 py-3 text-sm outline-none focus:border-[#0A0A0A] transition-colors resize-none" />
        <button className="btn-primary w-full">Send Message</button>
      </div>
    </div>
  );
}

import Image from 'next/image';

export default function AboutPage() {
  return (
    <div>
      <div className="relative h-96 bg-[#F8F6F3]">
        <Image src="https://framerusercontent.com/images/9D867nQlFTwf6oZ9xPTQhlTYas.jpg" alt="About" fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-[#0A0A0A]/40 flex items-center justify-center">
          <h1 className="font-serif text-5xl text-white font-light">About TruArtz</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-3xl font-light mb-6">Real Style, Real Confidence</h2>
        <p className="text-[#6B6B6B] leading-relaxed mb-6">
          TruArtz brings together premium contemporary fashion from globally recognized labels. We believe style should be accessible, confident, and effortless.
        </p>
        <p className="text-[#6B6B6B] leading-relaxed">
          From city streets to intimate gatherings, our collections are designed to be worn, lived in, and remembered. Every piece is curated with care, ensuring the perfect balance of comfort and elegance.
        </p>
      </div>
    </div>
  );
}

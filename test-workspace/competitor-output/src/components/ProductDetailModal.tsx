import { motion, AnimatePresence } from "motion/react";
import { X, Star, ShieldCheck, CheckCircle2, ShoppingBag, Award, Heart } from "lucide-react";
import { useState } from "react";
import { Product, Review } from "../types";
import { MOCK_REVIEWS } from "../data";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, flavor?: string) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  if (!product) return null;

  const [selectedFlavor, setSelectedFlavor] = useState(
    product.flavors && product.flavors.length > 0 ? product.flavors[0] : ""
  );
  const [isFavorite, setIsFavorite] = useState(false);

  // Blend mock reviews with customized reviews matching the product brand/category
  const productReviews: Review[] = MOCK_REVIEWS.map((r, i) => {
    if (i === 0 && product.brand === "Optimum Nutrition") return r;
    if (i === 2 && product.brand === "MuscleBlaze") return r;
    if (i === 1 && product.brand === "Kapiva") return r;
    if (i === 3 && product.brand === "Himalayan Organics") return r;
    if (i === 4 && product.brand === "Asitis Nutrition") return r;

    // Default template-swapping reviews to match current product context
    const templates = [
      { comment: `Genuine ${product.name}! Easily dissolves.`, rating: 5 },
      { comment: `Best purchase for my daily routine. Flavor is nice, works as expected.`, rating: 4 },
      { comment: `100% genuine product. Tested the scratch pin. Great packaging and quick shipping.`, rating: 5 },
      { comment: `Effective and safe. Happy that it is clean labeled and certified.`, rating: 5 }
    ];
    const t = templates[i % templates.length];
    return {
      ...r,
      comment: t.comment,
      rating: t.rating
    };
  });

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
        />

        {/* Modal card content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          id={`product-modal-${product.id}`}
          className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-12"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 p-2 rounded-full transition-all z-20"
          >
            <X size={20} />
          </button>

          {/* Left Side: Images & Quick badges (Cols 5) */}
          <div className="md:col-span-5 bg-neutral-50 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-100">
            <div className="space-y-4">
              {/* Top Row Badges */}
              <div className="flex items-center justify-between">
                <span className="bg-amber-600/10 text-amber-800 text-[11px] font-bold px-3 py-1 rounded-md border border-amber-600/20 uppercase tracking-wider">
                  {product.category}
                </span>

                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg shadow-2xs border border-neutral-100">
                  <div className={product.isVeg ? "veg-dot-green" : "nonveg-dot-red"} />
                  <span className="text-[11px] font-semibold text-neutral-700">
                    {product.isVeg ? "Veg" : "Non-Veg"}
                  </span>
                </div>
              </div>

              {/* Central Image View */}
              <div className="h-64 md:h-80 w-full overflow-hidden rounded-2xl relative bg-white border border-neutral-100 flex items-center justify-center p-4">
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              </div>

              {/* Info Snippet */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white p-3 rounded-xl border border-neutral-100 text-center">
                  <span className="block text-xs text-neutral-400 font-medium">Servings</span>
                  <span className="text-sm font-bold text-neutral-800 font-display">{product.servings} Servings</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-neutral-100 text-center">
                  <span className="block text-xs text-neutral-400 font-medium">Weight/Size</span>
                  <span className="text-sm font-bold text-neutral-800 font-display">{product.size}</span>
                </div>
              </div>
            </div>

            {/* Shield Guarantee */}
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
              <ShieldCheck className="text-amber-600 shrink-0" size={24} />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">100% Authentic Guarantee</h4>
                <p className="text-[11px] text-amber-800/80 leading-snug mt-0.5">
                  Imported directly from parent manufacturers with valid import tags and lab certifications.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Specifications & Purchase panel (Cols 7) */}
          <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Brand and Title */}
              <div>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{product.brand}</span>
                <h2 className="text-xl md:text-2xl font-display font-bold text-neutral-900 leading-tight mt-1">
                  {product.name}
                </h2>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                    <span className="font-bold">{product.rating}</span>
                    <Star size={13} className="fill-amber-600 stroke-amber-600" />
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">
                    Based on {product.reviewsCount} customer reviews
                  </span>
                </div>
              </div>

              {/* Pricing in INR */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Best Price Online</span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-2xl md:text-3xl font-display font-bold text-neutral-900">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm text-neutral-400 line-through">
                    ₹{product.originalPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-md">
                    {discountPercent}% OFF
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1.5 leading-none">
                  *Inclusive of all taxes (including 18% CGST + SGST applicable to sports nutrition).
                </p>
              </div>

              {/* Product Short Description */}
              <div>
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Overview</h4>
                <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Flavors selection */}
              {product.flavors && product.flavors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Select Flavor</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.flavors.map((flavor) => (
                      <button
                        key={flavor}
                        onClick={() => setSelectedFlavor(flavor)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                          selectedFlavor === flavor
                            ? "bg-amber-600 text-white border-amber-600 font-semibold shadow-xs"
                            : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-500"
                        }`}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Core Benefits */}
              <div>
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Key Benefits</h4>
                <ul className="space-y-1.5">
                  {product.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-neutral-600">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Authenticity scratch protocol */}
              <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                  <Award size={15} className="text-amber-600" />
                  <span>How to verify original brand product:</span>
                </div>
                <p className="text-xs text-neutral-600 leading-normal">
                  {product.authenticityDetails}
                </p>
              </div>

              {/* Customer Reviews Section */}
              <div className="border-t border-neutral-100 pt-5">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Customer Experiences</h4>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                  {productReviews.map((rev) => (
                    <div key={rev.id} className="bg-neutral-50/50 p-3 rounded-xl border border-neutral-100/80 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-neutral-700">{rev.userName}</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star
                              key={j}
                              size={10}
                              className={j < rev.rating ? "fill-amber-500" : "text-neutral-200"}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-neutral-600 text-[11px] leading-relaxed">{rev.comment}</p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
                        <span>{rev.date}</span>
                        {rev.verifiedPurchase && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 size={8} /> Verified Purchase (India)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Panel */}
            <div className="mt-8 pt-5 border-t border-neutral-100 flex items-center gap-3">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isFavorite
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-white text-neutral-400 border-neutral-200 hover:text-neutral-600"
                }`}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart size={20} className={isFavorite ? "fill-rose-500" : ""} />
              </button>

              <button
                onClick={() => {
                  onAddToCart(product, selectedFlavor);
                  onClose();
                }}
                className="flex-grow bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-600/10"
              >
                <ShoppingBag size={18} />
                <span>Add to Shopping Cart</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

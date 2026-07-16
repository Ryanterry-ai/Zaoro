import { motion } from "motion/react";
import { Star, ShieldAlert } from "lucide-react";
import { Product } from "../types";

interface ProductCardProps {
  key?: any;
  product: Product;
  onViewDetails: (product: Product) => void;
  onAddToCart: (product: Product, flavor?: string) => void;
}

export default function ProductCard({
  product,
  onViewDetails,
  onAddToCart,
}: ProductCardProps) {
  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      id={`product-card-${product.id}`}
      className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-xs hover:shadow-md transition-shadow flex flex-col h-full group relative"
    >
      {/* Badges Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        {product.isBestseller && (
          <span className="bg-amber-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs">
            Bestseller
          </span>
        )}
        {product.isNew && (
          <span className="bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs">
            New
          </span>
        )}
      </div>

      {/* Vegetarian / Non-Vegetarian Mark */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xs p-1 rounded-md shadow-xs flex items-center justify-center">
          <div
            className={product.isVeg ? "veg-dot-green flex" : "nonveg-dot-red flex"}
            title={product.isVeg ? "100% Vegetarian" : "Non-Vegetarian"}
          />
        </div>
      </div>

      {/* Product Image Area */}
      <div
        onClick={() => onViewDetails(product)}
        className="h-48 md:h-52 bg-neutral-50 overflow-hidden relative cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Product Information */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Brand & Origin */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            {product.brand}
          </span>
          <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-sm">
            {product.size}
          </span>
        </div>

        {/* Product Name */}
        <h3
          onClick={() => onViewDetails(product)}
          className="font-display font-medium text-neutral-800 text-sm md:text-base leading-tight mb-2 hover:text-amber-600 cursor-pointer transition-colors line-clamp-2 min-h-[2.5rem]"
        >
          {product.name}
        </h3>

        {/* Rating and Category */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[11px] font-semibold">
            <span>{product.rating}</span>
            <Star size={12} className="fill-amber-600 stroke-amber-600" />
          </div>
          <span className="text-[11px] text-neutral-400 font-medium">
            ({product.reviewsCount} reviews)
          </span>
          <div className="ml-auto flex items-center text-neutral-400 text-[11px] font-medium">
            <span>{product.category}</span>
          </div>
        </div>

        {/* Price Tag with discount percentage */}
        <div className="mt-auto pt-3 border-t border-neutral-100 flex items-baseline justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg md:text-xl font-bold font-display text-neutral-900">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-neutral-400 line-through">
                ₹{product.originalPrice.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">
              Save ₹{(product.originalPrice - product.price).toLocaleString("en-IN")} ({discountPercent}% OFF)
            </span>
          </div>
        </div>

        {/* Interactive Verification Indicator */}
        <div className="mt-3 py-1 px-2 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center gap-1.5 text-[10px] text-neutral-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium line-clamp-1">100% Authentic Product Guarantee</span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            id={`btn-view-${product.id}`}
            onClick={() => onViewDetails(product)}
            className="border border-neutral-200 text-neutral-700 hover:border-neutral-800 font-medium text-xs py-2 rounded-xl transition-colors cursor-pointer text-center"
          >
            Details
          </button>
          <button
            id={`btn-add-${product.id}`}
            onClick={() => onAddToCart(product, product.flavors?.[0])}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs py-2 rounded-xl transition-colors shadow-sm cursor-pointer text-center"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ShoppingBag,
  ShieldCheck,
  Package,
  Dumbbell,
  SlidersHorizontal,
  ChevronDown,
  X,
  Plus,
  Minus,
  Trash2,
  TrendingUp,
  Award,
  CirclePercent,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";

import { Category, Product, CartItem, Order } from "./types";
import { PRODUCTS, BRANDS } from "./data";
import ProductCard from "./components/ProductCard";
import ProductDetailModal from "./components/ProductDetailModal";
import VerificationHub from "./components/VerificationHub";
import CheckoutModal from "./components/CheckoutModal";
import ProfileOrders from "./components/ProfileOrders";

export default function App() {
  const [activeTab, setActiveTab] = useState<"catalog" | "verify" | "profile">("catalog");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"bestseller" | "price-asc" | "price-desc" | "rating">("bestseller");
  const [showFilters, setShowFilters] = useState(false);

  // Selected details modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [ordersTrigger, setOrdersTrigger] = useState(0);

  // Load cart from LocalStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("nutriindia_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error("Failed to load cart", err);
      }
    }
  }, []);

  // Save cart to LocalStorage when changed
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("nutriindia_cart", JSON.stringify(newCart));
  };

  const handleAddToCart = (product: Product, flavor?: string) => {
    const chosenFlavor = flavor || (product.flavors && product.flavors.length > 0 ? product.flavors[0] : undefined);
    
    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.selectedFlavor === chosenFlavor
    );

    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = [...cart];
      updated[existingIndex].quantity += 1;
    } else {
      updated = [...cart, { product, quantity: 1, selectedFlavor: chosenFlavor }];
    }
    
    saveCart(updated);
    setIsCartOpen(true); // Open cart to show success
  };

  const handleUpdateQuantity = (productId: string, flavor: string | undefined, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.product.id === productId && item.selectedFlavor === flavor) {
          const newQty = item.quantity + delta;
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);

    saveCart(updated);
  };

  const handleRemoveFromCart = (productId: string, flavor: string | undefined) => {
    const updated = cart.filter(
      (item) => !(item.product.id === productId && item.selectedFlavor === flavor)
    );
    saveCart(updated);
  };

  const handleClearCart = () => {
    saveCart([]);
  };

  const handleOrderSuccess = (order: Order) => {
    setIsCheckoutOpen(false);
    setActiveTab("profile");
    setOrdersTrigger((prev) => prev + 1); // Trigger profile re-render
  };

  // Filter and Sort logic
  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBrand = selectedBrand ? p.brand.toLowerCase() === selectedBrand.toLowerCase() : true;
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    const matchesVeg = vegOnly ? p.isVeg === true : true;

    return matchesSearch && matchesBrand && matchesCategory && matchesVeg;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    
    // Default: bestseller (bestseller first, then rating)
    const scoreA = (a.isBestseller ? 50 : 0) + a.rating * 5;
    const scoreB = (b.isBestseller ? 50 : 0) + b.rating * 5;
    return scoreB - scoreA;
  });

  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col justify-between font-sans selection:bg-amber-600 selection:text-white">
      
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div 
            onClick={() => { setActiveTab("catalog"); setSelectedBrand(null); setSelectedCategory(null); }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="bg-neutral-900 text-amber-500 p-2 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
              <Dumbbell size={20} className="transform rotate-45" />
            </div>
            <div>
              <h1 className="text-lg font-display font-black tracking-tight leading-none text-neutral-900">
                NUTRI<span className="text-amber-600">INDIA</span>
              </h1>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-bold leading-none mt-0.5">
                100% Authentic Supplements
              </span>
            </div>
          </div>

          {/* Quick Search Bar (Catalog Only) */}
          {activeTab === "catalog" && (
            <div className="hidden md:flex items-center flex-grow max-w-md relative">
              <Search className="absolute left-3.5 text-neutral-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search proteins, creatine, Ashwagandha, Kapiva..."
                className="w-full bg-neutral-50 border border-neutral-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full hover:bg-neutral-200 text-neutral-400"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/10"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              Shop Supplements
            </button>
            
            <button
              onClick={() => setActiveTab("verify")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "verify"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/10"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              <ShieldCheck size={14} className="shrink-0" />
              <span className="hidden sm:inline">Verify Authenticity</span>
              <span className="sm:hidden">Verify</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "profile"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/10"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              <Package size={14} className="shrink-0" />
              <span className="hidden sm:inline">My Locker</span>
              <span className="sm:hidden">Locker</span>
            </button>

            {/* Cart Trigger */}
            <div className="relative ml-2">
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white p-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <ShoppingBag size={16} />
                <span className="font-bold font-display text-xs bg-amber-500 text-neutral-900 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
                  {totalCartItemsCount}
                </span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* 2. Main Content Stage */}
      <main className="flex-grow">
        
        {activeTab === "catalog" && (
          <div id="catalog-tab-content">
            {/* Promotion Banner */}
            <section className="bg-neutral-900 text-white relative overflow-hidden py-12 md:py-16">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                
                {/* Hero Words (Cols 7) */}
                <div className="md:col-span-7 space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <TrendingUp size={12} />
                    <span>India's Premium Supplement Portal</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight">
                    Pure Results.<br />
                    <span className="text-amber-500">Zero Fake Spikes.</span>
                  </h2>
                  <p className="text-sm text-neutral-400 max-w-lg leading-relaxed mx-auto md:mx-0">
                    Buy authentic imported & homegrown supplement brands. Direct clearance certificates, NABL lab reports, and absolute scratch-code reliability.
                  </p>
                  
                  {/* Trust markers */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2 text-xs text-neutral-300 font-medium">
                    <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg">
                      🛡️ 100% Genuine Importer Tag
                    </span>
                    <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg">
                      ⚡ Free Shipping Above ₹999
                    </span>
                    <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg">
                      🌿 FSSAI Approved Portfolio
                    </span>
                  </div>
                </div>

                {/* Interactive Promo Banner Cards (Cols 5) */}
                <div className="md:col-span-5 flex flex-col gap-3">
                  <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-5 rounded-2xl text-neutral-900 flex justify-between items-center relative overflow-hidden group">
                    <div className="space-y-1 z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950">Active Promo Offer</span>
                      <h3 className="font-display font-black text-xl text-white">GET 10% OFF</h3>
                      <p className="text-xs text-amber-950 font-medium">Use code <strong className="bg-white/80 px-1.5 py-0.5 rounded-sm font-mono text-neutral-900">INDIAFIT</strong> at checkout</p>
                    </div>
                    <CirclePercent className="w-24 h-24 text-amber-500/20 absolute -right-4 -bottom-4 transform group-hover:scale-110 transition-transform" />
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-amber-500 block uppercase">Suspicious of a product?</span>
                      <span className="text-neutral-400 mt-0.5 block">Use our Scratch Pin Verifier to crosscheck batches.</span>
                    </div>
                    <button
                      onClick={() => setActiveTab("verify")}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Verify Now
                    </button>
                  </div>
                </div>

              </div>
            </section>

            {/* Brand Filters Ribbon */}
            <section className="bg-white py-6 border-b border-neutral-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center mb-4">
                  Shop Officially Licensed Indian & Global Brands
                </span>
                
                {/* Brand Logo grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {BRANDS.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBrand(selectedBrand === b.name ? null : b.name)}
                      className={`p-3 rounded-2xl border cursor-pointer text-center transition-all ${
                        selectedBrand === b.name
                          ? "bg-amber-600/5 border-amber-600 shadow-xs"
                          : "bg-neutral-50/50 border-neutral-100 hover:border-neutral-300 hover:bg-white"
                      }`}
                    >
                      <span className="block font-display font-extrabold text-neutral-900 text-sm group-hover:text-amber-600">
                        {b.logo}
                      </span>
                      <span className="block text-[10px] text-neutral-400 font-bold tracking-tight mt-0.5">
                        {b.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Interactive Filters Grid Stage */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              
              {/* Responsive Search (Mobile only) */}
              <div className="md:hidden relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search proteins, ayurveda, creatine..."
                  className="w-full bg-white border border-neutral-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Filtering Controls Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                {/* Category selectors */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      selectedCategory === null
                        ? "bg-neutral-900 text-white"
                        : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    All Catalog
                  </button>
                  {Object.values(Category).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                        selectedCategory === cat
                          ? "bg-neutral-900 text-white"
                          : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Sorting and Advanced parameters */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  {/* Vegetarian Filter (Extremely crucial culturally in India) */}
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-300 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={vegOnly}
                      onChange={(e) => setVegOnly(e.target.checked)}
                      className="accent-emerald-600 cursor-pointer h-3.5 w-3.5 rounded-md"
                    />
                    <div className="flex items-center gap-1 text-neutral-700">
                      <span className="veg-dot-green h-2 w-2" />
                      <span>Veg Only</span>
                    </div>
                  </label>

                  {/* Sorting dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="appearance-none bg-white border border-neutral-200 text-xs font-semibold px-4 py-1.5 pr-8 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-neutral-700 cursor-pointer"
                    >
                      <option value="bestseller">Sort: Best Match</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active filters summary */}
              {(selectedBrand || selectedCategory || vegOnly || searchQuery) && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Filters:</span>
                  {selectedBrand && (
                    <span className="bg-neutral-100 text-neutral-700 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      Brand: {selectedBrand}
                      <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setSelectedBrand(null)} />
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="bg-neutral-100 text-neutral-700 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      Cat: {selectedCategory}
                      <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setSelectedCategory(null)} />
                    </span>
                  )}
                  {vegOnly && (
                    <span className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-100">
                      Vegetarian
                      <X size={12} className="cursor-pointer text-emerald-500 hover:text-emerald-700" onClick={() => setVegOnly(false)} />
                    </span>
                  )}
                  {searchQuery && (
                    <span className="bg-neutral-100 text-neutral-700 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      Search: "{searchQuery}"
                      <X size={12} className="cursor-pointer text-neutral-400 hover:text-neutral-700" onClick={() => setSearchQuery("")} />
                    </span>
                  )}
                  <button 
                    onClick={() => { setSelectedBrand(null); setSelectedCategory(null); setVegOnly(false); setSearchQuery(""); }}
                    className="text-[11px] text-amber-600 hover:text-amber-800 font-bold uppercase tracking-wider underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Products Catalog Display Grid */}
              <AnimatePresence mode="popLayout">
                {sortedProducts.length === 0 ? (
                  /* Empty state for search/filters */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white border border-neutral-100 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4"
                  >
                    <div className="inline-flex p-4 bg-amber-500/10 text-amber-600 rounded-full">
                      <SlidersHorizontal size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-neutral-800 text-base">No Matching Supplements Found</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        We couldn't find any products matching those parameters. Please try broadening your filters or resetting the search.
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedBrand(null); setSelectedCategory(null); setVegOnly(false); setSearchQuery(""); }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      Reset Catalog
                    </button>
                  </motion.div>
                ) : (
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sortedProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onViewDetails={(prod) => setSelectedProduct(prod)}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>
        )}

        {activeTab === "verify" && (
          <VerificationHub onBackToStore={() => setActiveTab("catalog")} />
        )}

        {activeTab === "profile" && (
          <ProfileOrders 
            onBrowseProducts={() => setActiveTab("catalog")} 
            ordersTrigger={ordersTrigger}
          />
        )}

      </main>

      {/* 3. Global Footer */}
      <footer className="bg-neutral-950 text-neutral-400 py-12 border-t border-neutral-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
          
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-amber-600 text-neutral-900 p-1.5 rounded-lg">
                <Dumbbell size={16} className="transform rotate-45 text-white" />
              </div>
              <h4 className="font-display font-black text-white text-base tracking-tight">
                NUTRI<span className="text-amber-500">INDIA</span>
              </h4>
            </div>
            <p className="leading-relaxed max-w-sm">
              India's pre-eminent multi-brand sports nutrition portal. Our primary directive is ensuring 100% genuine products, keeping you safe from illegal substances and low-grade bulk duplicate formulations.
            </p>
            <div className="pt-2">
              <span className="text-white font-semibold block text-[10px] uppercase tracking-wider">Licensed FSSAI Number:</span>
              <span className="font-mono mt-0.5 block text-amber-500">10023081001429 (E-Commerce Division)</span>
            </div>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <h4 className="font-display font-bold text-white uppercase tracking-wider text-[11px]">Importer Partners</h4>
            <ul className="space-y-1.5">
              <li>Glanbia Performance Nutrition (ON)</li>
              <li>Bright Performance Nutrition (MuscleTech)</li>
              <li>Bright Lifecare Pvt Ltd (MuscleBlaze)</li>
              <li>Medisys Biotech (Asitis)</li>
              <li>Adret Retail Pvt Ltd (Kapiva)</li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <h4 className="font-display font-bold text-white uppercase tracking-wider text-[11px]">Quality Guarantee</h4>
            <div className="space-y-2 leading-relaxed">
              <p>Every single batch undergoes rigorous heavy metals testing, microbial parameters checks, and nitrogen amino spiking audits prior to warehousing.</p>
              <span 
                onClick={() => setActiveTab("verify")}
                className="text-amber-500 hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                Scan Authenticity PIN →
              </span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <h4 className="font-display font-bold text-white uppercase tracking-wider text-[11px]">Customer Support</h4>
            <div className="space-y-1">
              <p className="font-bold text-white">1800-419-8392</p>
              <p>support@nutriindia.com</p>
              <p className="text-[10px] text-neutral-500 mt-2">Bandra West, Mumbai, India</p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-neutral-900 text-center text-[10px] text-neutral-600">
          <p>© {new Date().getFullYear()} NutriIndia Sports Nutrition Limited. All rights reserved. Designated trademarks and brands are properties of their respective owners.</p>
        </div>
      </footer>

      {/* 4. Slide-Over Cart Side-Drawer Panel */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              id="shopping-cart-drawer"
              className="bg-white w-full max-w-md h-full relative z-10 shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-neutral-900 text-base flex items-center gap-1.5">
                    <ShoppingBag size={18} className="text-amber-600" />
                    <span>Shopping Cart ({totalCartItemsCount})</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Review your supplements before dispatch
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-grow overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  /* Empty state */
                  <div className="h-96 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-full text-neutral-400 border border-neutral-100">
                      <ShoppingBag size={28} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-700 text-sm">Your cart is empty</h4>
                      <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">
                        Find proteins, amino acids, and multivitamins to add to your fitness stack.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-5 py-2.5 rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Browse Catalog
                    </button>
                  </div>
                ) : (
                  /* Cart list items */
                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div
                        key={`${item.product.id}-${item.selectedFlavor}`}
                        className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100 flex gap-3 relative group"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 object-cover rounded-xl bg-white border border-neutral-100 shrink-0"
                        />
                        <div className="text-xs flex-grow space-y-0.5 pr-6">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{item.product.brand}</span>
                          <h4 className="font-semibold text-neutral-800 leading-tight line-clamp-1">{item.product.name}</h4>
                          {item.selectedFlavor && (
                            <span className="text-[10px] text-neutral-400 block font-medium">
                              Flavor: {item.selectedFlavor}
                            </span>
                          )}
                          <div className="flex items-center justify-between pt-1.5">
                            <span className="font-bold text-neutral-900 font-display">
                              ₹{(item.product.price * item.quantity).toLocaleString("en-IN")}
                            </span>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-neutral-200 bg-white rounded-lg">
                              <button
                                onClick={() => handleUpdateQuantity(item.product.id, item.selectedFlavor, -1)}
                                className="p-1 hover:bg-neutral-50 text-neutral-500 rounded-l-lg transition-colors cursor-pointer"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="px-2 text-[11px] font-bold text-neutral-700">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.product.id, item.selectedFlavor, 1)}
                                className="p-1 hover:bg-neutral-50 text-neutral-500 rounded-r-lg transition-colors cursor-pointer"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remove item absolute action */}
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id, item.selectedFlavor)}
                          className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-rose-600 p-1 rounded-md hover:bg-white transition-all cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer Billing calculation */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-neutral-100 bg-neutral-50/50 space-y-4">
                  <div className="space-y-2 text-xs text-neutral-600">
                    <div className="flex justify-between">
                      <span>Cart Subtotal</span>
                      <span className="font-medium">₹{totalCartPrice.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18% Integrated standard CGST+SGST included)</span>
                      <span>₹{Math.round(totalCartPrice - totalCartPrice / 1.18).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Logistics & Shipping</span>
                      <span>{totalCartPrice > 999 ? <span className="text-emerald-600 font-bold">FREE</span> : "₹99"}</span>
                    </div>
                    <div className="flex justify-between text-sm text-neutral-900 font-bold border-t border-neutral-200/60 pt-2">
                      <span>Grand Total</span>
                      <span className="font-display">₹{(totalCartPrice + (totalCartPrice > 999 ? 0 : 99)).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-amber-600/10"
                  >
                    <span>Proceed to Secure Checkout</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Product Specifications Modal Overlay */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* 6. Checkout Process Modal Overlay Drawer */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        onClearCart={handleClearCart}
        onOrderSuccess={handleOrderSuccess}
      />

    </div>
  );
}

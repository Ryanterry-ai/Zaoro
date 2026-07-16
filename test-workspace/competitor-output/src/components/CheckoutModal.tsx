import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, CreditCard, ShoppingBag, CheckCircle, Gift, ArrowRight, ShieldCheck, Ticket, RefreshCw } from "lucide-react";
import { CartItem, Address, Order } from "../types";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

const INDIAN_METROS = [
  { city: "Mumbai", state: "Maharashtra", pinPrefix: "400" },
  { city: "Delhi", state: "Delhi", pinPrefix: "110" },
  { city: "Bengaluru", state: "Karnataka", pinPrefix: "560" },
  { city: "Hyderabad", state: "Telangana", pinPrefix: "500" },
  { city: "Pune", state: "Maharashtra", pinPrefix: "411" },
  { city: "Chennai", state: "Tamil Nadu", pinPrefix: "600" },
  { city: "Kolkata", state: "West Bengal", pinPrefix: "700" },
  { city: "Ahmedabad", state: "Gujarat", pinPrefix: "380" }
];

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onClearCart,
  onOrderSuccess,
}: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // 1: Shipping Address, 2: Payment & Final Summary
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [pinCode, setPinCode] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);

  // Auto-fill state when a metro city is selected
  const handleMetroChange = (cityName: string) => {
    setCity(cityName);
    const found = INDIAN_METROS.find(m => m.city === cityName);
    if (found) {
      setState(found.state);
      setPinCode(found.pinPrefix + "001");
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  
  // Calculate GST (18% included in the price - let's break it down as standard Indian bills do)
  const baseValue = subtotal / 1.18;
  const gstValue = subtotal - baseValue;
  
  // Shipping: Free above ₹999, else ₹99
  const shippingCharge = subtotal > 999 ? 0 : 99;
  
  // COD surcharge if applicable
  const codCharge = paymentMethod === "cod" ? 49 : 0;

  const total = subtotal - appliedDiscount + shippingCharge + codCharge;

  const handleApplyCoupon = () => {
    setCouponError("");
    setCouponSuccess("");
    const cleaned = couponCode.trim().toUpperCase();

    if (cleaned === "INDIAFIT") {
      const discount = Math.round(subtotal * 0.10); // 10% off
      setAppliedDiscount(discount);
      setCouponSuccess("Coupon 'INDIAFIT' applied! 10% discount on supplements.");
    } else if (cleaned === "DIWALI500") {
      if (subtotal < 3000) {
        setCouponError("Minimum order of ₹3,000 required for DIWALI500 coupon.");
      } else {
        setAppliedDiscount(500);
        setCouponSuccess("Festive coupon 'DIWALI500' applied! Flat ₹500 off.");
      }
    } else if (cleaned === "FIRST100") {
      setAppliedDiscount(100);
      setCouponSuccess("Welcome coupon 'FIRST100' applied! Flat ₹100 off.");
    } else {
      setCouponError("Invalid promo code. Try 'INDIAFIT' or 'FIRST100'.");
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !addressLine1 || !pinCode) {
      alert("Please fill in all mandatory shipping fields.");
      return;
    }
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }
    if (pinCode.length !== 6) {
      alert("Please enter a valid 6-digit Indian PIN code.");
      return;
    }
    setStep(2);
  };

  const handlePlaceOrder = () => {
    if (paymentMethod === "upi" && !upiId.includes("@")) {
      alert("Please enter a valid UPI ID (e.g., name@okaxis or user@upi)");
      return;
    }

    setIsOrdering(true);

    setTimeout(() => {
      const deliveryAddress: Address = {
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        pinCode
      };

      const trackingIds = ["BLUEDART-", "DELHIVERY-", "EKART-"];
      const courier = trackingIds[Math.floor(Math.random() * trackingIds.length)];
      const randomNum = Math.floor(Math.random() * 899999) + 100000;

      const newOrder: Order = {
        id: "ORD-" + (Math.floor(Math.random() * 89999) + 10000),
        items: cartItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          brand: item.product.brand,
          price: item.product.price,
          quantity: item.quantity,
          flavor: item.selectedFlavor,
          image: item.product.image
        })),
        subtotal,
        gst: Math.round(gstValue),
        shipping: shippingCharge + codCharge,
        total,
        date: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        status: "Processing",
        address: deliveryAddress,
        paymentMethod: paymentMethod === "upi" ? `UPI (${upiId})` : paymentMethod === "card" ? "Credit Card" : "Cash on Delivery (COD)",
        trackingId: courier + randomNum
      };

      // Save order to LocalStorage
      const savedOrdersRaw = localStorage.getItem("nutriindia_orders");
      const existingOrders = savedOrdersRaw ? JSON.parse(savedOrdersRaw) : [];
      localStorage.setItem("nutriindia_orders", JSON.stringify([newOrder, ...existingOrders]));

      setOrderComplete(newOrder);
      onOrderSuccess(newOrder);
      onClearCart();
      setIsOrdering(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
        />

        {/* Sliding Drawer Container */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.35 }}
          id="checkout-drawer"
          className="bg-white w-full max-w-lg h-full relative z-10 shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-neutral-900 text-lg flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-600" />
                <span>Secure Checkout</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {orderComplete ? "Order Placed Successfully" : `Step ${step} of 2`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {!orderComplete ? (
              <>
                {/* Steps Navigator */}
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 flex-grow rounded-full ${step >= 1 ? "bg-amber-600" : "bg-neutral-200"}`} />
                  <div className={`h-1.5 flex-grow rounded-full ${step >= 2 ? "bg-amber-600" : "bg-neutral-200"}`} />
                </div>

                {step === 1 ? (
                  /* STEP 1: Shipping Address details */
                  <form onSubmit={handleNextStep} className="space-y-4">
                    <h3 className="font-display font-semibold text-neutral-800 text-sm flex items-center gap-1.5">
                      <MapPin size={16} className="text-amber-600" />
                      <span>Shipping Address (India Delivery)</span>
                    </h3>

                    {/* Quick Metros Selection */}
                    <div>
                      <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                        Quick Select Major Cities
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {INDIAN_METROS.map((m) => (
                          <button
                            type="button"
                            key={m.city}
                            onClick={() => handleMetroChange(m.city)}
                            className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            {m.city}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          10-Digit Mobile Number *
                        </label>
                        <div className="flex">
                          <span className="bg-neutral-50 border border-r-0 border-neutral-200 text-sm text-neutral-500 px-3 py-2.5 rounded-l-xl flex items-center">
                            +91
                          </span>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            placeholder="e.g. 9876543210"
                            className="w-full px-4 py-2.5 rounded-r-xl border border-neutral-200 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          Flat, House No, Building Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          placeholder="e.g. Apt 402, Block C, Silver Springs"
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          Area, Colony, Street Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          placeholder="e.g. Linking Road, Bandra West"
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                            City *
                          </label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Mumbai"
                            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                            PIN Code *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={pinCode}
                            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="6 digits PIN"
                            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-center font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="e.g. Maharashtra"
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/10 mt-6"
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                ) : (
                  /* STEP 2: Payment and Promo code */
                  <div className="space-y-6">
                    {/* Promo coupon Code block */}
                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 mb-2">
                        <Ticket size={14} className="text-amber-600" />
                        <span>Promo Code Offers</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Try 'INDIAFIT' or 'FIRST100'"
                          className="flex-grow px-3.5 py-2 text-xs rounded-xl border border-neutral-200 bg-white font-semibold uppercase focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="bg-neutral-800 text-white hover:bg-neutral-900 text-xs px-4 rounded-xl transition-colors font-medium cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && <p className="text-[10px] text-rose-600 font-medium mt-1.5">{couponError}</p>}
                      {couponSuccess && <p className="text-[10px] text-emerald-600 font-medium mt-1.5">{couponSuccess}</p>}
                    </div>

                    {/* Payment methods choice */}
                    <div className="space-y-3">
                      <h3 className="font-display font-semibold text-neutral-800 text-sm flex items-center gap-1.5">
                        <CreditCard size={16} className="text-amber-600" />
                        <span>Select Payment Method</span>
                      </h3>

                      <div className="grid grid-cols-1 gap-2">
                        {/* UPI Payment */}
                        <div
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            paymentMethod === "upi"
                              ? "bg-amber-600/5 border-amber-600"
                              : "bg-white border-neutral-200"
                          }`}
                          onClick={() => setPaymentMethod("upi")}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-800">Unified Payments Interface (UPI)</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-sm">
                              Popular in India
                            </span>
                          </div>
                          {paymentMethod === "upi" && (
                            <div className="mt-3 space-y-2">
                              <input
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="Enter Virtual Payment Address (VPA) e.g. rahul@upi"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white"
                              />
                              <span className="text-[10px] text-neutral-400 block leading-tight">
                                GPay, PhonePe, Paytm, and BHIM app requests will be sent to this UPI VPA handle.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Payment */}
                        <div
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            paymentMethod === "card"
                              ? "bg-amber-600/5 border-amber-600"
                              : "bg-white border-neutral-200"
                          }`}
                          onClick={() => setPaymentMethod("card")}
                        >
                          <span className="text-xs font-bold text-neutral-800 block">Credit or Debit Card</span>
                          {paymentMethod === "card" && (
                            <div className="mt-3 space-y-2">
                              <input
                                type="text"
                                maxLength={16}
                                placeholder="16-digit Card Number"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  maxLength={5}
                                  placeholder="MM/YY"
                                  className="px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white text-center"
                                />
                                <input
                                  type="password"
                                  maxLength={3}
                                  placeholder="CVV"
                                  className="px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white text-center"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Cash on delivery */}
                        <div
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            paymentMethod === "cod"
                              ? "bg-amber-600/5 border-amber-600"
                              : "bg-white border-neutral-200"
                          }`}
                          onClick={() => setPaymentMethod("cod")}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-800">Cash on Delivery (COD)</span>
                            <span className="text-[10px] text-neutral-400 font-medium">+₹49 COD fee applies</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bill break-down details */}
                    <div className="border-t border-neutral-100 pt-4 space-y-2">
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bill Summary</h4>
                      <div className="space-y-1.5 text-xs text-neutral-600">
                        <div className="flex justify-between">
                          <span>Items Subtotal</span>
                          <span>₹{subtotal.toLocaleString("en-IN")}</span>
                        </div>
                        {appliedDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span className="flex items-center gap-1">
                              <Gift size={12} /> Promo Discount
                            </span>
                            <span>-₹{appliedDiscount.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-neutral-400 text-[11px]">
                          <span>Includes 18% Integrated GST</span>
                          <span>(₹{gstValue.toLocaleString("en-IN")})</span>
                        </div>
                        {paymentMethod === "cod" && (
                          <div className="flex justify-between">
                            <span>Cash Handling Convenience Surcharge</span>
                            <span>₹49</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Delivery & Shipping Logistics</span>
                          <span>{shippingCharge === 0 ? "FREE" : `₹${shippingCharge}`}</span>
                        </div>
                        <div className="flex justify-between text-neutral-900 font-bold text-sm border-t border-neutral-100 pt-2">
                          <span>To Pay (Grand Total)</span>
                          <span>₹{total.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Security promise */}
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center gap-2 text-[10px] text-neutral-500">
                      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>FSSAI-Compliant Authentic Supplements. Safe SSL checkout pipeline.</span>
                    </div>

                    {/* Back / Pay Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="border border-neutral-200 text-neutral-600 hover:border-neutral-500 rounded-xl py-3 text-xs font-medium cursor-pointer transition-colors text-center"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handlePlaceOrder}
                        disabled={isOrdering}
                        className="col-span-2 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-300 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-amber-600/10 uppercase tracking-wider font-display"
                      >
                        {isOrdering ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Placing Order...
                          </>
                        ) : (
                          `Pay ₹${total.toLocaleString("en-IN")}`
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* SUCCESS ORDER COMPLETED SCREEN */
              <div className="text-center py-8 space-y-6">
                <div className="inline-flex p-4 bg-emerald-50 rounded-full text-emerald-600 shadow-inner">
                  <CheckCircle size={48} className="animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-bold text-neutral-900 text-xl">
                    Order Placed Successfully!
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
                    Thank you for shopping with us, <strong className="text-neutral-800">{fullName}</strong>. Your supplement purity and authentication certificates have been generated.
                  </p>
                </div>

                {/* Receipt Card Details */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-left space-y-2 text-xs">
                  <div className="flex justify-between pb-2 border-b border-neutral-200">
                    <span className="text-neutral-400 font-bold">Order ID</span>
                    <span className="font-mono font-bold text-neutral-800">{orderComplete.id}</span>
                  </div>

                  <div className="space-y-1 py-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Courier Dispatch (Blue Dart)</span>
                    <div className="flex justify-between font-mono text-[11px] text-neutral-700">
                      <span>Tracking ID:</span>
                      <span className="font-bold">{orderComplete.trackingId}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-500">Logistics Status:</span>
                    <span className="text-amber-700 font-semibold">{orderComplete.status}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-500">Delivery Est:</span>
                    <span className="font-medium text-neutral-800">In 2 - 3 Business Days</span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-neutral-200 text-neutral-800 font-bold text-sm">
                    <span>Total Paid</span>
                    <span>₹{orderComplete.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full border border-neutral-800 text-neutral-800 hover:bg-neutral-800 hover:text-white rounded-xl py-2.5 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

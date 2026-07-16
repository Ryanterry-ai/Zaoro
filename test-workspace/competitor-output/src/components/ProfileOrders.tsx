import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Package, Truck, Calendar, ShoppingBag, MapPin, User, ChevronRight } from "lucide-react";
import { Order } from "../types";

interface ProfileOrdersProps {
  onBrowseProducts: () => void;
  ordersTrigger: number; // Used to re-render when a new order is placed
}

export default function ProfileOrders({ onBrowseProducts, ordersTrigger }: ProfileOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const savedOrdersRaw = localStorage.getItem("nutriindia_orders");
    if (savedOrdersRaw) {
      try {
        setOrders(JSON.parse(savedOrdersRaw));
      } catch (err) {
        console.error("Failed to parse orders", err);
      }
    }
  }, [ordersTrigger]);

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm("Are you sure you want to cancel this order? Supplement refund will be initiated instantly to your original payment method.")) {
      const updated = orders.map(o => {
        if (o.id === orderId) {
          return { ...o, status: "Cancelled" as const };
        }
        return o;
      });
      setOrders(updated);
      localStorage.setItem("nutriindia_orders", JSON.stringify(updated));
    }
  };

  return (
    <div id="profile-orders" className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* User Welcome Block */}
      <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-md">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="p-4 bg-white/10 rounded-2xl">
            <User size={32} className="text-amber-500" />
          </div>
          <div>
            <span className="text-xs text-amber-500/90 font-bold uppercase tracking-wider">Premium Account Holder</span>
            <h2 className="text-xl md:text-2xl font-display font-bold">Namaste! Athlete</h2>
            <p className="text-xs text-neutral-300 mt-1">
              Welcome to your supplement locker. Check authentications and ship status here.
            </p>
          </div>
        </div>

        {/* Indian Market Metrics */}
        <div className="bg-white/10 px-5 py-3 rounded-2xl text-center backdrop-blur-xs border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-neutral-300 tracking-widest block">Fit Coins Earned</span>
          <span className="text-xl font-bold font-display text-amber-400">
            {orders.length * 500} pts
          </span>
          <span className="text-[9px] text-neutral-400 block">Redeemable on next MuscleBlaze purchase</span>
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-neutral-800 text-lg flex items-center gap-2">
          <Package size={20} className="text-amber-600" />
          <span>My Order History ({orders.length})</span>
        </h3>

        {orders.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-10 border border-neutral-100 text-center space-y-4 shadow-2xs"
          >
            <div className="inline-flex p-4 bg-amber-50 rounded-full text-amber-600">
              <ShoppingBag size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-neutral-800">No active supplement orders</h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                You haven't purchased anything yet. Build your bodybuilding routine with 100% genuine imported and Indian brands.
              </p>
            </div>
            <button
              onClick={onBrowseProducts}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 uppercase tracking-wider"
            >
              Browse Supplements <ChevronRight size={14} />
            </button>
          </motion.div>
        ) : (
          /* Orders list */
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-neutral-100 shadow-2xs overflow-hidden"
              >
                {/* Header of specific order */}
                <div className="bg-neutral-50 p-4 border-b border-neutral-100 flex flex-wrap justify-between items-center gap-3 text-xs">
                  <div className="flex gap-4">
                    <div>
                      <span className="text-neutral-400 text-[10px] block uppercase tracking-wider">Order Placed</span>
                      <span className="font-medium text-neutral-700 flex items-center gap-1">
                        <Calendar size={12} className="text-neutral-400" /> {order.date}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] block uppercase tracking-wider">Order ID</span>
                      <span className="font-mono font-bold text-neutral-800">{order.id}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] block uppercase tracking-wider">Paid via</span>
                      <span className="font-medium text-neutral-700">{order.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === "Processing"
                          ? "bg-amber-100 text-amber-800"
                          : order.status === "Shipped"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "Cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items and specs details */}
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Products list in this order (Cols 7) */}
                  <div className="md:col-span-7 space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <img
                          src={item.image}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover rounded-lg bg-neutral-100 border border-neutral-100 shrink-0"
                        />
                        <div className="text-xs space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-amber-700">{item.brand}</span>
                          <h4 className="font-semibold text-neutral-800 leading-tight">{item.productName}</h4>
                          <div className="flex gap-2 text-neutral-500 font-medium">
                            {item.flavor && <span>Flavor: {item.flavor}</span>}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shipping and summary information (Cols 5) */}
                  <div className="md:col-span-5 bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1 mb-1">
                        <Truck size={12} className="text-amber-600" />
                        <span>Logistics & Shipping</span>
                      </span>
                      <div className="space-y-1 font-mono text-[10px] text-neutral-600">
                        <div>Courier Partner: <span className="font-bold">Blue Dart Express</span></div>
                        <div>Docket Airway Bill: <span className="font-bold text-neutral-800">{order.trackingId}</span></div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1 mb-1">
                        <MapPin size={12} className="text-amber-600" />
                        <span>Shipping Location</span>
                      </span>
                      <p className="text-neutral-700 leading-tight font-medium">
                        {order.address.fullName}, {order.address.addressLine1}, {order.address.city} - {order.address.pinCode}
                      </p>
                    </div>

                    <div className="border-t border-neutral-200/60 pt-2 flex justify-between items-baseline">
                      <span className="font-bold text-neutral-800">Total Charged</span>
                      <span className="text-sm font-bold font-display text-neutral-900">
                        ₹{order.total.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {order.status === "Processing" && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="w-full mt-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg py-1.5 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

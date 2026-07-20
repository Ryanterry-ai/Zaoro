/**
 * Restaurant Component Templates
 *
 * Production-quality component templates for restaurant applications.
 */

export const RESTAURANT_TEMPLATES = {
  /**
   * MenuItem component with image, price, veg/non-veg indicator
   */
  MenuItem: () => `'use client';

import { motion } from 'framer-motion';
import { Plus, Star } from 'lucide-react';

interface MenuItemProps {
  name: string;
  description: string;
  price: number;
  image?: string;
  spicyLevel?: number;
  isVeg: boolean;
  isBestseller?: boolean;
  onAddToCart?: () => void;
}

export default function MenuItem({ name, description, price, image, spicyLevel, isVeg, isBestseller, onAddToCart }: MenuItemProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="flex gap-4 bg-white p-4 rounded-2xl border border-neutral-100 hover:shadow-md transition-shadow">
      {image && <img src={image} alt={name} className="w-24 h-24 object-cover rounded-xl" />}
      <div className="flex-grow">
        <div className="flex items-center gap-2 mb-1">
          <div className={isVeg ? 'w-3 h-3 border border-green-500 flex items-center justify-center' : 'w-3 h-3 border border-red-500 flex items-center justify-center'}>
            <div className={isVeg ? 'w-1.5 h-1.5 bg-green-500 rounded-full' : 'w-1.5 h-1.5 bg-red-500 rounded-full'} />
          </div>
          {isBestseller && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">BESTSELLER</span>}
          {spicyLevel && spicyLevel > 0 && (
            <span className="text-xs">{Array.from({ length: spicyLevel }).map(() => '🌶️').join('')}</span>
          )}
        </div>
        <h4 className="font-bold text-neutral-800">{name}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{description}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">₹{price}</span>
          <button onClick={onAddToCart} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}`,

  /**
   * TableReservation component with date, time, guests, name, phone
   */
  TableReservation: () => `'use client';

import { useState } from 'react';
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react';

interface TableReservationProps {
  onSubmit: (reservation: { date: string; time: string; guests: number; name: string; phone: string }) => void;
}

export default function TableReservation({ onSubmit }: TableReservationProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    onSubmit({ date, time, guests, name, phone });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
        <h3 className="font-display font-bold text-xl mb-2">Reservation Confirmed!</h3>
        <p className="text-muted-foreground">We'll send you a confirmation shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1"><Calendar size={14} className="inline mr-1" /> Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><Clock size={14} className="inline mr-1" /> Time</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
            <option value="">Select time</option>
            <option value="12:00">12:00 PM</option>
            <option value="12:30">12:30 PM</option>
            <option value="13:00">1:00 PM</option>
            <option value="13:30">1:30 PM</option>
            <option value="19:00">7:00 PM</option>
            <option value="19:30">7:30 PM</option>
            <option value="20:00">8:00 PM</option>
            <option value="20:30">8:30 PM</option>
            <option value="21:00">9:00 PM</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><Users size={14} className="inline mr-1" /> Guests</label>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
            {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
        </div>
      </div>
      <input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
      <button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors">Reserve Table</button>
    </div>
  );
}`,

  /**
   * MenuCategory component for grouping menu items
   */
  MenuCategory: () => `'use client';

import { motion } from 'framer-motion';

interface MenuItem {
  name: string;
  description: string;
  price: number;
  image?: string;
  isVeg: boolean;
  isBestseller?: boolean;
}

interface MenuCategoryProps {
  name: string;
  description?: string;
  items: MenuItem[];
  renderItem: (item: MenuItem) => React.ReactNode;
}

export default function MenuCategory({ name, description, items, renderItem }: MenuCategoryProps) {
  return (
    <section className="mb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h3 className="font-display font-bold text-2xl mb-2">{name}</h3>
        {description && <p className="text-muted-foreground text-sm mb-6">{description}</p>}
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i}>{renderItem(item)}</div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}`,

  /**
   * OrderStatus component for tracking orders
   */
  OrderStatus: () => `'use client';

import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

interface OrderStatusStep {
  title: string;
  description?: string;
  icon?: string;
  metadata?: { status?: string };
}

interface OrderStatusProps {
  status?: 'pending' | 'confirmed' | 'preparing' | 'on-the-way' | 'delivered';
  title?: string;
  subtitle?: string;
  items?: OrderStatusStep[];
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'on-the-way', label: 'On the Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle }
];

const ICON_MAP: Record<string, any> = { Clock, Package, Truck, CheckCircle };

export default function OrderStatus({ status, title, subtitle, items }: OrderStatusProps) {
  if (items && items.length > 0) {
    return (
      <div className="w-full">
        {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
        {subtitle ? <p className="text-sm text-muted-foreground mb-4">{subtitle}</p> : null}
        <div className="flex flex-col gap-4">
          {items.map((step, i) => {
            const Icon = step.icon ? (ICON_MAP[step.icon] || CheckCircle) : CheckCircle;
            const stepStatus = step.metadata?.status || (i === 0 ? 'complete' : 'pending');
            return (
              <div key={step.title} className="flex items-start gap-3">
                <div className={\`w-9 h-9 rounded-full flex items-center justify-center \${
                  stepStatus === 'complete' ? 'bg-amber-600 text-white'
                    : stepStatus === 'active' ? 'bg-amber-600/20 text-amber-600 ring-2 ring-amber-600'
                    : 'bg-neutral-200 text-muted-foreground'
                }\`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  {step.description ? <p className="text-xs text-muted-foreground">{step.description}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentIndex = status ? STATUS_STEPS.findIndex(s => s.key === status) : 0;

  return (
    <div className="flex items-center justify-between">
      {STATUS_STEPS.map((step, i) => {
        const Icon = step.icon;
        const isCompleted = i <= currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.key} className="flex flex-col items-center">
            <div className={\`w-10 h-10 rounded-full flex items-center justify-center \${
              isCompleted ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-muted-foreground'
            } \${isCurrent ? 'ring-2 ring-amber-600 ring-offset-2' : ''}\`}>
              <Icon size={18} />
            </div>
            <span className={\`text-xs mt-2 \${isCompleted ? 'text-amber-600 font-medium' : 'text-muted-foreground'}\`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}`
};

export default RESTAURANT_TEMPLATES;

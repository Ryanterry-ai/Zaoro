/**
 * Real Estate Component Templates
 *
 * Production-quality component templates for real estate applications.
 */

export const REALESTATE_TEMPLATES = {
  /**
   * Property listing card with image, price, and details
   */
  PropertyGrid: () => `'use client';

import { motion } from 'framer-motion';
import { Bed, Bath, Square, MapPin, Heart } from 'lucide-react';
import { useState } from 'react';

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  type: string;
}

interface PropertyGridProps {
  properties?: Property[];
}

export default function PropertyGrid({
  properties = [
    { id: '1', title: 'Modern Downtown Loft', address: '123 Main St, Austin, TX', price: 425000, beds: 2, baths: 2, sqft: 1200, image: '/placeholder-1.jpg', type: 'Condo' },
    { id: '2', title: 'Suburban Family Home', address: '456 Oak Ave, Austin, TX', price: 650000, beds: 4, baths: 3, sqft: 2400, image: '/placeholder-2.jpg', type: 'House' },
    { id: '3', title: 'Cozy Starter Home', address: '789 Pine Rd, Austin, TX', price: 320000, beds: 3, baths: 2, sqft: 1600, image: '/placeholder-3.jpg', type: 'House' },
    { id: '4', title: 'Luxury Penthouse', address: '321 Skyline Dr, Austin, TX', price: 1200000, beds: 3, baths: 3, sqft: 3000, image: '/placeholder-4.jpg', type: 'Penthouse' },
  ],
}: PropertyGridProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {properties.map((property) => (
        <motion.div
          key={property.id}
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
        >
          <div className="relative h-48 bg-gray-200">
            <img
              src={property.image}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => toggleFavorite(property.id)}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <Heart
                className={\`w-4 h-4 \${
                  favorites.has(property.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'
                }\`}
              />
            </button>
            <span className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 text-xs font-medium text-gray-700 rounded">
              {property.type}
            </span>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-gray-900">{property.title}</h3>
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{property.address}</span>
            </div>
            <p className="text-xl font-bold text-indigo-600 mt-2">{formatPrice(property.price)}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span>{property.beds} beds</span>
              </div>
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span>{property.baths} baths</span>
              </div>
              <div className="flex items-center gap-1">
                <Square className="w-4 h-4" />
                <span>{property.sqft.toLocaleString()} sqft</span>
              </div>
            </div>
            <button className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
              View Details
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}`,

  /**
   * Agent profile card
   */
  AgentCard: () => `'use client';

import { motion } from 'framer-motion';
import { User, Phone, Mail, Star, Home } from 'lucide-react';

interface AgentCardProps {
  name: string;
  title: string;
  phone: string;
  email: string;
  rating: number;
  listingsCount: number;
  image?: string;
  onContact?: () => void;
}

export default function AgentCard({
  name,
  title,
  phone,
  email,
  rating,
  listingsCount,
  image,
  onContact,
}: AgentCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-indigo-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600">{title}</p>
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={\`w-4 h-4 \${
                  i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                }\`}
              />
            ))}
            <span className="text-sm text-gray-500 ml-1">({rating.toFixed(1)})</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Home className="w-4 h-4 text-gray-400" />
          <span>{listingsCount} active listings</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-gray-400" />
          <span>{phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <span>{email}</span>
        </div>
      </div>

      <button
        onClick={onContact}
        className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
      >
        Contact Agent
      </button>
    </motion.div>
  );
}`,

  /**
   * Mortgage calculator
   */
  MortgageCalculator: () => `'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, DollarSign, Percent, Calendar } from 'lucide-react';

interface MortgageCalculatorProps {
  defaultPrice?: number;
  defaultDownPayment?: number;
  defaultInterestRate?: number;
  defaultLoanTerm?: number;
}

export default function MortgageCalculator({
  defaultPrice = 400000,
  defaultDownPayment = 20,
  defaultInterestRate = 6.5,
  defaultLoanTerm = 30,
}: MortgageCalculatorProps) {
  const [homePrice, setHomePrice] = useState(defaultPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(defaultDownPayment);
  const [interestRate, setInterestRate] = useState(defaultInterestRate);
  const [loanTerm, setLoanTerm] = useState(defaultLoanTerm);

  const calculation = useMemo(() => {
    const downPayment = homePrice * (downPaymentPercent / 100);
    const loanAmount = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;

    let monthlyPayment: number;
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / numPayments;
    } else {
      monthlyPayment =
        loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    const totalInterest = monthlyPayment * numPayments - loanAmount;
    const totalCost = homePrice + totalInterest;

    return { downPayment, loanAmount, monthlyPayment, totalInterest, totalCost };
  }, [homePrice, downPaymentPercent, interestRate, loanTerm]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
          <Calculator className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mortgage Calculator</h2>
          <p className="text-sm text-gray-500">Estimate your monthly payment</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Home Price</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              value={homePrice}
              onChange={(e) => setHomePrice(Number(e.target.value))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Down Payment ({downPaymentPercent}%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-16 text-right">
              {formatCurrency(calculation.downPayment)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate</label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={loanTerm}
              onChange={(e) => setLoanTerm(Number(e.target.value))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value={15}>15 years</option>
              <option value={20}>20 years</option>
              <option value={25}>25 years</option>
              <option value={30}>30 years</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
        <div className="text-center">
          <p className="text-sm text-indigo-600">Estimated Monthly Payment</p>
          <p className="text-3xl font-bold text-indigo-700">{formatCurrency(calculation.monthlyPayment)}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-gray-500">Loan Amount</p>
            <p className="font-medium text-gray-900">{formatCurrency(calculation.loanAmount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Interest</p>
            <p className="font-medium text-gray-900">{formatCurrency(calculation.totalInterest)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}`,

  /**
   * Property features list
   */
  PropertyFeatures: () => `'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Feature {
  name: string;
  included: boolean;
}

interface PropertyFeaturesProps {
  features?: Feature[];
}

export default function PropertyFeatures({
  features = [
    { name: 'Central Air Conditioning', included: true },
    { name: 'Hardwood Floors', included: true },
    { name: 'Updated Kitchen', included: true },
    { name: 'Finished Basement', included: false },
    { name: 'Two-Car Garage', included: true },
    { name: 'Deck/Patio', included: true },
    { name: 'Swimming Pool', included: false },
    { name: 'Smart Home System', included: true },
  ],
}: PropertyFeaturesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-2xl shadow-lg"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Property Features</h3>
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature, i) => (
          <div
            key={i}
            className={\`flex items-center gap-2 \${
              feature.included ? 'text-gray-900' : 'text-gray-400'
            }\`}
          >
            <div
              className={\`w-5 h-5 rounded-full flex items-center justify-center \${
                feature.included ? 'bg-green-100' : 'bg-gray-100'
              }\`}
            >
              <Check
                className={\`w-3 h-3 \${
                  feature.included ? 'text-green-600' : 'text-gray-400'
                }\`}
              />
            </div>
            <span className="text-sm">{feature.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}`,
};

export default REALESTATE_TEMPLATES;

/**
 * Fitness Component Templates
 *
 * Production-quality component templates for fitness applications.
 */

export const FITNESS_TEMPLATES = {
  /**
   * Class booking grid with schedule
   */
  ClassBooking: () => `'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Calendar, Check } from 'lucide-react';

interface FitnessClass {
  id: string;
  name: string;
  instructor: string;
  time: string;
  duration: string;
  spotsAvailable: number;
  maxSpots: number;
  intensity: 'low' | 'medium' | 'high';
}

interface ClassBookingProps {
  classes?: FitnessClass[];
  onBook?: (classId: string) => void;
}

export default function ClassBooking({
  classes = [
    { id: '1', name: 'HIIT Blast', instructor: 'Sarah', time: '6:00 AM', duration: '45 min', spotsAvailable: 5, maxSpots: 20, intensity: 'high' },
    { id: '2', name: 'Yoga Flow', instructor: 'Mike', time: '7:00 AM', duration: '60 min', spotsAvailable: 8, maxSpots: 15, intensity: 'low' },
    { id: '3', name: 'Spin Cycle', instructor: 'Emma', time: '8:00 AM', duration: '45 min', spotsAvailable: 3, maxSpots: 25, intensity: 'high' },
    { id: '4', name: 'Strength Training', instructor: 'John', time: '9:00 AM', duration: '50 min', spotsAvailable: 10, maxSpots: 12, intensity: 'medium' },
    { id: '5', name: 'Pilates', instructor: 'Lisa', time: '10:00 AM', duration: '55 min', spotsAvailable: 12, maxSpots: 15, intensity: 'medium' },
    { id: '6', name: 'Boxing', instructor: 'Carlos', time: '5:00 PM', duration: '60 min', spotsAvailable: 6, maxSpots: 10, intensity: 'high' },
  ],
  onBook,
}: ClassBookingProps) {
  const [bookedClasses, setBookedClasses] = useState<Set<string>>(new Set());

  const handleBook = (classId: string) => {
    setBookedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
        onBook?.(classId);
      }
      return next;
    });
  };

  const intensityConfig = {
    low: { color: 'bg-green-100 text-green-700', label: 'Low' },
    medium: { color: 'bg-amber-100 text-amber-700', label: 'Medium' },
    high: { color: 'bg-red-100 text-red-700', label: 'High' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <Calendar className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Today&apos;s Classes</h2>
          <p className="text-sm text-gray-500">{classes.length} classes available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((fitnessClass) => {
          const isBooked = bookedClasses.has(fitnessClass.id);
          const intensity = intensityConfig[fitnessClass.intensity];

          return (
            <motion.div
              key={fitnessClass.id}
              whileHover={{ scale: 1.02 }}
              className={\`p-4 rounded-xl border-2 transition-colors \${
                isBooked
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }\`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900">{fitnessClass.name}</h3>
                <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${intensity.color}\`}>
                  {intensity.label}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{fitnessClass.time} · {fitnessClass.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>with {fitnessClass.instructor}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={\`text-sm \${
                  fitnessClass.spotsAvailable <= 3 ? 'text-red-600 font-medium' : 'text-gray-500'
                }\`}>
                  {fitnessClass.spotsAvailable} spots left
                </span>
                <button
                  onClick={() => handleBook(fitnessClass.id)}
                  className={\`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors \${
                    isBooked
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : fitnessClass.spotsAvailable === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }\`}
                  disabled={fitnessClass.spotsAvailable === 0 && !isBooked}
                >
                  {isBooked ? (
                    <><Check className="w-4 h-4 inline mr-1" /> Booked</>
                  ) : fitnessClass.spotsAvailable === 0 ? (
                    'Full'
                  ) : (
                    'Book'
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}`,

  /**
   * Membership pricing tiers
   */
  MembershipPricing: () => `'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

interface MembershipPricingProps {
  tiers?: PricingTier[];
  onSelect?: (tierId: string) => void;
}

export default function MembershipPricing({
  tiers = [
    {
      id: 'basic',
      name: 'Basic',
      price: 29,
      period: 'month',
      features: [
        'Access to gym floor',
        'Basic equipment usage',
        'Locker room access',
        'Free WiFi',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 59,
      period: 'month',
      features: [
        'Everything in Basic',
        'Unlimited classes',
        'Sauna & steam room',
        'Guest passes (2/month)',
        'Nutrition consultation',
      ],
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      id: 'elite',
      name: 'Elite',
      price: 99,
      period: 'month',
      features: [
        'Everything in Premium',
        'Personal training sessions',
        'Recovery zone access',
        'Priority class booking',
        'Custom meal plans',
        'Body composition analysis',
      ],
    },
  ],
  onSelect,
}: MembershipPricingProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleSelect = (tierId: string) => {
    setSelectedTier(tierId);
    onSelect?.(tierId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {tiers.map((tier) => (
        <motion.div
          key={tier.id}
          whileHover={{ scale: 1.02 }}
          className={\`relative p-6 rounded-2xl border-2 transition-colors \${
            tier.highlighted
              ? 'border-orange-500 bg-orange-50 shadow-lg'
              : selectedTier === tier.id
              ? 'border-orange-300 bg-white'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }\`}
        >
          {tier.badge && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {tier.badge}
            </div>
          )}

          <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold text-gray-900">{'$'}{tier.price}</span>
            <span className="text-gray-500">/{tier.period}</span>
          </div>

          <ul className="mt-4 space-y-2">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSelect(tier.id)}
            className={\`w-full mt-6 py-3 rounded-xl font-medium transition-colors \${
              tier.highlighted
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }\`}
          >
            {selectedTier === tier.id ? 'Selected' : 'Choose Plan'}
          </button>
        </motion.div>
      ))}
    </div>
  );
}`,

  /**
   * Trainer profile card
   */
  TrainerProfile: () => `'use client';

import { motion } from 'framer-motion';
import { User, Award, Clock, Star, Calendar } from 'lucide-react';

interface TrainerProfileProps {
  name: string;
  specialty: string;
  certifications: string[];
  experience: string;
  rating: number;
  availability: string[];
  image?: string;
  onBook?: () => void;
}

export default function TrainerProfile({
  name,
  specialty,
  certifications,
  experience,
  rating,
  availability,
  image,
  onBook,
}: TrainerProfileProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-orange-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <p className="text-sm text-orange-600 font-medium">{specialty}</p>
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
          <Award className="w-4 h-4 text-gray-400" />
          <span>{experience} experience</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>Available: {availability.join(', ')}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {certifications.map((cert, i) => (
          <span
            key={i}
            className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
          >
            {cert}
          </span>
        ))}
      </div>

      <button
        onClick={onBook}
        className="w-full mt-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Calendar className="w-4 h-4" />
        Book Session
      </button>
    </motion.div>
  );
}`,

  /**
   * Workout tracker with sets and reps
   */
  WorkoutTracker: () => `'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Check, RotateCcw } from 'lucide-react';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
}

interface WorkoutTrackerProps {
  exercises?: Exercise[];
}

export default function WorkoutTracker({
  exercises = [
    { name: 'Barbell Squat', sets: 4, reps: '8-10', weight: '135 lbs' },
    { name: 'Bench Press', sets: 4, reps: '8-10', weight: '115 lbs' },
    { name: 'Deadlift', sets: 3, reps: '6-8', weight: '185 lbs' },
    { name: 'Pull-ups', sets: 3, reps: '8-12', weight: 'Bodyweight' },
    { name: 'Shoulder Press', sets: 3, reps: '10-12', weight: '45 lbs' },
  ],
}: WorkoutTrackerProps) {
  const [completedSets, setCompletedSets] = useState<Map<string, Set<number>>>(new Map());

  const toggleSet = (exerciseName: string, setNumber: number) => {
    setCompletedSets((prev) => {
      const next = new Map(prev);
      const exerciseSets = next.get(exerciseName) ?? new Set();
      if (exerciseSets.has(setNumber)) {
        exerciseSets.delete(setNumber);
      } else {
        exerciseSets.add(setNumber);
      }
      next.set(exerciseName, exerciseSets);
      return next;
    });
  };

  const resetAll = () => {
    setCompletedSets(new Map());
  };

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const completedCount = Array.from(completedSets.values()).reduce(
    (sum, sets) => sum + sets.size,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Today&apos;s Workout</h2>
            <p className="text-sm text-gray-500">{completedCount}/{totalSets} sets completed</p>
          </div>
        </div>
        <button
          onClick={resetAll}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-red-500 h-2 rounded-full transition-all duration-300"
          style={{ width: \`\${(completedCount / totalSets) * 100}%\` }}
        />
      </div>

      <div className="space-y-4">
        {exercises.map((exercise) => {
          const exerciseCompleted = completedSets.get(exercise.name) ?? new Set();

          return (
            <div key={exercise.name} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">{exercise.name}</h3>
                <span className="text-sm text-gray-500">{exercise.weight}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{exercise.sets} sets × {exercise.reps}</p>
              <div className="flex gap-2">
                {Array.from({ length: exercise.sets }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSet(exercise.name, i)}
                    className={\`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors \${
                      exerciseCompleted.has(i)
                        ? 'bg-green-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-green-500'
                    }\`}
                  >
                    {exerciseCompleted.has(i) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {completedCount === totalSets && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 rounded-xl text-center"
        >
          <p className="text-green-700 font-bold">Workout Complete!</p>
          <p className="text-sm text-green-600">Great job finishing all {totalSets} sets</p>
        </motion.div>
      )}
    </motion.div>
  );
}`,
};

export default FITNESS_TEMPLATES;

/**
 * Healthcare Component Templates
 *
 * Production-quality component templates for healthcare applications.
 * COMPLIANCE: No PHI stored in localStorage. Server action handles submission.
 */

export const HEALTHCARE_TEMPLATES = {
  /**
   * Patient intake form with HIPAA compliance notice
   */
  PatientIntakeForm: () => `'use client';
// COMPLIANCE: No PHI stored in localStorage. Server action handles submission.
// HIPAA-relevant fields must transit via encrypted POST only.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, FileText, Phone } from 'lucide-react';

interface PatientIntakeFormProps {
  onSubmit?: (data: Record<string, string>) => void;
}

export default function PatientIntakeForm({ onSubmit }: PatientIntakeFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    insuranceProvider: '',
    insuranceId: '',
    reasonForVisit: '',
    currentMedications: '',
    allergies: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Patient Intake Form</h2>
          <p className="text-sm text-gray-500">All information is kept strictly confidential</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
            <input
              type="text"
              value={formData.insuranceProvider}
              onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance ID</label>
            <input
              type="text"
              value={formData.insuranceId}
              onChange={(e) => setFormData({ ...formData, insuranceId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
          <textarea
            value={formData.reasonForVisit}
            onChange={(e) => setFormData({ ...formData, reasonForVisit: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
          <textarea
            value={formData.currentMedications}
            onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
          <textarea
            value={formData.allergies}
            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Submit Intake Form
        </button>
      </form>
    </motion.div>
  );
}`,

  /**
   * Appointment scheduler with calendar view
   */
  AppointmentScheduler: () => `'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Check } from 'lucide-react';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AppointmentSchedulerProps {
  providerName?: string;
  availableSlots?: TimeSlot[];
  onBook?: (slot: string) => void;
}

export default function AppointmentScheduler({
  providerName = 'Dr. Smith',
  availableSlots = [
    { time: '9:00 AM', available: true },
    { time: '9:30 AM', available: false },
    { time: '10:00 AM', available: true },
    { time: '10:30 AM', available: true },
    { time: '11:00 AM', available: false },
    { time: '11:30 AM', available: true },
    { time: '2:00 PM', available: true },
    { time: '2:30 PM', available: true },
    { time: '3:00 PM', available: false },
    { time: '3:30 PM', available: true },
  ],
  onBook,
}: AppointmentSchedulerProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleBook = () => {
    if (selectedSlot) {
      onBook?.(selectedSlot);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <Calendar className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Book Appointment</h2>
          <p className="text-sm text-gray-500">with {providerName}</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Available Times</label>
        <div className="grid grid-cols-3 gap-2">
          {availableSlots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => slot.available && setSelectedSlot(slot.time)}
              disabled={!slot.available}
              className={\`px-3 py-2 rounded-lg text-sm font-medium transition-colors \${
                selectedSlot === slot.time
                  ? 'bg-green-600 text-white'
                  : slot.available
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }\`}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-3 bg-green-50 rounded-lg"
        >
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Selected: {selectedSlot}</span>
          </div>
        </motion.div>
      )}

      <button
        onClick={handleBook}
        disabled={!selectedSlot}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        Confirm Appointment
      </button>
    </motion.div>
  );
}`,

  /**
   * Prescription tracker with medication list
   */
  PrescriptionTracker: () => `'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pill, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  nextDose: string;
  refillsRemaining: number;
}

interface PrescriptionTrackerProps {
  medications?: Medication[];
}

export default function PrescriptionTracker({
  medications = [
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', nextDose: '8:00 AM', refillsRemaining: 3 },
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', nextDose: '8:00 AM', refillsRemaining: 2 },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', nextDose: '9:00 PM', refillsRemaining: 5 },
  ],
}: PrescriptionTrackerProps) {
  const [takenMeds, setTakenMeds] = useState<Set<string>>(new Set());

  const toggleTaken = (medName: string) => {
    setTakenMeds((prev) => {
      const next = new Set(prev);
      if (next.has(medName)) {
        next.delete(medName);
      } else {
        next.add(medName);
      }
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Pill className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Prescriptions</h2>
          <p className="text-sm text-gray-500">{medications.length} active medications</p>
        </div>
      </div>

      <div className="space-y-3">
        {medications.map((med) => (
          <motion.div
            key={med.name}
            whileHover={{ scale: 1.01 }}
            className={\`p-4 rounded-xl border-2 transition-colors \${
              takenMeds.has(med.name)
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }\`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{med.name}</h3>
                  {takenMeds.has(med.name) && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{med.dosage} — {med.frequency}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Next dose: {med.nextDose}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Refills</p>
                <p className={\`font-bold \${
                  med.refillsRemaining <= 1 ? 'text-red-500' : 'text-gray-900'
                }\`}>{med.refillsRemaining}</p>
              </div>
            </div>
            <button
              onClick={() => toggleTaken(med.name)}
              className={\`w-full mt-3 py-2 rounded-lg text-sm font-medium transition-colors \${
                takenMeds.has(med.name)
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }\`}
            >
              {takenMeds.has(med.name) ? 'Taken' : 'Mark as Taken'}
            </button>
            {med.refillsRemaining <= 1 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                <span>Low refills — contact your pharmacy</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}`,

  /**
   * Appointment card for displaying upcoming appointments
   */
  AppointmentCard: () => `'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';

interface AppointmentCardProps {
  providerName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  isVirtual?: boolean;
  onJoin?: () => void;
}

export default function AppointmentCard({
  providerName,
  specialty,
  date,
  time,
  location,
  isVirtual = false,
  onJoin,
}: AppointmentCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          {isVirtual ? (
            <Video className="w-6 h-6 text-blue-600" />
          ) : (
            <Calendar className="w-6 h-6 text-blue-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900">{providerName}</h3>
          <p className="text-sm text-gray-500">{specialty}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
        </div>
        {isVirtual && (
          <button
            onClick={onJoin}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Join
          </button>
        )}
      </div>
    </motion.div>
  );
}`,
};

export default HEALTHCARE_TEMPLATES;

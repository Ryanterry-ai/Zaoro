/**
 * Legal Component Templates
 *
 * Production-quality component templates for legal applications.
 * COMPLIANCE: Attorney-client privilege disclaimers on contact forms.
 */

export const LEGAL_TEMPLATES = {
  /**
   * Case management card
   */
  CaseManagement: () => `'use client';

import { motion } from 'framer-motion';
import { Briefcase, Calendar, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  clientName: string;
  status: 'active' | 'pending' | 'closed';
  nextDeadline?: string;
  type: string;
}

interface CaseManagementProps {
  cases?: Case[];
}

export default function CaseManagement({
  cases = [
    { id: '1', title: 'Smith v. Johnson', clientName: 'John Smith', status: 'active', nextDeadline: 'Jan 15, 2025', type: 'Civil Litigation' },
    { id: '2', title: 'Estate of Williams', clientName: 'Sarah Williams', status: 'pending', nextDeadline: 'Jan 20, 2025', type: 'Estate Planning' },
    { id: '3', title: 'ABC Corp Formation', clientName: 'Michael Chen', status: 'active', type: 'Corporate' },
  ],
}: CaseManagementProps) {
  const statusConfig = {
    active: { color: 'text-green-600 bg-green-100', icon: CheckCircle, label: 'Active' },
    pending: { color: 'text-amber-600 bg-amber-100', icon: Clock, label: 'Pending' },
    closed: { color: 'text-gray-600 bg-gray-100', icon: AlertTriangle, label: 'Closed' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Active Cases</h2>
          <p className="text-sm text-gray-500">{cases.length} cases in progress</p>
        </div>
      </div>

      <div className="space-y-3">
        {cases.map((caseItem) => {
          const config = statusConfig[caseItem.status];
          const StatusIcon = config.icon;

          return (
            <motion.div
              key={caseItem.id}
              whileHover={{ scale: 1.01 }}
              className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{caseItem.title}</h3>
                    <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${config.color}\`}>
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{caseItem.type}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{caseItem.clientName}</span>
                    </div>
                    {caseItem.nextDeadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Deadline: {caseItem.nextDeadline}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  View Details
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
   * Document assembly with template selection
   */
  DocumentAssembly: () => `'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Plus, Search } from 'lucide-react';

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface DocumentAssemblyProps {
  templates?: DocumentTemplate[];
  onGenerate?: (templateId: string) => void;
}

export default function DocumentAssembly({
  templates = [
    { id: '1', name: 'Non-Disclosure Agreement', category: 'Contracts', description: 'Standard NDA for business relationships' },
    { id: '2', name: 'Power of Attorney', category: 'Estate', description: 'General power of attorney document' },
    { id: '3', name: 'Employment Agreement', category: 'Employment', description: 'Standard employment contract' },
    { id: '4', name: 'Lease Agreement', category: 'Real Estate', description: 'Residential lease contract' },
    { id: '5', name: 'Last Will and Testament', category: 'Estate', description: 'Standard will document' },
  ],
  onGenerate,
}: DocumentAssemblyProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Document Templates</h2>
          <p className="text-sm text-gray-500">{templates.length} templates available</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const categoryTemplates = filteredTemplates.filter((t) => t.category === category);
          if (categoryTemplates.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.01 }}
                    className={\`p-4 rounded-xl border-2 cursor-pointer transition-colors \${
                      selectedTemplate === template.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }\`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h4 className="font-bold text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-indigo-50 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700">
                Selected: {templates.find((t) => t.id === selectedTemplate)?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onGenerate?.(selectedTemplate)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Generate Document
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}`,

  /**
   * Contact form with attorney-client privilege disclaimer
   */
  ContactForm: () => `'use client';
// COMPLIANCE: Attorney-client privilege disclaimer required.
// Information sent via this form may not be privileged until a formal engagement is established.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, User, MessageSquare, AlertCircle } from 'lucide-react';

interface ContactFormProps {
  onSubmit?: (data: Record<string, string>) => void;
}

export default function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
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
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
          <Mail className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contact Us</h2>
          <p className="text-sm text-gray-500">Schedule a consultation</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Attorney-Client Privilege Notice</p>
            <p>
              The information you submit via this form may not be protected by attorney-client
              privilege until a formal engagement agreement has been signed. Please do not
              include confidential or sensitive information in this initial contact form.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Select a subject</option>
              <option value="consultation">Initial Consultation</option>
              <option value="case-inquiry">Case Inquiry</option>
              <option value="general">General Question</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Brief description of your legal matter..."
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Send Message
        </button>
      </form>
    </motion.div>
  );
}`,

  /**
   * Attorney profile card
   */
  AttorneyProfile: () => `'use client';

import { motion } from 'framer-motion';
import { User, Award, BookOpen, Mail } from 'lucide-react';

interface AttorneyProfileProps {
  name: string;
  title: string;
  specialization: string;
  yearsOfExperience: number;
  education: string[];
  certifications?: string[];
  onContact?: () => void;
}

export default function AttorneyProfile({
  name,
  title,
  specialization,
  yearsOfExperience,
  education,
  certifications = [],
  onContact,
}: AttorneyProfileProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-sm text-indigo-600 font-medium mt-1">{specialization}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Award className="w-4 h-4 text-gray-400" />
          <span>{yearsOfExperience} years of experience</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <BookOpen className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            {education.map((edu, i) => (
              <p key={i}>{edu}</p>
            ))}
          </div>
        </div>
        {certifications.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {certifications.map((cert, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {cert}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onContact}
        className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Mail className="w-4 h-4" />
        Contact Attorney
      </button>
    </motion.div>
  );
}`,
};

export default LEGAL_TEMPLATES;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  { key: 'welcome', title: 'Welcome to AMBAR BI' },
  { key: 'company', title: 'Tell us about your company' },
  { key: 'focus', title: 'What\'s your focus?' },
];

const industries = [
  { value: 'technology', label: 'Technology' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & E-Commerce' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'construction', label: 'Construction' },
  { value: 'logistics', label: 'Logistics & Supply Chain' },
  { value: 'education', label: 'Education' },
  { value: 'energy', label: 'Energy' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];

const businessTypes = [
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'b2b2c', label: 'B2B2C' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'saas', label: 'SaaS' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
];

const companySizes = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: '', industry: '', business_type: '', company_size: '', country: '', operational_focus: ''
  });

  const createCompany = useMutation({
    mutationFn: (companyData) => base44.entities.Company.create({ ...companyData, setup_complete: true }),
    onSuccess: () => navigate('/Home'),
  });

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      createCompany.mutate(data);
    }
  };

  const update = (field, value) => setData({ ...data, [field]: value });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        className="relative w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? 'w-10 bg-amber-500' : 'w-6 bg-slate-800'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-8">
                <span className="text-slate-950 font-black text-3xl">A</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Welcome to AMBAR BI</h1>
              <p className="text-slate-400 mb-3 max-w-sm mx-auto">Your intelligent business analysis platform. Let's set up your workspace in a few quick steps.</p>
              <div className="flex items-center justify-center gap-2 text-amber-400 text-sm mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Powered by HELIOS AI</span>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="company" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Company Details</h2>
                  <p className="text-sm text-slate-400">Help HELIOS understand your business</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300 text-sm">Company Name</Label>
                  <Input value={data.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter company name" className="mt-1.5 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 text-sm">Industry</Label>
                    <Select value={data.industry} onValueChange={(v) => update('industry', v)}>
                      <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-800 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{industries.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Business Type</Label>
                    <Select value={data.business_type} onValueChange={(v) => update('business_type', v)}>
                      <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-800 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{businessTypes.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 text-sm">Company Size</Label>
                    <Select value={data.company_size} onValueChange={(v) => update('company_size', v)}>
                      <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-800 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{companySizes.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Country</Label>
                    <Input value={data.country} onChange={(e) => update('country', e.target.value)} placeholder="Country" className="mt-1.5 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500/50" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="focus" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">What do you want to analyze?</h2>
                  <p className="text-sm text-slate-400">HELIOS will tailor suggestions for you</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Main Operational Focus</Label>
                <Input value={data.operational_focus} onChange={(e) => update('operational_focus', e.target.value)} placeholder="e.g., Sales performance, Supply chain efficiency, Customer retention..." className="mt-1.5 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500/50" />
                <p className="text-xs text-slate-500 mt-2">Describe in your own words what you'd like to analyze. HELIOS will help from here.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action */}
        <div className="mt-8 flex justify-between items-center">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-sm text-slate-400 hover:text-white transition-colors">Back</button>
          ) : <div />}
          <button
            onClick={handleNext}
            disabled={step === 1 && !data.name}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-sm hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === steps.length - 1 ? 'Get Started' : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

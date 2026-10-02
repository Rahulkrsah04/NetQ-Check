import { Link } from 'react-router-dom';
import {
  Camera, Upload, ShieldCheck, FileText, CheckCircle,
  Package, ArrowRight, ChevronRight, BadgeCheck, History,
  BarChart3, Search, AlertTriangle, Star
} from 'lucide-react';

const FEATURES = [
  {
    icon: Camera,
    title: 'Scan Product Labels',
    desc: 'Upload or capture product label images directly from your device. Supports front, back, and side labels.',
    color: 'bg-teal-100 text-primary',
  },
  {
    icon: ShieldCheck,
    title: 'Rule-Based Verification',
    desc: 'Declarations are checked against configurable rules derived from Legal Metrology (PC) Rules, 2011.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: FileText,
    title: 'Instant Compliance Report',
    desc: 'Get a detailed compliance assessment report with field-by-field results, downloadable as PDF.',
    color: 'bg-green-100 text-success',
  },
  {
    icon: History,
    title: 'Scan History & Analytics',
    desc: 'All scans are saved with full history. Filter by status, search by product, and revisit past reports.',
    color: 'bg-gray-100 text-navy',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Upload Label Image', desc: 'Take a photo or upload an image of the packaged commodity label.' },
  { step: '02', title: 'Automatic Extraction', desc: 'Our OCR engine extracts text from the image and identifies mandatory declarations.' },
  { step: '03', title: 'Compliance Check', desc: 'Extracted data is checked against Legal Metrology (PC) Rules, 2011 requirements.' },
  { step: '04', title: 'Review & Download', desc: 'View the detailed compliance assessment and download a printable PDF report.' },
];

const MANDATORY_CHECKS = [
  'Name / Generic Name of the Commodity',
  'Net Quantity in Standard Units',
  'MRP inclusive of all taxes',
  'Manufacturer / Packer Name & Address',
  'Month & Year of Manufacture',
  'Consumer Care Contact Information',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-navy text-white py-20 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute top-32 right-32 w-40 h-40 rounded-full border border-white" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full border border-white" />
        </div>

        <div className="page-container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/80 mb-6 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Legal Metrology Compliance System
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                Scan.{' '}
                <span className="text-primary">Verify.</span>{' '}
                Comply.
              </h1>

              <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-lg">
                Automatically inspect packaged commodity labels and identify missing or non-compliant declarations under the Legal Metrology (Packaged Commodities) Rules, 2011.
              </p>

              {/* Feature indicators */}
              <div className="grid grid-cols-2 gap-2 mb-8">
                {['OCR Powered', 'Rule-Based Verification', 'Instant PDF Report', 'Scan History'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/login"
                  id="hero-scan-cta"
                  className="btn btn-primary btn-lg shadow-sm"
                >
                  <Camera className="w-5 h-5" />
                  Scan Product
                </Link>
                <Link
                  to="/compliance-rules"
                  id="hero-explore-cta"
                  className="btn btn-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
                >
                  Explore Compliance
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="flex justify-center lg:justify-end">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-border py-6">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: '8+', label: 'Mandatory Checks' },
              { val: '2011', label: 'Rules Reference Year' },
              { val: '100%', label: 'Rules Configurable' },
              { val: 'Free', label: 'Demo Available' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-extrabold text-primary">{stat.val}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-background">
        <div className="page-container">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Capabilities</div>
            <h2 className="text-3xl font-bold text-navy">Everything You Need for Label Verification</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              NetQ Check automates the preliminary inspection of packaged commodity labels — saving time for compliance officers, inspectors, and businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="card card-hover">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-navy text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white" id="how-it-works">
        <div className="page-container">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Process</div>
            <h2 className="text-3xl font-bold text-navy">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%-0px)] w-full h-0.5 bg-border z-0" style={{ left: '60px', width: 'calc(100% - 60px)' }} />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center text-sm font-bold mb-4">
                    {step.step}
                  </div>
                  <h3 className="font-semibold text-navy text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mandatory Declarations */}
      <section className="py-16 bg-navy text-white">
        <div className="page-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Legal Framework</div>
              <h2 className="text-3xl font-bold mb-4">Mandatory Declarations Checked</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Under the Legal Metrology (Packaged Commodities) Rules, 2011, every pre-packaged commodity must carry specific mandatory declarations. NetQ Check automatically screens for all of them.
              </p>
              <Link to="/compliance-rules" className="btn btn-primary shadow-sm">
                View All Compliance Rules
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {MANDATORY_CHECKS.map((check, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                  <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-white/80">{check}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 bg-amber-50 border-y border-amber-100">
        <div className="page-container">
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Disclaimer:</strong> This system provides automated preliminary compliance screening based on available image/text information. Final legal determination requires verification against the applicable Legal Metrology (Packaged Commodities) Rules, 2011, and where necessary, manual inspection by a qualified officer. NetQ Check is not a legal authority.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-background">
        <div className="page-container text-center">
          <h2 className="text-3xl font-bold text-navy mb-3">Start Checking Compliance Now</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
            Create a free account to scan products, view compliance results, and download verification reports.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login" id="cta-get-started" className="btn btn-primary btn-lg shadow-sm">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/how-it-works" className="btn btn-secondary btn-lg shadow-sm">
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Professional product label visual for hero
function HeroVisual() {
  return (
    <div className="relative w-72 h-80">
      {/* Background card */}
      <div className="absolute inset-0 bg-white/5 border border-white/20 rounded-2xl" />

      {/* Product label mockup */}
      <div className="absolute inset-4 bg-white rounded-xl p-5 shadow-2xl">
        {/* Label header */}
        <div className="bg-navy rounded-lg px-3 py-2 mb-4 text-center">
          <div className="text-white text-xs font-bold">ABC PREMIUM RICE</div>
          <div className="text-white/50 text-[10px]">Product Label Preview</div>
        </div>

        {/* Label fields */}
        <div className="space-y-2.5 text-[11px]">
          {[
            { label: 'Net Wt', value: '1 Kg', ok: true },
            { label: 'MRP', value: '₹120 (Incl. taxes)', ok: true },
            { label: 'Mfg by', value: 'ABC Foods Pvt. Ltd.', ok: true },
            { label: 'Mfg Date', value: '06/2026', ok: true },
            { label: 'Best Before', value: '05/2028', ok: true },
            { label: 'Consumer Care', value: '1800-XXX-1234', ok: true },
          ].map((f, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <span className="text-gray-400">{f.label}: </span>
                <span className="text-navy font-medium">{f.value}</span>
              </div>
              {f.ok && <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Status footer */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-success flex-shrink-0" />
          <span className="text-success text-xs font-semibold">All declarations found</span>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute -top-3 -right-3 bg-success text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
        COMPLIANT
      </div>
      <div className="absolute -bottom-3 -left-3 bg-white border border-border rounded-lg px-3 py-2 shadow-card text-[10px]">
        <div className="text-gray-400">OCR Confidence</div>
        <div className="text-navy font-bold">96%</div>
      </div>
    </div>
  );
}

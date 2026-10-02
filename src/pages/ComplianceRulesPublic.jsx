import { Link } from 'react-router-dom';
import { ShieldCheck, Info, ArrowRight, BookOpen, SearchCheck } from 'lucide-react';
import { COMPLIANCE_RULES, RULE_CATEGORIES } from '../data/complianceRules';

export default function ComplianceRulesPublic() {
  return (
    <div className="py-12">
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4" />
            Legal Metrology Framework
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-3">Compliance Rules Checklist</h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Mandatory and advisory declaration requirements under the Legal Metrology (Packaged Commodities) Rules, 2011 for pre-packaged commodities sold in India.
          </p>
        </div>

        {/* Alert */}
        <div className="alert alert-info mb-8 max-w-3xl mx-auto">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
          <span>Rules listed here are a reference summary based on statutory provisions. Always refer to official gazette notifications for authoritative text.</span>
        </div>

        {/* Rules by category */}
        {RULE_CATEGORIES.map(cat => {
          const catRules = COMPLIANCE_RULES.filter(r => r.category === cat);
          if (!catRules.length) return null;
          return (
            <div key={cat} className="mb-10">
              <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2 pb-2 border-b border-border">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catRules.map(rule => (
                  <div key={rule.id} className="card flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-navy text-sm">{rule.name || rule.requirement}</h3>
                        <span className={`badge flex-shrink-0 ${rule.mandatory ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                          {rule.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-4">{rule.description}</p>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100 space-y-1.5 text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="truncate"><strong>Source:</strong> {rule.source || rule.legalRef}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <SearchCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="truncate"><strong>Verification:</strong> {rule.verificationMethod}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <div className="mt-10 text-center bg-navy rounded-2xl p-8 sm:p-10 text-white shadow-md">
          <h2 className="text-2xl font-bold mb-2">Ready to Assess Compliance?</h2>
          <p className="text-white/60 text-sm mb-6 max-w-xl mx-auto">Scan product labels against Legal Metrology Rules and obtain instant compliance verification reports.</p>
          <Link to="/login" className="btn btn-primary btn-lg shadow-sm">
            Start Scanning
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}


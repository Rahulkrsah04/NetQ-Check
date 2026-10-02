import { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Info, BookOpen, SearchCheck, CheckCircle2, Filter, AlertTriangle } from 'lucide-react';
import { RULES_REPOSITORY, REQUIREMENT_TYPES, APPLICABILITY_TYPES, VALIDATION_TYPES, SEVERITY_LEVELS, RULE_SET_VERSION } from '../services/ruleRepository/ruleRepository';
import { PRODUCT_CATEGORIES } from '../services/ruleEngine/productCategories';

export default function ComplianceRulesPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeType, setActiveType] = useState('All');
  const [activeSeverity, setActiveSeverity] = useState('All');
  const [expandedRule, setExpandedRule] = useState(null);

  const categories = ['All', ...new Set(RULES_REPOSITORY.map(r => r.category))];

  const filteredRules = RULES_REPOSITORY.filter(rule => {
    const matchCat = activeCategory === 'All' || rule.category === activeCategory;
    const matchType = activeType === 'All' || rule.requirementType === activeType;
    const matchSeverity = activeSeverity === 'All' || rule.severity === activeSeverity;
    return matchCat && matchType && matchSeverity;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Rule Library & Repository</h1>
          <p className="page-desc">Configurable Legal Metrology (PC) Rules, 2011 · Rule Set Version: <strong className="text-primary font-mono">{RULE_SET_VERSION}</strong></p>
        </div>
      </div>

      {/* Legal reference banner */}
      <div className="alert alert-info mb-6">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <strong>Legal Reference:</strong> Rules defined in accordance with the Legal Metrology (Packaged Commodities) Rules, 2011 promulgated under the Legal Metrology Act, 2009 (India). Requirements adapt dynamically by commodity category, origin, and quantity.
        </div>
      </div>

      {/* Requirement Types Legend */}
      <div className="card mb-5 bg-gray-50/50">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2.5">Rule Requirement Classifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {Object.values(REQUIREMENT_TYPES).map(type => (
            <div key={type.id} className="p-2.5 rounded-lg border bg-white border-border">
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border mb-1 ${type.badgeClass}`}>
                {type.label}
              </span>
              <p className="text-gray-500 text-[11px] leading-snug">
                {type.id === 'MANDATORY' ? 'Statutory declaration required on all retail packages under Rule 6(1)' :
                 type.id === 'CONDITIONAL' ? 'Declaration required based on category, origin, or net quantity' :
                 'Voluntary or advisory declaration (does not cause failure if absent)'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-navy">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Filter Rule Repository</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Category Filter */}
          <div>
            <label htmlFor="filter-rule-cat" className="block font-semibold text-gray-600 mb-1">Declaration Group</label>
            <select
              id="filter-rule-cat"
              value={activeCategory}
              onChange={e => setActiveCategory(e.target.value)}
              className="form-input text-xs"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Requirement Type Filter */}
          <div>
            <label htmlFor="filter-rule-type" className="block font-semibold text-gray-600 mb-1">Requirement Type</label>
            <select
              id="filter-rule-type"
              value={activeType}
              onChange={e => setActiveType(e.target.value)}
              className="form-input text-xs"
            >
              <option value="All">All Types</option>
              <option value="MANDATORY">Mandatory</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="INFORMATIONAL">Informational</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label htmlFor="filter-rule-severity" className="block font-semibold text-gray-600 mb-1">Severity Level</label>
            <select
              id="filter-rule-severity"
              value={activeSeverity}
              onChange={e => setActiveSeverity(e.target.value)}
              className="form-input text-xs"
            >
              <option value="All">All Severities</option>
              <option value="HIGH">High (Critical)</option>
              <option value="MEDIUM">Medium (Warning)</option>
              <option value="LOW">Low (Advisory)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-4">
        {filteredRules.map(rule => {
          const typeObj = REQUIREMENT_TYPES[rule.requirementType] || REQUIREMENT_TYPES.MANDATORY;
          const severityObj = SEVERITY_LEVELS[rule.severity] || SEVERITY_LEVELS.HIGH;
          const applicabilityObj = APPLICABILITY_TYPES[rule.applicability] || APPLICABILITY_TYPES.UNIVERSAL;
          const validationObj = VALIDATION_TYPES[rule.validationType] || VALIDATION_TYPES.PRESENCE;

          return (
            <div
              key={rule.id}
              className={`card transition-all ${expandedRule === rule.id ? 'border-primary/40 shadow-sm' : ''}`}
            >
              <div
                className="flex items-start gap-4 cursor-pointer"
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  rule.severity === 'HIGH' ? 'bg-red-50 text-red-700' :
                  rule.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-navy text-sm">{rule.name}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${typeObj.badgeClass}`}>
                      {typeObj.label}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${severityObj.badgeClass}`}>
                      {severityObj.label}
                    </span>
                    <span className="badge bg-gray-100 text-gray-600">{rule.category}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{rule.description}</p>
                </div>

                <div className="flex-shrink-0 mt-1">
                  {expandedRule === rule.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Rule Detail Grid */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Source / Legal Reference
                  </div>
                  <p className="text-navy font-medium leading-snug">{rule.ruleReference}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] mb-1">
                    <SearchCheck className="w-3.5 h-3.5 text-primary" />
                    Validation Type
                  </div>
                  <p className="text-navy font-medium leading-snug">{validationObj.label}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    Applicability Rule
                  </div>
                  <span className="inline-block mt-0.5 font-semibold text-primary">{applicabilityObj.label}</span>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] mb-1">
                    Data Mapping Field
                  </div>
                  <p className="text-navy font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200 inline-block mt-0.5">
                    {rule.dataKey}
                  </p>
                </div>
              </div>

              {expandedRule === rule.id && (
                <div className="mt-3 p-3 bg-teal-50/50 rounded-lg border border-teal-100 text-xs">
                  <h4 className="font-bold text-teal-900 mb-1">Required Evidence Attributes:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.requiredEvidence.map((ev, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-teal-200 text-teal-800 rounded font-mono text-[11px]">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            The compliance rules above represent standard statutory requirements under the Legal Metrology (Packaged Commodities) Rules, 2011. Official gazette notifications govern final authority.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NetQ Check — Evidence Mapping & Confidence Assessment
// Unified re-export from central evidenceMapperService
// Maintains 100% backward compatibility for all callers & tests
// ============================================================

export {
  getConfidenceLevel,
  buildFieldEvidence,
  buildEvidenceMap,
} from '../evidence/evidenceMapperService.js';


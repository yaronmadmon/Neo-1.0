/**
 * Intent Resolution System
 * Exports all intent processing modules
 */

export {
  parseCommand,
  isRelativeCommand,
  isContextualCommand,
  isModeCommand,
  isPresetCommand,
  normalizeTarget,
  normalizeValue,
  type ParsedIntent,
} from './command-parser';

export {
  resolveContext,
  getComponentTokens,
  componentSupportsProperty,
  getAllCanonicalTargets,
  isModeTarget,
  type SelectionContext,
  type ResolvedContext,
} from './context-resolver';

export {
  computeRelativeChange,
  computeRelativeColor,
  computeRelativeRadius,
  makeLighter,
  makeDarker,
  adjustSaturation,
  type RelativeResult,
} from './relative-computer';

export {
  executeCommand,
  quickExecute,
  type ExecutionResult,
} from './executor';

// Fuzzy matching utilities
export {
  levenshteinDistance,
  similarity,
  phoneticEncode,
  soundsLike,
  findBestMatch,
  findCloseMatches,
  normalizeForComparison,
  type FuzzyMatch,
} from './fuzzy-matcher';

// Synonym dictionaries
export {
  TARGET_SYNONYMS,
  COLOR_SYNONYMS,
  ACTION_SYNONYMS,
  RADIUS_SYNONYMS,
  MODE_SYNONYMS,
  STYLE_PRESETS,
  resolveTargetSynonym,
  resolveColorSynonym,
  resolveActionSynonym,
  resolveRadiusSynonym,
  resolveModeSynonym,
  getAllTargetNames,
  getAllColorNames,
} from './synonyms';

// Error message helpers
export {
  unknownTargetError,
  unknownColorError,
  unparseableCommandError,
  invalidValueError,
  successMessage,
  partialSuccessMessage,
  clarificationNeeded,
  helpMessage,
  formatSuggestions,
  getContextualExamples,
} from './error-messages';

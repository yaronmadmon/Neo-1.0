/**
 * Fuzzy Matcher
 * Handles typo tolerance and approximate string matching for non-tech users
 */

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits to transform one into the other)
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[a.length][b.length];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
export function similarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Simple phonetic encoding (simplified Soundex-like)
 * Groups similar-sounding letters together
 */
export function phoneticEncode(str: string): string {
  const input = str.toLowerCase().replace(/[^a-z]/g, '');
  if (!input) return '';
  
  // Keep first letter
  let result = input[0].toUpperCase();
  
  // Map letters to phonetic codes
  const map: Record<string, string> = {
    'b': '1', 'f': '1', 'p': '1', 'v': '1',
    'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
    'd': '3', 't': '3',
    'l': '4',
    'm': '5', 'n': '5',
    'r': '6',
    // Vowels and h, w, y are ignored (except first letter)
  };
  
  let prevCode = map[input[0]] || '';
  
  for (let i = 1; i < input.length; i++) {
    const code = map[input[i]] || '';
    if (code && code !== prevCode) {
      result += code;
      prevCode = code;
    } else if (!code) {
      prevCode = '';
    }
  }
  
  // Pad or trim to 4 characters
  return (result + '000').slice(0, 4);
}

/**
 * Check if two strings sound similar (phonetically)
 */
export function soundsLike(a: string, b: string): boolean {
  return phoneticEncode(a) === phoneticEncode(b);
}

/**
 * Check if a string starts with a prefix (fuzzy)
 */
export function fuzzyStartsWith(str: string, prefix: string, maxDistance: number = 1): boolean {
  const strPrefix = str.toLowerCase().slice(0, prefix.length + maxDistance);
  const prefixLower = prefix.toLowerCase();
  
  // Exact prefix match
  if (str.toLowerCase().startsWith(prefixLower)) {
    return true;
  }
  
  // Check with typo tolerance
  return levenshteinDistance(strPrefix, prefixLower) <= maxDistance;
}

/**
 * Find the best match from a list of candidates
 */
export interface FuzzyMatch {
  match: string;
  score: number;
  exact: boolean;
  phonetic: boolean;
}

export function findBestMatch(input: string, candidates: string[], options: {
  maxDistance?: number;
  minSimilarity?: number;
  usePhonetic?: boolean;
} = {}): FuzzyMatch | null {
  const {
    maxDistance = 2,
    minSimilarity = 0.6,
    usePhonetic = true,
  } = options;
  
  const inputLower = input.toLowerCase().trim();
  
  // First, try exact match
  const exactMatch = candidates.find(c => c.toLowerCase() === inputLower);
  if (exactMatch) {
    return { match: exactMatch, score: 1, exact: true, phonetic: false };
  }
  
  let bestMatch: FuzzyMatch | null = null;
  
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    
    // Calculate Levenshtein distance
    const distance = levenshteinDistance(inputLower, candidateLower);
    
    // If within acceptable distance
    if (distance <= maxDistance) {
      const score = similarity(inputLower, candidateLower);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { match: candidate, score, exact: false, phonetic: false };
      }
    }
    
    // Check phonetic similarity
    if (usePhonetic && soundsLike(inputLower, candidateLower)) {
      const score = 0.85; // Phonetic matches get a good score
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { match: candidate, score, exact: false, phonetic: true };
      }
    }
    
    // Check prefix match for longer inputs
    if (inputLower.length >= 3 && candidateLower.startsWith(inputLower)) {
      const score = 0.9; // Prefix matches are good
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { match: candidate, score, exact: false, phonetic: false };
      }
    }
  }
  
  // Apply minimum similarity threshold
  if (bestMatch && bestMatch.score < minSimilarity) {
    return null;
  }
  
  return bestMatch;
}

/**
 * Find multiple close matches sorted by similarity
 */
export function findCloseMatches(input: string, candidates: string[], options: {
  maxResults?: number;
  minSimilarity?: number;
} = {}): FuzzyMatch[] {
  const { maxResults = 3, minSimilarity = 0.5 } = options;
  
  const inputLower = input.toLowerCase().trim();
  const matches: FuzzyMatch[] = [];
  
  for (const candidate of candidates) {
    const score = similarity(inputLower, candidate.toLowerCase());
    const phonetic = soundsLike(inputLower, candidate);
    
    if (score >= minSimilarity || phonetic) {
      matches.push({
        match: candidate,
        score: phonetic ? Math.max(score, 0.7) : score,
        exact: score === 1,
        phonetic,
      });
    }
  }
  
  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  
  return matches.slice(0, maxResults);
}

/**
 * Common keyboard typos (adjacent keys)
 */
const KEYBOARD_ADJACENT: Record<string, string[]> = {
  'a': ['q', 'w', 's', 'z'],
  'b': ['v', 'g', 'h', 'n'],
  'c': ['x', 'd', 'f', 'v'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'e': ['w', 's', 'd', 'r'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'i': ['u', 'j', 'k', 'o'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'm': ['n', 'j', 'k'],
  'n': ['b', 'h', 'j', 'm'],
  'o': ['i', 'k', 'l', 'p'],
  'p': ['o', 'l'],
  'q': ['w', 'a'],
  'r': ['e', 'd', 'f', 't'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  't': ['r', 'f', 'g', 'y'],
  'u': ['y', 'h', 'j', 'i'],
  'v': ['c', 'f', 'g', 'b'],
  'w': ['q', 'a', 's', 'e'],
  'x': ['z', 's', 'd', 'c'],
  'y': ['t', 'g', 'h', 'u'],
  'z': ['a', 's', 'x'],
};

/**
 * Check if a typo is likely a keyboard slip
 */
export function isKeyboardTypo(original: string, typo: string): boolean {
  if (Math.abs(original.length - typo.length) > 1) {
    return false;
  }
  
  const origLower = original.toLowerCase();
  const typoLower = typo.toLowerCase();
  
  // Check for single character substitution with adjacent key
  if (origLower.length === typoLower.length) {
    let diffCount = 0;
    let lastDiffIndex = -1;
    
    for (let i = 0; i < origLower.length; i++) {
      if (origLower[i] !== typoLower[i]) {
        diffCount++;
        lastDiffIndex = i;
      }
    }
    
    if (diffCount === 1) {
      const origChar = origLower[lastDiffIndex];
      const typoChar = typoLower[lastDiffIndex];
      return KEYBOARD_ADJACENT[origChar]?.includes(typoChar) ?? false;
    }
  }
  
  return false;
}

/**
 * Normalize a string for comparison
 * Handles common variations and typos
 */
export function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .trim()
    // Remove common filler words
    .replace(/\b(the|a|an|my|our|this)\b/g, '')
    // Normalize spacing
    .replace(/\s+/g, ' ')
    // Remove possessives
    .replace(/'s\b/g, '')
    // Trim again after removals
    .trim();
}

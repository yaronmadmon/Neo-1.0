/**
 * Error Messages
 * Provides helpful, user-friendly error messages with suggestions
 * Designed for non-technical users
 */

import { findCloseMatches, type FuzzyMatch } from './fuzzy-matcher';
import { getAllTargetNames, getAllColorNames } from './synonyms';

/**
 * Known target descriptions for user help
 */
const TARGET_DESCRIPTIONS: Record<string, string> = {
  'background': 'the page/app background color',
  'primary': 'the main theme color (buttons, links)',
  'secondary': 'the secondary theme color',
  'text': 'the color of text/words',
  'card': 'the color of cards, boxes, and panels',
  'button': 'the color of buttons',
  'border': 'the color of borders and lines',
  'sidebar': 'the sidebar/menu color',
  'popover': 'popup and dropdown colors',
  'input': 'form field and input colors',
  'ring': 'focus highlight color',
  'error': 'error and warning colors',
  'muted': 'subtle/faded text color',
  'chart': 'graph and chart colors',
  'radius': 'how rounded corners are',
};

/**
 * Example commands for different scenarios
 */
const EXAMPLE_COMMANDS: Record<string, string[]> = {
  color: [
    'make the background blue',
    'change the primary color to green',
    'set the text to dark gray',
    'make buttons purple',
  ],
  radius: [
    'make corners more rounded',
    'set corners to sharp',
    'make it rounded',
    'less rounding',
  ],
  mode: [
    'switch to dark mode',
    'enable light mode',
    'toggle dark mode',
  ],
  general: [
    'make the background light blue',
    'more rounded corners',
    'switch to dark mode',
  ],
};

/**
 * Generate a helpful error message for an unknown target
 */
export function unknownTargetError(input: string): string {
  const candidates = getAllTargetNames();
  const matches = findCloseMatches(input, candidates, { maxResults: 3, minSimilarity: 0.4 });
  
  let message = `I didn't recognize "${input}".`;
  
  if (matches.length > 0) {
    message += '\n\nDid you mean:';
    matches.forEach((match) => {
      const desc = TARGET_DESCRIPTIONS[match.match] || '';
      message += `\n  • ${match.match}${desc ? ` - ${desc}` : ''}`;
    });
  } else {
    message += '\n\nThings you can change:';
    message += '\n  • background - the page color';
    message += '\n  • primary/main - the theme color';
    message += '\n  • text - the text color';
    message += '\n  • cards - card/panel colors';
    message += '\n  • corners/radius - how rounded things are';
  }
  
  message += '\n\nExample: "make the background blue"';
  
  return message;
}

/**
 * Generate a helpful error message for an unknown color
 */
export function unknownColorError(input: string): string {
  const candidates = getAllColorNames();
  const matches = findCloseMatches(input, candidates, { maxResults: 3, minSimilarity: 0.4 });
  
  let message = `I'm not sure what color "${input}" is.`;
  
  if (matches.length > 0) {
    message += '\n\nDid you mean:';
    matches.forEach((match) => {
      message += `\n  • ${match.match}`;
    });
  } else {
    message += '\n\nTry colors like:';
    message += '\n  • blue, light blue, navy';
    message += '\n  • green, emerald, teal';
    message += '\n  • red, pink, rose';
    message += '\n  • purple, violet, indigo';
    message += '\n  • gray, slate, white, black';
    message += '\n  • Or a hex code like #3B82F6';
  }
  
  message += '\n\nExample: "make it light blue"';
  
  return message;
}

/**
 * Generate a helpful error message for an unparseable command
 */
export function unparseableCommandError(input: string): string {
  let message = `I didn't understand: "${input}"`;
  
  message += '\n\nTry saying things like:';
  EXAMPLE_COMMANDS.general.forEach((example) => {
    message += `\n  • "${example}"`;
  });
  
  message += '\n\nOr just describe what you want:';
  message += '\n  • "make it pop" - more vibrant';
  message += '\n  • "tone it down" - more subtle';
  message += '\n  • "softer corners" - more rounded';
  
  return message;
}

/**
 * Generate a helpful error message for an invalid value
 */
export function invalidValueError(target: string, value: string): string {
  let message = `I couldn't set ${target} to "${value}".`;
  
  if (target === 'radius' || target === 'corners') {
    message += '\n\nFor corners, try:';
    message += '\n  • sharp, square (no rounding)';
    message += '\n  • small, subtle (slight rounding)';
    message += '\n  • rounded, medium (moderate)';
    message += '\n  • large, soft (more rounded)';
    message += '\n  • pill, full (completely round)';
    message += '\n\nOr say "more rounded" or "less rounded"';
  } else {
    message += '\n\nFor colors, try:';
    message += '\n  • A color name: blue, green, purple';
    message += '\n  • A shade: light blue, dark green';
    message += '\n  • A hex code: #3B82F6';
  }
  
  return message;
}

/**
 * Generate a success message
 */
export function successMessage(action: string, target: string, value?: string): string {
  // Make messages friendly and non-technical
  const targetFriendly = TARGET_DESCRIPTIONS[target] || target;
  
  if (value) {
    return `Changed ${targetFriendly} to ${value} ✓`;
  }
  
  return `Updated ${targetFriendly} ✓`;
}

/**
 * Generate a partial success message (for suggestions)
 */
export function partialSuccessMessage(action: string, suggestion: string): string {
  return `I made a change, but you might also want to try: "${suggestion}"`;
}

/**
 * Generate an "ask for clarification" message
 */
export function clarificationNeeded(question: string, options: string[]): string {
  let message = question;
  
  if (options.length > 0) {
    message += '\n\nOptions:';
    options.forEach((opt) => {
      message += `\n  • ${opt}`;
    });
  }
  
  return message;
}

/**
 * Generate a help message showing what the user can do
 */
export function helpMessage(): string {
  return `
Here's what you can do:

🎨 COLORS
  "make the background blue"
  "change primary color to green"
  "set buttons to purple"
  "darker text color"

📐 CORNERS
  "more rounded corners"
  "make it sharp"
  "softer edges"

🌙 MODE
  "switch to dark mode"
  "light mode"
  "toggle mode"

✨ QUICK STYLES
  "make it pop" - more vibrant
  "tone it down" - more subtle
  "modernize" - clean, modern look
  "professional" - business-like

💡 TIPS
  • You can say things naturally
  • Typos are okay, I'll figure it out
  • Ask for "more" or "less" of something
`.trim();
}

/**
 * Format suggestions as a bulleted list
 */
export function formatSuggestions(suggestions: FuzzyMatch[]): string {
  if (suggestions.length === 0) return '';
  
  let result = 'Did you mean:';
  suggestions.forEach((s) => {
    result += `\n  • ${s.match}`;
  });
  
  return result;
}

/**
 * Get context-aware examples based on what the user is trying to do
 */
export function getContextualExamples(context: 'color' | 'radius' | 'mode' | 'general'): string[] {
  return EXAMPLE_COMMANDS[context] || EXAMPLE_COMMANDS.general;
}

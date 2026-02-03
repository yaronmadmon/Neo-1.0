/**
 * Synonyms Dictionary
 * Maps natural language terms to standard internal terms
 * Designed for non-technical users with extensive variations
 */

/**
 * Color target synonyms - maps user terms to canonical target names
 */
export const TARGET_SYNONYMS: Record<string, string> = {
  // === BACKGROUND / PAGE ===
  'background': 'background',
  'background color': 'background',
  'bg': 'background',
  'page': 'background',
  'page color': 'background',
  'page background': 'background',
  'app background': 'background',
  'main background': 'background',
  'back color': 'background',
  'behind': 'background',
  'backdrop': 'background',
  'canvas': 'background',
  // Common typos
  'backround': 'background',
  'backgroud': 'background',
  'backgorund': 'background',
  'backgound': 'background',
  'bckground': 'background',
  'bacground': 'background',
  'backgrund': 'background',
  'backgroung': 'background',
  'backgrounf': 'background',
  'baclground': 'background',
  
  // === PRIMARY / BRAND ===
  'primary': 'primary',
  'primary color': 'primary',
  'main color': 'primary',
  'main': 'primary',
  'brand': 'primary',
  'brand color': 'primary',
  'theme color': 'primary',
  'app color': 'primary',
  'accent': 'primary', // Common confusion
  'highlight': 'primary',
  // Common typos
  'primery': 'primary',
  'primay': 'primary',
  'praimary': 'primary',
  'pirmary': 'primary',
  'pirmairy': 'primary',
  
  // === SECONDARY ===
  'secondary': 'secondary',
  'secondary color': 'secondary',
  'second color': 'secondary',
  'second': 'secondary',
  'alternate': 'secondary',
  'alternative': 'secondary',
  // Common typos
  'secondry': 'secondary',
  'secndary': 'secondary',
  'secodary': 'secondary',
  
  // === TEXT / FOREGROUND ===
  'text': 'text',
  'text color': 'text',
  'font color': 'text',
  'font': 'text',
  'foreground': 'text',
  'writing': 'text',
  'words': 'text',
  'letters': 'text',
  'paragraphs': 'text',
  'content': 'text',
  'copy': 'text',
  'reading': 'text',
  'text color': 'text',
  // Common typos
  'txt': 'text',
  'txet': 'text',
  'forground': 'text',
  'foregound': 'text',
  
  // === CARD / SURFACE ===
  'card': 'card',
  'cards': 'card',
  'card color': 'card',
  'surface': 'card',
  'surfaces': 'card',
  'panel': 'card',
  'panels': 'card',
  'box': 'card',
  'boxes': 'card',
  'container': 'card',
  'containers': 'card',
  'section': 'card',
  'sections': 'card',
  'tile': 'card',
  'tiles': 'card',
  'block': 'card',
  'blocks': 'card',
  'widget': 'card',
  'widgets': 'card',
  // Common typos
  'crad': 'card',
  'cadr': 'card',
  
  // === BUTTON ===
  'button': 'button',
  'buttons': 'button',
  'button color': 'button',
  'btn': 'button',
  'btns': 'button',
  'click': 'button',
  'clickable': 'button',
  'actions': 'button',
  // Common typos
  'buton': 'button',
  'buttn': 'button',
  'botton': 'button',
  'butoon': 'button',
  'buttton': 'button',
  
  // === BORDER ===
  'border': 'border',
  'borders': 'border',
  'border color': 'border',
  'outline': 'border',
  'outlines': 'border',
  'edge': 'border',
  'edges': 'border',
  'frame': 'border',
  'line': 'border',
  'lines': 'border',
  'divider': 'border',
  'dividers': 'border',
  'separator': 'border',
  // Common typos
  'boarder': 'border',
  'boarders': 'border',
  'broder': 'border',
  'boder': 'border',
  
  // === SIDEBAR / NAVIGATION ===
  'sidebar': 'sidebar',
  'side bar': 'sidebar',
  'side menu': 'sidebar',
  'navigation': 'sidebar',
  'nav': 'sidebar',
  'menu': 'sidebar',
  'left menu': 'sidebar',
  'left panel': 'sidebar',
  'side panel': 'sidebar',
  // Common typos
  'sdiebar': 'sidebar',
  'sidbar': 'sidebar',
  'sidebare': 'sidebar',
  'siedbar': 'sidebar',
  
  // === POPOVER / DROPDOWN ===
  'popover': 'popover',
  'popup': 'popover',
  'pop up': 'popover',
  'dropdown': 'popover',
  'drop down': 'popover',
  'menu popup': 'popover',
  'overlay': 'popover',
  'modal': 'popover',
  'dialog': 'popover',
  'tooltip': 'popover',
  
  // === INPUT / FORM FIELD ===
  'input': 'input',
  'inputs': 'input',
  'input field': 'input',
  'text field': 'input',
  'text box': 'input',
  'textbox': 'input',
  'form field': 'input',
  'form fields': 'input',
  'field': 'input',
  'fields': 'input',
  'form': 'input',
  'forms': 'input',
  // Common typos
  'inout': 'input',
  'imput': 'input',
  'inoput': 'input',
  
  // === FOCUS / RING ===
  'ring': 'ring',
  'focus': 'ring',
  'focus ring': 'ring',
  'outline': 'ring',
  'focus outline': 'ring',
  'selected': 'ring',
  'selection': 'ring',
  'active': 'ring',
  
  // === ERROR / DESTRUCTIVE ===
  'error': 'error',
  'error color': 'error',
  'danger': 'error',
  'destructive': 'error',
  'delete': 'error',
  'remove': 'error',
  'warning': 'error', // Often confused
  'alert': 'error',
  'problem': 'error',
  'bad': 'error',
  
  // === MUTED ===
  'muted': 'muted',
  'muted color': 'muted',
  'subtle': 'muted',
  'faded': 'muted',
  'light text': 'muted',
  'gray text': 'muted',
  'dimmed': 'muted',
  'secondary text': 'muted',
  'placeholder': 'muted',
  'hint': 'muted',
  'caption': 'muted',
  
  // === CHARTS ===
  'chart': 'chart',
  'charts': 'chart',
  'chart color': 'chart',
  'graph': 'chart',
  'graphs': 'chart',
  'data': 'chart',
  'visualization': 'chart',
  'pie chart': 'chart',
  'bar chart': 'chart',
  'line chart': 'chart',
  
  // === RADIUS / CORNERS ===
  'radius': 'radius',
  'corner': 'radius',
  'corners': 'radius',
  'rounding': 'radius',
  'border radius': 'radius',
  'roundness': 'radius',
  'curved': 'radius',
  'curves': 'radius',
  'edges': 'radius',
  'sharp': 'radius',
  'soft': 'radius',
  // Common typos
  'raduis': 'radius',
  'radious': 'radius',
  'raius': 'radius',
  'raidus': 'radius',
  'cornres': 'radius',
  'conrers': 'radius',
  'roudned': 'radius',
  'roundd': 'radius',
  'rounder': 'radius',
};

/**
 * Color value synonyms - maps user terms to canonical color names
 */
export const COLOR_SYNONYMS: Record<string, string> = {
  // === BLUES ===
  'blue': 'blue',
  'sky': 'sky',
  'sky blue': 'sky',
  'light blue': 'light-blue',
  'baby blue': 'light-blue',
  'pale blue': 'light-blue',
  'dark blue': 'dark-blue',
  'navy': 'dark-blue',
  'navy blue': 'dark-blue',
  'ocean': 'blue',
  'sea': 'blue',
  'water': 'blue',
  'azure': 'sky',
  'cobalt': 'blue',
  'royal blue': 'blue',
  'indigo': 'indigo',
  'violet': 'violet',
  // Typos
  'bule': 'blue',
  'bleu': 'blue',
  'blu': 'blue',
  
  // === GREENS ===
  'green': 'green',
  'light green': 'light-green',
  'dark green': 'dark-green',
  'forest': 'dark-green',
  'forest green': 'dark-green',
  'lime': 'lime',
  'lime green': 'lime',
  'emerald': 'emerald',
  'teal': 'teal',
  'mint': 'light-green',
  'sage': 'green',
  'olive': 'dark-green',
  'grass': 'green',
  'nature': 'green',
  'eco': 'green',
  // Typos
  'grean': 'green',
  'gren': 'green',
  'gree': 'green',
  
  // === REDS ===
  'red': 'red',
  'light red': 'rose',
  'dark red': 'red',
  'crimson': 'red',
  'scarlet': 'red',
  'ruby': 'red',
  'blood': 'red',
  'cherry': 'red',
  'rose': 'rose',
  'coral': 'rose',
  'salmon': 'rose',
  'brick': 'red',
  'maroon': 'red',
  // Typos
  'rd': 'red',
  'redd': 'red',
  
  // === PINKS ===
  'pink': 'pink',
  'light pink': 'pink',
  'hot pink': 'pink',
  'magenta': 'pink',
  'fuchsia': 'pink',
  'blush': 'pink',
  'bubblegum': 'pink',
  // Typos
  'pnik': 'pink',
  'pinl': 'pink',
  
  // === PURPLES ===
  'purple': 'purple',
  'violet': 'violet',
  'lavender': 'violet',
  'plum': 'purple',
  'grape': 'purple',
  'amethyst': 'purple',
  'orchid': 'violet',
  'mauve': 'violet',
  // Typos
  'pruple': 'purple',
  'purpel': 'purple',
  'purlpe': 'purple',
  
  // === YELLOWS ===
  'yellow': 'yellow',
  'gold': 'amber',
  'golden': 'amber',
  'amber': 'amber',
  'honey': 'amber',
  'mustard': 'amber',
  'lemon': 'yellow',
  'sunshine': 'yellow',
  'sunny': 'yellow',
  'canary': 'yellow',
  // Typos
  'yelow': 'yellow',
  'yello': 'yellow',
  'yellwo': 'yellow',
  
  // === ORANGES ===
  'orange': 'orange',
  'light orange': 'orange',
  'dark orange': 'orange',
  'tangerine': 'orange',
  'peach': 'orange',
  'apricot': 'orange',
  'rust': 'orange',
  'burnt orange': 'orange',
  'pumpkin': 'orange',
  'carrot': 'orange',
  // Typos
  'ornage': 'orange',
  'orage': 'orange',
  
  // === NEUTRALS ===
  'gray': 'gray',
  'grey': 'gray',
  'silver': 'gray',
  'slate': 'slate',
  'charcoal': 'slate',
  'ash': 'gray',
  'stone': 'slate',
  'zinc': 'zinc',
  'neutral': 'gray',
  // Typos
  'gry': 'gray',
  'graay': 'gray',
  
  // === BLACK & WHITE ===
  'white': 'white',
  'pure white': 'white',
  'snow': 'white',
  'ivory': 'white',
  'cream': 'white',
  'off-white': 'white',
  'black': 'black',
  'dark': 'black',
  'jet': 'black',
  'midnight': 'black',
  'onyx': 'black',
  // Typos
  'wihte': 'white',
  'whiet': 'white',
  'balck': 'black',
  'blakc': 'black',
  
  // === SEMANTIC ===
  'success': 'success',
  'positive': 'success',
  'good': 'success',
  'ok': 'success',
  'complete': 'success',
  'done': 'success',
  'error': 'error',
  'danger': 'error',
  'fail': 'error',
  'failure': 'error',
  'wrong': 'error',
  'warning': 'warning',
  'caution': 'warning',
  'alert': 'warning',
  'attention': 'warning',
  'info': 'info',
  'information': 'info',
  
  // === DESCRIPTIVE / RELATIVE ===
  'bright': 'bright', // Will be handled specially
  'dark': 'dark',
  'light': 'light',
  'pale': 'light',
  'vivid': 'vivid',
  'muted': 'muted',
  'soft': 'soft',
  'bold': 'bold',
  'vibrant': 'vivid',
  'saturated': 'vivid',
  'desaturated': 'muted',
  'warm': 'warm',
  'cool': 'cool',
  'cold': 'cool',
  'hot': 'warm',
};

/**
 * Action synonyms - maps user terms to standard action verbs
 */
export const ACTION_SYNONYMS: Record<string, string> = {
  // === MAKE / SET ===
  'make': 'set',
  'set': 'set',
  'change': 'set',
  'turn': 'set',
  'switch': 'set',
  'use': 'set',
  'apply': 'set',
  'put': 'set',
  'color': 'set',
  'paint': 'set',
  
  // === INCREASE ===
  'increase': 'increase',
  'more': 'increase',
  'bigger': 'increase',
  'larger': 'increase',
  'boost': 'increase',
  'raise': 'increase',
  'up': 'increase',
  'add': 'increase',
  'enhance': 'increase',
  'strengthen': 'increase',
  'amplify': 'increase',
  
  // === DECREASE ===
  'decrease': 'decrease',
  'less': 'decrease',
  'smaller': 'decrease',
  'reduce': 'decrease',
  'lower': 'decrease',
  'down': 'decrease',
  'remove': 'decrease',
  'weaken': 'decrease',
  'diminish': 'decrease',
  'tone down': 'decrease',
  
  // === SHOW / HIDE ===
  'show': 'show',
  'display': 'show',
  'reveal': 'show',
  'unhide': 'show',
  'visible': 'show',
  'enable': 'show',
  'activate': 'show',
  'hide': 'hide',
  'remove': 'hide',
  'delete': 'hide',
  'invisible': 'hide',
  'disable': 'hide',
  'deactivate': 'hide',
  
  // === RESET ===
  'reset': 'reset',
  'restore': 'reset',
  'default': 'reset',
  'original': 'reset',
  'undo all': 'reset',
  'start over': 'reset',
  'clear': 'reset',
};

/**
 * Radius value synonyms
 */
export const RADIUS_SYNONYMS: Record<string, string> = {
  // === NONE / SHARP ===
  'none': 'none',
  'zero': 'none',
  '0': 'none',
  'sharp': 'none',
  'square': 'none',
  'squared': 'none',
  'no rounding': 'none',
  'no radius': 'none',
  'flat': 'none',
  'hard': 'none',
  'angular': 'none',
  'boxy': 'none',
  
  // === SMALL ===
  'small': 'sm',
  'sm': 'sm',
  'tiny': 'sm',
  'slight': 'sm',
  'subtle': 'sm',
  'barely': 'sm',
  'little': 'sm',
  'minimal': 'sm',
  
  // === MEDIUM ===
  'medium': 'md',
  'md': 'md',
  'default': 'md',
  'normal': 'md',
  'regular': 'md',
  'rounded': 'md',
  'moderate': 'md',
  'standard': 'md',
  
  // === LARGE ===
  'large': 'lg',
  'lg': 'lg',
  'big': 'lg',
  'more rounded': 'lg',
  'rounder': 'lg',
  'softer': 'lg',
  'smooth': 'lg',
  
  // === EXTRA LARGE ===
  'extra large': 'xl',
  'xl': 'xl',
  'very rounded': 'xl',
  'very soft': 'xl',
  'super rounded': 'xl',
  'extra round': 'xl',
  
  // === FULL / PILL ===
  'full': 'full',
  'pill': 'full',
  'round': 'full',
  'circular': 'full',
  'circle': 'full',
  'capsule': 'full',
  'completely rounded': 'full',
  'fully rounded': 'full',
  'maximum': 'full',
  'max': 'full',
};

/**
 * Mode synonyms (dark/light)
 */
export const MODE_SYNONYMS: Record<string, 'dark' | 'light' | 'toggle'> = {
  // === DARK ===
  'dark': 'dark',
  'dark mode': 'dark',
  'dark theme': 'dark',
  'night': 'dark',
  'night mode': 'dark',
  'night theme': 'dark',
  'midnight': 'dark',
  'black': 'dark',
  'dim': 'dark',
  
  // === LIGHT ===
  'light': 'light',
  'light mode': 'light',
  'light theme': 'light',
  'day': 'light',
  'day mode': 'light',
  'day theme': 'light',
  'bright': 'light',
  'white': 'light',
  'normal': 'light',
  
  // === TOGGLE ===
  'toggle': 'toggle',
  'switch': 'toggle',
  'flip': 'toggle',
  'change mode': 'toggle',
  'switch mode': 'toggle',
  'other mode': 'toggle',
};

/**
 * Natural language style presets
 * Maps casual phrases to predefined style sets
 */
export const STYLE_PRESETS: Record<string, { description: string; styles: Record<string, string> }> = {
  // Casual requests that imply style changes
  'make it pop': {
    description: 'Increases contrast and saturation',
    styles: { saturation: 'increase', contrast: 'increase' },
  },
  'tone it down': {
    description: 'Decreases saturation for a more muted look',
    styles: { saturation: 'decrease' },
  },
  'soften': {
    description: 'Adds more rounding and reduces contrast',
    styles: { radius: 'lg', contrast: 'decrease' },
  },
  'sharpen': {
    description: 'Removes rounding and increases contrast',
    styles: { radius: 'none', contrast: 'increase' },
  },
  'modernize': {
    description: 'Clean, modern look with subtle rounding',
    styles: { radius: 'md', saturation: 'moderate' },
  },
  'professional': {
    description: 'Subdued, business-appropriate colors',
    styles: { saturation: 'low', radius: 'sm' },
  },
  'playful': {
    description: 'Bright, vibrant colors with more rounding',
    styles: { saturation: 'high', radius: 'lg' },
  },
  'minimal': {
    description: 'Clean and simple with muted colors',
    styles: { saturation: 'low', radius: 'sm' },
  },
  'bold': {
    description: 'Strong, vibrant colors',
    styles: { saturation: 'high', contrast: 'high' },
  },
  'calm': {
    description: 'Soft, relaxing colors',
    styles: { saturation: 'low', lightness: 'high' },
  },
  'energetic': {
    description: 'Bright, vivid colors',
    styles: { saturation: 'high', lightness: 'moderate' },
  },
  'elegant': {
    description: 'Sophisticated, refined look',
    styles: { saturation: 'moderate', contrast: 'moderate' },
  },
  'fun': {
    description: 'Bright and playful',
    styles: { saturation: 'high', radius: 'xl' },
  },
  'serious': {
    description: 'Professional and subdued',
    styles: { saturation: 'low', radius: 'sm' },
  },
  'friendly': {
    description: 'Warm and approachable',
    styles: { radius: 'lg', saturation: 'moderate' },
  },
};

/**
 * Resolve a target synonym to canonical name
 */
export function resolveTargetSynonym(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return TARGET_SYNONYMS[normalized] || null;
}

/**
 * Resolve a color synonym to canonical name
 */
export function resolveColorSynonym(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return COLOR_SYNONYMS[normalized] || null;
}

/**
 * Resolve an action synonym to canonical name
 */
export function resolveActionSynonym(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return ACTION_SYNONYMS[normalized] || null;
}

/**
 * Resolve a radius synonym to canonical name
 */
export function resolveRadiusSynonym(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return RADIUS_SYNONYMS[normalized] || null;
}

/**
 * Resolve a mode synonym
 */
export function resolveModeSynonym(input: string): 'dark' | 'light' | 'toggle' | null {
  const normalized = input.toLowerCase().trim();
  return MODE_SYNONYMS[normalized] || null;
}

/**
 * Get all known target names for fuzzy matching
 */
export function getAllTargetNames(): string[] {
  return Object.keys(TARGET_SYNONYMS);
}

/**
 * Get all known color names for fuzzy matching
 */
export function getAllColorNames(): string[] {
  return Object.keys(COLOR_SYNONYMS);
}

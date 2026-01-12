/**
 * Versioning Service
 * 
 * Handles semantic versioning for app versions.
 */

import { AppVersion, type Environment } from './types.js';

/**
 * Parse semantic version string
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Format version from parts
 */
export function formatVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

/**
 * Increment version
 */
export function incrementVersion(
  version: string,
  type: 'major' | 'minor' | 'patch' = 'patch'
): string {
  const parsed = parseVersion(version);
  if (!parsed) return '1.0.0';

  switch (type) {
    case 'major':
      return formatVersion(parsed.major + 1, 0, 0);
    case 'minor':
      return formatVersion(parsed.major, parsed.minor + 1, 0);
    case 'patch':
      return formatVersion(parsed.major, parsed.minor, parsed.patch + 1);
  }
}

/**
 * Get next version for environment
 */
export function getNextVersion(
  existingVersions: AppVersion[],
  environment: Environment
): string {
  // Get latest version for this environment
  const envVersions = existingVersions
    .filter(v => v.environment === environment)
    .sort((a, b) => {
      const aVersion = parseVersion(a.version);
      const bVersion = parseVersion(b.version);
      if (!aVersion || !bVersion) return 0;
      
      if (aVersion.major !== bVersion.major) return bVersion.major - aVersion.major;
      if (aVersion.minor !== bVersion.minor) return bVersion.minor - aVersion.minor;
      return bVersion.patch - aVersion.patch;
    });

  if (envVersions.length === 0) {
    return '1.0.0';
  }

  const latest = envVersions[0];
  const parsed = parseVersion(latest.version);
  
  if (!parsed) return '1.0.0';

  // Increment patch version for same environment
  return incrementVersion(latest.version, 'patch');
}

/**
 * Compare two versions
 */
export function compareVersions(a: string, b: string): number {
  const aVersion = parseVersion(a);
  const bVersion = parseVersion(b);
  
  if (!aVersion || !bVersion) return 0;
  
  if (aVersion.major !== bVersion.major) return aVersion.major - bVersion.major;
  if (aVersion.minor !== bVersion.minor) return aVersion.minor - bVersion.minor;
  return aVersion.patch - bVersion.patch;
}

/**
 * Validate version string
 */
export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}

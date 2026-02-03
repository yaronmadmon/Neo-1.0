/**
 * Port utility functions for Windows development
 */
import { execSync } from 'child_process';

export interface PortInfo {
  port: number;
  inUse: boolean;
  processId?: number;
  processName?: string;
}

/**
 * Check if a port is in use on Windows
 */
export function isPortInUse(port: number): boolean {
  try {
    // Use more specific pattern to avoid matching IPv6 addresses
    // Look for LISTENING state on local address with exact port
    const result = execSync(
      `netstat -ano | findstr ":${port} " | findstr "LISTENING"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    // Additional check: make sure it's a local port (0.0.0.0 or 127.0.0.1 or [::])
    const lines = result.trim().split('\n').filter(line => {
      const trimmedLine = line.trim();
      return trimmedLine.includes(`0.0.0.0:${port}`) || 
             trimmedLine.includes(`127.0.0.1:${port}`) ||
             trimmedLine.includes(`[::]:${port}`) ||
             trimmedLine.includes(`[::1]:${port}`);
    });
    return lines.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get process ID using a specific port on Windows
 */
export function getProcessIdUsingPort(port: number): number | null {
  try {
    const result = execSync(
      `netstat -ano | findstr :${port} | findstr LISTENING`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    const lines = result.trim().split('\n');
    if (lines.length > 0) {
      // Parse PID from last column
      const parts = lines[0].trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      return isNaN(pid) ? null : pid;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Kill process using a specific port on Windows
 */
export function killProcessOnPort(port: number): boolean {
  try {
    const pid = getProcessIdUsingPort(port);
    if (!pid) {
      return false;
    }

    console.log(`Found process ${pid} using port ${port}, attempting to terminate...`);
    
    // Try graceful termination first
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
      // Wait a moment for the port to be released (synchronous wait)
      const start = Date.now();
      while (Date.now() - start < 2000) {
        // Busy wait for 2 seconds (increased from 1 second)
      }
      
      // Verify port is free
      if (!isPortInUse(port)) {
        console.log(`✓ Port ${port} is now free`);
        return true;
      } else {
        console.log(`⚠️  Port ${port} may still be in use after termination`);
        return false;
      }
    } catch (error: any) {
      // Process might not exist or already terminated
      if (error.message?.includes('not found') || error.message?.includes('not running')) {
        console.log(`Process ${pid} not found (may have already terminated)`);
        // Check if port is actually free now
        return !isPortInUse(port);
      }
      console.error(`Failed to kill process ${pid}:`, error.message);
      return false;
    }

    return false;
  } catch (error: any) {
    console.error(`Failed to kill process on port ${port}:`, error.message);
    return false;
  }
}

/**
 * Ensure port is available, killing existing process if needed
 */
export async function ensurePortAvailable(port: number, autoKill: boolean = true): Promise<boolean> {
  if (!isPortInUse(port)) {
    return true;
  }

  if (!autoKill) {
    return false;
  }

  return killProcessOnPort(port);
}

/**
 * Find next available port starting from a given port
 */
export async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (!isPortInUse(port)) {
      return port;
    }
  }
  return null;
}

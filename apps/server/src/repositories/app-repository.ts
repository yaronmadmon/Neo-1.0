/**
 * App Repository
 * Handles app persistence to database or file-based storage
 */
import { query, queryOne, execute, isDatabaseEnabled } from '../services/database.js';
import type { DbApp } from '../types/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface App {
  id: string;
  name: string;
  description?: string;
  category?: string;
  schema: Record<string, unknown>;
  theme?: Record<string, unknown>;
  data?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  isPublic?: boolean;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * File-based storage path (used when no database is configured)
 */
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const APPS_FILE = path.join(DATA_DIR, 'apps.json');

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load apps from file
 */
function loadAppsFromFile(): Map<string, App> {
  try {
    ensureDataDir();
    if (fs.existsSync(APPS_FILE)) {
      const data = fs.readFileSync(APPS_FILE, 'utf-8');
      const apps = JSON.parse(data) as App[];
      const map = new Map<string, App>();
      for (const app of apps) {
        map.set(app.id, app);
      }
      console.log(`[AppRepository] Loaded ${map.size} apps from file storage`);
      return map;
    }
  } catch (err) {
    console.error('[AppRepository] Failed to load apps from file:', err);
  }
  return new Map<string, App>();
}

/**
 * Save apps to file
 */
function saveAppsToFile(apps: Map<string, App>): void {
  try {
    ensureDataDir();
    const data = JSON.stringify(Array.from(apps.values()), null, 2);
    fs.writeFileSync(APPS_FILE, data, 'utf-8');
    console.log(`[AppRepository] Saved ${apps.size} apps to file storage`);
  } catch (err) {
    console.error('[AppRepository] Failed to save apps to file:', err);
  }
}

/**
 * In-memory store for apps (loaded from file on startup when no database)
 */
let memoryStore: Map<string, App> | null = null;

function getMemoryStoreInstance(): Map<string, App> {
  if (!memoryStore) {
    // Load from file on first access
    memoryStore = loadAppsFromFile();
  }
  return memoryStore;
}

/**
 * Convert database row to App object
 */
function dbToApp(row: DbApp): App {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    category: row.category || undefined,
    schema: row.schema,
    theme: row.theme || undefined,
    data: row.data || {},
    settings: row.settings || {},
    isPublic: row.is_public,
    userId: row.user_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * App Repository class
 */
export class AppRepository {
  /**
   * Save an app (create or update)
   */
  async save(app: App, userId?: string): Promise<App> {
    if (!isDatabaseEnabled()) {
      // Fallback to file-based storage
      const store = getMemoryStoreInstance();
      const savedApp = { 
        ...app, 
        userId: userId || null,
        updatedAt: new Date().toISOString(),
        createdAt: app.createdAt || new Date().toISOString(),
      };
      store.set(app.id, savedApp);
      saveAppsToFile(store); // Persist to file
      return savedApp;
    }
    
    const existing = await this.findById(app.id);
    
    if (existing) {
      // Update existing app
      const result = await queryOne<DbApp>(`
        UPDATE apps 
        SET name = $2, 
            description = $3, 
            category = $4, 
            schema = $5, 
            theme = $6, 
            data = $7, 
            settings = $8, 
            is_public = $9,
            user_id = COALESCE($10, user_id)
        WHERE id = $1
        RETURNING *
      `, [
        app.id,
        app.name,
        app.description || null,
        app.category || null,
        JSON.stringify(app.schema),
        app.theme ? JSON.stringify(app.theme) : null,
        JSON.stringify(app.data || {}),
        JSON.stringify(app.settings || {}),
        app.isPublic || false,
        userId || null,
      ]);
      
      return result ? dbToApp(result) : app;
    } else {
      // Create new app
      const result = await queryOne<DbApp>(`
        INSERT INTO apps (id, user_id, name, description, category, schema, theme, data, settings, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        app.id,
        userId || null,
        app.name,
        app.description || null,
        app.category || null,
        JSON.stringify(app.schema),
        app.theme ? JSON.stringify(app.theme) : null,
        JSON.stringify(app.data || {}),
        JSON.stringify(app.settings || {}),
        app.isPublic || false,
      ]);
      
      return result ? dbToApp(result) : app;
    }
  }
  
  /**
   * Find an app by ID
   */
  async findById(id: string): Promise<App | null> {
    if (!isDatabaseEnabled()) {
      return getMemoryStoreInstance().get(id) || null;
    }
    
    const result = await queryOne<DbApp>(`
      SELECT * FROM apps WHERE id = $1
    `, [id]);
    
    return result ? dbToApp(result) : null;
  }
  
  /**
   * Find all apps for a user
   */
  async findByUserId(userId: string): Promise<App[]> {
    if (!isDatabaseEnabled()) {
      return Array.from(getMemoryStoreInstance().values()).filter(app => app.userId === userId);
    }
    
    const results = await query<DbApp>(`
      SELECT * FROM apps WHERE user_id = $1 ORDER BY updated_at DESC
    `, [userId]);
    
    return results.map(dbToApp);
  }
  
  /**
   * Find all public apps
   */
  async findPublic(limit: number = 50): Promise<App[]> {
    if (!isDatabaseEnabled()) {
      return Array.from(getMemoryStoreInstance().values())
        .filter(app => app.isPublic)
        .slice(0, limit);
    }
    
    const results = await query<DbApp>(`
      SELECT * FROM apps WHERE is_public = true ORDER BY updated_at DESC LIMIT $1
    `, [limit]);
    
    return results.map(dbToApp);
  }
  
  /**
   * Find all apps (admin only, limited)
   */
  async findAll(limit: number = 100): Promise<App[]> {
    if (!isDatabaseEnabled()) {
      return Array.from(getMemoryStoreInstance().values()).slice(0, limit);
    }
    
    const results = await query<DbApp>(`
      SELECT * FROM apps ORDER BY updated_at DESC LIMIT $1
    `, [limit]);
    
    return results.map(dbToApp);
  }
  
  /**
   * Count apps for a user
   */
  async countByUserId(userId: string): Promise<number> {
    if (!isDatabaseEnabled()) {
      return Array.from(getMemoryStoreInstance().values()).filter(app => app.userId === userId).length;
    }
    
    const result = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM apps WHERE user_id = $1
    `, [userId]);
    
    return parseInt(result?.count || '0', 10);
  }
  
  /**
   * Delete an app
   */
  async delete(id: string): Promise<boolean> {
    if (!isDatabaseEnabled()) {
      const store = getMemoryStoreInstance();
      const result = store.delete(id);
      if (result) {
        saveAppsToFile(store); // Persist deletion
      }
      return result;
    }
    
    const result = await execute(`
      DELETE FROM apps WHERE id = $1
    `, [id]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Delete an app (only if owned by user)
   */
  async deleteByUser(id: string, userId: string): Promise<boolean> {
    if (!isDatabaseEnabled()) {
      const store = getMemoryStoreInstance();
      const app = store.get(id);
      if (app && app.userId === userId) {
        const result = store.delete(id);
        if (result) {
          saveAppsToFile(store); // Persist deletion
        }
        return result;
      }
      return false;
    }
    
    const result = await execute(`
      DELETE FROM apps WHERE id = $1 AND user_id = $2
    `, [id, userId]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Update app data (for CRUD operations)
   */
  async updateData(id: string, data: Record<string, unknown>): Promise<App | null> {
    if (!isDatabaseEnabled()) {
      const store = getMemoryStoreInstance();
      const app = store.get(id);
      if (app) {
        app.data = data;
        app.updatedAt = new Date().toISOString();
        store.set(id, app);
        saveAppsToFile(store); // Persist update
        return app;
      }
      return null;
    }
    
    const result = await queryOne<DbApp>(`
      UPDATE apps SET data = $2 WHERE id = $1 RETURNING *
    `, [id, JSON.stringify(data)]);
    
    return result ? dbToApp(result) : null;
  }
  
  /**
   * Transfer app ownership
   */
  async transferOwnership(id: string, newUserId: string): Promise<App | null> {
    if (!isDatabaseEnabled()) {
      const store = getMemoryStoreInstance();
      const app = store.get(id);
      if (app) {
        app.userId = newUserId;
        app.updatedAt = new Date().toISOString();
        store.set(id, app);
        saveAppsToFile(store); // Persist update
        return app;
      }
      return null;
    }
    
    const result = await queryOne<DbApp>(`
      UPDATE apps SET user_id = $2 WHERE id = $1 RETURNING *
    `, [id, newUserId]);
    
    return result ? dbToApp(result) : null;
  }
  
  // ============================================
  // Memory store access (for backward compatibility)
  // ============================================
  
  /**
   * Get memory store (for legacy code)
   */
  getMemoryStore(): Map<string, App> {
    return getMemoryStoreInstance();
  }
  
  /**
   * Set app in memory store (for session-only storage)
   */
  setInMemory(app: App): void {
    const store = getMemoryStoreInstance();
    store.set(app.id, app);
    saveAppsToFile(store); // Also persist to file
  }
  
  /**
   * Get app from memory store
   */
  getFromMemory(id: string): App | undefined {
    return getMemoryStoreInstance().get(id);
  }
}

// Singleton instance
export const appRepository = new AppRepository();

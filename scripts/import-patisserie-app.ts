/**
 * Import the French Patisserie app blueprint into Neo
 */

import * as fs from 'fs';
import * as path from 'path';

async function importApp() {
  const blueprintPath = path.join(process.cwd(), 'generated-apps', 'french-patisserie-blueprint.json');
  const dataPath = path.join(process.cwd(), 'generated-apps', 'french-patisserie-data.json');
  
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Create app schema to import (API expects { schema: {...} })
  const schemaToImport = {
    ...blueprint,
    data: data.tables,
  };
  
  console.log('Importing French Patisserie app...');
  console.log(`App ID: ${blueprint.id}`);
  console.log(`Surface Intent: ${blueprint.theme?.surfaceIntent}`);
  
  // Import via API
  const response = await fetch('http://localhost:3000/api/apps/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schema: schemaToImport }),
  });
  
  if (!response.ok) {
    console.error('Failed to import app:', await response.text());
    return;
  }
  
  const result = await response.json();
  console.log('\n✅ App imported successfully!');
  console.log(`View at: http://localhost:5173/preview/${result.app?.id || blueprint.id}`);
}

importApp().catch(console.error);

/**
 * French Patisserie App - Surface Theme Test
 * 
 * This script creates a French patisserie app to test the new Surface/Atmosphere system.
 * We expect:
 * - Industry: bakery → Design System: warm-craft → Surface Intent: warm-artisanal
 * - Light green vibes = custom theme preference
 */

import { NeoEngine } from '../packages/core/blueprint-engine/src/index.js';
import { getSurfaceIntentForDesignSystem, getSurfaceTheme, DESIGN_SYSTEM_SURFACE_MAP } from '../packages/core/blueprint-engine/src/dna/surface-theme.js';
import { getDesignSystemForIndustry } from '../packages/core/blueprint-engine/src/dna/design-systems.js';
import * as fs from 'fs';
import * as path from 'path';

async function createPatisserieApp() {
  console.log('='.repeat(80));
  console.log('🥐 FRENCH PATISSERIE APP - SURFACE THEME TEST');
  console.log('='.repeat(80));
  console.log();

  const userInput = `
Build me an app for "La Belle Pâtisserie" - a charming French patisserie in Paris.

The app should manage:
- Products (pastries, cakes, breads, macarons) with beautiful photos, descriptions, prices
- Daily specials and seasonal offerings
- Customer orders (pickup and delivery)
- Customers and their preferences
- Inventory of ingredients
- Recipes for signature items

I want light green vibes - fresh, elegant, sophisticated like spring in Paris.

The dashboard should show:
- Today's orders
- Popular items this week
- Low inventory alerts
- Revenue summary
`;

  console.log('USER INPUT:');
  console.log('-'.repeat(40));
  console.log(userInput.trim());
  console.log('-'.repeat(40));
  console.log();

  // First, let's verify the surface theme mapping
  console.log('🔍 SURFACE THEME VERIFICATION:');
  console.log('-'.repeat(40));
  
  const bakeryDesignSystem = getDesignSystemForIndustry('bakery');
  console.log(`   Industry: bakery`);
  console.log(`   Design System: ${bakeryDesignSystem.id} (${bakeryDesignSystem.name})`);
  
  const expectedSurfaceIntent = getSurfaceIntentForDesignSystem(bakeryDesignSystem.id);
  console.log(`   Expected Surface Intent: ${expectedSurfaceIntent}`);
  
  const surfaceTheme = getSurfaceTheme(expectedSurfaceIntent);
  console.log(`   Surface Theme: ${surfaceTheme.name}`);
  console.log(`   - App Background: ${surfaceTheme.appBackground}`);
  console.log(`   - Section Background: ${surfaceTheme.sectionBackground}`);
  console.log(`   - Card Background: ${surfaceTheme.cardBackground}`);
  console.log(`   - Warmth Level: ${surfaceTheme.warmthLevel}`);
  console.log(`   - Contrast Level: ${surfaceTheme.contrastLevel}`);
  console.log();

  // Generate the app
  console.log('🎨 GENERATING APP...');
  console.log('-'.repeat(40));
  
  const neo = new NeoEngine();
  const result = await neo.generateAppFromVoice(userInput);
  const blueprint = result.blueprint;

  console.log(`\n📱 APP: ${blueprint.name}`);
  console.log(`   Description: ${blueprint.description || 'N/A'}`);
  console.log(`   Industry: ${blueprint.industry}`);
  
  // Check the theme
  console.log('\n🎨 THEME ANALYSIS:');
  console.log('-'.repeat(40));
  console.log(`   Mode: ${blueprint.theme?.mode}`);
  console.log(`   Surface Intent: ${blueprint.theme?.surfaceIntent || 'NOT SET!'}`);
  console.log(`   Primary Color: ${blueprint.theme?.primaryColor}`);
  console.log(`   Secondary Color: ${blueprint.theme?.secondaryColor}`);
  console.log(`   Accent Color: ${blueprint.theme?.accentColor}`);
  
  if (!blueprint.theme.surfaceIntent) {
    console.log('\n   ⚠️  WARNING: surfaceIntent was not auto-assigned!');
  } else {
    console.log(`\n   ✅ Surface Intent correctly assigned: ${blueprint.theme.surfaceIntent}`);
    const assignedSurface = getSurfaceTheme(blueprint.theme.surfaceIntent);
    console.log(`   Surface Theme Details:`);
    console.log(`   - ${assignedSurface.description}`);
  }

  // Entities
  console.log('\n📦 ENTITIES:');
  blueprint.entities.forEach((entity, i) => {
    console.log(`   ${i + 1}. ${entity.name} (${entity.fields.length} fields)`);
  });

  // Pages
  console.log('\n📄 PAGES:');
  blueprint.pages.forEach((page, i) => {
    console.log(`   ${i + 1}. ${page.name} (${page.type}) - ${page.route}`);
  });

  // Save the blueprint for viewing
  const outputDir = path.join(process.cwd(), 'generated-apps');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'french-patisserie-blueprint.json');
  fs.writeFileSync(outputPath, JSON.stringify(blueprint, null, 2));
  console.log(`\n📁 Blueprint saved to: ${outputPath}`);

  // Also save the sample data
  const dataPath = path.join(outputDir, 'french-patisserie-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(result.sampleData, null, 2));
  console.log(`📁 Sample data saved to: ${dataPath}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ GENERATION COMPLETE!');
  console.log('='.repeat(80));
  
  // Return the result for programmatic use
  return { blueprint, sampleData: result.sampleData };
}

createPatisserieApp().catch(console.error);

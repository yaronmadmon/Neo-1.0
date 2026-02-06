/**
 * Real Estate Management App - Neo Generation Demo
 * 
 * This script demonstrates Neo's ability to build a complex dual-surface
 * real estate management application from natural language input.
 */

import { NeoEngine } from '../packages/core/blueprint-engine/src/index.js';

async function runDemo() {
  console.log('='.repeat(80));
  console.log('NEO REAL ESTATE MANAGEMENT APP GENERATION DEMO');
  console.log('='.repeat(80));
  console.log();

  const userInput = `
Build me a full real estate management application for a property owner managing multiple properties and tenants.

This app MUST support both:
- Internal owner/admin management
- Tenant-facing portals

INTERNAL (OWNER / ADMIN) SURFACE:
- Manage properties (address, type, notes)
- Manage units within properties
- Manage tenants (personal info, lease terms, assigned unit)
- Track rent amounts, due dates, lease start/end
- Track tenant payments (paid, partial, late, missed)
- View payment history per tenant and per property
- Track overdue rent and upcoming rent
- Maintenance requests management (new, in progress, completed)
- Store documents (leases, notices, invoices)
- Notes and communication log per tenant

Admin Dashboard:
- Total monthly rent
- Collected vs outstanding rent
- Number of active tenants
- Late payments
- Upcoming rent due

TENANT-FACING SURFACE (PORTAL):
- Tenant login portal
- View own lease details
- View rent amount and due date
- View payment history
- Submit rent payments
- Submit maintenance requests
- View maintenance request status
- Upload/download documents related to their unit
- View notices/messages from landlord

Permissions:
- Tenants can ONLY see and act on their own data
- Owners/admins can see and manage everything
`;

  console.log('USER INPUT:');
  console.log('-'.repeat(40));
  console.log(userInput.trim());
  console.log('-'.repeat(40));
  console.log();

  const neo = new NeoEngine();

  // Step 1: Understand the input
  console.log('STEP 1: Understanding the input...');
  const understanding = await neo.understand(userInput);
  
  console.log('\n📊 UNDERSTANDING RESULT:');
  console.log(`   Industry detected: ${understanding.industry.id} (${(understanding.industry.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`   Behavior matched: ${understanding.behavior?.id || 'none'}`);
  console.log(`   Features detected: ${understanding.features?.length || 0}`);
  if (understanding.features) {
    understanding.features.forEach(f => console.log(`     - ${f.id}: ${f.description || ''}`));
  }
  console.log(`   Entities inferred: ${understanding.entities?.length || 0}`);
  if (understanding.entities) {
    understanding.entities.forEach(e => console.log(`     - ${e.name} (${e.fields?.length || 0} fields)`));
  }
  console.log();

  // Step 2: Generate the app
  console.log('STEP 2: Generating the application blueprint...');
  const result = await neo.generateAppFromVoice(userInput);

  // Display the generated blueprint
  const blueprint = result.blueprint;
  
  console.log('\n' + '='.repeat(80));
  console.log('GENERATED APP BLUEPRINT');
  console.log('='.repeat(80));
  
  console.log(`\n📱 APP: ${blueprint.name}`);
  console.log(`   Description: ${blueprint.description || 'N/A'}`);
  console.log(`   Behavior: ${blueprint.behavior || 'custom'}`);
  
  // Surfaces
  console.log('\n🔲 SURFACES:');
  console.log(`   Admin Surface: ${blueprint.surfaces?.admin?.enabled !== false ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   Customer Surface: ${blueprint.surfaces?.customer?.enabled ? 'ENABLED' : 'DISABLED'}`);
  if (blueprint.surfaces?.customer?.features) {
    console.log('   Customer Features:');
    const features = blueprint.surfaces.customer.features;
    Object.entries(features).forEach(([key, value]) => {
      if (value) console.log(`     - ${key}: ✓`);
    });
  }
  
  // Entities
  console.log('\n📦 ENTITIES:');
  blueprint.entities.forEach((entity, i) => {
    console.log(`   ${i + 1}. ${entity.name} (${entity.pluralName})`);
    console.log(`      Fields: ${entity.fields.map(f => f.name).join(', ')}`);
    const refFields = entity.fields.filter(f => f.reference);
    if (refFields.length > 0) {
      console.log(`      References: ${refFields.map(f => `${f.name} -> ${f.reference?.targetEntity}`).join(', ')}`);
    }
  });
  
  // Pages by surface
  console.log('\n📄 PAGES:');
  const adminPages = blueprint.pages.filter(p => !p.surface || p.surface === 'admin');
  const customerPages = blueprint.pages.filter(p => p.surface === 'customer');
  
  console.log('\n   ADMIN PAGES:');
  adminPages.forEach((page, i) => {
    console.log(`   ${i + 1}. ${page.name} (${page.type}) - ${page.route}`);
    if (page.entity) console.log(`      Entity: ${page.entity}`);
  });
  
  if (customerPages.length > 0) {
    console.log('\n   TENANT PORTAL PAGES:');
    customerPages.forEach((page, i) => {
      console.log(`   ${i + 1}. ${page.name} (${page.type}) - ${page.route}`);
      if (page.entity) console.log(`      Entity: ${page.entity}`);
    });
  }
  
  // Workflows
  console.log('\n⚡ WORKFLOWS:');
  blueprint.workflows.forEach((wf, i) => {
    console.log(`   ${i + 1}. ${wf.name}`);
    console.log(`      Trigger: ${wf.trigger.type}`);
    console.log(`      Actions: ${wf.actions.map(a => a.type).join(' → ')}`);
  });
  
  // Navigation
  console.log('\n🧭 NAVIGATION:');
  console.log(`   Default Page: ${blueprint.navigation.defaultPage}`);
  if (blueprint.navigation.sidebar?.items) {
    console.log('   Sidebar Items:');
    blueprint.navigation.sidebar.items.forEach(item => {
      console.log(`     - ${item.label} (${item.pageId})`);
    });
  }
  
  if (blueprint.customerNavigation) {
    console.log('\n   TENANT NAVIGATION:');
    console.log(`   Default Page: ${blueprint.customerNavigation.defaultPage}`);
    if (blueprint.customerNavigation.sidebar?.items) {
      console.log('   Sidebar Items:');
      blueprint.customerNavigation.sidebar.items.forEach(item => {
        console.log(`     - ${item.label} (${item.pageId})`);
      });
    }
  }

  // Sample data
  console.log('\n📊 SAMPLE DATA GENERATED:');
  Object.entries(result.sampleData.tables).forEach(([tableName, records]) => {
    console.log(`   ${tableName}: ${(records as any[]).length} records`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('GENERATION COMPLETE!');
  console.log('='.repeat(80));
  
  // Output full JSON for inspection
  console.log('\n\nFULL BLUEPRINT JSON:');
  console.log(JSON.stringify(blueprint, null, 2));
}

runDemo().catch(console.error);

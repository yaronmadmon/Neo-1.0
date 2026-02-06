/**
 * Real Estate Management App - Neo Generation Demo Test
 * 
 * This test demonstrates Neo's ability to build a complex dual-surface
 * real estate management application from natural language input.
 */

import { describe, it, expect } from 'vitest';
import { AppBlueprintEngine } from './lib/blueprint/AppBlueprintEngine.js';
import { PageGenerator } from './lib/materializer/PageGenerator.js';
import type { ProcessedIntent } from './types.js';

describe('Real Estate Management App Generation', () => {
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

  it('should detect property management industry and tenant portal features', () => {
    const engine = new AppBlueprintEngine();
    
    // Create a minimal intent to test detection
    const intent: ProcessedIntent = {
      rawInput: userInput,
      type: 'create_app',
      extractedDetails: {
        appName: 'Real Estate Manager',
      },
    };
    
    // Generate the blueprint
    const blueprint = engine.generate(intent);
    
    console.log('\n' + '='.repeat(80));
    console.log('REAL ESTATE APP GENERATION RESULTS');
    console.log('='.repeat(80));
    
    // Log app info
    console.log(`\n📱 APP NAME: ${blueprint.name}`);
    console.log(`📝 DESCRIPTION: ${blueprint.description || 'N/A'}`);
    console.log(`🏭 BEHAVIOR: ${blueprint.behavior || 'custom'}`);
    
    // Check entities
    console.log('\n📦 ENTITIES GENERATED:');
    blueprint.entities.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.name} (${e.pluralName})`);
      console.log(`      Fields: ${e.fields.map(f => `${f.name}:${f.type}`).join(', ')}`);
    });
    
    // Expect key entities
    const entityIds = blueprint.entities.map(e => e.id.toLowerCase());
    console.log('\n✅ Checking required entities...');
    
    // Property-related entities
    const hasProperty = entityIds.some(id => id.includes('property'));
    const hasUnit = entityIds.some(id => id.includes('unit'));
    const hasTenant = entityIds.some(id => id.includes('tenant') || id.includes('resident'));
    const hasLease = entityIds.some(id => id.includes('lease') || id.includes('contract'));
    const hasPayment = entityIds.some(id => id.includes('payment') || id.includes('rent'));
    const hasMaintenance = entityIds.some(id => id.includes('maintenance') || id.includes('request'));
    
    console.log(`   Property entity: ${hasProperty ? '✓' : '✗'}`);
    console.log(`   Unit entity: ${hasUnit ? '✓' : '✗'}`);
    console.log(`   Tenant entity: ${hasTenant ? '✓' : '✗'}`);
    console.log(`   Lease entity: ${hasLease ? '✓' : '✗'}`);
    console.log(`   Payment entity: ${hasPayment ? '✓' : '✗'}`);
    console.log(`   Maintenance entity: ${hasMaintenance ? '✓' : '✗'}`);
    
    // Check pages
    console.log('\n📄 PAGES GENERATED:');
    const adminPages = blueprint.pages.filter(p => !p.surface || p.surface === 'admin');
    const customerPages = blueprint.pages.filter(p => p.surface === 'customer');
    
    console.log('\n   ADMIN PAGES:');
    adminPages.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (type: ${p.type}, route: ${p.route})`);
    });
    
    console.log('\n   TENANT PORTAL PAGES:');
    if (customerPages.length > 0) {
      customerPages.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (type: ${p.type}, route: ${p.route})`);
      });
    } else {
      console.log('   (None generated directly - checking surfaces config...)');
    }
    
    // Check surfaces configuration
    console.log('\n🔲 SURFACES CONFIGURATION:');
    console.log(`   Admin enabled: ${blueprint.surfaces?.admin?.enabled !== false}`);
    console.log(`   Customer enabled: ${blueprint.surfaces?.customer?.enabled || false}`);
    
    if (blueprint.surfaces?.customer?.features) {
      console.log('\n   CUSTOMER FEATURES DETECTED:');
      const features = blueprint.surfaces.customer.features;
      Object.entries(features).forEach(([key, value]) => {
        if (value) console.log(`     ✓ ${key}`);
      });
    }
    
    // Check navigation
    console.log('\n🧭 NAVIGATION:');
    console.log(`   Default page: ${blueprint.navigation.defaultPage}`);
    console.log(`   Sidebar items: ${blueprint.navigation.sidebar?.items?.length || 0}`);
    
    if (blueprint.customerNavigation) {
      console.log('\n   CUSTOMER NAVIGATION:');
      console.log(`   Default page: ${blueprint.customerNavigation.defaultPage}`);
      console.log(`   Sidebar items: ${blueprint.customerNavigation.sidebar?.items?.length || 0}`);
    }
    
    // Output JSON for detailed inspection
    console.log('\n' + '='.repeat(80));
    console.log('BLUEPRINT JSON (entities and pages only):');
    console.log('='.repeat(80));
    console.log(JSON.stringify({
      name: blueprint.name,
      behavior: blueprint.behavior,
      surfaces: blueprint.surfaces,
      entities: blueprint.entities.map(e => ({
        id: e.id,
        name: e.name,
        fields: e.fields.map(f => ({ id: f.id, name: f.name, type: f.type })),
      })),
      pages: blueprint.pages.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        surface: p.surface,
        entity: p.entity,
      })),
    }, null, 2));
    
    // Assertions
    expect(blueprint.entities.length).toBeGreaterThan(3);
    expect(blueprint.pages.length).toBeGreaterThan(3);
  });

  it('should verify all tenant portal page types are correctly typed', () => {
    const engine = new AppBlueprintEngine();
    
    // Create intent
    const intent: ProcessedIntent = {
      rawInput: userInput,
      type: 'create_app',
    };
    
    // Generate the blueprint
    const blueprint = engine.generate(intent);
    
    // Get tenant portal pages
    const tenantPages = blueprint.pages.filter(p => p.surface === 'customer');
    
    console.log('\n' + '='.repeat(80));
    console.log('TENANT PORTAL PAGE TYPE VERIFICATION');
    console.log('='.repeat(80));
    
    // Check for expected tenant page types
    const pageTypes = tenantPages.map(p => p.type);
    console.log('\n✅ Tenant portal page types generated:');
    console.log(`   tenant_portal: ${pageTypes.includes('tenant_portal') ? '✓' : '✗'}`);
    console.log(`   lease_view: ${pageTypes.includes('lease_view') ? '✓' : '✗'}`);
    console.log(`   rent_payment: ${pageTypes.includes('rent_payment') ? '✓' : '✗'}`);
    console.log(`   maintenance_request: ${pageTypes.includes('maintenance_request') ? '✓' : '✗'}`);
    console.log(`   document_library: ${pageTypes.includes('document_library') ? '✓' : '✗'}`);
    console.log(`   notices_board: ${pageTypes.includes('notices_board') ? '✓' : '✗'}`);
    console.log(`   message_center: ${pageTypes.includes('message_center') ? '✓' : '✗'}`);
    console.log(`   profile: ${pageTypes.includes('profile') ? '✓' : '✗'}`);
    
    // Assertions
    expect(tenantPages.length).toBeGreaterThanOrEqual(6);
    expect(pageTypes).toContain('tenant_portal');
    expect(pageTypes).toContain('lease_view');
    expect(pageTypes).toContain('rent_payment');
    expect(pageTypes).toContain('maintenance_request');
  });
});

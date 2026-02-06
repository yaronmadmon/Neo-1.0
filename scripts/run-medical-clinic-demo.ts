/**
 * Medical/Therapy Clinic Management App - Neo Generation Demo
 * 
 * This script demonstrates Neo's ability to build a complex 3-surface
 * medical/therapy clinic management application from natural language input.
 * 
 * SURFACES:
 * 1. Admin - Full clinic management
 * 2. Provider - Doctor/therapist interface
 * 3. Patient - Patient portal
 */

import { NeoEngine } from '../packages/core/blueprint-engine/src/index.js';

async function runDemo() {
  console.log('='.repeat(80));
  console.log('NEO MEDICAL/THERAPY CLINIC MANAGEMENT APP GENERATION DEMO');
  console.log('='.repeat(80));
  console.log();

  const userInput = `
Build me a full medical/therapy clinic management application.

This system MUST support MULTIPLE SURFACES sharing the SAME DATA:
1) Admin / Clinic Management
2) Providers (doctors / therapists)
3) Patients

Single source of truth:
- Same entities, schemas, and backend
- NO duplicated entities
- Surfaces differ ONLY by permissions, layout, and navigation

=== ADMIN SURFACE (Clinic Management) ===
Full management capabilities:
- Patient records (demographics, insurance, medical history, allergies, medications)
- Provider management (credentials, specialties, availability)
- Provider-patient assignments
- Appointment scheduling for all providers
- Treatment notes management (view all)
- Billing and invoicing
- Payments tracking
- Document management (consents, reports, insurance docs)
- Secure messaging overview
- Follow-ups and reminders management
- Reporting and analytics

Admin Dashboard:
- Active patients count
- Today's appointments
- Pending treatment notes
- Outstanding balance
- Follow-ups due
- Recent activity

=== PROVIDER SURFACE (Doctors/Therapists) ===
Provider-specific view with restricted access:
- View ONLY assigned patients
- Personal schedule (calendar view)
- Manage availability slots
- Create treatment notes (SOAP format, write-once after signing)
- View patient medical history (for assigned patients)
- View patient documents
- Send secure messages to patients
- Create follow-ups
- View billing for their services

Provider Dashboard:
- Today's schedule
- My patients count
- Pending notes to complete
- Unread messages
- Follow-ups due

=== PATIENT SURFACE (Patient Portal) ===
Patient self-service portal:
- View own profile
- Update contact information (not medical info)
- View upcoming appointments
- Book new appointments
- Cancel appointments
- View treatment notes (APPROVED ones only)
- View documents (visible ones only)
- View and pay bills
- Send messages to care team
- Complete intake forms
- View prescriptions

Patient Dashboard:
- Next appointment
- New messages
- Balance due
- Quick actions

=== CRITICAL CONSTRAINTS ===
Data Permissions:
- Treatment notes are WRITE-ONCE after signing (for compliance)
- Patients can ONLY see records approved by provider (approvedForPatient = true)
- Providers can ONLY see assigned patients (via patientAssignment)
- Providers can only edit their own treatment notes
- Some fields are provider-only (e.g., internal notes)

Entity Relationships:
- Patient -> has many Appointments
- Provider -> has many Appointments
- Provider -> has many PatientAssignments -> Patient (many-to-many)
- Appointment -> has one TreatmentNote
- Patient -> has many Billing records
- Patient -> has many Documents
- Patient -> has many Messages

This is a medical application - data security and compliance are critical.
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
  console.log(`   Provider Surface: ${(blueprint.surfaces as any)?.provider?.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   Patient Surface: ${(blueprint.surfaces as any)?.patient?.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   Customer Surface: ${blueprint.surfaces?.customer?.enabled ? 'ENABLED' : 'DISABLED'}`);
  
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
  const providerPages = blueprint.pages.filter(p => p.surface === 'provider');
  const patientPages = blueprint.pages.filter(p => p.surface === 'patient' || p.surface === 'customer');
  
  console.log('\n   ADMIN PAGES:');
  adminPages.forEach((page, i) => {
    console.log(`   ${i + 1}. ${page.name} (${page.type}) - ${page.route}`);
    if (page.entity) console.log(`      Entity: ${page.entity}`);
  });
  
  if (providerPages.length > 0) {
    console.log('\n   PROVIDER PAGES:');
    providerPages.forEach((page, i) => {
      console.log(`   ${i + 1}. ${page.name} (${page.type}) - ${page.route}`);
      if (page.entity) console.log(`      Entity: ${page.entity}`);
    });
  }
  
  if (patientPages.length > 0) {
    console.log('\n   PATIENT PORTAL PAGES:');
    patientPages.forEach((page, i) => {
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
  console.log(`   Admin Default Page: ${blueprint.navigation.defaultPage}`);
  if (blueprint.navigation.sidebar?.items) {
    console.log('   Admin Sidebar Items:');
    blueprint.navigation.sidebar.items.forEach(item => {
      console.log(`     - ${item.label} (${item.pageId})`);
    });
  }
  
  if ((blueprint as any).providerNavigation) {
    console.log('\n   PROVIDER NAVIGATION:');
    console.log(`   Default Page: ${(blueprint as any).providerNavigation.defaultPage}`);
    if ((blueprint as any).providerNavigation.sidebar?.items) {
      console.log('   Sidebar Items:');
      (blueprint as any).providerNavigation.sidebar.items.forEach((item: any) => {
        console.log(`     - ${item.label} (${item.pageId})`);
      });
    }
  }
  
  if ((blueprint as any).patientNavigation || blueprint.customerNavigation) {
    const patientNav = (blueprint as any).patientNavigation || blueprint.customerNavigation;
    console.log('\n   PATIENT NAVIGATION:');
    console.log(`   Default Page: ${patientNav.defaultPage}`);
    if (patientNav.sidebar?.items) {
      console.log('   Sidebar Items:');
      patientNav.sidebar.items.forEach((item: any) => {
        console.log(`     - ${item.label} (${item.pageId})`);
      });
    }
  }

  // Sample data
  console.log('\n📊 SAMPLE DATA GENERATED:');
  if (result.sampleData?.tables) {
    Object.entries(result.sampleData.tables).forEach(([tableName, records]) => {
      console.log(`   ${tableName}: ${(records as any[]).length} records`);
    });
  } else {
    console.log('   No sample data tables generated');
  }

  // Permission summary
  console.log('\n🔒 PERMISSION MODEL:');
  console.log('   Admin: Full access to all data');
  console.log('   Provider: Access only to assigned patients, own schedule, own notes');
  console.log('   Patient: Access only to own data, approved treatment notes');
  console.log('   Write-once: Treatment notes locked after signing');

  console.log('\n' + '='.repeat(80));
  console.log('GENERATION COMPLETE!');
  console.log('='.repeat(80));
  
  // Save full JSON for inspection
  const fs = await import('fs');
  const outputPath = './medical-clinic-blueprint.json';
  fs.writeFileSync(outputPath, JSON.stringify(blueprint, null, 2));
  console.log(`\nBlueprint saved to: ${outputPath}`);
  
  // Return the result for testing
  return { blueprint, sampleData: result.sampleData };
}

runDemo().catch(console.error);

export { runDemo };

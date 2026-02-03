# App Configuration Usage Guide

## Overview

The App Configuration system controls how industry kits are presented without modifying the kits themselves.

**Key Principle:** Kits are sacred. Configuration controls presentation.

## Quick Start

```typescript
import {
  buildConfiguration,
  generateSampleData,
  generateSetupSummary,
  generateWelcomeMessage,
} from '@neo/blueprint-engine';

// From discovery output
const config = buildConfiguration({
  kitId: 'plumber',
  originalInput: 'I need an app for my plumbing business',
  scale: 'solo',
  businessName: "Mike's Plumbing",
  mentioned: ['scheduling', 'invoicing'],
});

// Generate narrative sample data
const sampleData = generateSampleData(config);

// Get setup summary to show user
const summary = generateSetupSummary(config);
// => [
//   "Set up as a plumber business",
//   "Configured for solo use (team features hidden)",
//   "Home view set to Calendar",
//   "Scheduling prominently featured",
//   "Hidden for now: team management, inventory, customer portal (enable anytime in Settings)"
// ]

// Get welcome message
const welcome = generateWelcomeMessage(config, sampleData);
// => "Good morning, Mike's Plumbing. You have 2 items scheduled for today."
```

## Configuration Structure

```typescript
interface AppConfiguration {
  // Which kit to use
  kitId: IndustryKitId;
  
  // Complexity level (affects UI density)
  complexity: 'simple' | 'standard' | 'advanced';
  
  // Terminology overrides (e.g., "Job" → "Service Call")
  terminology: Record<string, EntityTerminology>;
  
  // Feature visibility
  features: {
    scheduling: 'hidden' | 'visible' | 'prominent';
    invoicing: 'hidden' | 'visible' | 'prominent';
    teamManagement: 'hidden' | 'visible' | 'prominent';
    // ... more features
  };
  
  // View defaults
  defaults: {
    primaryView: 'calendar' | 'list' | 'kanban' | 'dashboard';
    homePage: 'dashboard' | 'today' | 'list' | 'calendar';
    calendarStartHour: number;
    // ... more defaults
  };
  
  // Sample data context
  sampleData: {
    businessName: string;
    serviceTypes: string[];
    locationStyle: 'residential' | 'commercial' | 'mixed';
    includeSampleData: boolean;
  };
  
  // What user said (for transparency)
  discoveryContext: {
    originalInput: string;
    mentionedKeywords: string[];
    notMentioned: string[];
    confidence: number;
  };
  
  // What system assumed
  assumptions: {
    assumptions: Array<{ what, why, adjustPath }>;
    uncertainties: Array<{ what, defaultChoice, adjustPath }>;
  };
}
```

## How It Works

### 1. Discovery Extracts Intent

User says: "I'm a solo plumber doing emergency service calls"

Discovery extracts:
- Industry: plumber
- Scale: solo
- Mentioned: scheduling (emergency = time-sensitive)

### 2. Configuration Builder Creates Config

```typescript
const config = buildConfiguration({
  kitId: 'plumber',
  originalInput: "I'm a solo plumber doing emergency service calls",
  scale: 'solo',
  mentioned: ['scheduling'],
});
```

Result:
```javascript
{
  kitId: 'plumber',
  complexity: 'simple',
  features: {
    scheduling: 'prominent',  // They mentioned it
    invoicing: 'prominent',   // Kit default for plumber
    teamManagement: 'hidden', // Solo = no team
    inventory: 'hidden',      // Kit default
    customerPortal: 'hidden', // Not mentioned
  },
  defaults: {
    primaryView: 'calendar',  // Kit default for plumber
    calendarStartHour: 7,     // Kit default
  },
  terminology: {
    job: {
      singular: 'Service Call',
      plural: 'Service Calls',
      actions: {
        create: 'Schedule Service Call',
        complete: 'Complete Call',
        // ...
      },
    },
  },
}
```

### 3. Sample Data Is Contextual

```typescript
const sampleData = generateSampleData(config);
```

Generates realistic data:
```javascript
{
  entities: {
    homeowner: [
      { id: 'c1', name: 'Sarah Mitchell', address: '742 Oak Lane', status: 'active' },
      // ...
    ],
    job: [
      { 
        id: 'j1', 
        jobTitle: 'Leak repair - 742 Oak Lane',
        status: 'completed',
        appointmentDate: 'yesterday',
      },
      {
        id: 'j2',
        jobTitle: 'Drain cleaning - 158 Pine Street',
        status: 'scheduled',
        appointmentDate: 'today 2pm',
      },
    ],
  },
  welcomeContext: {
    businessName: "Mike's Plumbing",
    todayCount: 1,
    todayItems: ['Drain cleaning - 158 Pine Street'],
  },
}
```

### 4. Renderer Uses Configuration

The renderer uses configuration to:
- Apply terminology to labels
- Show/hide features based on visibility
- Set default views
- Apply complexity-appropriate UI density

## Integration with Discovery

From the discovery package:

```typescript
import {
  buildConfigurationFromAIDiscovery,
  buildCompleteDiscoveryResult,
} from '@neo/discovery';

// After AI discovery completes
const completeResult = buildCompleteDiscoveryResult(discoveryState, appConfig);

// completeResult contains:
// - appConfig: Legacy app config
// - configuration: New AppConfiguration
// - setupSummary: ["Set up as...", "Configured for...", ...]
// - welcomeMessage: "Good morning, Mike's Plumbing!"
```

## Terminology Mapping

Each kit has default terminology that maps generic terms to domain-specific language:

| Kit | Generic | Domain-Specific |
|-----|---------|-----------------|
| Plumber | Job | Service Call |
| Gym | Customer | Member |
| Property Mgmt | Customer | Tenant |
| Tutor | Appointment | Lesson |
| Restaurant | Customer | Guest |

Terminology includes:
- Entity names (singular/plural)
- Action verbs (create, edit, delete, complete)
- Status labels
- Empty state messages

## Feature Visibility

Three visibility levels:
- **hidden**: Not shown in UI, can be enabled in Settings
- **visible**: Shown in secondary locations
- **prominent**: Shown in primary navigation/dashboard

Hidden features aren't removed - they're available when needed.

## What Makes Apps Feel Different

Two plumbers can have the same kit but feel like different apps:

| Aspect | Solo Plumber | Plumbing Company |
|--------|-------------|------------------|
| Complexity | Simple | Standard |
| Team features | Hidden | Visible |
| Permissions | Hidden | Visible |
| UI density | Spacious | Denser |
| Default view | Calendar | Dashboard |
| Sample data | Individual jobs | Team dispatch view |

Same underlying capabilities, different presentation.

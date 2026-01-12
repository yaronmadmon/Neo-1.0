# Reference Fields Implementation - Phase 1 Complete

## ✅ Phase 1: Schema Enhancement

### Changes Made

1. **Added ReferenceFieldConfigSchema** (`packages/contracts/src/core/app.ts`)
   ```typescript
   export const ReferenceFieldConfigSchema = z.object({
     targetModel: z.string(), // e.g., "Project"
     displayField: z.string(), // e.g., "name"
   });
   ```

2. **Enhanced FieldSchema** with reference support
   - Added optional `reference` property
   - Added validation using `.refine()`:
     - REFERENCE type fields MUST have reference config
     - Non-REFERENCE type fields CANNOT have reference config

3. **Updated TypeScript Types**
   - Exported `ReferenceFieldConfig` type
   - `Field` type automatically includes reference support

### Schema Validation Rules

The schema now enforces:
- **REFERENCE fields**: Must have `reference: { targetModel, displayField }`
- **Other fields**: Cannot have `reference` property

This is enforced at the Zod schema level, so invalid schemas will fail validation.

### Backward Compatibility

✅ **Fully backward compatible**
- Existing fields without `reference` property continue to work
- Existing apps are unaffected
- Only new REFERENCE fields need the `reference` config

### Example Usage

```typescript
// ✅ Valid: Reference field
{
  id: "task-project-id",
  name: "projectId",
  type: FieldType.REFERENCE,
  required: true,
  reference: {
    targetModel: "Project",
    displayField: "name"
  }
}

// ✅ Valid: Non-reference field (existing pattern)
{
  id: "task-title",
  name: "title",
  type: FieldType.STRING,
  required: true
  // No reference property
}

// ❌ Invalid: REFERENCE without reference config
{
  id: "task-project-id",
  name: "projectId",
  type: FieldType.REFERENCE,
  required: true
  // Missing reference config - will fail validation
}

// ❌ Invalid: Non-REFERENCE with reference config
{
  id: "task-title",
  name: "title",
  type: FieldType.STRING,
  reference: { targetModel: "Project", displayField: "name" }
  // Will fail validation
}
```

### Files Modified

- `packages/contracts/src/core/app.ts`
  - Added `ReferenceFieldConfigSchema`
  - Enhanced `FieldSchema` with reference support and validation
  - Exported `ReferenceFieldConfig` type

### Next Steps (Phase 2)

1. **AI Generator Updates**
   - Update prompt engineering to recognize relationships
   - Generate reference fields when user mentions relationships
   - Example: "tasks assigned to projects" → Task.projectId with reference config

2. **Testing**
   - Test schema validation with various field configurations
   - Verify backward compatibility with existing apps

### Notes

- The `REFERENCE` field type already existed in the enum
- We've now completed the schema to support it properly
- Runtime and UI support will come in later phases

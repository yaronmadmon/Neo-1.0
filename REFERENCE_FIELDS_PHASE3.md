# Reference Fields Implementation - Phase 3 Complete

## ✅ Phase 3: Runtime Validation

### Changes Made

1. **Added FieldType Import**
   - Imported `FieldType` enum from `@neo/contracts`
   - Enables type checking for reference fields

2. **Added `validateReferenceFields()` Method**
   - Validates reference fields in record data
   - Checks required fields have values
   - Verifies referenced records exist
   - Returns clear error messages

3. **Updated `createRecord()` Action**
   - Validates reference fields before creating record
   - Returns error if validation fails
   - Prevents creating records with invalid references

4. **Updated `updateRecord()` Action**
   - Validates reference fields before updating record
   - Merges existing data with updates for validation
   - Returns error if validation fails
   - Prevents updating records with invalid references

### Validation Logic

The `validateReferenceFields()` method:

1. **Finds the model** in the schema
2. **Iterates through fields** looking for reference types
3. **Checks required fields**:
   - Required reference fields must have a value
   - Optional reference fields can be null/undefined
4. **Validates references exist**:
   - Looks up target model records
   - Checks if referenced record ID exists
   - Returns error if not found

### Error Messages

Clear, actionable error messages:

- `"Reference field {name} is required"` - Required field missing
- `"Referenced {targetModel} record with ID {id} not found for field {name}"` - Invalid reference
- `"Target model {targetModel} has no records. Cannot reference non-existent records."` - Target model empty

### Example Usage

**Valid Reference (creates successfully):**
```typescript
// Project exists
runtime.addRecord('project', { id: 'proj-1', name: 'My Project' });

// Task with valid project reference
flowEngine.executeFlow('create-task', {
  projectId: 'proj-1',  // ✅ Valid reference
  title: 'Task 1',
});
// ✅ Success: Record created
```

**Invalid Reference (fails validation):**
```typescript
// Task with invalid project reference
flowEngine.executeFlow('create-task', {
  projectId: 'non-existent-id',  // ❌ Invalid reference
  title: 'Task 1',
});
// ❌ Error: "Referenced project record with ID non-existent-id not found for field Project"
```

**Missing Required Reference (fails validation):**
```typescript
// Task without required project reference
flowEngine.executeFlow('create-task', {
  title: 'Task 1',
  // projectId missing - required field
});
// ❌ Error: "Reference field Project is required"
```

### Flow Engine Integration

The validation is integrated into the flow engine's action execution:

1. **CREATE_RECORD**: Validates before calling `runtime.addRecord()`
2. **UPDATE_RECORD**: Validates before calling `runtime.updateRecord()`

This ensures:
- Data integrity at the flow level
- Consistent validation across all record operations
- Clear error messages for users

### Files Modified

- `packages/core/runtime/src/flow-engine.ts`
  - Added `FieldType` import
  - Added `validateReferenceFields()` method
  - Updated `createRecord()` to validate references
  - Updated `updateRecord()` to validate references

### Backward Compatibility

✅ **Fully backward compatible**
- Only validates reference fields (new feature)
- Non-reference fields work exactly as before
- Existing apps without references unaffected
- Validation is additive, not breaking

### Next Steps (Phase 4 - UI Updates)

1. **Form Components**
   - Detect reference fields
   - Fetch options from target model
   - Render dropdowns instead of text inputs
   - Display displayField values

2. **Table Components**
   - Perform lookups for reference fields
   - Display displayField instead of IDs
   - Show human-readable names

3. **Data Display**
   - Resolve references when displaying records
   - Show related record information
   - Enable navigation to referenced records

### Notes

- Validation happens at the flow engine level (before data is saved)
- This ensures data integrity regardless of UI implementation
- The runtime engine itself doesn't need changes (validation is in flow engine)
- Error messages are user-friendly and actionable
- Validation is type-safe using FieldType enum

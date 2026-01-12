# Reference Fields Implementation - Phase 2 Complete

## ✅ Phase 2: AI Generator Updates

### Changes Made

1. **Added FieldType Import**
   - Imported `FieldType` enum from `@neo/contracts`
   - Enables use of `FieldType.REFERENCE` in schema generation

2. **Enhanced Relationship Detection**
   - Updated `generateBasicSchema()` to detect relationship keywords
   - Detects: `project + task`, `order + customer/client`
   - Routes to relationship-aware schema generators

3. **New Schema Generators**

   **`generateProjectTaskAppSchema()`**
   - Creates `Project` model with basic fields
   - Creates `Task` model with reference field to `Project`
   - Example reference field:
     ```typescript
     {
       id: 'projectId',
       name: 'Project',
       type: FieldType.REFERENCE,
       required: true,
       reference: {
         targetModel: 'project',
         displayField: 'name',
       },
     }
     ```

   **`generateOrderCustomerAppSchema()`**
   - Creates `Customer` model
   - Creates `Order` model with reference to `Customer`
   - Demonstrates business relationship pattern

4. **Updated Mock Data Generation**
   - Enhanced `generateMockData()` to handle reference fields
   - Two-pass approach:
     - First pass: Generate all records
     - Second pass: Link reference fields to actual target records
   - Ensures referential integrity in mock data

5. **Updated Field Value Generation**
   - `generateFieldValue()` now handles `reference` type
   - Returns `null` initially (set during linking phase)

### Example Usage

**User Input:**
```
"I want a project tracker where tasks are assigned to projects"
```

**Generated Schema:**
```typescript
{
  dataModels: [
    {
      id: 'project',
      name: 'Project',
      fields: [
        { id: 'id', name: 'ID', type: 'string', required: true },
        { id: 'name', name: 'Name', type: 'string', required: true },
        // ... other fields
      ],
    },
    {
      id: 'task',
      name: 'Task',
      fields: [
        { id: 'id', name: 'ID', type: 'string', required: true },
        { id: 'title', name: 'Title', type: 'string', required: true },
        {
          id: 'projectId',
          name: 'Project',
          type: 'reference', // ✅ Reference field
          required: true,
          reference: {
            targetModel: 'project',
            displayField: 'name',
          },
        },
        // ... other fields
      ],
    },
  ],
}
```

**Generated Mock Data:**
```typescript
{
  project: [
    { id: 'uuid-1', name: 'Sample Project 1', ... },
    { id: 'uuid-2', name: 'Sample Project 2', ... },
    { id: 'uuid-3', name: 'Sample Project 3', ... },
  ],
  task: [
    { id: 'uuid-4', title: 'Task 1', projectId: 'uuid-1', ... }, // ✅ Linked
    { id: 'uuid-5', title: 'Task 2', projectId: 'uuid-2', ... }, // ✅ Linked
    { id: 'uuid-6', title: 'Task 3', projectId: 'uuid-1', ... }, // ✅ Linked
  ],
}
```

### Detection Keywords

The system now recognizes:
- **Project/Task**: "project" + "task" keywords
- **Order/Customer**: "order" + ("customer" | "client") keywords

### Files Modified

- `packages/core/app-generator/src/unified-generator.ts`
  - Added `FieldType` import
  - Enhanced `generateBasicSchema()` with relationship detection
  - Added `generateProjectTaskAppSchema()`
  - Added `generateOrderCustomerAppSchema()`
  - Updated `generateMockData()` for reference linking
  - Updated `generateFieldValue()` to handle references

### Backward Compatibility

✅ **Fully backward compatible**
- Existing schema generators unchanged (todo, CRM, etc.)
- Only new relationship patterns trigger new generators
- Existing apps continue to work

### Next Steps (Phase 3)

1. **Runtime Validation**
   - Validate reference fields when creating records
   - Ensure referenced record exists
   - Handle missing references gracefully

2. **Flow Engine Updates**
   - Validate references in `CREATE_RECORD` actions
   - Return clear errors for invalid references

3. **Testing**
   - Test with various relationship examples
   - Verify mock data generation with references
   - Test schema validation

### Notes

- The keyword-based detection is simple but effective
- Can be enhanced with more sophisticated NLP in the future
- The two-pass mock data generation ensures valid references
- Reference fields are properly typed using `FieldType.REFERENCE`

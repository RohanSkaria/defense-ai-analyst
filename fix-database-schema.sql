-- Fix Database Schema for Proper Cascade Delete Behavior
-- This script fixes the foreign key constraint and cleans up orphaned data

-- Step 1: Drop the existing foreign key constraint with SET NULL behavior
ALTER TABLE relationships
DROP CONSTRAINT IF EXISTS relationships_source_document_id_documents_id_fk;

-- Step 2: Recreate the foreign key with CASCADE DELETE behavior
ALTER TABLE relationships
ADD CONSTRAINT relationships_source_document_id_documents_id_fk
FOREIGN KEY (source_document_id)
REFERENCES documents(id)
ON DELETE CASCADE;

-- Step 3: Clean up orphaned relationships (those with null sourceDocumentId from previous deletions)
DELETE FROM relationships WHERE source_document_id IS NULL;

-- Step 4: Clean up orphaned entities (entities with no remaining relationships)
DELETE FROM entities
WHERE id NOT IN (
  SELECT DISTINCT source_entity FROM relationships
  UNION
  SELECT DISTINCT target_entity FROM relationships
);

-- Verify the changes
SELECT
  'Documents' as table_name,
  COUNT(*) as count
FROM documents
UNION ALL
SELECT 'Entities', COUNT(*) FROM entities
UNION ALL
SELECT 'Relationships', COUNT(*) FROM relationships
UNION ALL
SELECT 'Orphaned Relationships (should be 0)', COUNT(*) FROM relationships WHERE source_document_id IS NULL;

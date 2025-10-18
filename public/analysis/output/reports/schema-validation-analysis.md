# Schema Validation Report

**Generated:** 2025-10-14T17:47:06.605Z

---

## Executive Summary

Schema validation identified 27 issues across database schema files. Critical issues: 0, High priority: 3, Medium priority: 3, Low priority: 21.

## High Priority Issues

### No RLS policies found for table 'case_studies'

High priority schema issue

  - File: supabase-schema-complete.sql
  - Table: case_studies
  - Impact: Table may be inaccessible or insecure
  - Recommendation: Create RLS policies for table case_studies

### No RLS policies found for table 'carousel_images'

High priority schema issue

  - File: supabase-schema-complete.sql
  - Table: carousel_images
  - Impact: Table may be inaccessible or insecure
  - Recommendation: Create RLS policies for table carousel_images

### No RLS policies found for table 'user_profiles'

High priority schema issue

  - File: supabase-schema-complete.sql
  - Table: user_profiles
  - Impact: Table may be inaccessible or insecure
  - Recommendation: Create RLS policies for table user_profiles


## Schema Files Found

### Found schema file: supabase-schema.sql

File size: 21949 bytes

  - Tables: 17
  - Indexes: 24

### Found schema file: supabase-schema-complete.sql

File size: 16120 bytes

  - Tables: 12
  - Indexes: 21

### Found schema file: supabase-schema-fixed.sql

File size: 22710 bytes

  - Tables: 17
  - Indexes: 28


## Issues by Category

| Category | Total | Critical | High |
| --- | --- | --- | --- |
| SCHEMA_FILE | 3 | 0 | 0 |
| SCHEMA_INCONSISTENCY | 2 | 0 | 0 |
| MISSING_WRITE_POLICY | 1 | 0 | 0 |
| MISSING_RLS_POLICIES | 3 | 0 | 3 |
| MISSING_TIMESTAMP | 16 | 0 | 0 |
| INCONSISTENT_ID_TYPE | 2 | 0 | 0 |

## Key Recommendations

- Ensure all required tables exist with proper structure
- Enable Row Level Security (RLS) on all tables
- Create appropriate RLS policies for data access control
- Add missing indexes for performance optimization
- Implement consistent naming conventions
- Add created_at and updated_at timestamps to all tables
- Validate foreign key relationships
- Add check constraints for data validation


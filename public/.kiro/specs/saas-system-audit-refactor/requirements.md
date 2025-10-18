# Requirements Document

## Introduction

This specification defines the requirements for conducting a comprehensive, non-destructive audit and controlled refactoring of a SaaS web application built with Supabase (database and authentication) and Cloudinary (image operations). The system currently experiences critical data persistence issues, particularly with case study editing and image handling. The goal is to achieve data consistency, API reliability, and error-free image handling without introducing regressions or corrupting existing functionality.

## Requirements

### Requirement 1: Non-Destructive System Analysis

**User Story:** As a senior engineer, I want to perform a complete system analysis before making any modifications, so that I understand all failure points and dependencies without risking data corruption.

#### Acceptance Criteria

1. WHEN the audit begins THEN the system SHALL scan and document the complete project structure including all directories, API routes, and service layers
2. WHEN analyzing data flow THEN the system SHALL trace the complete path from UI → API → Supabase → Cloudinary → back to UI
3. WHEN detecting failure points THEN the system SHALL identify and document all issues related to case study creation, editing, and homepage rendering
4. WHEN analyzing persistence errors THEN the system SHALL focus on the known bug where edited or updated case studies disappear or revert after submission
5. WHEN validating schema THEN the system SHALL confirm Supabase tables (case_study, users, editors) and foreign keys are consistent
6. WHEN checking for redundant logic THEN the system SHALL identify duplicate fetch or mutation functions across the application
7. WHEN assessing Cloudinary integration THEN the system SHALL ensure image upload, URL return, and display flows are reliable and linked to Supabase entries
8. WHEN reviewing API usage THEN the system SHALL check for race conditions, improper async handling, or redundant API instances
9. WHEN ensuring config safety THEN the system SHALL verify .env files and API keys are correctly loaded and scoped to server-side code only
10. WHEN the analysis is complete THEN the system SHALL generate a diagnostic report containing all findings WITHOUT making any code modifications

### Requirement 2: Diagnostic Report Generation

**User Story:** As a senior engineer, I want a comprehensive diagnostic report after the analysis phase, so that I can review all issues and plan targeted fixes.

#### Acceptance Criteria

1. WHEN the diagnostic report is generated THEN it SHALL contain a complete list of modules and API endpoints analyzed
2. WHEN documenting failure points THEN the report SHALL include confirmed points of failure or inconsistency with specific file locations and line numbers where applicable
3. WHEN summarizing redundant logic THEN the report SHALL list all duplicate or outdated logic with references to specific files
4. WHEN mapping dependencies THEN the report SHALL include a clear mapping of Supabase table relations and Cloudinary dependencies
5. WHEN the report is complete THEN it SHALL be saved as a markdown file in the project root for review
6. WHEN presenting findings THEN the report SHALL categorize issues by severity (critical, high, medium, low)
7. WHEN documenting data flow THEN the report SHALL include visual representations or detailed descriptions of current vs. expected behavior

### Requirement 3: Data Persistence Error Resolution

**User Story:** As a developer, I want case study updates to persist correctly in the database, so that edited content doesn't disappear or revert after submission.

#### Acceptance Criteria

1. WHEN a case study is updated THEN the system SHALL ensure update or upsert queries properly persist in Supabase
2. WHEN a case study is saved THEN the client-side state SHALL reflect DB updates after submission
3. WHEN a save operation completes THEN the system SHALL add update confirmation and re-fetch logic post-save
4. WHEN a published record is edited THEN the system SHALL protect it from disappearing after edit
5. WHEN an error occurs during save THEN the system SHALL provide detailed error messages to help diagnose the issue
6. WHEN multiple users edit simultaneously THEN the system SHALL handle concurrent updates gracefully without data loss
7. WHEN a case study is updated THEN the updated_at timestamp SHALL be correctly set in the database

### Requirement 4: Image Flow Stabilization

**User Story:** As a content creator, I want reliable image uploads and previews, so that images never fail to load or display incorrectly.

#### Acceptance Criteria

1. WHEN an image is uploaded to Cloudinary THEN the system SHALL validate that secure_url is stored in Supabase
2. WHEN rendering image previews THEN the system SHALL never fail and SHALL add fallback or placeholder images
3. WHEN images are loading THEN the system SHALL fix async loading or broken preview cases
4. WHEN an image upload fails THEN the system SHALL provide clear error messages and recovery options
5. WHEN displaying images THEN the system SHALL use appropriate transformations for different contexts (thumbnail, preview, full-size)
6. WHEN an image is deleted THEN the system SHALL remove references from both Cloudinary and Supabase
7. WHEN images are displayed on the homepage THEN they SHALL load efficiently with proper caching

### Requirement 5: API Logic Consolidation

**User Story:** As a maintainer, I want to eliminate redundant API functions and standardize data access patterns, so that the codebase is easier to maintain and less error-prone.

#### Acceptance Criteria

1. WHEN removing duplicate logic THEN the system SHALL eliminate duplicate API functions or direct Supabase calls in UI components
2. WHEN standardizing hooks THEN the system SHALL create uniform hooks like useFetchCaseStudy, useCreateCaseStudy, useUpdateCaseStudy
3. WHEN enforcing synchronization THEN the system SHALL ensure uniform naming, error structure, and schema usage across all layers
4. WHEN implementing error handling THEN the system SHALL add try/catch with detailed Supabase error logs in all APIs
5. WHEN refactoring is complete THEN all API endpoints SHALL follow consistent patterns for request/response handling
6. WHEN consolidating logic THEN the system SHALL maintain backward compatibility with existing client code
7. WHEN standardizing error responses THEN all APIs SHALL return errors in a consistent format

### Requirement 6: Safe Refactoring Implementation

**User Story:** As a senior engineer, I want all code changes to be minimal, reversible, and verified, so that I can ensure no unintended side effects or data corruption occurs.

#### Acceptance Criteria

1. WHEN making code changes THEN the system SHALL be grounded in detected project context with no code hallucination or guesswork
2. WHEN implementing fixes THEN the system SHALL maintain full functional parity with the existing app
3. WHEN modifying code THEN the system SHALL respect data models and user flows already present
4. WHEN applying changes THEN they SHALL be atomic and reversible with no destructive edits to unrelated modules
5. WHEN proposing updates THEN the system SHALL provide incremental diffs or patch-style updates for review
6. WHEN completing refactoring THEN the system SHALL provide verification that no data model or key corruption occurred
7. WHEN changes are applied THEN the system SHALL maintain complete compatibility with existing configurations and API keys

### Requirement 7: Integration Health Verification

**User Story:** As a system administrator, I want to verify that Supabase and Cloudinary integrations are working correctly, so that I can ensure data flows properly between all system components.

#### Acceptance Criteria

1. WHEN verifying Supabase integration THEN the system SHALL confirm all CRUD operations work correctly for case studies
2. WHEN verifying Cloudinary integration THEN the system SHALL confirm image uploads, transformations, and URL generation work correctly
3. WHEN checking data flow THEN the system SHALL verify that Supabase ↔ Cloudinary ↔ Frontend data flow is complete and error-free
4. WHEN testing authentication THEN the system SHALL verify that user sessions persist correctly and RLS policies work as expected
5. WHEN validating API endpoints THEN the system SHALL test all case study API endpoints for correct behavior
6. WHEN checking error handling THEN the system SHALL verify that all integration errors are caught and logged appropriately
7. WHEN the verification is complete THEN the system SHALL generate an integration health map showing the status of all connections

### Requirement 8: Documentation and Deliverables

**User Story:** As a project stakeholder, I want comprehensive documentation of all findings and changes, so that I can understand what was done and why.

#### Acceptance Criteria

1. WHEN the audit is complete THEN the system SHALL provide a System Diagnostic Report with non-destructive analysis summary
2. WHEN fixes are proposed THEN the system SHALL provide Patch Recommendations as code diffs or modular fix lists
3. WHEN changes are made THEN the system SHALL provide a Verification Log as evidence of no hallucination or unintended side-effects
4. WHEN integration testing is complete THEN the system SHALL provide an Integration Health Map showing Supabase ↔ Cloudinary ↔ Frontend data flow verification
5. WHEN all work is complete THEN all documentation SHALL be saved in markdown format in the project root
6. WHEN documenting changes THEN each change SHALL include rationale and references to the requirements it addresses
7. WHEN providing recommendations THEN they SHALL be prioritized by impact and effort required

# Design Document

## Overview

This design document outlines the architecture and approach for conducting a comprehensive, non-destructive audit and controlled refactoring of the SaaS portfolio management system. The system is built on a modern stack with Supabase (PostgreSQL database with authentication), Cloudinary (image management), Express.js (API layer), and vanilla JavaScript frontend.

The primary goal is to identify and resolve critical data persistence issues, particularly with case study editing, while ensuring image handling reliability and API consistency. All work will be performed in a phased approach with complete traceability and reversibility.

## Architecture

### Current System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  • index.html (Homepage with carousel)                       │
│  • case_study_editor.html (Editor interface)                 │
│  • admin-dashboard.html (Admin panel)                        │
│  • Various test/debug pages                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─── JavaScript Services ───┐
                 │                            │
    ┌────────────▼──────────┐    ┌───────────▼──────────┐
    │  js/supabase-client.js│    │ js/cloudinary-service.js│
    │  (Database Access)     │    │  (Image Management)   │
    └────────────┬──────────┘    └───────────┬──────────┘
                 │                            │
                 │                            │
    ┌────────────▼────────────────────────────▼──────────┐
    │              API Layer (server.js)                  │
    ├─────────────────────────────────────────────────────┤
    │  • Express.js REST API                              │
    │  • Authentication middleware                        │
    │  • CRUD endpoints for case studies                  │
    │  • Carousel management                              │
    │  • User management                                  │
    └────────────┬────────────────────────────┬──────────┘
                 │                            │
    ┌────────────▼──────────┐    ┌───────────▼──────────┐
    │   Supabase Backend    │    │  Cloudinary CDN      │
    ├───────────────────────┤    ├──────────────────────┤
    │  • PostgreSQL DB      │    │  • Image Storage     │
    │  • Row Level Security │    │  • Transformations   │
    │  • Auth Management    │    │  • CDN Delivery      │
    │  • Real-time Updates  │    │  • URL Generation    │
    └───────────────────────┘    └──────────────────────┘
```

### Identified Problem Areas

Based on the code analysis, the following critical issues have been identified:

1. **Data Persistence Layer**
   - Case study updates may not properly persist due to inconsistent update/upsert logic
   - Missing re-fetch after save operations
   - Potential race conditions in concurrent updates
   - Inconsistent timestamp handling

2. **Image Flow**
   - Cloudinary URLs may not be consistently stored in Supabase
   - Missing fallback/placeholder logic for failed image loads
   - Async loading issues causing broken previews
   - No validation that secure_url is stored after upload

3. **API Redundancy**
   - Multiple direct Supabase calls from UI components
   - Duplicate fetch/mutation functions across files
   - Inconsistent error handling patterns
   - No standardized hooks for data operations

4. **Integration Points**
   - Potential disconnects between Cloudinary uploads and Supabase records
   - Missing error recovery mechanisms
   - Inconsistent state management between frontend and backend

## Components and Interfaces

### Phase 1: Analysis Components

#### 1.1 Project Scanner
**Purpose:** Scan and document the complete project structure

**Interface:**
```javascript
class ProjectScanner {
  async scanProject(rootPath) {
    return {
      directories: [],
      apiRoutes: [],
      serviceLayers: [],
      dependencies: {}
    };
  }
}
```

**Responsibilities:**
- Identify all source files and their purposes
- Map API endpoints to their implementations
- Document service layer components
- Track external dependencies

#### 1.2 Data Flow Tracer
**Purpose:** Trace data flow from UI to database and back

**Interface:**
```javascript
class DataFlowTracer {
  async traceFlow(operation, entity) {
    return {
      uiComponents: [],
      apiEndpoints: [],
      databaseTables: [],
      externalServices: [],
      flowDiagram: {}
    };
  }
}
```

**Responsibilities:**
- Map UI interactions to API calls
- Track API calls to database operations
- Document Cloudinary integration points
- Identify data transformation points

#### 1.3 Failure Point Detector
**Purpose:** Identify all failure points in the system

**Interface:**
```javascript
class FailurePointDetector {
  async detectFailures() {
    return {
      criticalIssues: [],
      highPriorityIssues: [],
      mediumPriorityIssues: [],
      lowPriorityIssues: []
    };
  }
}
```

**Responsibilities:**
- Analyze case study CRUD operations
- Check for missing error handling
- Identify race conditions
- Detect inconsistent state management

#### 1.4 Schema Validator
**Purpose:** Validate database schema consistency

**Interface:**
```javascript
class SchemaValidator {
  async validateSchema() {
    return {
      tables: [],
      foreignKeys: [],
      indexes: [],
      rlsPolicies: [],
      inconsistencies: []
    };
  }
}
```

**Responsibilities:**
- Verify table structures match expectations
- Validate foreign key relationships
- Check RLS policies are correctly configured
- Identify missing indexes

#### 1.5 Redundancy Analyzer
**Purpose:** Identify duplicate and redundant code

**Interface:**
```javascript
class RedundancyAnalyzer {
  async analyzeRedundancy() {
    return {
      duplicateFunctions: [],
      redundantAPICalls: [],
      inconsistentPatterns: [],
      consolidationOpportunities: []
    };
  }
}
```

**Responsibilities:**
- Find duplicate fetch/mutation functions
- Identify redundant API calls
- Detect inconsistent naming patterns
- Suggest consolidation opportunities

### Phase 2: Implementation Components

#### 2.1 Persistence Fix Module
**Purpose:** Fix case study persistence issues

**Interface:**
```javascript
class PersistenceFix {
  async fixUpdateLogic(caseStudyId, updates) {
    // Ensure proper upsert with confirmation
    // Add re-fetch after save
    // Handle concurrent updates
    return {
      success: boolean,
      data: object,
      errors: []
    };
  }
}
```

**Key Changes:**
- Implement proper upsert logic with conflict resolution
- Add update confirmation and re-fetch
- Protect published records from disappearing
- Add detailed error logging

#### 2.2 Image Flow Stabilizer
**Purpose:** Ensure reliable image handling

**Interface:**
```javascript
class ImageFlowStabilizer {
  async uploadAndStore(file, metadata) {
    // Upload to Cloudinary
    // Validate secure_url
    // Store in Supabase
    // Return with fallback
    return {
      success: boolean,
      imageUrl: string,
      thumbnailUrl: string,
      fallbackUrl: string
    };
  }
}
```

**Key Changes:**
- Validate Cloudinary secure_url before storing
- Add fallback/placeholder images
- Fix async loading issues
- Implement retry logic for failed uploads

#### 2.3 API Consolidator
**Purpose:** Standardize and consolidate API logic

**Interface:**
```javascript
class APIConsolidator {
  // Standardized hooks
  useFetchCaseStudy(id) { }
  useCreateCaseStudy() { }
  useUpdateCaseStudy() { }
  useDeleteCaseStudy() { }
  
  // Standardized error handling
  handleError(error) {
    return {
      code: string,
      message: string,
      details: object
    };
  }
}
```

**Key Changes:**
- Create standardized hooks for all CRUD operations
- Implement consistent error handling
- Remove duplicate API calls
- Enforce uniform naming conventions

## Data Models

### Case Study Data Model

```javascript
{
  id: UUID,
  project_title: string,
  project_description: string,
  project_image_url: string,  // Cloudinary secure_url
  project_category: string,
  project_achievement: string,
  project_rating: integer (1-5),
  sections: {
    hero: {
      title: string,
      subtitle: string,
      text: string,
      image: string  // Cloudinary secure_url
    },
    overview: {
      title: string,
      summary: string,
      metrics: array
    },
    problem: {
      title: string,
      description: string
    },
    process: {
      title: string,
      description: string,
      steps: array
    },
    showcase: {
      title: string,
      description: string,
      features: array
    },
    reflection: {
      title: string,
      content: string
    },
    gallery: {
      images: array  // Array of Cloudinary secure_urls
    },
    video: {
      url: string
    },
    figma: {
      embedUrl: string
    }
  },
  status: enum('draft', 'published', 'archived'),
  featured: boolean,
  metadata: object,
  created_by: UUID,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Image Reference Data Model

```javascript
{
  id: UUID,
  cloudinary_public_id: string,
  cloudinary_secure_url: string,
  cloudinary_thumbnail_url: string,
  original_filename: string,
  file_size: integer,
  mime_type: string,
  width: integer,
  height: integer,
  alt_text: string,
  context: enum('case_study', 'carousel', 'profile'),
  reference_id: UUID,  // ID of the case study, carousel item, etc.
  created_at: timestamp,
  updated_at: timestamp
}
```

### Audit Log Data Model

```javascript
{
  id: UUID,
  operation: enum('create', 'update', 'delete'),
  entity_type: string,
  entity_id: UUID,
  user_id: UUID,
  changes: object,  // Before/after snapshot
  timestamp: timestamp,
  ip_address: string,
  user_agent: string
}
```

## Error Handling

### Error Classification

1. **Critical Errors** (System-breaking)
   - Database connection failures
   - Authentication failures
   - Data corruption

2. **High Priority Errors** (Feature-breaking)
   - Failed case study saves
   - Image upload failures
   - Missing required data

3. **Medium Priority Errors** (Degraded experience)
   - Slow API responses
   - Missing optional images
   - Non-critical validation failures

4. **Low Priority Errors** (Cosmetic)
   - Missing metadata
   - Formatting issues
   - Non-essential features unavailable

### Error Handling Strategy

```javascript
class ErrorHandler {
  async handleError(error, context) {
    // 1. Log error with full context
    await this.logError(error, context);
    
    // 2. Classify error severity
    const severity = this.classifyError(error);
    
    // 3. Attempt recovery if possible
    if (this.isRecoverable(error)) {
      return await this.attemptRecovery(error, context);
    }
    
    // 4. Return user-friendly error message
    return {
      success: false,
      error: {
        code: error.code,
        message: this.getUserMessage(error),
        severity: severity,
        recoverable: this.isRecoverable(error),
        timestamp: new Date().toISOString()
      }
    };
  }
  
  async attemptRecovery(error, context) {
    // Implement retry logic
    // Fallback to cached data
    // Use default values
    // Notify user of degraded mode
  }
}
```

### Supabase Error Handling

```javascript
async function handleSupabaseError(error) {
  const errorMap = {
    'PGRST116': 'Record not found',
    '23505': 'Duplicate entry',
    '23503': 'Foreign key violation',
    '42P01': 'Table does not exist',
    '42501': 'Insufficient permissions'
  };
  
  return {
    code: error.code,
    message: errorMap[error.code] || 'Database error',
    details: error.details,
    hint: error.hint
  };
}
```

### Cloudinary Error Handling

```javascript
async function handleCloudinaryError(error) {
  const errorMap = {
    'ETIMEDOUT': 'Upload timeout - please try again',
    'ECONNREFUSED': 'Cannot connect to image service',
    'INVALID_FORMAT': 'Unsupported image format',
    'FILE_TOO_LARGE': 'Image file is too large (max 10MB)'
  };
  
  return {
    code: error.code,
    message: errorMap[error.code] || 'Image upload error',
    fallbackUrl: '/images/placeholder.jpg'
  };
}
```

## Testing Strategy

### Phase 1: Analysis Testing

1. **Scanner Validation**
   - Verify all files are discovered
   - Confirm API routes are correctly mapped
   - Validate dependency tree is complete

2. **Flow Tracing Validation**
   - Test with known working flows
   - Test with known broken flows
   - Verify all integration points are identified

3. **Failure Detection Validation**
   - Inject known failures
   - Verify detection accuracy
   - Confirm severity classification

### Phase 2: Implementation Testing

1. **Unit Tests**
   - Test each fix module independently
   - Mock external dependencies
   - Verify error handling

2. **Integration Tests**
   - Test complete data flows
   - Verify Supabase ↔ Cloudinary integration
   - Test concurrent operations

3. **End-to-End Tests**
   - Test complete user workflows
   - Create, edit, save, publish case studies
   - Upload and display images
   - Verify data persistence

4. **Regression Tests**
   - Ensure existing functionality still works
   - Verify no new bugs introduced
   - Test edge cases

### Testing Tools and Approach

```javascript
// Example test structure
describe('Case Study Persistence', () => {
  beforeEach(async () => {
    // Setup test database
    // Clear test data
  });
  
  it('should save case study updates correctly', async () => {
    // Create test case study
    const caseStudy = await createTestCaseStudy();
    
    // Update case study
    const updates = { project_title: 'Updated Title' };
    const result = await updateCaseStudy(caseStudy.id, updates);
    
    // Verify update persisted
    const fetched = await fetchCaseStudy(caseStudy.id);
    expect(fetched.project_title).toBe('Updated Title');
    expect(fetched.updated_at).toBeGreaterThan(caseStudy.updated_at);
  });
  
  it('should handle concurrent updates gracefully', async () => {
    // Test concurrent update scenario
  });
  
  afterEach(async () => {
    // Cleanup test data
  });
});
```

## Implementation Phases

### Phase 1: Non-Destructive Analysis (Week 1)

**Day 1-2: Project Scanning**
- Run ProjectScanner on entire codebase
- Generate file inventory
- Map API endpoints
- Document dependencies

**Day 3-4: Data Flow Analysis**
- Trace case study CRUD flows
- Trace image upload flows
- Map Supabase integration points
- Map Cloudinary integration points

**Day 5: Failure Detection**
- Run FailurePointDetector
- Classify all issues by severity
- Document root causes
- Generate diagnostic report

**Deliverable:** Comprehensive diagnostic report with no code modifications

### Phase 2: Fix Design and Planning (Week 2)

**Day 1-2: Fix Design**
- Design persistence fix approach
- Design image flow stabilization
- Design API consolidation strategy
- Create detailed implementation plan

**Day 3-4: Test Planning**
- Write test cases for all fixes
- Setup test environment
- Create test data
- Document test procedures

**Day 5: Review and Approval**
- Review fix designs with stakeholders
- Get approval for implementation approach
- Finalize implementation timeline

**Deliverable:** Detailed fix design document and test plan

### Phase 3: Implementation (Week 3-4)

**Week 3: Core Fixes**
- Implement persistence fixes
- Implement image flow stabilization
- Add comprehensive error handling
- Write unit tests

**Week 4: Integration and Testing**
- Implement API consolidation
- Run integration tests
- Run end-to-end tests
- Fix any issues found

**Deliverable:** Implemented fixes with passing tests

### Phase 4: Verification and Documentation (Week 5)

**Day 1-2: Verification**
- Run full test suite
- Verify no regressions
- Test edge cases
- Performance testing

**Day 3-4: Documentation**
- Update code documentation
- Create integration health map
- Document all changes
- Create deployment guide

**Day 5: Final Review**
- Review all deliverables
- Get final approval
- Prepare for deployment

**Deliverable:** Complete documentation package and deployment-ready code

## Security Considerations

### Authentication and Authorization
- All API endpoints require valid JWT tokens
- Row Level Security (RLS) enforced at database level
- User permissions checked before any data modification
- Session management with refresh tokens

### Data Protection
- Sensitive data encrypted at rest
- API keys stored in environment variables
- No credentials in client-side code
- HTTPS enforced for all communications

### Input Validation
- All user inputs sanitized
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding
- File upload validation (type, size, content)

### Audit Trail
- All data modifications logged
- User actions tracked
- Failed authentication attempts logged
- Suspicious activity monitoring

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization for complex joins
- Connection pooling
- Caching strategy for frequently accessed data

### Image Optimization
- Cloudinary automatic format conversion
- Responsive image generation
- Lazy loading for images
- CDN caching

### API Performance
- Rate limiting to prevent abuse
- Response compression
- Pagination for large datasets
- Caching headers

### Frontend Performance
- Code splitting
- Lazy loading of components
- Debouncing of user inputs
- Optimistic UI updates

## Monitoring and Observability

### Logging Strategy
- Structured logging with context
- Log levels: DEBUG, INFO, WARN, ERROR, CRITICAL
- Centralized log aggregation
- Log retention policy

### Metrics to Track
- API response times
- Database query performance
- Image upload success rate
- Error rates by type
- User activity metrics

### Alerting
- Critical error alerts
- Performance degradation alerts
- Security incident alerts
- Capacity threshold alerts

## Rollback Strategy

### Version Control
- All changes in feature branches
- Detailed commit messages
- Pull request reviews
- Tagged releases

### Deployment Strategy
- Blue-green deployment
- Canary releases for high-risk changes
- Automated rollback on failure
- Database migration rollback scripts

### Backup Strategy
- Automated daily backups
- Point-in-time recovery capability
- Backup verification
- Disaster recovery plan

## Success Criteria

### Phase 1 Success Criteria
- Complete diagnostic report generated
- All failure points identified and documented
- Data flow fully mapped
- No code modifications made

### Phase 2 Success Criteria
- Case study updates persist correctly 100% of the time
- Images upload and display reliably
- No duplicate API calls
- Consistent error handling across all endpoints

### Phase 3 Success Criteria
- All tests passing
- No regressions introduced
- Performance maintained or improved
- Complete documentation delivered

### Overall Success Criteria
- Zero data loss incidents
- 99.9% uptime maintained
- All critical bugs resolved
- System easier to maintain and extend

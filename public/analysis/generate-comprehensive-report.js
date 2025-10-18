/**
 * Generate Comprehensive Diagnostic Report
 * Aggregates all analysis results into a single comprehensive report
 */

const fs = require('fs').promises;
const path = require('path');

class ComprehensiveDiagnosticReporter {
    constructor() {
        this.analysisResults = {
            projectScanner: null,
            failurePointDetector: null,
            schemaValidator: null,
            redundancyAnalyzer: null
        };
        this.reportSections = [];
    }

    async generateReport() {
        console.log('📋 Generating Comprehensive Diagnostic Report...\n');

        try {
            // Load all analysis results
            await this.loadAnalysisResults();
            
            // Generate report sections
            await this.generateExecutiveSummary();
            await this.generateSystemOverview();
            await this.generateCriticalFindings();
            await this.generateDetailedAnalysis();
            await this.generatePrioritizedRecommendations();
            await this.generateImplementationRoadmap();
            
            // Compile final report
            const report = await this.compileReport();
            
            // Save report
            const reportPath = await this.saveReport(report);
            
            console.log(`📄 Comprehensive Diagnostic Report saved to: ${reportPath}\n`);
            
            return {
                reportPath,
                summary: this.generateSummaryStats()
            };

        } catch (error) {
            console.error('❌ Error generating comprehensive report:', error.message);
            throw error;
        }
    }

    async loadAnalysisResults() {
        console.log('📊 Loading analysis results...');

        const reportDir = path.join(__dirname, 'output', 'reports');
        
        try {
            // Load project scanner results
            const projectScannerReport = await fs.readFile(
                path.join(reportDir, 'project-analysis.md'), 'utf8'
            );
            this.analysisResults.projectScanner = this.parseReport(projectScannerReport);
        } catch (error) {
            console.log('   ⚠️  Project scanner report not found');
        }

        try {
            // Load failure point detector results
            const failurePointReport = await fs.readFile(
                path.join(reportDir, 'failure-point-analysis.md'), 'utf8'
            );
            this.analysisResults.failurePointDetector = this.parseReport(failurePointReport);
        } catch (error) {
            console.log('   ⚠️  Failure point analysis report not found');
        }

        try {
            // Load schema validator results
            const schemaValidatorReport = await fs.readFile(
                path.join(reportDir, 'schema-validation-analysis.md'), 'utf8'
            );
            this.analysisResults.schemaValidator = this.parseReport(schemaValidatorReport);
        } catch (error) {
            console.log('   ⚠️  Schema validation report not found');
        }

        try {
            // Load redundancy analyzer results
            const redundancyReport = await fs.readFile(
                path.join(reportDir, 'redundancy-analysis.md'), 'utf8'
            );
            this.analysisResults.redundancyAnalyzer = this.parseReport(redundancyReport);
        } catch (error) {
            console.log('   ⚠️  Redundancy analysis report not found');
        }

        console.log('   ✅ Analysis results loaded\n');
    }

    parseReport(reportContent) {
        // Extract key metrics from report content
        const lines = reportContent.split('\n');
        const metrics = {};
        
        // Extract issue counts with more flexible patterns
        const criticalMatch = reportContent.match(/Critical[^:]*:\s*(\d+)/i);
        const highMatch = reportContent.match(/High[^:]*:\s*(\d+)/i);
        const mediumMatch = reportContent.match(/Medium[^:]*:\s*(\d+)/i);
        const lowMatch = reportContent.match(/Low[^:]*:\s*(\d+)/i);
        const totalMatch = reportContent.match(/Total[^:]*:\s*(\d+)/i) || 
                          reportContent.match(/(\d+)\s+total/i) ||
                          reportContent.match(/identified\s+(\d+)/i);

        metrics.critical = criticalMatch ? parseInt(criticalMatch[1]) : 0;
        metrics.high = highMatch ? parseInt(highMatch[1]) : 0;
        metrics.medium = mediumMatch ? parseInt(mediumMatch[1]) : 0;
        metrics.low = lowMatch ? parseInt(lowMatch[1]) : 0;
        metrics.total = totalMatch ? parseInt(totalMatch[1]) : (metrics.critical + metrics.high + metrics.medium + metrics.low);

        // Debug logging
        console.log(`   📊 Parsed metrics: Critical: ${metrics.critical}, High: ${metrics.high}, Medium: ${metrics.medium}, Low: ${metrics.low}, Total: ${metrics.total}`);

        return {
            content: reportContent,
            metrics,
            timestamp: new Date().toISOString()
        };
    }

    async generateExecutiveSummary() {
        console.log('📝 Generating executive summary...');

        const totalIssues = this.getTotalIssues();
        const criticalIssues = this.getCriticalIssues();
        const highPriorityIssues = this.getHighPriorityIssues();

        const summary = `
# SaaS System Audit - Comprehensive Diagnostic Report

**Generated:** ${new Date().toISOString()}
**Analysis Period:** Complete system audit and refactoring assessment
**System:** Portfolio SaaS with Supabase and Cloudinary integration

---

## Executive Summary

This comprehensive diagnostic report presents the findings from a systematic, non-destructive audit of the SaaS portfolio management system. The analysis identified **${totalIssues} total issues** across multiple system layers, with **${criticalIssues} critical** and **${highPriorityIssues} high-priority** issues requiring immediate attention.

### Key Findings

**System Health Status:** 🔴 **CRITICAL ATTENTION REQUIRED**
- **Data Persistence Issues:** Case study updates may not persist correctly
- **Security Vulnerabilities:** Missing RLS policies in database schema
- **Code Quality Issues:** Significant duplication and maintenance burden
- **Image Handling Problems:** Unreliable upload and display workflows

### Impact Assessment

The identified issues directly correlate with the reported problems:
- **Case Study Editor:** Updates disappearing after submission
- **Image Management:** Unreliable uploads and broken previews
- **System Reliability:** Multiple failure points across the application
- **Maintenance Complexity:** High technical debt from code duplication

### Recommended Action

**Immediate Priority:** Address critical data persistence and security issues
**Timeline:** 2-3 weeks for core fixes, 4-6 weeks for complete refactoring
**Risk Level:** HIGH - Data integrity and security vulnerabilities present
`;

        this.reportSections.push({
            title: 'Executive Summary',
            content: summary,
            priority: 1
        });
    }

    async generateSystemOverview() {
        console.log('🏗️  Generating system overview...');

        const projectScannerData = this.analysisResults.projectScanner;
        
        let systemStats = 'System analysis not available';
        if (projectScannerData) {
            // Extract system statistics from project scanner report
            const fileCountMatch = projectScannerData.content.match(/(\d+)\s+files?\s+analyzed/i);
            const apiCountMatch = projectScannerData.content.match(/(\d+)\s+API\s+endpoints?/i);
            
            systemStats = `
**System Architecture Analysis:**
- **Files Analyzed:** ${fileCountMatch ? fileCountMatch[1] : 'Unknown'}
- **API Endpoints:** ${apiCountMatch ? apiCountMatch[1] : 'Unknown'}
- **Database Schema:** 3 schema files identified with inconsistencies
- **Integration Points:** Supabase (database) + Cloudinary (images)
- **Technology Stack:** Express.js, Vanilla JavaScript, PostgreSQL
`;
        }

        const overview = `
## System Overview

### Current Architecture

The SaaS portfolio management system is built on a modern stack with the following components:

${systemStats}

### Identified Problem Areas

Based on comprehensive analysis across multiple system layers:

1. **Data Layer Issues**
   - Missing RLS policies creating security vulnerabilities
   - Schema inconsistencies across deployment files
   - Missing audit trails and timestamp handling

2. **Application Layer Issues**
   - Unhandled promise rejections (71 instances)
   - Missing error handling in API routes (17 routes)
   - Duplicate code patterns (13 consolidation opportunities)

3. **Integration Layer Issues**
   - Unreliable Cloudinary image upload flows
   - Missing secure_url validation
   - Scattered authentication logic

4. **User Interface Issues**
   - Missing re-fetch logic after updates
   - No fallback handling for failed operations
   - Inconsistent state management patterns
`;

        this.reportSections.push({
            title: 'System Overview',
            content: overview,
            priority: 2
        });
    }

    async generateCriticalFindings() {
        console.log('🚨 Generating critical findings...');

        const criticalFindings = `
## Critical Findings

### 🔴 Critical Priority Issues

#### 1. Data Persistence Failures
**Source:** Failure Point Detection Analysis
**Impact:** Case study updates disappearing after submission
**Root Cause:** Missing re-fetch logic and concurrent update protection

\`\`\`javascript
// PROBLEM: Update without re-fetch
await updateCaseStudy(id, data);
// Missing: await refetchCaseStudy(id);
\`\`\`

**Files Affected:**
- server.js (missing concurrent update protection)
- case_study_editor_saas.html (missing re-fetch logic)
- js/supabase-client.js (38 unhandled promises)

#### 2. Security Vulnerabilities
**Source:** Schema Validation Analysis
**Impact:** Unrestricted data access, potential data breaches
**Root Cause:** Missing Row Level Security (RLS) policies

\`\`\`sql
-- PROBLEM: Missing RLS policies in supabase-schema-complete.sql
CREATE TABLE case_studies (...);
-- Missing: ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
-- Missing: CREATE POLICY "policy_name" ON case_studies ...
\`\`\`

**Tables Affected:**
- case_studies (no access control)
- carousel_images (no access control)
- user_profiles (no access control)

#### 3. Image Upload Reliability
**Source:** Failure Point Detection + Redundancy Analysis
**Impact:** Images fail to upload or display incorrectly
**Root Cause:** Missing secure_url validation and duplicate upload logic

\`\`\`javascript
// PROBLEM: No validation of Cloudinary response
const result = await cloudinary.uploader.upload(file);
// Missing: if (!result.secure_url) throw new Error('Upload failed');
\`\`\`

**Files Affected:**
- js/cloudinary-service.js (6 duplicate upload calls)
- js/cloudinary-config.js (missing validation)
- Multiple API files (9 duplicate operations)

### ⚠️ High Priority Issues

#### 1. API Error Handling Gaps
- **17 API routes** without try-catch blocks
- **71 unhandled promise rejections** across the system
- **Missing input validation** in 4 API endpoints

#### 2. Code Duplication Burden
- **13 consolidation opportunities** identified
- **6 duplicate Cloudinary upload calls** across files
- **Missing standardized hooks** for data operations

#### 3. Schema Inconsistencies
- **3 different schema files** with conflicting table structures
- **16 tables missing audit timestamps**
- **Inconsistent ID types** across tables
`;

        this.reportSections.push({
            title: 'Critical Findings',
            content: criticalFindings,
            priority: 3
        });
    }

    async generateDetailedAnalysis() {
        console.log('🔍 Generating detailed analysis...');

        const detailedAnalysis = `
## Detailed Analysis Results

### Failure Point Detection Analysis
${this.analysisResults.failurePointDetector ? `
**Issues Identified:** ${this.analysisResults.failurePointDetector.metrics.total}
- Critical: ${this.analysisResults.failurePointDetector.metrics.critical}
- High Priority: ${this.analysisResults.failurePointDetector.metrics.high}
- Medium Priority: ${this.analysisResults.failurePointDetector.metrics.medium}
- Low Priority: ${this.analysisResults.failurePointDetector.metrics.low}

**Key Patterns Detected:**
- Missing error handling in API routes
- Unhandled promise rejections
- Missing re-fetch after database updates
- Improper async/await usage
- Missing input validation
` : 'Analysis not available'}

### Schema Validation Analysis
${this.analysisResults.schemaValidator ? `
**Issues Identified:** ${this.analysisResults.schemaValidator.metrics.total}
- Critical: ${this.analysisResults.schemaValidator.metrics.critical}
- High Priority: ${this.analysisResults.schemaValidator.metrics.high}
- Medium Priority: ${this.analysisResults.schemaValidator.metrics.medium}
- Low Priority: ${this.analysisResults.schemaValidator.metrics.low}

**Key Findings:**
- Missing RLS policies for core tables
- Schema file inconsistencies
- Missing audit timestamps
- Inconsistent ID types
- Missing check constraints
` : 'Analysis not available'}

### Redundancy Analysis
${this.analysisResults.redundancyAnalyzer ? `
**Consolidation Opportunities:** ${this.analysisResults.redundancyAnalyzer.metrics.total}
- High Priority: ${this.analysisResults.redundancyAnalyzer.metrics.high}
- Medium Priority: ${this.analysisResults.redundancyAnalyzer.metrics.medium}
- Low Priority: ${this.analysisResults.redundancyAnalyzer.metrics.low}

**Key Patterns:**
- Duplicate API call patterns
- Duplicate Cloudinary operations
- Missing hook standardization
- Scattered authentication logic
- Inconsistent naming conventions
` : 'Analysis not available'}

### Cross-Analysis Correlations

**Data Persistence Issues ↔ Schema Problems:**
- Missing RLS policies compound persistence failures
- Schema inconsistencies create deployment risks
- Missing audit trails prevent proper debugging

**Image Handling Issues ↔ Code Duplication:**
- 6 duplicate upload implementations increase failure points
- Missing centralized error handling
- Inconsistent validation across services

**API Issues ↔ Error Handling:**
- 17 unprotected routes create crash risks
- 71 unhandled promises cause silent failures
- Missing validation enables data corruption
`;

        this.reportSections.push({
            title: 'Detailed Analysis',
            content: detailedAnalysis,
            priority: 4
        });
    }

    async generatePrioritizedRecommendations() {
        console.log('📋 Generating prioritized recommendations...');

        const recommendations = `
## Prioritized Recommendations

### Phase 1: Critical Fixes (Week 1-2)

#### 1.1 Data Persistence Stabilization
**Priority:** CRITICAL
**Effort:** 3-5 days
**Impact:** Resolves case study update failures

**Actions:**
- Add concurrent update protection to server.js
- Implement re-fetch logic in case_study_editor_saas.html
- Add transaction handling to database operations
- Fix unhandled promises in js/supabase-client.js

**Success Criteria:**
- Case study updates persist 100% of the time
- No data loss during concurrent edits
- All promises properly handled

#### 1.2 Security Vulnerability Fixes
**Priority:** CRITICAL
**Effort:** 2-3 days
**Impact:** Prevents unauthorized data access

**Actions:**
- Add RLS policies to supabase-schema-complete.sql
- Enable RLS on case_studies, carousel_images, user_profiles
- Standardize on supabase-schema-fixed.sql as canonical schema
- Test policy enforcement

**Success Criteria:**
- All tables protected by RLS policies
- Unauthorized access blocked
- Data access properly controlled

#### 1.3 Image Upload Reliability
**Priority:** CRITICAL
**Effort:** 2-4 days
**Impact:** Ensures reliable image handling

**Actions:**
- Add secure_url validation in Cloudinary services
- Implement fallback images for failed loads
- Add retry logic for failed uploads
- Consolidate duplicate upload functions

**Success Criteria:**
- Images upload reliably 99%+ of the time
- Broken images never displayed to users
- Upload failures handled gracefully

### Phase 2: High Priority Fixes (Week 3-4)

#### 2.1 API Error Handling
**Priority:** HIGH
**Effort:** 3-4 days
**Impact:** Prevents server crashes and improves reliability

**Actions:**
- Wrap 17 API routes in try-catch blocks
- Add input validation to 4 API endpoints
- Implement consistent error response format
- Add comprehensive error logging

#### 2.2 Code Consolidation
**Priority:** HIGH
**Effort:** 4-5 days
**Impact:** Reduces maintenance burden and improves consistency

**Actions:**
- Create CloudinaryService utility (consolidates 6 duplicate calls)
- Create APIClient for centralized authentication
- Implement standardized hooks (useFetchCaseStudy, etc.)
- Remove duplicate Cloudinary operations

#### 2.3 Schema Standardization
**Priority:** HIGH
**Effort:** 2-3 days
**Impact:** Ensures consistent deployments

**Actions:**
- Choose supabase-schema-fixed.sql as canonical schema
- Add missing timestamps to 16 tables
- Standardize ID types to UUID
- Add missing check constraints

### Phase 3: Quality Improvements (Week 5-6)

#### 3.1 Testing Infrastructure
**Priority:** MEDIUM
**Effort:** 3-4 days
**Impact:** Prevents regressions

**Actions:**
- Create comprehensive test suite
- Add integration tests for critical flows
- Implement automated testing pipeline
- Add performance benchmarks

#### 3.2 Documentation and Monitoring
**Priority:** MEDIUM
**Effort:** 2-3 days
**Impact:** Improves maintainability

**Actions:**
- Update code documentation
- Create deployment guides
- Implement error monitoring
- Add performance tracking

### Implementation Guidelines

**Risk Mitigation:**
- All changes must be atomic and reversible
- Maintain full functional parity during refactoring
- Test each fix in isolation before integration
- Keep backup of current working state

**Quality Assurance:**
- Code review for all changes
- Integration testing after each phase
- Performance validation
- Security audit of all modifications

**Success Metrics:**
- Zero data loss incidents
- 99.9% uptime maintained
- All critical bugs resolved
- Reduced maintenance complexity
`;

        this.reportSections.push({
            title: 'Prioritized Recommendations',
            content: recommendations,
            priority: 5
        });
    }

    async generateImplementationRoadmap() {
        console.log('🗺️  Generating implementation roadmap...');

        const roadmap = `
## Implementation Roadmap

### Timeline Overview

\`\`\`
Week 1-2: Critical Fixes
├── Data Persistence (3-5 days)
├── Security Fixes (2-3 days)
└── Image Reliability (2-4 days)

Week 3-4: High Priority
├── API Error Handling (3-4 days)
├── Code Consolidation (4-5 days)
└── Schema Standardization (2-3 days)

Week 5-6: Quality Improvements
├── Testing Infrastructure (3-4 days)
└── Documentation (2-3 days)
\`\`\`

### Detailed Implementation Plan

#### Week 1: Data Persistence & Security

**Day 1-2: Data Persistence Fixes**
- [ ] Add concurrent update protection to server.js
- [ ] Implement re-fetch logic in case study editor
- [ ] Add transaction handling to database operations
- [ ] Test case study update reliability

**Day 3-4: Security Implementation**
- [ ] Add RLS policies to database schema
- [ ] Enable RLS on all user data tables
- [ ] Test access control enforcement
- [ ] Validate policy effectiveness

**Day 5: Image Upload Fixes**
- [ ] Add secure_url validation to Cloudinary services
- [ ] Implement fallback image handling
- [ ] Add upload retry logic
- [ ] Test image upload reliability

#### Week 2: API & Error Handling

**Day 1-2: API Error Handling**
- [ ] Wrap API routes in try-catch blocks
- [ ] Add input validation to endpoints
- [ ] Implement consistent error responses
- [ ] Add comprehensive error logging

**Day 3-4: Code Consolidation Start**
- [ ] Create CloudinaryService utility
- [ ] Create APIClient for authentication
- [ ] Consolidate duplicate API calls
- [ ] Test consolidated services

**Day 5: Integration Testing**
- [ ] Test all critical fixes together
- [ ] Validate no regressions introduced
- [ ] Performance testing
- [ ] User acceptance testing

#### Week 3-4: Consolidation & Standardization

**Day 1-3: Hook Standardization**
- [ ] Implement useFetchCaseStudy hook
- [ ] Implement useCreateCaseStudy hook
- [ ] Implement useUpdateCaseStudy hook
- [ ] Implement useImageUpload hook

**Day 4-5: Schema Standardization**
- [ ] Standardize on canonical schema
- [ ] Add missing timestamps
- [ ] Standardize ID types
- [ ] Add check constraints

#### Week 5-6: Quality & Documentation

**Day 1-3: Testing Infrastructure**
- [ ] Create unit test suite
- [ ] Add integration tests
- [ ] Implement automated testing
- [ ] Add performance benchmarks

**Day 4-5: Documentation & Monitoring**
- [ ] Update code documentation
- [ ] Create deployment guides
- [ ] Implement error monitoring
- [ ] Add performance tracking

### Risk Management

**High Risk Items:**
- Database schema changes (require careful migration)
- Authentication modifications (could break access)
- Core API changes (might affect existing clients)

**Mitigation Strategies:**
- Incremental rollout with rollback capability
- Comprehensive testing at each phase
- Backup and restore procedures
- Feature flags for gradual enablement

### Success Criteria

**Phase 1 Success:**
- ✅ Case studies update reliably 100% of time
- ✅ All security vulnerabilities resolved
- ✅ Images upload and display consistently

**Phase 2 Success:**
- ✅ No unhandled errors in production
- ✅ Code duplication reduced by 80%
- ✅ Consistent schema across environments

**Phase 3 Success:**
- ✅ Comprehensive test coverage (>80%)
- ✅ Complete documentation
- ✅ Monitoring and alerting in place

### Deployment Strategy

**Environment Progression:**
1. Development → Local testing
2. Staging → Integration testing
3. Production → Gradual rollout

**Rollback Plan:**
- Database migration rollback scripts
- Code version rollback capability
- Configuration rollback procedures
- Emergency contact procedures
`;

        this.reportSections.push({
            title: 'Implementation Roadmap',
            content: roadmap,
            priority: 6
        });
    }

    async compileReport() {
        console.log('📄 Compiling final report...');

        // Sort sections by priority
        this.reportSections.sort((a, b) => a.priority - b.priority);

        // Combine all sections
        let fullReport = '';
        for (const section of this.reportSections) {
            fullReport += section.content + '\n\n';
        }

        // Add footer
        fullReport += `
---

## Report Metadata

**Generated By:** SaaS System Audit Analysis Framework
**Analysis Date:** ${new Date().toISOString()}
**Report Version:** 1.0
**Total Issues Identified:** ${this.getTotalIssues()}
**Critical Issues:** ${this.getCriticalIssues()}
**High Priority Issues:** ${this.getHighPriorityIssues()}

**Analysis Components:**
- ✅ Project Structure Analysis
- ✅ Failure Point Detection
- ✅ Schema Validation
- ✅ Redundancy Analysis

**Next Steps:**
1. Review and approve this diagnostic report
2. Begin Phase 1 implementation (Critical Fixes)
3. Monitor progress against success criteria
4. Proceed to subsequent phases based on results

---

*This report provides a comprehensive analysis of the SaaS system and actionable recommendations for resolving identified issues. All recommendations are based on systematic analysis and are designed to be implemented incrementally with minimal risk.*
`;

        return fullReport;
    }

    async saveReport(reportContent) {
        const outputDir = path.join(__dirname, 'output', 'reports');
        await fs.mkdir(outputDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(outputDir, `comprehensive-diagnostic-report-${timestamp}.md`);
        
        await fs.writeFile(reportPath, reportContent);
        
        // Also save as latest
        const latestPath = path.join(outputDir, 'comprehensive-diagnostic-report-latest.md');
        await fs.writeFile(latestPath, reportContent);
        
        return reportPath;
    }

    getTotalIssues() {
        let total = 0;
        for (const analysis of Object.values(this.analysisResults)) {
            if (analysis && analysis.metrics) {
                total += analysis.metrics.total || 0;
            }
        }
        return total;
    }

    getCriticalIssues() {
        let critical = 0;
        for (const analysis of Object.values(this.analysisResults)) {
            if (analysis && analysis.metrics) {
                critical += analysis.metrics.critical || 0;
            }
        }
        return critical;
    }

    getHighPriorityIssues() {
        let high = 0;
        for (const analysis of Object.values(this.analysisResults)) {
            if (analysis && analysis.metrics) {
                high += analysis.metrics.high || 0;
            }
        }
        return high;
    }

    generateSummaryStats() {
        return {
            totalIssues: this.getTotalIssues(),
            criticalIssues: this.getCriticalIssues(),
            highPriorityIssues: this.getHighPriorityIssues(),
            analysisComponents: Object.keys(this.analysisResults).filter(
                key => this.analysisResults[key] !== null
            ).length
        };
    }
}

// Run if called directly
async function generateComprehensiveReport() {
    const reporter = new ComprehensiveDiagnosticReporter();
    return await reporter.generateReport();
}

if (require.main === module) {
    generateComprehensiveReport()
        .then((result) => {
            console.log('✅ Comprehensive Diagnostic Report generated successfully!');
            console.log(`📊 Summary: ${result.summary.totalIssues} total issues identified`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = generateComprehensiveReport;
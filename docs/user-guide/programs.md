# Managing Programs in MACAS

This guide covers everything you need to know about creating, managing, and organizing curriculum programs in the Multi-Agent Curriculum Alignment System (MACAS).

## Programs Overview

A **program** in MACAS represents a complete curriculum or degree offering, including all courses, requirements, and supporting documentation. Programs are the foundation for all analysis and reporting in the system.

### Program Types

MACAS supports various program types:

#### 🎓 **Undergraduate Programs**
- Bachelor's degrees
- Associate degrees
- Undergraduate certificates
- Pre-professional programs

#### 📚 **Graduate Programs**
- Master's degrees
- Doctoral programs
- Graduate certificates
- Professional degrees (JD, MD, etc.)

#### 💼 **Professional Programs**
- Executive education
- Continuing education
- Professional development
- Industry certifications

#### 🏆 **Specialized Programs**
- Interdisciplinary programs
- Joint degrees
- Online programs
- International programs

## Creating Programs

### Program Creation Workflow

#### Step 1: Initial Setup
1. Navigate to **Programs → Create New**
2. Select program type from the dropdown
3. Choose creation method:
   - **Start from scratch**: Build completely new program
   - **Copy existing**: Duplicate and modify existing program
   - **Import template**: Use predefined program template

#### Step 2: Basic Information

**Required Information:**
```
Program Name: [Full official program name]
Short Name: [Abbreviated name for displays]
Department: [Select from organizational hierarchy]
Faculty/School: [Parent organizational unit]
Program Code: [Official institutional code]
Academic Level: [Undergraduate/Graduate/Professional]
Degree Type: [BA/BS/MA/MS/PhD/Certificate/Other]
```

**Additional Details:**
```
Academic Year: [Implementation year]
Language of Instruction: [Primary language]
Mode of Delivery: [On-campus/Online/Hybrid]
Duration: [Semesters/Years to completion]
Total Credits: [Minimum credits for graduation]
```

#### Step 3: Program Structure

Define the academic structure:

**Core Requirements:**
- Required courses
- Core competency areas
- Foundational knowledge requirements
- Skills development components

**Elective Options:**
- Elective credit requirements
- Concentration areas
- Specialization tracks
- Free elective allowances

**Special Requirements:**
- Capstone projects
- Internship requirements
- Study abroad components
- Language requirements
- Comprehensive exams

### Advanced Program Configuration

#### Curriculum Mapping

**Learning Outcomes Alignment:**
1. Define program learning outcomes
2. Map courses to specific outcomes
3. Identify outcome coverage gaps
4. Track outcome achievement

**Prerequisite Management:**
- Course prerequisite chains
- Co-requisite relationships
- Recommended preparation
- Alternative pathway options

**Credit Distribution:**
- Major requirements breakdown
- General education requirements
- Free electives allocation
- Total credit validation

#### Assessment Methods

**Program Assessment:**
- Direct assessment measures
- Indirect assessment measures
- External evaluation criteria
- Benchmarking standards

**Quality Indicators:**
- Student success metrics
- Employer satisfaction measures
- Alumni outcome tracking
- Accreditation compliance

## Document Management

### Supported Document Types

#### 📄 **Curriculum Documents**
- Course catalogs
- Program handbooks
- Syllabi collections
- Assessment plans

#### 📊 **Data Files**
- Course listing spreadsheets
- Enrollment data
- Grade distributions
- Student outcome data

#### 🏛️ **Institutional Documents**
- Accreditation reports
- Self-study documents
- External review reports
- Compliance documentation

### Upload Process

#### Batch Upload
1. **Prepare documents**:
   - Organize files by category
   - Use consistent naming conventions
   - Verify file formats and sizes

2. **Upload interface**:
   - Drag and drop multiple files
   - Select upload category
   - Add metadata for each file

3. **Processing verification**:
   - Check upload completion
   - Verify document parsing
   - Review extracted metadata

#### Document Organization

**Folder Structure:**
```
Program Name/
├── Core Documents/
│   ├── Course Catalog
│   ├── Program Handbook
│   └── Assessment Plan
├── Course Materials/
│   ├── Syllabi/
│   ├── Course Descriptions/
│   └── Learning Outcomes/
└── Supporting Documents/
    ├── Accreditation Reports/
    ├── Review Documents/
    └── Data Files/
```

**Metadata Management:**
- Document version tracking
- Date stamps and currency
- Author and reviewer information
- Access permissions
- Change history

### Document Processing

#### Automated Extraction
The system automatically extracts:
- Course codes and titles
- Credit hour information
- Prerequisite relationships
- Learning outcome statements
- Assessment methods

#### Manual Review
After automated extraction:
1. **Verify accuracy** of extracted data
2. **Correct any errors** in interpretation
3. **Add missing information** not captured automatically
4. **Approve final data** for analysis use

## Program Analytics

### Program Dashboard

Each program has a dedicated dashboard showing:

#### 📈 **Key Metrics**
- Total enrolled students
- Graduation rates
- Time to degree completion
- Course completion rates
- Student satisfaction scores

#### 🔍 **Analysis Status**
- Recent analysis results
- Pending analysis requests
- Analysis history and trends
- Comparison with peer programs

#### 📊 **Visual Summaries**
- Credit distribution charts
- Course pathway diagrams
- Learning outcome coverage maps
- Student flow visualizations

### Performance Tracking

#### Curriculum Health Indicators
- **Completeness Score**: Percentage of requirements documented
- **Alignment Score**: Match with institutional standards
- **Currency Score**: Document recency and relevance
- **Coherence Score**: Internal consistency and logic

#### Benchmark Comparisons
- Peer institution comparisons
- Industry standard alignment
- Accreditation requirement coverage
- Best practice implementation

### Trend Analysis

#### Historical Tracking
- Program evolution over time
- Curriculum change patterns
- Student outcome trends
- Resource allocation changes

#### Predictive Insights
- Enrollment projections
- Resource needs forecasting
- Market demand analysis
- Competency gap predictions

## Collaboration Features

### Team Management

#### Role Assignment
**Program Owner:**
- Full program access and control
- Can modify all program elements
- Manages team member permissions
- Responsible for final approvals

**Curriculum Committee:**
- Can edit curriculum content
- Can run analyses and generate reports
- Can comment and suggest changes
- Cannot modify program structure

**Reviewer:**
- View-only access to program data
- Can generate reports and exports
- Can add comments and feedback
- Cannot modify program content

**Guest:**
- Limited view access
- Can view summary information only
- Cannot access detailed analyses
- Cannot export sensitive data

#### Collaboration Tools

**Comments and Annotations:**
- Add comments to specific documents
- Tag team members for notifications
- Track comment resolution
- Maintain comment history

**Change Tracking:**
- Version control for all modifications
- Change approval workflows
- Rollback capabilities
- Audit trail maintenance

**Notifications:**
- Email alerts for important changes
- In-app notification center
- Custom notification preferences
- Team activity summaries

### Approval Workflows

#### Standard Approval Process
1. **Draft Creation**: Program created in draft status
2. **Team Review**: Colleagues review and comment
3. **Revision Cycle**: Incorporate feedback and make changes
4. **Final Approval**: Designated approver publishes program
5. **Active Status**: Program available for analysis

#### Custom Workflows
Configure custom approval processes:
- Multi-stage approval chains
- Conditional approval rules
- Automated escalation procedures
- Integration with institutional processes

## Program Templates

### Standard Templates

MACAS provides pre-built templates for common program types:

#### Academic Program Templates
- **Liberal Arts Bachelor**: General education focused undergraduate program
- **STEM Bachelor**: Science, technology, engineering, mathematics programs
- **Professional Master**: Industry-focused graduate programs
- **Research Doctorate**: Research-intensive doctoral programs

#### Specialized Templates
- **Online Program**: Distance learning optimized structure
- **International Program**: Multi-institutional collaboration programs
- **Professional Certification**: Industry certification preparation
- **Executive Education**: Working professional continuing education

### Custom Template Creation

#### Template Development Process
1. **Base Program Selection**: Choose exemplary program as starting point
2. **Generalization**: Remove program-specific details
3. **Parameterization**: Define customizable elements
4. **Testing**: Validate template with test cases
5. **Documentation**: Create usage guidelines

#### Template Sharing
- Share templates within institution
- Contribute to community template library
- Access templates from peer institutions
- Maintain template version control

## Data Import and Export

### Import Options

#### Bulk Program Import
- CSV file import for multiple programs
- Excel template for program data
- API integration with student information systems
- Migration tools from legacy systems

#### Data Mapping
Configure field mappings between:
- Source system data formats
- MACAS program structure
- Institutional naming conventions
- Standard classification systems

### Export Capabilities

#### Report Exports
- PDF reports for sharing and printing
- Excel data exports for further analysis
- PowerPoint summaries for presentations
- Word documents for institutional reports

#### Data Integration
- API endpoints for external system integration
- Real-time data synchronization
- Scheduled export automation
- Custom format generation

## Quality Assurance

### Data Validation

#### Automated Checks
- Required field validation
- Data format verification
- Consistency checking
- Duplicate detection

#### Quality Scores
- **Completeness**: Percentage of required data present
- **Accuracy**: Validation against known standards
- **Currency**: Recency of information updates
- **Consistency**: Internal logic and coherence

### Improvement Recommendations

#### System Suggestions
- Missing data identification
- Inconsistency alerts
- Currency warnings
- Best practice recommendations

#### Action Planning
- Prioritized improvement lists
- Resource requirement estimates
- Timeline recommendations
- Impact assessments

## Advanced Features

### Bulk Operations

#### Multi-Program Management
- Batch updates across programs
- Bulk analysis execution
- Mass report generation
- Coordinated approval workflows

#### Department-Level Views
- Portfolio summaries
- Cross-program comparisons
- Resource allocation views
- Strategic planning dashboards

### Integration Capabilities

#### Student Information Systems
- Enrollment data integration
- Academic record synchronization
- Graduation requirement tracking
- Student outcome analysis

#### Learning Management Systems
- Course content alignment
- Learning objective mapping
- Assessment data integration
- Student performance tracking

### Automation Features

#### Scheduled Operations
- Regular data updates
- Automated report generation
- Periodic analysis execution
- System maintenance tasks

#### Workflow Automation
- Approval process automation
- Notification triggers
- Escalation procedures
- Status update propagation

## Troubleshooting Common Issues

### Program Creation Problems

**Issue**: Cannot save program due to validation errors
**Solution**:
1. Check all required fields are completed
2. Verify data format compliance
3. Resolve any duplicate name conflicts
4. Contact support if validation errors persist

**Issue**: Document upload failures
**Solution**:
1. Verify file size is under 50 MB limit
2. Check file format is supported (PDF, Word, Excel)
3. Ensure stable internet connection
4. Try uploading files individually

### Data Integrity Issues

**Issue**: Extracted course data appears incorrect
**Solution**:
1. Review original document formatting
2. Use manual override for automated extraction
3. Contact support for parsing improvements
4. Consider reformatting source documents

**Issue**: Program metrics seem inconsistent
**Solution**:
1. Verify all required documents are uploaded
2. Check for duplicate or conflicting data
3. Run data validation reports
4. Contact support for detailed analysis

### Performance Problems

**Issue**: Slow program loading or timeouts
**Solution**:
1. Check internet connection stability
2. Clear browser cache and cookies
3. Try accessing during off-peak hours
4. Contact support for system status

**Issue**: Analysis taking longer than expected
**Solution**:
1. Check analysis queue status
2. Verify program complexity and size
3. Consider breaking large programs into components
4. Schedule analysis during off-peak hours

---

## Next Steps

Now that you understand program management in MACAS, you can:

- **Explore analysis features** in the [Analysis Guide](./analysis.md)
- **Learn about reporting** in the [Reports Guide](./reports.md)
- **Configure system settings** in the [Settings Guide](./settings.md)
- **Get help** with the [Troubleshooting Guide](./troubleshooting.md)

For questions about specific program management features, contact our support team at support@ceu.edu or use the in-app chat feature.
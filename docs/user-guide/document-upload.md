# Document Upload Guide

This comprehensive guide covers everything you need to know about uploading, processing, and managing curriculum documents in MACAS.

## Overview

MACAS processes various types of curriculum documents to extract structured data for analysis. The system uses advanced AI techniques to understand document content and convert it into analyzable formats.

## Supported Document Types

### 📄 Primary Document Formats

#### PDF Documents
- **Course Catalogs**: Official curriculum descriptions
- **Program Handbooks**: Student guides and requirements
- **Syllabi**: Individual course details
- **Assessment Plans**: Learning outcome documentation
- **Accreditation Reports**: External evaluation documents

**Requirements**:
- Maximum size: 50 MB per file
- Text-searchable PDFs preferred
- OCR processing available for scanned documents
- Password protection not supported

#### Microsoft Word Documents
- **Program Descriptions**: Detailed program information
- **Course Descriptions**: Individual course documentation
- **Meeting Minutes**: Curriculum committee records
- **Policy Documents**: Academic regulations and policies

**Supported Formats**:
- `.docx` (Word 2007 and later) - Recommended
- `.doc` (Word 97-2003) - Limited support
- `.rtf` Rich Text Format
- Maximum size: 50 MB per file

#### Microsoft Excel Spreadsheets
- **Course Listings**: Structured course data
- **Credit Distributions**: Program requirement breakdowns
- **Enrollment Data**: Student registration information
- **Grade Reports**: Academic performance data

**Supported Formats**:
- `.xlsx` (Excel 2007 and later) - Recommended
- `.xls` (Excel 97-2003) - Limited support
- `.csv` Comma-separated values
- Maximum size: 50 MB per file

### 🌍 Language Support

#### Fully Supported Languages
- **English**: Complete processing and analysis
- **German**: Advanced text processing
- **Hungarian**: Native language support
- **Czech**: Comprehensive analysis capabilities

#### Partial Support
- **Slovak**: Basic processing available
- **Polish**: Limited text analysis
- **Romanian**: Document extraction only
- **Other Languages**: Contact support for availability

## Upload Process

### Single File Upload

#### Step 1: Access Upload Interface
1. Navigate to **Programs** → Select Program → **Documents**
2. Or click **Upload Documents** from dashboard
3. Choose target program from dropdown

#### Step 2: File Selection
1. Click **"Choose File"** or **"Browse"**
2. Select document from your computer
3. Verify file type and size requirements
4. Confirm selection

#### Step 3: Document Metadata
**Required Information**:
```
Document Title: [Descriptive name]
Document Type: [Select from dropdown]
Academic Year: [Relevant academic year]
Department: [Responsible department]
Language: [Primary document language]
```

**Optional Information**:
```
Description: [Brief document summary]
Author: [Document creator]
Version: [Document version number]
Keywords: [Search keywords]
Access Level: [Public/Department/Private]
```

#### Step 4: Upload and Processing
1. Click **"Upload Document"**
2. Monitor upload progress bar
3. Wait for processing completion
4. Review extracted data

### Batch Upload

#### Bulk Upload Interface
1. Click **"Batch Upload"** button
2. Select multiple files (up to 20 at once)
3. Drag and drop files into upload area
4. Or use **"Select Multiple Files"** button

#### File Organization
**Recommended Naming Convention**:
```
[Program]_[Document Type]_[Year].[extension]
Examples:
- CS_Bachelor_Course_Catalog_2024.pdf
- DataScience_MS_Handbook_2024.docx
- AI_Certificate_Requirements_2024.xlsx
```

#### Batch Metadata Assignment
- **Apply to All**: Set common metadata for all files
- **Individual Settings**: Customize each file separately
- **Template Application**: Use predefined metadata templates
- **Bulk Edit**: Modify multiple files simultaneously

### Advanced Upload Options

#### Upload Templates
Save frequently used metadata combinations:
- **Template Creation**: Define reusable metadata sets
- **Department Templates**: Standard configurations
- **Program-Specific**: Tailored to specific programs
- **Sharing**: Share templates with colleagues

#### Scheduled Uploads
- **Recurring Uploads**: Schedule regular document updates
- **Email Integration**: Upload documents from email
- **API Integration**: Automated system uploads
- **Folder Monitoring**: Watch local folders for changes

## Document Processing

### Automated Extraction

#### Content Analysis
The system automatically extracts:

**Course Information**:
- Course codes and numbers
- Course titles and descriptions
- Credit hours and contact hours
- Prerequisites and co-requisites
- Learning outcomes and objectives

**Program Structure**:
- Degree requirements
- Core vs. elective breakdown
- Concentration areas
- Graduation requirements
- Academic policies

**Assessment Data**:
- Grading criteria
- Assessment methods
- Performance standards
- Accreditation compliance

#### AI Processing Pipeline

**Stage 1: Document Parsing**
- Text extraction from various formats
- Image and table recognition
- Structure identification
- Language detection

**Stage 2: Content Understanding**
- Natural language processing
- Semantic analysis
- Entity recognition
- Relationship mapping

**Stage 3: Data Structuring**
- Information categorization
- Database integration
- Quality validation
- Error detection

### Manual Review and Correction

#### Review Interface
After automated processing, review extracted data:

1. **Accuracy Check**: Verify extracted information
2. **Missing Data**: Add information not captured
3. **Corrections**: Fix misinterpreted content
4. **Validation**: Confirm data completeness

#### Common Review Tasks

**Course Data Verification**:
```
✓ Course codes correctly extracted
✓ Prerequisites properly linked
✓ Credit hours accurate
✓ Learning outcomes complete
✗ Fix: Incorrect course number format
✗ Add: Missing co-requisite information
```

**Program Requirements Review**:
- Total credit requirements
- Distribution requirements
- Special program features
- Graduation criteria

#### Collaborative Review
- **Team Review**: Assign colleagues to verify data
- **Expert Review**: Subject matter expert validation
- **Department Approval**: Official department sign-off
- **Version Control**: Track review changes

### Quality Assurance

#### Automated Quality Checks

**Data Validation**:
- Required field completeness
- Format consistency
- Numerical accuracy
- Duplicate detection

**Cross-Reference Validation**:
- Course prerequisite chains
- Credit hour calculations
- Program requirement totals
- Accreditation alignment

#### Quality Scores
Each document receives quality ratings:

**Completeness Score** (0-100%)
- Percentage of expected data fields populated
- Identifies missing critical information
- Suggests additional data sources

**Accuracy Score** (0-100%)
- Validation against known standards
- Consistency with peer institutions
- Historical data comparison

**Currency Score** (0-100%)
- Document recency and relevance
- Update frequency assessment
- Obsolete content identification

**Coherence Score** (0-100%)
- Internal consistency check
- Logical structure validation
- Policy alignment verification

## Document Management

### Organization System

#### Folder Structure
```
Program Name/
├── Core Documents/
│   ├── Course Catalog (2024-2025)
│   ├── Student Handbook (Current)
│   └── Assessment Plan (Latest)
├── Course Materials/
│   ├── Syllabi/
│   │   ├── Core Courses/
│   │   └── Elective Courses/
│   ├── Learning Outcomes/
│   └── Assessment Rubrics/
├── Historical Documents/
│   ├── Previous Catalogs/
│   ├── Archived Handbooks/
│   └── Legacy Materials/
└── Supporting Documents/
    ├── Accreditation Reports/
    ├── External Reviews/
    └── Compliance Documentation/
```

#### Document Categories

**By Type**:
- Official Documents
- Course Materials
- Assessment Tools
- Policy Documents
- Historical Archives

**By Status**:
- Active/Current
- Under Review
- Archived/Historical
- Draft/Pending

**By Access Level**:
- Public Access
- Department Only
- Program Team
- Administrator Only

### Version Control

#### Version Tracking
- **Automatic Versioning**: System tracks all changes
- **Version History**: Complete change timeline
- **Comparison Tools**: Side-by-side version comparison
- **Rollback Capability**: Restore previous versions

#### Version Metadata
```
Version: 2.1
Created: 2024-03-15 14:30:00
Author: Dr. Jane Smith
Changes: Updated prerequisite requirements
Approved: Department Chair
Status: Active
```

#### Change Management
- **Change Requests**: Formal modification procedures
- **Approval Workflow**: Multi-stage approval process
- **Change Documentation**: Detailed change logs
- **Impact Assessment**: Effect on related programs

### Access Control

#### Permission Levels

**Document Owner**:
- Full edit and delete permissions
- Access control management
- Version approval authority
- Sharing configuration

**Editor**:
- Edit document content
- Upload new versions
- Comment and annotate
- Cannot delete or share

**Viewer**:
- Read-only access
- Download permitted documents
- Comment on documents
- Cannot modify content

**Restricted**:
- Limited view access
- No download permissions
- No commenting ability
- Summary information only

#### Sharing Options
- **Internal Sharing**: Within institution only
- **Department Sharing**: Department members access
- **Program Team**: Program stakeholders only
- **Public Sharing**: Unrestricted access (where appropriate)

## Troubleshooting Upload Issues

### Common Upload Problems

#### File Size Limitations
**Problem**: "File too large" error message
**Solutions**:
1. Compress PDF files using online tools
2. Split large documents into sections
3. Convert to more efficient formats
4. Contact support for size limit increases

#### Unsupported File Formats
**Problem**: File format not accepted
**Solutions**:
1. Convert to supported formats (PDF, Word, Excel)
2. Save in compatible versions (newer Office formats)
3. Use online conversion tools
4. Contact support for format requests

#### Upload Timeouts
**Problem**: Upload fails or times out
**Solutions**:
1. Check internet connection stability
2. Try uploading during off-peak hours
3. Upload files individually instead of batch
4. Clear browser cache and retry

### Processing Issues

#### Text Extraction Problems
**Problem**: Text not properly extracted from PDF
**Solutions**:
1. Ensure PDF is text-searchable (not scanned image)
2. Try OCR processing option
3. Convert to Word format first
4. Contact support for manual processing

#### Language Recognition Issues
**Problem**: Wrong language detected
**Solutions**:
1. Manually specify document language
2. Ensure document contains substantial text
3. Check for mixed-language content
4. Use language-specific upload settings

#### Data Extraction Errors
**Problem**: Incorrect or missing data extraction
**Solutions**:
1. Review original document formatting
2. Use manual data entry override
3. Provide additional context in metadata
4. Contact support for extraction improvements

### Performance Optimization

#### Upload Speed Optimization
- **Wired Connection**: Use ethernet instead of Wi-Fi
- **Browser Choice**: Chrome generally performs best
- **Background Activity**: Close unnecessary applications
- **Peak Hours**: Avoid high-traffic times

#### Processing Speed
- **Document Preparation**: Clean, well-formatted documents process faster
- **File Size**: Smaller files process more quickly
- **Complexity**: Simple document structures are easier to process
- **Language**: Native language support processes faster

## Best Practices

### Document Preparation

#### Before Upload
1. **Quality Check**: Ensure documents are complete and current
2. **Format Optimization**: Use recommended file formats
3. **Clear Naming**: Use descriptive, consistent file names
4. **Metadata Preparation**: Gather all required information

#### Document Quality
- **Text Quality**: Ensure text is clear and searchable
- **Structure**: Use proper headings and formatting
- **Completeness**: Include all relevant sections
- **Currency**: Verify information is up-to-date

### Upload Strategy

#### Systematic Approach
1. **Plan Organization**: Design folder structure first
2. **Batch Similar Documents**: Upload related documents together
3. **Review Immediately**: Check processing results promptly
4. **Collaborative Review**: Involve subject matter experts

#### Timing Considerations
- **Off-Peak Hours**: Upload during low-traffic times
- **Advance Planning**: Allow time for processing and review
- **Staged Approach**: Upload core documents first
- **Regular Updates**: Schedule periodic document refreshes

---

## Integration Features

### External System Integration

#### Student Information Systems
- **Enrollment Data**: Sync student registration information
- **Grade Integration**: Import academic performance data
- **Transcript Data**: Link course completion records
- **Degree Audit**: Connect graduation requirement tracking

#### Learning Management Systems
- **Course Alignment**: Map LMS courses to curriculum
- **Content Integration**: Link course materials and resources
- **Assessment Data**: Import quiz and assignment results
- **Student Activity**: Track engagement and participation

### API Integration

#### Document Management APIs
- **Bulk Upload**: Automated document submission
- **Metadata Sync**: Synchronize document information
- **Status Monitoring**: Track processing progress
- **Error Handling**: Automated error notification

#### Third-Party Tools
- **Google Workspace**: Direct document import
- **Microsoft 365**: Seamless Office integration
- **Dropbox/OneDrive**: Cloud storage connectivity
- **Version Control**: Git-based document management

---

## Next Steps

After mastering document upload, explore:

- **[Analysis Features](./analysis.md)**: Analyze your uploaded documents
- **[Program Management](./programs.md)**: Organize programs effectively
- **[Reports Generation](./reports.md)**: Generate insights from documents
- **[Settings Configuration](./settings.md)**: Optimize upload preferences

For document upload assistance, contact support at support@ceu.edu or use the in-app help feature.
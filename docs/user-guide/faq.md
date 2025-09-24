# Frequently Asked Questions (FAQ)

This FAQ addresses the most common questions about the Multi-Agent Curriculum Alignment System (MACAS). Find quick answers to common issues, understand system capabilities, and learn about best practices.

## General System Questions

### What is MACAS?

**Q: What does MACAS stand for and what does it do?**

A: MACAS stands for Multi-Agent Curriculum Alignment System. It's a sophisticated platform designed specifically for Central European University to automatically analyze and align curricula across university programs. The system uses multiple AI agents to:
- Analyze curriculum documents and extract structured data
- Compare programs against peer institutions
- Identify gaps and alignment opportunities
- Generate professional reports and recommendations
- Streamline curriculum development and review processes

**Q: Who can use MACAS?**

A: MACAS is available to CEU faculty, staff, and administrators with different access levels:
- **Faculty Members**: Create and manage their own programs, run analyses
- **Department Administrators**: Manage department programs, access advanced features
- **University Administrators**: System-wide access and reporting capabilities
- **System Administrators**: Full system configuration and user management
- **Guest Users**: Limited read-only access for external reviewers

**Q: Is MACAS available 24/7?**

A: Yes, MACAS is available 24/7 with minimal scheduled maintenance. System maintenance typically occurs:
- **Daily**: 2:00-3:00 AM CET (automated backups and log maintenance)
- **Weekly**: Sunday 1:00-4:00 AM CET (system updates)
- **Monthly**: First Sunday 12:00-6:00 AM CET (major updates)

Check the system status page at `https://status.curriculum-alignment.ceu.edu` for current system status and any scheduled maintenance.

### System Access and Accounts

**Q: How do I get access to MACAS?**

A: Access to MACAS is provided through CEU's identity management system:
1. **CEU Faculty/Staff**: Access is automatically provisioned based on your CEU role
2. **Guest Access**: Department administrators can request guest accounts for external reviewers
3. **Special Access**: Contact IT support for unique access requirements

**Q: Can I access MACAS from outside CEU?**

A: Yes, MACAS is accessible from anywhere with internet access. You'll need:
- Valid CEU credentials for authentication
- Supported web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection

VPN is not required but may be recommended for enhanced security when accessing from public networks.

**Q: What happens if I forget my password?**

A: MACAS uses CEU's Single Sign-On (SSO) system:
- Use CEU's standard password reset process
- Visit the CEU IT portal for password recovery
- Contact CEU IT support at +36-1-327-3000 for assistance
- Your MACAS access will be restored once CEU credentials are recovered

## Getting Started

### First Steps

**Q: Where do I start as a new user?**

A: Follow this recommended path:
1. **Complete the welcome tour** when you first log in
2. **Set up your profile** with complete information
3. **Review the Getting Started Guide** in the documentation
4. **Create your first program** using the program wizard
5. **Upload sample documents** to familiarize yourself with the process
6. **Run a basic analysis** to see how the system works
7. **Generate your first report** to understand the outputs

**Q: Do I need special training to use MACAS?**

A: MACAS is designed to be intuitive, but training options are available:
- **Self-guided**: Built-in tutorials and comprehensive documentation
- **Video tutorials**: Step-by-step video guides for key features
- **Live training**: Monthly group training sessions
- **Custom training**: Department-specific training sessions available
- **Peer support**: User community forums and best practice sharing

**Q: What browsers work best with MACAS?**

A: MACAS is optimized for modern browsers:

**Recommended (Best Performance)**:
- Google Chrome 90+
- Mozilla Firefox 88+
- Safari 14+
- Microsoft Edge 90+

**Minimum Requirements**:
- JavaScript enabled
- Cookies enabled
- Pop-up blocker configured to allow MACAS
- Minimum screen resolution: 1024x768

**Not Recommended**:
- Internet Explorer (any version)
- Browsers with strict ad blockers that disable JavaScript

### Creating Programs

**Q: What information do I need to create a program?**

A: To create a program, gather these essential details:

**Required Information**:
- Program name and short name
- Department and faculty/school
- Academic level (undergraduate/graduate/professional)
- Degree type (BA, BS, MA, MS, PhD, Certificate, etc.)
- Program code (institutional identifier)

**Recommended Information**:
- Academic year of implementation
- Language of instruction
- Mode of delivery (on-campus/online/hybrid)
- Expected duration and credit requirements
- Brief program description

**Supporting Documents**:
- Course catalog or program handbook
- Course syllabi collection
- Assessment plans and learning outcomes
- Accreditation documents (if applicable)

**Q: Can I copy an existing program to create a new one?**

A: Yes, MACAS provides several program creation options:
- **Copy existing program**: Duplicate and modify an existing program
- **Use program template**: Start from predefined templates
- **Import from external source**: Import program data from spreadsheets
- **Start from scratch**: Create completely new program

When copying, you can selectively copy components like course structure, assessment methods, or document organization while customizing details for the new program.

## Document Management

### File Uploads

**Q: What types of documents can I upload?**

A: MACAS supports various document formats:

**Primary Formats**:
- **PDF**: Course catalogs, handbooks, syllabi, reports (preferred format)
- **Microsoft Word**: .docx and .doc files for editable documents
- **Microsoft Excel**: .xlsx and .xls files for structured data
- **CSV**: Comma-separated values for course lists and data

**Document Types**:
- Course catalogs and program handbooks
- Individual course syllabi
- Assessment plans and rubrics
- Learning outcome documentation
- Accreditation reports and self-studies
- Policy documents and regulations
- Enrollment and performance data

**Limitations**:
- Maximum file size: 50 MB per document
- Password-protected files are not supported
- Scanned documents should be text-searchable (OCR available)

**Q: Why did my document upload fail?**

A: Common upload failure reasons and solutions:

**File Size Issues**:
- **Problem**: File exceeds 50 MB limit
- **Solution**: Compress PDF, split large documents, or convert to more efficient format

**Format Issues**:
- **Problem**: Unsupported file format
- **Solution**: Convert to PDF, Word, or Excel format

**Network Issues**:
- **Problem**: Upload interrupted or timed out
- **Solution**: Check internet connection, try during off-peak hours, upload smaller files first

**Browser Issues**:
- **Problem**: Browser blocking upload or JavaScript disabled
- **Solution**: Enable JavaScript, disable ad blockers temporarily, try different browser

**Q: How accurate is the automated document processing?**

A: Document processing accuracy varies by document type and quality:

**Typical Accuracy Rates**:
- **Well-formatted PDFs**: 90-95% accuracy
- **Scanned documents**: 80-90% accuracy (depends on image quality)
- **Complex layouts**: 70-85% accuracy
- **Non-English documents**: 85-95% accuracy for supported languages

**Factors Affecting Accuracy**:
- Document formatting and structure
- Text clarity and font quality
- Language and vocabulary complexity
- Table and layout complexity
- Image quality for scanned documents

**Quality Assurance**:
- All automated extractions are reviewable and editable
- Manual override options available for critical data
- Quality scores provided for each extraction
- Expert review recommended for important documents

### Document Organization

**Q: How should I organize my documents in MACAS?**

A: Follow these organization best practices:

**Recommended Folder Structure**:
```
Program Name/
├── Core Documents/
│   ├── Course Catalog (Current)
│   ├── Student Handbook (Current)
│   └── Assessment Plan (Current)
├── Course Materials/
│   ├── Core Course Syllabi/
│   ├── Elective Course Syllabi/
│   └── Learning Outcomes/
├── Historical Documents/
│   ├── Previous Catalogs/
│   └── Archived Materials/
└── Supporting Documents/
    ├── Accreditation Reports/
    ├── External Reviews/
    └── Compliance Documentation/
```

**Naming Conventions**:
- Use descriptive, consistent file names
- Include version dates: `CS_Catalog_2024-2025.pdf`
- Avoid special characters in file names
- Use standard abbreviations consistently

**Q: Can I share documents with colleagues?**

A: Yes, MACAS provides comprehensive document sharing options:

**Sharing Levels**:
- **Program Team**: Share with program development team
- **Department**: Share with department colleagues
- **Institution**: Share with all CEU users
- **External**: Share with external reviewers (limited access)

**Permission Types**:
- **View Only**: Read and download permissions
- **Comment**: Add comments and annotations
- **Edit**: Modify document metadata and organization
- **Owner**: Full control including sharing permissions

**Sharing Methods**:
- Direct user invitation via email
- Shareable links with expiration dates
- Integration with CEU email and collaboration tools
- Bulk sharing for multiple documents

## Analysis Features

### Running Analyses

**Q: How long does analysis take?**

A: Analysis time depends on several factors:

**Typical Processing Times**:
- **Gap Analysis**: 15-30 minutes
- **Peer Comparison**: 30-60 minutes  
- **Semantic Analysis**: 20-45 minutes
- **Comprehensive Analysis**: 60-120 minutes

**Factors Affecting Duration**:
- **Program Complexity**: Number of courses and requirements
- **Document Volume**: Amount of curriculum documentation
- **Peer Institution Count**: Number of institutions for comparison
- **Analysis Depth**: Detail level selected
- **System Load**: Current system utilization
- **Queue Position**: Your position in the analysis queue

**Time Optimization Tips**:
- Schedule large analyses during off-peak hours (evenings, weekends)
- Start with basic analysis types to get faster initial insights
- Use focused analysis parameters rather than comprehensive scopes
- Ensure documents are fully processed before starting analysis

**Q: What is peer comparison and how does it work?**

A: Peer comparison benchmarks your curriculum against similar institutions:

**Peer Selection Process**:
1. **Automatic Discovery**: System identifies similar institutions based on:
   - Institution type and mission
   - Academic level and program offerings
   - Geographic and cultural context
   - Size and student population
   - Accreditation status

2. **Manual Selection**: You can specify particular institutions:
   - Aspirational peers (institutions you want to emulate)
   - Direct competitors (similar programs in your region)
   - Benchmark leaders (top-ranked programs in your field)

**Comparison Metrics**:
- **Curriculum Structure**: Credit distribution, course organization
- **Content Coverage**: Topic areas, depth of coverage, emerging trends
- **Requirements**: Prerequisites, capstone projects, experiential learning
- **Innovation**: Use of technology, interdisciplinary approaches
- **Student Outcomes**: Employment rates, graduate school placement

**Q: Can I compare against specific institutions?**

A: Yes, you have full control over peer selection:

**Selection Options**:
- **Choose specific institutions**: Select from database of 500+ institutions
- **Regional focus**: Limit to Central Europe, EU, or global scope
- **Institution type**: Research universities, teaching colleges, specialized schools
- **Size categories**: Similar enrollment and faculty size
- **Program level**: Undergraduate, graduate, or professional programs

**Custom Institution Addition**:
- Request addition of institutions not in the database
- Provide institutional data for one-time comparisons
- Collaborate with peer institutions for mutual benchmarking

### Understanding Results

**Q: How should I interpret analysis scores?**

A: MACAS uses standardized scoring systems:

**Score Ranges** (0-100 scale):
- **90-100**: Excellent - Best-in-class performance
- **80-89**: Good - Above average with improvement opportunities
- **70-79**: Fair - Meets standards with notable gaps
- **60-69**: Poor - Significant improvements needed
- **0-59**: Critical - Major restructuring required

**Key Metrics Explained**:

**Completeness Score**:
- Measures how fully your curriculum covers required areas
- Based on accreditation standards and best practices
- Higher scores indicate comprehensive coverage

**Competitiveness Score**:
- Compares your program against peer institutions
- Higher scores indicate competitive advantages
- Shows relative positioning in your peer group

**Coherence Score**:
- Evaluates internal curriculum logic and flow
- Measures prerequisite chains and content progression
- Higher scores indicate well-structured curricula

**Innovation Score**:
- Assesses incorporation of emerging trends and technologies
- Measures pedagogical innovation and modern practices
- Higher scores indicate forward-thinking curricula

**Q: What do the recommendations mean and how should I prioritize them?**

A: MACAS recommendations are categorized by impact and effort:

**Priority Levels**:

**High Priority (Immediate - 0-6 months)**:
- Critical accreditation gaps that must be addressed
- Major competitive disadvantages requiring immediate attention
- Student success impediments with clear solutions
- Compliance requirements with deadlines

**Medium Priority (Short-term - 6-18 months)**:
- Enhancement opportunities with significant impact
- Competitive improvements requiring moderate resources
- Quality upgrades that improve student experience
- Efficiency optimizations that reduce workload

**Low Priority (Long-term - 12+ months)**:
- Innovation opportunities for future differentiation
- Strategic enhancements requiring significant planning
- Future-proofing measures for emerging trends
- Exploratory improvements with uncertain ROI

**Implementation Guidance**:
- **Quick Wins**: Low effort, high impact improvements to start immediately
- **Strategic Investments**: High effort, high impact changes requiring planning
- **Consider Later**: Medium impact improvements for future consideration
- **Avoid**: High effort, low impact changes that don't justify resources

## Reports and Export

### Report Types

**Q: What types of reports can MACAS generate?**

A: MACAS generates several report types for different audiences:

**Executive Summary** (2-4 pages):
- **Audience**: Senior leadership, deans, department heads
- **Content**: Key findings, strategic recommendations, high-level insights
- **Format**: Professional, board-ready presentation
- **Timeline**: Available immediately after analysis completion

**Detailed Analysis Report** (15-50 pages):
- **Audience**: Faculty, curriculum committees, academic planners
- **Content**: Comprehensive methodology, detailed findings, supporting data
- **Format**: Technical documentation with charts and references
- **Timeline**: Available 5-10 minutes after analysis completion

**Visual Dashboard**:
- **Audience**: All stakeholders needing data visualization
- **Content**: Interactive charts, graphs, comparative metrics
- **Format**: Web-based with drill-down capabilities
- **Timeline**: Available immediately, updates in real-time

**Action Plan Report** (5-15 pages):
- **Audience**: Implementation teams, project managers
- **Content**: Prioritized actions, timelines, resource requirements
- **Format**: Implementation-focused with clear next steps
- **Timeline**: Available with detailed analysis reports

**Accreditation Report** (20-100+ pages):
- **Audience**: Accreditation bodies, compliance officers
- **Content**: Standards mapping, evidence documentation, compliance analysis
- **Format**: Accreditor-specific formatting and requirements
- **Timeline**: Available 10-30 minutes after analysis completion

**Q: Can I customize report content and formatting?**

A: Yes, MACAS provides extensive report customization options:

**Content Customization**:
- **Section Selection**: Choose which sections to include
- **Detail Level**: Adjust depth of analysis and explanation
- **Focus Areas**: Emphasize specific curriculum aspects
- **Audience Targeting**: Customize language and presentation for audience

**Format Options**:
- **PDF**: Professional print-ready reports
- **Microsoft Word**: Editable documents for customization
- **Excel**: Data-focused spreadsheets with charts
- **PowerPoint**: Presentation slides with key insights
- **Interactive Web**: Online reports with interactive elements

**Branding Customization**:
- **CEU Branding**: Official university colors, logos, typography
- **Department Branding**: Include departmental identity elements
- **Custom Elements**: Add institution-specific design features
- **International Versions**: Multi-language report generation

**Q: How do I share reports with stakeholders?**

A: Multiple sharing options are available:

**Direct Distribution**:
- **Email Reports**: Send reports directly from the system
- **Download Links**: Generate secure download links
- **Bulk Distribution**: Send to multiple recipients simultaneously
- **Scheduled Delivery**: Set up automatic report delivery

**Access Control**:
- **Permission Levels**: Control who can view, download, or edit
- **Time-Limited Access**: Set expiration dates for shared links
- **Password Protection**: Add password security to sensitive reports
- **Watermarking**: Add watermarks to track document distribution

**Collaboration Features**:
- **Comment System**: Allow stakeholders to add comments and feedback
- **Version Control**: Track report versions and changes
- **Discussion Threads**: Enable collaborative discussion on findings
- **Approval Workflows**: Set up formal approval processes

### Data Export

**Q: Can I export data for use in other systems?**

A: Yes, MACAS provides comprehensive data export capabilities:

**Export Formats**:
- **CSV**: Raw data for spreadsheet analysis
- **Excel**: Formatted spreadsheets with charts and pivot tables
- **JSON**: Structured data for system integration
- **XML**: Standard data exchange format
- **API Access**: Direct data access for custom applications

**Exportable Data Types**:
- **Program Data**: Complete program information and structure
- **Analysis Results**: All analysis findings and metrics
- **Comparative Data**: Peer comparison results and benchmarks
- **Historical Data**: Trend analysis and longitudinal data
- **Document Metadata**: Information about uploaded documents

**Integration Options**:
- **API Endpoints**: Real-time data access for external systems
- **Scheduled Exports**: Automatic data exports on set schedules
- **Webhook Integration**: Event-driven data synchronization
- **Custom Formats**: Tailored export formats for specific systems

## Technical Support

### Getting Help

**Q: How do I get help if I have problems?**

A: Multiple support channels are available:

**Self-Service Options**:
- **Documentation**: Comprehensive user guides and tutorials
- **Video Library**: Step-by-step visual instructions
- **FAQ Database**: Answers to common questions
- **Community Forum**: Peer support and discussion

**Direct Support**:
- **Help Desk Email**: support@ceu.edu (4-hour response time)
- **Phone Support**: +36-1-327-3000 ext. 2500 (Mon-Fri, 9 AM-5 PM CET)
- **In-App Chat**: Real-time chat support during business hours
- **Emergency Hotline**: +36-1-327-3000 ext. 9999 (critical issues only)

**Specialized Support**:
- **Training Sessions**: Monthly group training webinars
- **Custom Training**: Department-specific training sessions
- **Implementation Support**: Assistance with system rollout
- **Technical Consultation**: Advanced feature configuration help

**Q: What information should I include when contacting support?**

A: To help support resolve your issue quickly, include:

**Essential Information**:
- **Your Name and Email**: Contact information
- **Institution and Department**: Your organizational context
- **Issue Description**: Clear description of the problem
- **When It Occurred**: Date and time of the issue
- **What You Were Trying to Do**: Context of the problem

**Technical Details**:
- **Browser and Version**: What browser you're using
- **Operating System**: Windows, macOS, Linux, etc.
- **Error Messages**: Exact text of any error messages
- **Screenshots**: Visual evidence of the problem
- **Steps to Reproduce**: How to recreate the issue

**Impact Information**:
- **Urgency Level**: How critical is this issue?
- **Affected Users**: Who else is experiencing this problem?
- **Workarounds Tried**: What have you tried already?
- **Business Impact**: How is this affecting your work?

### System Updates

**Q: How often is MACAS updated?**

A: MACAS follows a regular update schedule:

**Update Types**:

**Security Updates** (Weekly):
- Critical security patches
- Bug fixes for security vulnerabilities
- Usually applied during weekly maintenance windows

**Feature Updates** (Monthly):
- New features and capabilities
- User interface improvements
- Performance enhancements
- Applied during monthly maintenance windows

**Major Releases** (Quarterly):
- Significant new functionality
- Major interface changes
- Integration with new external systems
- Requires extended maintenance window

**Emergency Updates** (As Needed):
- Critical bug fixes
- Security vulnerabilities requiring immediate attention
- May require brief service interruption

**Update Notifications**:
- **In-App Notifications**: Announcements of upcoming updates
- **Email Alerts**: Important update notifications sent to users
- **Release Notes**: Detailed information about changes and new features
- **Training Materials**: Updated documentation and tutorials

**Q: Will my data be affected by system updates?**

A: No, system updates are designed to preserve all user data:

**Data Protection During Updates**:
- **Automatic Backups**: Complete system backup before all updates
- **Data Migration**: Automated data migration for structural changes
- **Rollback Capability**: Ability to revert if issues occur
- **Validation Testing**: Comprehensive testing before production deployment

**What to Expect**:
- **Temporary Downtime**: Brief service interruption during major updates
- **Feature Changes**: Some interfaces may look or work differently
- **Performance Improvements**: Updates often improve system performance
- **New Capabilities**: Access to new features and improvements

**User Actions**:
- **No Action Required**: Updates are applied automatically
- **Clear Browser Cache**: May be needed after major updates
- **Review New Features**: Take advantage of new capabilities
- **Update Documentation**: Review updated user guides

## Advanced Features

### Integration and APIs

**Q: Can MACAS integrate with our existing systems?**

A: Yes, MACAS provides extensive integration capabilities:

**Supported Integrations**:

**Student Information Systems (SIS)**:
- Automatic student enrollment data synchronization
- Grade and performance data integration
- Degree audit and requirement tracking
- Popular SIS platforms: Banner, PeopleSoft, Student Information Systems

**Learning Management Systems (LMS)**:
- Course content alignment with curriculum
- Assessment data integration
- Student activity and engagement tracking
- Supported LMS: Canvas, Moodle, Blackboard, D2L

**Authentication Systems**:
- Single Sign-On (SSO) integration
- LDAP and Active Directory connectivity
- Multi-factor authentication support
- OAuth and SAML protocol support

**External Data Sources**:
- Accreditation body databases
- Industry standard repositories
- Peer institution data sharing
- Government education databases

**Integration Benefits**:
- **Reduced Manual Work**: Automatic data synchronization
- **Improved Accuracy**: Elimination of manual data entry errors
- **Real-Time Updates**: Current data always available
- **Comprehensive Analysis**: More complete picture of programs

**Q: Is there an API for custom integrations?**

A: Yes, MACAS provides RESTful APIs for custom integration:

**API Capabilities**:
- **Data Access**: Retrieve program and analysis data
- **Program Management**: Create and update programs programmatically
- **Document Upload**: Automated document submission
- **Analysis Execution**: Trigger analyses via API calls
- **Report Generation**: Generate and retrieve reports programmatically

**API Features**:
- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Format**: Standard data exchange format
- **Authentication**: Secure API key and OAuth authentication
- **Rate Limiting**: Fair usage policies and throttling
- **Documentation**: Comprehensive API documentation with examples

**Use Cases**:
- **Automated Workflows**: Integration with institutional processes
- **Custom Dashboards**: Create custom reporting interfaces
- **Data Warehousing**: Export data to institutional data warehouses
- **Mobile Applications**: Build custom mobile interfaces

### Automation Features

**Q: Can I automate recurring tasks in MACAS?**

A: Yes, MACAS provides several automation features:

**Automated Analysis**:
- **Scheduled Analysis**: Run analyses on regular schedules
- **Trigger-Based Analysis**: Automatic analysis when documents are updated
- **Batch Analysis**: Process multiple programs simultaneously
- **Notification Automation**: Automatic alerts when analyses complete

**Document Processing Automation**:
- **Folder Monitoring**: Watch folders for new documents
- **Email Integration**: Process documents sent via email
- **Batch Upload**: Automated upload of multiple documents
- **Quality Validation**: Automatic quality checks on uploaded documents

**Report Automation**:
- **Scheduled Reports**: Generate reports on regular schedules
- **Distribution Automation**: Automatically send reports to stakeholders
- **Format Automation**: Generate multiple report formats simultaneously
- **Archive Management**: Automatic organization of generated reports

**Workflow Automation**:
- **Approval Workflows**: Automated approval processes
- **Task Assignment**: Automatic task assignment to team members
- **Status Updates**: Automated status notifications
- **Escalation Procedures**: Automatic escalation for overdue tasks

### Data Analytics

**Q: What analytics and insights does MACAS provide?**

A: MACAS provides comprehensive analytics at multiple levels:

**Program-Level Analytics**:
- **Health Metrics**: Overall program health and completeness scores
- **Trend Analysis**: Program evolution and improvement over time
- **Peer Positioning**: Competitive position relative to peer institutions
- **Gap Analysis**: Specific areas needing attention or improvement

**Department-Level Analytics**:
- **Portfolio Overview**: Summary of all department programs
- **Resource Allocation**: Analysis of resource distribution across programs
- **Quality Trends**: Department-wide quality improvement trends
- **Comparative Performance**: Department performance relative to peers

**Institution-Level Analytics**:
- **Strategic Dashboards**: Executive-level view of institutional curriculum health
- **Accreditation Readiness**: Institution-wide accreditation compliance status
- **Market Position**: Competitive analysis across all programs
- **Investment Planning**: Data-driven curriculum investment recommendations

**Predictive Analytics**:
- **Trend Forecasting**: Predicted curriculum development needs
- **Market Demand**: Analysis of future skill and program demand
- **Resource Planning**: Projected resource needs for program improvements
- **Risk Assessment**: Identification of potential curriculum risks

---

## Additional Resources

### Training and Learning

**Q: Where can I learn more about curriculum development best practices?**

A: MACAS includes extensive educational resources:

**Built-in Resources**:
- **Best Practice Library**: Curated collection of curriculum development strategies
- **Case Study Database**: Real-world examples of successful curriculum improvements
- **Research Integration**: Latest research on curriculum effectiveness
- **Methodology Guides**: Detailed explanations of analysis approaches

**External Learning**:
- **Professional Development**: Links to relevant conferences and workshops
- **Academic Partnerships**: Connections with curriculum development experts
- **Research Collaborations**: Opportunities to participate in curriculum research
- **Community of Practice**: Network of curriculum development professionals

### Community and Collaboration

**Q: How can I connect with other MACAS users?**

A: MACAS includes several community features:

**User Community**:
- **Discussion Forums**: Topic-specific discussion areas
- **Best Practice Sharing**: Platform for sharing successful strategies
- **Peer Networking**: Connect with users at similar institutions
- **Expert Consultations**: Access to curriculum development experts

**Collaboration Features**:
- **Institutional Partnerships**: Collaborate with peer institutions
- **Benchmark Sharing**: Participate in benchmarking consortiums
- **Research Participation**: Contribute to curriculum effectiveness research
- **Knowledge Sharing**: Share templates, practices, and insights

For additional questions not covered in this FAQ, contact support at support@ceu.edu or use the in-app chat feature. The support team is available to help with any MACAS-related questions or issues.
# Requirements: Multi-Agent Curriculum Alignment System for CEU

## Product Overview

The Multi-Agent Curriculum Alignment System (MACAS) is a comprehensive platform designed to automatically align curricula across individual university programs at Central European University (CEU). The system enables automated data collection from diverse sources, semantic analysis of curriculum content, gap identification, and generation of unified curriculum documentation with peer university comparisons.

## User Stories

### Core Curriculum Collection and Analysis

**User Story 1: Automated Course Data Collection**
- As an **Academic Administrator**, I want to **automatically collect course data from TimeEdit web portal** so that **I can have up-to-date course information without manual data entry**.
- **EARS Criteria**: GIVEN the system has access to TimeEdit web portal, WHEN I initiate a course data collection process for a specific program, THEN the system SHALL extract course content, learning outcomes, and curriculum information for all courses in that program.

**User Story 2: Central Document Processing**
- As an **Academic Administrator**, I want to **upload and process Excel/Word documents containing program descriptions** so that **I can integrate centralized program information with individual course data**.
- **EARS Criteria**: GIVEN I have uploaded a program document (Excel/Word), WHEN the system processes the document, THEN it SHALL extract program content, learning outcomes, and curriculum structure and store them in a structured format.

**User Story 3: Curriculum Gap Analysis**
- As an **Academic Program Director**, I want to **automatically identify gaps between individual course curricula and overall program requirements** so that **I can ensure comprehensive curriculum coverage**.
- **EARS Criteria**: GIVEN course data and program requirements are available, WHEN I request a gap analysis, THEN the system SHALL generate a report highlighting missing content areas, overlapping content, and alignment issues.

### Multi-Agent Semantic Analysis

**User Story 4: Coordinated Multi-Agent Processing**
- As an **Academic Administrator**, I want **specialized AI agents to automatically coordinate curriculum analysis tasks** so that **complex processing is handled efficiently and accurately**.
- **EARS Criteria**: GIVEN a curriculum analysis request, WHEN the coordinator agent receives the task, THEN it SHALL orchestrate specialized agents (web search, browser automation, document processing, content analysis, QA) to complete the workflow.

**User Story 5: Semantic Curriculum Mapping**
- As an **Academic Administrator**, I want the **semantic search agent to identify relationships between different curriculum elements** so that **I can understand how courses connect within and across programs**.
- **EARS Criteria**: GIVEN curriculum content from multiple sources, WHEN semantic analysis is performed, THEN the system SHALL identify conceptual relationships, skill progressions, and knowledge dependencies between curriculum elements.

**User Story 6: Unified Terminology Standardization**
- As an **Academic Administrator**, I want the **QA agent to standardize terminology across all curriculum documents** so that **all materials use consistent language and definitions**.
- **EARS Criteria**: GIVEN curriculum content with varying terminology, WHEN the standardization process runs, THEN the QA agent SHALL apply unified vocabulary and generate standardized curriculum documentation.

**User Story 7: Interactive Curriculum Chat**
- As an **Academic Program Director**, I want to **chat with an AI assistant about curriculum analysis results** so that **I can ask questions and get insights about gaps, peer comparisons, and alignment issues**.
- **EARS Criteria**: GIVEN curriculum analysis data in the system, WHEN I ask questions in the chat interface, THEN the chat agent SHALL provide accurate answers about curricula, gaps, peer universities, and recommendations.

### Peer University Comparison

**User Story 8: Peer University Data Collection**
- As an **Academic Program Director**, I want to **configure the web search and browser agents to analyze curricula from comparable universities** so that **I can benchmark CEU programs against peer institutions**.
- **EARS Criteria**: GIVEN a configurable list of peer universities and their program URLs, WHEN I initiate a peer comparison analysis, THEN the web search and browser agents SHALL collect and analyze curriculum data from specified institutions.

**User Story 9: Comparative Gap Analysis**
- As an **Academic Program Director**, I want to **receive reports showing how CEU curricula compare to peer universities** so that **I can identify opportunities for improvement and competitive advantages**.
- **EARS Criteria**: GIVEN CEU curriculum data and peer university data, WHEN a comparative analysis is requested, THEN the accreditation expert agent SHALL generate reports highlighting gaps, similarities, and unique strengths relative to peer institutions.

### Document Generation and Reporting

**User Story 10: Multi-Format Report Generation**
- As an **Academic Administrator**, I want to **export gap analysis and aligned curricula in multiple formats (Excel, Word, PDF)** so that **I can share results with different stakeholders in their preferred format**.
- **EARS Criteria**: GIVEN completed curriculum analysis, WHEN I request a report export, THEN the document processing agent SHALL generate professionally formatted documents in Excel, Word, and PDF formats.

**User Story 11: Unified Curriculum Documentation**
- As an **Academic Administrator**, I want to **generate unified curriculum documents that align all courses within a program** so that **I have consistent documentation for accreditation and planning purposes**.
- **EARS Criteria**: GIVEN analyzed curriculum data, WHEN I request unified documentation, THEN the system SHALL produce comprehensive curriculum documents with standardized terminology and aligned learning outcomes.

### User Management and Administration

**User Story 12: Role-Based Access Control**
- As a **System Administrator**, I want to **manage user roles and permissions** so that **different users have appropriate access levels to system functions**.
- **EARS Criteria**: GIVEN the user management interface, WHEN I assign roles to users, THEN the system SHALL enforce role-based permissions for viewing, editing, and administrative functions.

**User Story 13: Document Upload/Download Management**
- As an **Academic Administrator**, I want to **securely upload program documents and download generated reports** so that **I can manage curriculum data efficiently**.
- **EARS Criteria**: GIVEN authenticated access, WHEN I upload or download documents, THEN the system SHALL provide secure file transfer with audit logging.

**User Story 14: Configuration Management**
- As a **System Administrator**, I want to **configure web links, peer universities, and system parameters** so that **the system adapts to changing institutional needs**.
- **EARS Criteria**: GIVEN administrative access, WHEN I modify configuration settings, THEN the system SHALL update collection targets and analysis parameters accordingly.

### User Experience and Branding

**User Story 15: Professional CEU-Branded Interface**
- As a **CEU User**, I want to **interact with a professionally designed interface that reflects CEU's brand identity** so that **I have a consistent and trustworthy experience**.
- **EARS Criteria**: GIVEN the web interface, WHEN I access the system, THEN the interface SHALL display CEU logo, use institutional colors, and maintain professional typography and spacing using Tailwind CSS design system.

**User Story 16: Responsive Professional Design**
- As a **Mobile User**, I want to **access a reactive interface that adapts to any device size and orientation** so that **I can work effectively on any device with optimal performance**.
- **EARS Criteria**: GIVEN various device sizes and orientations, WHEN I access the system, THEN the interface SHALL provide reactive Tailwind CSS layouts that maintain professional aesthetics and usability across desktop, tablet, mobile, and foldable devices.

**User Story 17: LLM Model Selection and Configuration**
- As a **System User**, I want to **configure which LLM models are used for different agent tasks** so that **I can optimize cost, performance, and quality based on my needs**.
- **EARS Criteria**: GIVEN the top app bar configuration menu, WHEN I select LLM models for different agents, THEN the system SHALL use the specified models for Chat Interface Agent, Accreditation Expert Agent, QA Agent, and other LLM-dependent agents.

**User Story 18: Real-time System Status Monitoring**
- As a **System User**, I want to **see real-time status of the multi-agent system in the bottom app bar** so that **I can monitor workflow progress and system health**.
- **EARS Criteria**: GIVEN active multi-agent workflows, WHEN I view the bottom app bar, THEN it SHALL display current agent status, workflow progress, error indicators, and system performance metrics.

**User Story 19: Semantic Analysis Model Configuration**
- As a **System Administrator**, I want to **configure inexpensive and fast models for semantic analysis and vector indexing** so that **I can minimize costs while maintaining analysis quality**.
- **EARS Criteria**: GIVEN the configuration menu, WHEN I select models like Grok for semantic analysis, THEN the Semantic Search Agent SHALL use the specified model for vector embeddings and similarity calculations.

### Technical Infrastructure

**User Story 20: Serverless Backend Deployment**
- As a **DevOps Engineer**, I want to **deploy serverless functions to AWS Lambda with API Gateway** so that **we have cost-effective, auto-scaling backend infrastructure**.
- **EARS Criteria**: GIVEN serverless deployment configuration, WHEN I deploy the backend, THEN the system SHALL provision Lambda functions, API Gateway endpoints, and associated AWS resources automatically.

**User Story 21: Multi-Environment Serverless Setup**
- As a **DevOps Engineer**, I want to **deploy serverless infrastructure to development and production environments** so that **we have proper staging and live environments without server management**.
- **EARS Criteria**: GIVEN AWS SAM/Serverless Framework templates, WHEN I execute deployment, THEN the system SHALL be available in both development and production environments with appropriate Lambda configurations.

**User Story 22: Secure Configuration Management**
- As a **System Administrator**, I want to **manage API keys and credentials through environment files and AWS Secrets Manager** so that **sensitive information is properly secured and configurable**.
- **EARS Criteria**: GIVEN environment configuration files and AWS Secrets Manager, WHEN the system starts, THEN Lambda functions SHALL load all credentials and API keys from secure sources.

**User Story 23: One-Command Installation**
- As a **System Administrator**, I want to **install the entire system with a single command** so that **setup is streamlined and error-free**.
- **EARS Criteria**: GIVEN the installation script and system requirements, WHEN I run ./install.sh (or .bat), THEN the system SHALL be fully configured for development and deployment including serverless infrastructure.

## Functional Requirements

### Multi-Agent System Requirements
- F1: The system SHALL implement a Coordinator Agent that orchestrates all other agents and manages workflow execution
- F2: The system SHALL implement a Web Search Agent for discovering peer university curricula and academic content
- F3: The system SHALL implement a Browser Agent using Stagehand/MCP technology to extract course information from TimeEdit portals and peer university websites
- F4: The system SHALL implement a Document Processing Agent to read/write Excel (.xlsx, .xls), Word (.docx, .doc), and PDF documents
- F5: The system SHALL implement an Accreditation Expert Agent specialized in curriculum analysis and educational standards
- F6: The system SHALL implement a QA Agent to ensure consistent formatting and professional terminology across all documents
- F7: The system SHALL implement a Semantic Search Agent using Qdrant vector database for curriculum similarity analysis
- F8: The system SHALL implement a Chat Interface Agent for interactive Q&A about curriculum analysis results

### Data Collection Requirements
- F9: The Browser Agent SHALL integrate with web browsers using Stagehand/MCP technology to extract course information from TimeEdit portals
- F10: The Document Processing Agent SHALL process Excel (.xlsx, .xls) and Word (.docx, .doc) documents to extract structured curriculum data
- F11: The system SHALL maintain configurable lists of target universities for peer comparison in PostgreSQL database
- F12: The Web Search Agent SHALL perform automated web searches to discover and analyze peer university curricula

### Semantic Analysis Requirements
- F13: The Semantic Search Agent SHALL use Qdrant vector database for semantic similarity searches across curriculum content
- F14: The Accreditation Expert Agent SHALL identify semantic relationships between courses, learning outcomes, and curriculum elements
- F15: The QA Agent SHALL maintain a unified terminology dictionary for standardizing curriculum language
- F16: The system SHALL support multiple languages as appropriate for CEU's international context (English, Hungarian, other EU languages)

### Analysis and Reporting Requirements
- F17: The Accreditation Expert Agent SHALL generate gap analysis reports identifying missing content areas within programs
- F18: The Accreditation Expert Agent SHALL produce comparative analysis reports showing differences between CEU and peer university curricula
- F19: The QA Agent SHALL create unified curriculum documents with standardized terminology and aligned learning outcomes
- F20: The Document Processing Agent SHALL support export to Excel, Word, and PDF formats for all generated reports

### Chat Interface Requirements
- F21: The Chat Interface Agent SHALL provide natural language Q&A about curriculum analysis results
- F22: The Chat Interface Agent SHALL answer questions about curriculum gaps, peer university comparisons, and alignment recommendations
- F23: The Chat Interface Agent SHALL access PostgreSQL database and vector search results to provide accurate responses
- F24: The Chat Interface Agent SHALL maintain conversation context and provide follow-up capabilities

### LLM Model Configuration Requirements
- F47: The system SHALL support configurable LLM models for different agent types (Chat Interface, Accreditation Expert, QA, Semantic Search)
- F48: The system SHALL provide a top app bar configuration menu for selecting LLM models per agent
- F49: The system SHALL support multiple LLM providers (OpenAI, Anthropic, Grok, Google, Azure OpenAI, local models)
- F50: The system SHALL allow cost-optimized model selection for semantic analysis and vector indexing (e.g., Grok, Claude Haiku)
- F51: The system SHALL store LLM model preferences per user in PostgreSQL database
- F52: The system SHALL validate LLM model availability and API keys before agent execution

### User Interface Requirements
- F25: The system SHALL provide a modern React-based web interface with Vite build tool and Redux state management
- F26: The system SHALL implement MVI (Model-View-Intent) architecture for predictable state management
- F27: The system SHALL provide role-based dashboards for different user types (administrators, program directors, regular users)
- F28: The system SHALL support file upload/download with progress indicators and error handling
- F29: The system SHALL use Tailwind CSS for consistent, professional styling across all components
- F30: The system SHALL incorporate CEU branding including logo, institutional colors (CEU blue #0033A0, gold #FFC72C), and typography
- F31: The system SHALL implement Tailwind's component classes for maintainable and consistent design patterns
- F32: The system SHALL provide dark mode support using Tailwind CSS dark mode utilities
- F33: The system SHALL include a real-time chat interface for interacting with the Chat Interface Agent

### App Bar and Status Requirements
- F53: The system SHALL provide a top app bar with CEU logo, navigation menu, and LLM model configuration dropdown
- F54: The top app bar SHALL include user profile menu, notifications, and system settings access
- F55: The system SHALL provide a bottom status bar displaying real-time multi-agent system status
- F56: The bottom status bar SHALL show active agents, workflow progress, error indicators, and performance metrics
- F57: The system SHALL implement reactive design that adapts to any device size, orientation, and input method
- F58: The system SHALL maintain consistent functionality across desktop, tablet, mobile, and foldable devices

### Security and Authentication Requirements
- F34: The system SHALL implement secure user authentication using AWS Cognito or similar service
- F35: The system SHALL provide role-based access control with configurable permissions
- F36: The system SHALL maintain audit logs for all user actions and system operations in CloudWatch
- F37: The system SHALL encrypt sensitive data at rest (S3, PostgreSQL) and in transit (HTTPS/TLS)

### Infrastructure Requirements
- F38: The system SHALL use AWS Lambda functions for serverless backend processing and agent orchestration
- F39: The system SHALL use API Gateway for RESTful API endpoints with request/response validation
- F40: The system SHALL use PostgreSQL (Supabase or Neon) for relational data storage with high performance
- F41: The system SHALL use S3 for document storage and static website hosting
- F42: The system SHALL use CloudFront CDN for global content delivery and caching
- F43: The system SHALL implement infrastructure as code using AWS SAM or Serverless Framework
- F44: The system SHALL support separate development and production environments with stage variables
- F45: The system SHALL provide automated deployment pipelines using AWS CodePipeline or GitHub Actions
- F46: The system SHALL integrate Qdrant vector database for semantic search capabilities

## Non-Functional Requirements

### Performance Requirements
- NF1: The system SHALL process course data collection requests within 5 minutes for typical program sizes (50-100 courses)
- NF2: The system SHALL support concurrent analysis operations for multiple programs using parallel Lambda executions
- NF3: The system SHALL maintain API response times under 1 second for cached content via CloudFront
- NF4: The vector database SHALL support semantic searches across 10,000+ curriculum documents
- NF5: Lambda functions SHALL cold start within 3 seconds and warm executions under 500ms

### Scalability Requirements
- NF6: The system SHALL support analysis of curricula from 100+ peer universities
- NF7: The system SHALL automatically scale to handle 10,000+ concurrent Lambda executions for multi-agent processing
- NF8: The system SHALL scale API Gateway to 10,000 requests per second with throttling protection
- NF9: The system SHALL support PostgreSQL connection pooling and read replicas for high-throughput workloads
- NF10: The system SHALL support data storage growth to 1TB+ in S3 with lifecycle policies
- NF11: The system SHALL handle concurrent multi-agent workflows with proper resource allocation

### Reliability Requirements
- NF12: The system SHALL maintain 99.9% uptime leveraging AWS managed services and PostgreSQL provider SLAs
- NF13: The system SHALL implement automatic PostgreSQL backup and point-in-time recovery
- NF14: The system SHALL use Lambda Dead Letter Queues for failed agent processing
- NF15: The system SHALL implement exponential backoff retry logic for transient failures in multi-agent workflows
- NF16: The system SHALL validate all extracted data for completeness and accuracy across agent interactions

### Security Requirements
- NF17: The system SHALL comply with GDPR requirements for data protection
- NF18: The system SHALL implement secure communication using HTTPS/TLS via API Gateway
- NF19: The system SHALL protect against common web vulnerabilities (OWASP Top 10)
- NF20: The system SHALL use AWS Secrets Manager for secure credential management
- NF21: The system SHALL implement AWS WAF for API Gateway protection
- NF22: The system SHALL secure PostgreSQL connections with SSL/TLS encryption
- NF23: The system SHALL implement secure inter-agent communication within Lambda functions

### Usability Requirements
- NF24: The system SHALL provide intuitive interfaces with Tailwind UI components requiring minimal training
- NF25: The system SHALL support common web browsers (Chrome, Firefox, Safari, Edge)
- NF26: The system SHALL provide responsive design using Tailwind's responsive utilities for mobile and tablet access
- NF27: The system SHALL offer comprehensive help documentation and user guides
- NF28: The system SHALL maintain consistent CEU branding across all interfaces
- NF29: The system SHALL provide intuitive chat interface for natural language interactions with analysis results

### Maintainability Requirements
- NF30: The system SHALL use TypeScript for type safety and maintainability across all agents
- NF31: The system SHALL provide comprehensive API documentation using OpenAPI/Swagger
- NF32: The system SHALL implement automated testing with 80%+ code coverage for all agent functions
- NF33: The system SHALL use AWS SAM/Serverless Framework for infrastructure as code
- NF34: The system SHALL support blue-green deployments for zero-downtime updates

## Acceptance Criteria

### Data Collection Acceptance
- AC1: Successfully extract course information from at least 3 different TimeEdit portals
- AC2: Process Excel and Word documents with 95%+ accuracy in data extraction
- AC3: Collect and analyze curricula from 10+ peer universities
- AC4: Complete full data collection cycle within defined time limits

### Analysis Acceptance
- AC5: Generate gap analysis reports with actionable insights for program improvement
- AC6: Produce comparative analysis showing meaningful differences with peer institutions
- AC7: Create unified curriculum documents with consistent terminology
- AC8: Achieve semantic similarity matching with 85%+ accuracy

### Technical Acceptance
- AC9: Deploy successfully to AWS with both development and production environments
- AC10: Complete installation process with single command execution
- AC11: Support all required file formats for import and export
- AC12: Maintain system performance under specified load conditions

### User Experience Acceptance
- AC13: Enable non-technical users to perform curriculum analysis tasks
- AC14: Provide clear error messages and recovery guidance
- AC15: Support role-based access with appropriate permission enforcement
- AC16: Generate professional-quality reports suitable for institutional use

### LLM Configuration Acceptance
- AC17: Successfully configure different LLM models for each agent type
- AC18: Display real-time cost estimates and performance metrics for model selection
- AC19: Validate all selected models before workflow execution
- AC20: Achieve 80% cost reduction using optimized models for semantic analysis

### Reactive Design Acceptance
- AC21: Maintain full functionality across all device sizes and orientations
- AC22: Provide intuitive touch and mouse interactions for all interface elements
- AC23: Display real-time system status in bottom app bar across all devices
- AC24: Support seamless model configuration via top app bar dropdown menu

## Constraints and Assumptions

### Technical Constraints
- TC1: Must use TypeScript for all backend Lambda functions
- TC2: Must use React with Vite, Redux, and Tailwind CSS for frontend development  
- TC3: Must use Qdrant for vector database functionality (hosted or serverless)
- TC4: Must deploy to AWS serverless infrastructure (Lambda, API Gateway, PostgreSQL, S3)
- TC5: Must support Stagehand/MCP for web automation
- TC6: Must use AWS SAM or Serverless Framework for infrastructure as code
- TC7: Must implement Tailwind CSS design system for all UI components
- TC8: Must incorporate CEU visual identity guidelines
- TC9: Must support multiple LLM providers (OpenAI, Anthropic, Grok, Google, Azure)
- TC10: Must implement reactive design that works on all device types and orientations
- TC11: Must provide real-time status monitoring and model configuration interfaces

### Business Constraints
- BC1: Must comply with university data privacy policies
- BC2: Must integrate with existing CEU IT infrastructure
- BC3: Must support multilingual content (English, Hungarian, other EU languages)
- BC4: Must provide audit trails for accreditation purposes

### Assumptions
- A1: TimeEdit portals maintain consistent structure for automated extraction
- A2: Peer universities provide publicly accessible curriculum information
- A3: Users have basic computer literacy for web application use
- A4: AWS services will remain available and cost-effective
- A5: LLM APIs (for semantic analysis) will maintain reliable service

## Dependencies

### External Dependencies
- ED1: TimeEdit web portal structure and availability
- ED2: Peer university website accessibility and structure
- ED3: AWS cloud services and pricing
- ED4: LLM API services for semantic analysis
- ED5: Qdrant vector database service

### Internal Dependencies
- ID1: CEU IT infrastructure compatibility
- ID2: University policy approval for automated data collection
- ID3: User training and change management support
- ID4: Ongoing maintenance and support resources

## Architecture Specifications

### Multi-Agent Serverless Architecture
- SA1: **Coordinator Agent** - Central orchestration Lambda function managing workflow execution and inter-agent communication
- SA2: **Web Search Agent** - Lambda function for discovering and researching peer university curricula using web search APIs
- SA3: **Browser Agent** - Lambda function with Stagehand/MCP integration for automated web scraping of TimeEdit and university websites
- SA4: **Document Processing Agent** - Lambda function for reading/writing Excel, Word, and PDF documents with format validation
- SA5: **Accreditation Expert Agent** - Lambda function specialized in curriculum analysis, gap identification, and educational standards
- SA6: **QA Agent** - Lambda function ensuring consistent formatting, terminology standardization, and quality control
- SA7: **Semantic Search Agent** - Lambda function interfacing with Qdrant for vector similarity searches and curriculum mapping
- SA8: **Chat Interface Agent** - Lambda function providing natural language Q&A capabilities about analysis results

### Backend Infrastructure Architecture
- SA9: API Gateway with request/response models and input validation for agent endpoints
- SA10: PostgreSQL database (Supabase/Neon) for structured data storage including user data, curriculum metadata, and analysis results
- SA11: S3 buckets for document storage with versioning and encryption
- SA12: Qdrant vector database for semantic search (managed service or containerized)
- SA13: Step Functions for orchestrating complex multi-agent workflows
- SA14: EventBridge for event-driven architecture and scheduled tasks
- SA15: CloudWatch for centralized logging and monitoring across all agents

### Multi-Agent Workflow Architecture
- WF1: **Initial Data Collection Flow**: Coordinator Agent → Browser Agent (TimeEdit extraction) → Document Processing Agent (Excel/Word processing) → PostgreSQL storage
- WF2: **Peer University Analysis Flow**: Coordinator Agent → Web Search Agent (university discovery) → Browser Agent (website scraping) → Semantic Search Agent (content analysis)
- WF3: **Curriculum Analysis Flow**: Coordinator Agent → Accreditation Expert Agent (gap analysis) → Semantic Search Agent (similarity matching) → QA Agent (standardization)
- WF4: **Report Generation Flow**: Coordinator Agent → Document Processing Agent (format generation) → QA Agent (quality check) → S3 storage
- WF5: **Chat Interaction Flow**: Chat Interface Agent → PostgreSQL query → Semantic Search Agent (vector search) → Response generation
- WF6: **Error Handling Flow**: Failed agent → Dead Letter Queue → Coordinator Agent (retry logic) → Alternative agent pathway

### Frontend Architecture
- FA1: React 18+ with Vite for fast development and optimized builds
- FA2: Redux Toolkit for state management with RTK Query for API calls
- FA3: MVI (Model-View-Intent) pattern for predictable state updates
- FA4: Tailwind CSS v3+ with custom configuration for CEU branding
- FA5: Component library using Tailwind UI patterns
- FA6: React Router for client-side routing
- FA7: AWS Amplify or S3 + CloudFront for static hosting
- FA8: Progressive Web App (PWA) capabilities for offline access
- FA9: Real-time chat interface with WebSocket support for Chat Interface Agent
- FA10: Agent status dashboard showing multi-agent workflow progress

### PostgreSQL Data Model Specifications
- DM1: **Users Table** - user_id, email, role, created_at, updated_at, ui_preferences, llm_model_preferences
- DM2: **Programs Table** - program_id, ceu_program_name, description, department, created_at, updated_at
- DM3: **Courses Table** - course_id, program_id, course_name, course_code, credits, learning_outcomes, content_description
- DM4: **Peer_Universities Table** - university_id, name, country, website_url, programs_url, last_analyzed_at
- DM5: **Peer_Programs Table** - peer_program_id, university_id, program_name, description, courses_data, analysis_date
- DM6: **Gap_Analyses Table** - analysis_id, program_id, analysis_type, gaps_identified, recommendations, created_by, created_at
- DM7: **Comparison_Reports Table** - report_id, ceu_program_id, peer_program_ids, similarities, differences, generated_at
- DM8: **Agent_Workflows Table** - workflow_id, initiating_user, agents_involved, status, start_time, end_time, results, model_configurations
- DM9: **Chat_Sessions Table** - session_id, user_id, conversation_history, context_data, model_used, created_at, updated_at
- DM10: **Documents Table** - document_id, document_type, file_path, processed_content, extraction_metadata, uploaded_by
- DM11: **LLM_Model_Configurations Table** - config_id, user_id, agent_type, model_provider, model_name, api_key_reference, created_at, updated_at
- DM12: **System_Status Table** - status_id, agent_name, status, last_heartbeat, performance_metrics, error_count, created_at

### UI/UX Design Specifications
- UX1: CEU brand colors - Primary: #0033A0 (CEU Blue), Secondary: #FFC72C (CEU Gold)
- UX2: Typography using Inter font family with fallback to system fonts
- UX3: Consistent spacing using Tailwind's spacing scale (0.25rem base)
- UX4: Card-based layouts with subtle shadows using Tailwind's shadow utilities
- UX5: Reactive breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px), ultrawide (>1440px)
- UX6: Loading states with skeleton screens and progress indicators
- UX7: Toast notifications for user feedback using Tailwind animations
- UX8: Accessible color contrast ratios meeting WCAG AA standards
- UX9: Chat interface with message bubbles, typing indicators, and conversation history
- UX10: Multi-agent workflow visualization showing progress and status of each agent

### App Bar Design Specifications
- UX11: **Top App Bar** - CEU logo (left), navigation breadcrumbs (center), LLM config dropdown + user menu (right)
- UX12: **LLM Configuration Menu** - Agent-specific model selection with cost indicators and performance metrics
- UX13: **Bottom Status Bar** - Active agents display, workflow progress bar, error indicators, system health metrics
- UX14: **Reactive Layout** - Automatic layout adaptation for portrait/landscape, touch/mouse input, screen density
- UX15: **Model Selection UI** - Dropdown with provider logos, model descriptions, cost estimates, and availability status
- UX16: **Status Indicators** - Color-coded agent status (green=active, yellow=processing, red=error, gray=idle)
- UX17: **Progress Visualization** - Real-time workflow progress with agent sequence and completion percentages

### LLM Model Support Specifications
- LM1: **Chat Interface Agent Models**: GPT-4, Claude-3.5-Sonnet, Grok-3, Gemini-Pro, Azure-OpenAI-GPT4
- LM2: **Accreditation Expert Agent Models**: GPT-4, Claude-3.5-Sonnet, Grok-3 (specialized academic reasoning)
- LM3: **QA Agent Models**: GPT-3.5-Turbo, Claude-3-Haiku, Grok-2 (cost-optimized for formatting tasks)
- LM4: **Semantic Search Agent Models**: Grok-1 (fast embeddings), Claude-3-Haiku, text-embedding-3-small
- LM5: **Web Search Agent Models**: GPT-3.5-Turbo, Grok-2 (efficient search query generation)
- LM6: **Browser Agent Models**: GPT-3.5-Turbo, Claude-3-Haiku (DOM understanding and extraction)
- LM7: **Document Processing Agent Models**: GPT-4-Vision, Claude-3.5-Sonnet (OCR and format understanding)
- LM8: **Model Cost Tiers**: Premium ($0.10+/1K tokens), Standard ($0.01-0.10/1K), Economy (<$0.01/1K tokens)
- LM9: **Default Configurations**: Grok models for semantic analysis, Claude-Haiku for QA, GPT-4 for complex analysis
- LM10: **Model Validation**: API availability check, rate limit verification, cost estimation before execution

## Success Metrics

### Operational Metrics
- SM1: Reduce curriculum analysis time by 80% compared to manual processes
- SM2: Achieve 95% user satisfaction rating for system usability
- SM3: Process curriculum data for 100% of CEU programs within first year
- SM4: Generate quarterly comparative reports for all major programs

### Quality Metrics
- SM5: Maintain data accuracy above 95% for extracted curriculum information
- SM6: Achieve semantic matching accuracy above 85% for curriculum alignment
- SM7: Reduce curriculum documentation inconsistencies by 90%
- SM8: Enable identification of 100% of significant curriculum gaps

### Business Metrics
- SM9: Support accreditation processes for all CEU programs
- SM10: Enable evidence-based curriculum improvement decisions
- SM11: Enhance competitive positioning through peer comparison insights
- SM12: Reduce administrative overhead for curriculum management by 60%

### Cost Optimization Metrics
- SM13: Maintain monthly AWS costs under $500 for typical usage (1000 analyses/month)
- SM14: Achieve 90% cost reduction compared to traditional server-based deployment
- SM15: Optimize Lambda execution time to minimize per-invocation costs
- SM16: Implement effective caching to reduce redundant API calls and processing
- SM17: Achieve 80% cost savings on semantic analysis by using efficient models (Grok, Claude Haiku)
- SM18: Reduce LLM costs through intelligent model selection based on task complexity
- SM19: Maintain total LLM API costs under $200/month for typical university usage
- SM20: Optimize vector embeddings generation to use most cost-effective models available
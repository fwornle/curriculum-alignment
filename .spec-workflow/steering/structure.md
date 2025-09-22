# Structure Steering Document: CEU Curriculum Alignment System

## Codebase Organization Philosophy

Create a maintainable, scalable, and intuitive codebase structure that enables rapid development while ensuring long-term sustainability. The structure should reflect the multi-agent architecture, support serverless deployment patterns, and facilitate collaboration between academic domain experts and technical developers.

## Repository Structure

```
curriculum-alignment/
├── .github/                     # GitHub Actions CI/CD workflows
│   ├── workflows/
│   │   ├── deploy-dev.yml      # Development environment deployment
│   │   ├── deploy-staging.yml  # Staging environment deployment
│   │   ├── deploy-prod.yml     # Production deployment
│   │   ├── test.yml            # Automated testing pipeline
│   │   └── security-scan.yml   # Security and dependency scanning
│   └── ISSUE_TEMPLATE/         # GitHub issue templates
├── docs/                       # Project documentation
│   ├── architecture/           # Technical architecture diagrams
│   ├── api/                    # API documentation
│   ├── deployment/             # Deployment guides
│   └── user-guides/            # End-user documentation
├── infrastructure/             # AWS SAM templates and IaC
│   ├── templates/              # SAM templates for each environment
│   ├── scripts/                # Deployment and maintenance scripts
│   └── config/                 # Environment-specific configurations
├── backend/                    # Serverless backend services
│   ├── agents/                 # Multi-agent system
│   ├── api/                    # API Gateway Lambda functions
│   ├── shared/                 # Shared utilities and types
│   ├── database/               # Database schemas and migrations
│   └── tests/                  # Backend test suites
├── frontend/                   # React frontend application
│   ├── src/                    # Source code
│   ├── public/                 # Static assets
│   ├── tests/                  # Frontend test suites
│   └── build/                  # Production build output
├── config/                     # Project-wide configuration
│   ├── environments/           # Environment-specific settings
│   └── schemas/                # Configuration validation schemas
└── scripts/                    # Development and deployment scripts
```

## Backend Architecture Organization

### Multi-Agent System Structure

```
backend/agents/
├── core/                       # Core agent framework
│   ├── base-agent.ts          # Abstract base agent class
│   ├── agent-factory.ts       # Agent instantiation and management
│   ├── llm-client.ts          # LLM provider abstraction layer
│   └── agent-types.ts         # Type definitions for agents
├── web-search/                # Web Search Agent
│   ├── handler.ts             # Lambda function handler
│   ├── agent.ts               # Agent implementation
│   ├── prompts/               # Agent-specific prompts
│   └── types.ts               # Agent-specific types
├── browser-automation/        # Browser Automation Agent
│   ├── handler.ts
│   ├── agent.ts
│   ├── stagehand-config.ts    # Stagehand/MCP configuration
│   └── types.ts
├── document-processing/       # Document Processing Agent
│   ├── handler.ts
│   ├── agent.ts
│   ├── parsers/               # File format parsers
│   └── types.ts
├── accreditation-expert/      # Accreditation Expert Agent
│   ├── handler.ts
│   ├── agent.ts
│   ├── knowledge-base/        # Accreditation standards
│   └── types.ts
├── qa-testing/                # QA Testing Agent
│   ├── handler.ts
│   ├── agent.ts
│   ├── test-templates/        # Testing framework templates
│   └── types.ts
├── semantic-search/           # Semantic Search Agent
│   ├── handler.ts
│   ├── agent.ts
│   ├── embeddings/            # Vector embedding utilities
│   └── types.ts
├── chat-interface/            # Chat Interface Agent
│   ├── handler.ts
│   ├── agent.ts
│   ├── conversation/          # Conversation management
│   └── types.ts
└── coordinator/               # Coordinator Agent
    ├── handler.ts
    ├── agent.ts
    ├── orchestration/         # Agent coordination logic
    └── types.ts
```

### API Layer Organization

```
backend/api/
├── auth/                      # Authentication endpoints
│   ├── login.ts
│   ├── logout.ts
│   ├── refresh.ts
│   └── middleware.ts
├── curriculum/                # Curriculum management APIs
│   ├── upload.ts             # File upload handling
│   ├── analysis.ts           # Analysis endpoints
│   ├── comparison.ts         # Peer comparison APIs
│   └── reports.ts            # Report generation
├── admin/                     # Administrative APIs
│   ├── users.ts              # User management
│   ├── config.ts             # System configuration
│   └── monitoring.ts         # System health monitoring
├── chat/                      # Chat interface APIs
│   ├── websocket.ts          # WebSocket connection handler
│   ├── messages.ts           # Message processing
│   └── history.ts            # Chat history management
└── shared/                    # Shared API utilities
    ├── middleware/            # Common middleware functions
    ├── validation/            # Request validation schemas
    ├── responses/             # Standardized response formats
    └── errors/                # Error handling utilities
```

### Database Organization

```
backend/database/
├── migrations/                # PostgreSQL migration files
│   ├── 001_initial_schema.sql
│   ├── 002_add_llm_config.sql
│   └── ...
├── seeds/                     # Development data seeds
│   ├── users.sql
│   ├── sample_curricula.sql
│   └── accreditation_standards.sql
├── schemas/                   # Database schema definitions
│   ├── core.sql              # Core tables (users, programs, etc.)
│   ├── curriculum.sql        # Curriculum-related tables
│   ├── analysis.sql          # Analysis and comparison tables
│   └── config.sql            # Configuration tables
└── utils/                     # Database utilities
    ├── connection.ts         # Database connection management
    ├── query-builder.ts      # Type-safe query building
    └── migrations.ts         # Migration management
```

## Frontend Architecture Organization

### React Application Structure

```
frontend/src/
├── components/                # Reusable UI components
│   ├── ui/                   # Base UI components (buttons, inputs)
│   ├── forms/                # Form components
│   ├── layout/               # Layout components (header, sidebar)
│   ├── charts/               # Data visualization components
│   └── modals/               # Modal dialog components
├── pages/                     # Page-level components
│   ├── Dashboard/
│   ├── CurriculumAnalysis/
│   ├── Reports/
│   ├── Chat/
│   ├── Admin/
│   └── Auth/
├── store/                     # Redux store configuration
│   ├── slices/               # Redux Toolkit slices
│   │   ├── auth.ts
│   │   ├── curriculum.ts
│   │   ├── analysis.ts
│   │   └── chat.ts
│   ├── api/                  # RTK Query API definitions
│   └── index.ts              # Store configuration
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts
│   ├── useAnalysis.ts
│   └── useChat.ts
├── utils/                     # Utility functions
│   ├── api.ts                # API client configuration
│   ├── formatting.ts         # Data formatting utilities
│   └── validation.ts         # Client-side validation
├── types/                     # TypeScript type definitions
│   ├── api.ts                # API response types
│   ├── curriculum.ts         # Curriculum domain types
│   └── user.ts               # User-related types
├── styles/                    # Styling configuration
│   ├── globals.css           # Global styles
│   ├── components.css        # Component-specific styles
│   └── tailwind.config.js    # Tailwind configuration
└── assets/                    # Static assets
    ├── images/
    ├── icons/
    └── fonts/
```

### Component Architecture Patterns

**Atomic Design Principles**:
- **Atoms**: Basic UI elements (Button, Input, Icon)
- **Molecules**: Simple component combinations (SearchBox, FormField)
- **Organisms**: Complex component sections (NavigationBar, AnalysisCard)
- **Templates**: Page layout structures
- **Pages**: Specific page implementations

**MVI (Model-View-Intent) Pattern**:
```typescript
// Model: Redux store slice
interface CurriculumState {
  programs: Program[];
  loading: boolean;
  error: string | null;
}

// View: React component
const CurriculumList: React.FC<Props> = ({ programs, onAnalyze }) => {
  // Component rendering logic
};

// Intent: Action creators and thunks
export const analyzeCurriculum = createAsyncThunk(
  'curriculum/analyze',
  async (programId: string) => {
    // Analysis logic
  }
);
```

## Configuration Management

### Environment Configuration Structure

```
config/environments/
├── development.yml            # Development environment settings
├── staging.yml               # Staging environment settings
├── production.yml            # Production environment settings
└── local.yml                 # Local development overrides
```

**Configuration Schema**:
```yaml
# Example configuration structure
database:
  postgresql:
    host: ${DB_HOST}
    port: ${DB_PORT:5432}
    database: ${DB_NAME}
    ssl: ${DB_SSL:true}
  qdrant:
    url: ${QDRANT_URL}
    api_key: ${QDRANT_API_KEY}

llm_providers:
  openai:
    api_key: ${OPENAI_API_KEY}
    base_url: ${OPENAI_BASE_URL}
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}
  grok:
    api_key: ${GROK_API_KEY}

aws:
  region: ${AWS_REGION:eu-central-1}
  s3_bucket: ${S3_BUCKET}
  lambda_timeout: ${LAMBDA_TIMEOUT:300}

agents:
  web_search:
    model: "grok-beta"
    max_tokens: 4000
  document_processing:
    model: "gpt-4-turbo"
    max_tokens: 8000
  # ... other agent configurations
```

## Testing Strategy Organization

### Test Structure

```
backend/tests/
├── unit/                      # Unit tests
│   ├── agents/               # Agent-specific unit tests
│   ├── api/                  # API endpoint unit tests
│   └── utils/                # Utility function tests
├── integration/              # Integration tests
│   ├── database/             # Database integration tests
│   ├── llm/                  # LLM provider integration tests
│   └── api/                  # API integration tests
└── e2e/                      # End-to-end tests
    ├── curriculum-analysis/  # Complete analysis workflow tests
    └── user-journeys/        # User scenario tests

frontend/tests/
├── unit/                     # Component unit tests
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/              # Feature integration tests
└── e2e/                      # End-to-end user interface tests
```

### Testing Patterns

**Agent Testing Pattern**:
```typescript
// agents/__tests__/web-search.test.ts
describe('WebSearchAgent', () => {
  let agent: WebSearchAgent;
  
  beforeEach(() => {
    agent = new WebSearchAgent(mockConfig);
  });
  
  describe('search', () => {
    it('should return relevant curriculum information', async () => {
      // Test implementation
    });
    
    it('should handle API rate limits gracefully', async () => {
      // Test implementation
    });
  });
});
```

**API Testing Pattern**:
```typescript
// api/__tests__/curriculum.test.ts
describe('Curriculum API', () => {
  describe('POST /api/curriculum/analyze', () => {
    it('should start analysis for valid curriculum', async () => {
      // Test implementation
    });
    
    it('should reject unauthorized requests', async () => {
      // Test implementation
    });
  });
});
```

## Development Workflow Organization

### Git Branching Strategy

**GitFlow Pattern**:
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `release/*`: Release preparation branches
- `hotfix/*`: Critical production fixes

**Branch Naming Conventions**:
- `feature/agent-web-search`: New agent implementation
- `feature/ui-dashboard-redesign`: Frontend feature
- `bugfix/analysis-timeout-issue`: Bug fixes
- `hotfix/security-vulnerability`: Critical fixes

### Code Quality Standards

**TypeScript Configuration**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**ESLint Configuration**:
- Airbnb TypeScript configuration
- Custom rules for agent development patterns
- Automatic fixing on save
- Pre-commit hooks for code quality

**Prettier Configuration**:
- Consistent code formatting
- Integration with ESLint
- Automatic formatting on save

## Deployment Architecture

### Infrastructure as Code Structure

```
infrastructure/
├── templates/
│   ├── base.yml              # Core AWS resources
│   ├── database.yml          # Database infrastructure
│   ├── lambda.yml            # Lambda function definitions
│   ├── api-gateway.yml       # API Gateway configuration
│   └── frontend.yml          # S3 + CloudFront for frontend
├── scripts/
│   ├── deploy.sh            # Deployment orchestration
│   ├── rollback.sh          # Rollback procedures
│   └── migrate.sh           # Database migration runner
└── config/
    ├── dev-params.json      # Development parameters
    ├── staging-params.json  # Staging parameters
    └── prod-params.json     # Production parameters
```

### Deployment Pipeline Organization

**Environment Promotion Flow**:
1. **Development**: Automatic deployment on merge to `develop`
2. **Staging**: Manual promotion with automated testing
3. **Production**: Manual promotion with approval gates

**Deployment Stages**:
1. Code quality checks (lint, test, security scan)
2. Build and package applications
3. Deploy infrastructure changes
4. Deploy application code
5. Run smoke tests
6. Update monitoring and alerting

## Monitoring and Observability Structure

### Logging Organization

```
backend/shared/logging/
├── logger.ts                 # Centralized logging configuration
├── formatters/
│   ├── json-formatter.ts    # Structured JSON logging
│   └── human-formatter.ts   # Human-readable local logging
├── transports/
│   ├── cloudwatch.ts       # AWS CloudWatch integration
│   └── datadog.ts          # Datadog integration
└── middleware/
    ├── request-logger.ts    # HTTP request logging
    └── error-logger.ts      # Error logging middleware
```

### Metrics and Alerting

**Custom Metrics Structure**:
- Business metrics: Analysis completion rates, user satisfaction
- Technical metrics: API response times, error rates, resource usage
- Agent metrics: Token usage, model performance, processing times

**Alert Categories**:
- Critical: System downtime, security breaches, data loss
- Warning: Performance degradation, high error rates
- Info: Deployment notifications, usage milestones

## Documentation Organization

### Technical Documentation Structure

```
docs/
├── architecture/
│   ├── system-overview.md   # High-level architecture
│   ├── agent-architecture.md # Multi-agent system design
│   ├── database-design.md   # Database schema documentation
│   └── security-model.md    # Security architecture
├── api/
│   ├── openapi.yml         # OpenAPI specification
│   ├── authentication.md   # Auth API documentation
│   └── agents.md           # Agent API documentation
├── deployment/
│   ├── getting-started.md  # Local development setup
│   ├── aws-deployment.md   # AWS deployment guide
│   └── troubleshooting.md  # Common issues and solutions
├── user-guides/
│   ├── curriculum-analysis.md # User guide for analysis features
│   ├── report-generation.md   # Report generation guide
│   └── admin-panel.md         # Administrative features
└── development/
    ├── contributing.md     # Contribution guidelines
    ├── code-standards.md   # Coding standards and patterns
    └── testing-guide.md    # Testing practices and patterns
```

## Security Organization

### Security Implementation Structure

```
backend/shared/security/
├── authentication/
│   ├── jwt-handler.ts      # JWT token management
│   ├── oauth-provider.ts   # OAuth integration
│   └── session-manager.ts  # Session management
├── authorization/
│   ├── rbac.ts            # Role-based access control
│   ├── permissions.ts     # Permission definitions
│   └── middleware.ts      # Authorization middleware
├── encryption/
│   ├── data-encryption.ts # Data encryption utilities
│   └── key-management.ts  # Encryption key management
└── validation/
    ├── input-sanitizer.ts # Input validation and sanitization
    └── schema-validator.ts # Request schema validation
```

### Security Checklist Integration

**Pre-deployment Security Checks**:
- Dependency vulnerability scanning
- Static code analysis for security issues
- API security testing
- Infrastructure security validation
- Data encryption verification

## Performance Optimization Structure

### Performance Monitoring Organization

```
backend/shared/performance/
├── monitoring/
│   ├── metrics-collector.ts # Custom metrics collection
│   ├── performance-logger.ts # Performance logging
│   └── health-checker.ts    # System health monitoring
├── optimization/
│   ├── cache-manager.ts     # Response caching
│   ├── rate-limiter.ts      # API rate limiting
│   └── resource-optimizer.ts # Resource usage optimization
└── analysis/
    ├── bottleneck-detector.ts # Performance bottleneck detection
    └── usage-analyzer.ts      # Usage pattern analysis
```

## Maintenance and Operations

### Operational Scripts Organization

```
scripts/
├── development/
│   ├── setup.sh           # Development environment setup
│   ├── test.sh            # Test execution scripts
│   └── lint.sh            # Code quality checks
├── deployment/
│   ├── deploy.sh          # Deployment orchestration
│   ├── rollback.sh        # Rollback procedures
│   └── health-check.sh    # Post-deployment validation
├── maintenance/
│   ├── backup.sh          # Database backup procedures
│   ├── cleanup.sh         # Log and temporary file cleanup
│   └── update-deps.sh     # Dependency update automation
└── monitoring/
    ├── log-analysis.sh    # Log analysis utilities
    └── performance-report.sh # Performance reporting
```

This structure ensures the CEU Curriculum Alignment System maintains high code quality, supports rapid development and deployment, and provides clear organization for all stakeholders from academic administrators to technical developers.
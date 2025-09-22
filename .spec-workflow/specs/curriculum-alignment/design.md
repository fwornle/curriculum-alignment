# Design Document: Multi-Agent Curriculum Alignment System for CEU

## System Overview

The Multi-Agent Curriculum Alignment System (MACAS) is a serverless, AI-driven platform that automates curriculum analysis and alignment for Central European University. The system employs eight specialized AI agents orchestrated through AWS Lambda functions, utilizing PostgreSQL for data storage, Qdrant for semantic search, and React with Tailwind CSS for the user interface.

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   React + Vite + Redux + Tailwind CSS + PWA        │   │
│  │  ┌──────────────┐  ┌──────────┐  ┌──────────────┐ │   │
│  │  │ Top App Bar  │  │   Main   │  │ Bottom Status│ │   │
│  │  │ (LLM Config) │  │  Content │  │     Bar      │ │   │
│  │  └──────────────┘  └──────────┘  └──────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Gateway                          │
│         (REST API + WebSocket + Request Validation)         │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Lambda Functions Layer                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Coordinator Agent (λ)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│      │         │         │         │         │         │    │
│      ▼         ▼         ▼         ▼         ▼         ▼    │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
│  │Web    │ │Browser│ │Document│ │Accred.│ │  QA   │       │
│  │Search │ │Agent  │ │Process │ │Expert │ │ Agent │       │
│  │Agent λ│ │   λ   │ │Agent λ │ │Agent λ│ │   λ   │       │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘       │
│  ┌───────────────┐ ┌─────────────────────────────┐       │
│  │Semantic Search│ │  Chat Interface Agent (λ)    │       │
│  │   Agent (λ)   │ └─────────────────────────────┘       │
│  └───────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│   PostgreSQL     │ │    Qdrant    │ │      S3      │
│   (Supabase/     │ │   (Vector    │ │  (Document   │
│     Neon)        │ │   Database)  │ │   Storage)   │
└──────────────────┘ └──────────────┘ └──────────────┘
```

### Multi-Agent System Design

#### Agent Communication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Coordinator Agent                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Workflow Orchestration Engine                       │  │
│  │  - Task Queue Management                            │  │
│  │  - Agent Selection Logic                            │  │
│  │  - Error Handling & Retry                          │  │
│  │  - Result Aggregation                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│    ┌──────────────────────┼──────────────────────┐         │
│    ▼                      ▼                      ▼          │
│ ┌─────────┐         ┌─────────┐          ┌─────────┐      │
│ │ Message │         │ Task    │          │ Status  │      │
│ │ Router  │         │ Scheduler│         │ Monitor │      │
│ └─────────┘         └─────────┘          └─────────┘      │
└─────────────────────────────────────────────────────────────┘
```

#### Agent Implementation Details

| Agent | Primary Function | LLM Models | Technologies |
|-------|-----------------|------------|--------------|
| **Coordinator** | Workflow orchestration | N/A | Step Functions, EventBridge |
| **Web Search** | Peer university discovery | GPT-3.5-Turbo, Grok-2 | Search APIs |
| **Browser** | Web scraping | GPT-3.5-Turbo, Claude-Haiku | Stagehand/MCP |
| **Document Processing** | Excel/Word/PDF handling | GPT-4-Vision, Claude-3.5 | Apache POI, PDFBox |
| **Accreditation Expert** | Curriculum analysis | GPT-4, Claude-3.5, Grok-3 | Custom prompts |
| **QA** | Terminology standardization | GPT-3.5-Turbo, Claude-Haiku | Rule engine |
| **Semantic Search** | Vector similarity | Grok-1, Claude-Haiku | Qdrant |
| **Chat Interface** | User Q&A | GPT-4, Claude-3.5, Grok-3 | LangChain |

### Database Design

#### PostgreSQL Schema

```sql
-- Users and Authentication
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    ui_preferences JSONB,
    llm_model_preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Academic Programs
CREATE TABLE programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ceu_program_name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
    course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(program_id),
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(50),
    credits INTEGER,
    learning_outcomes TEXT[],
    content_description TEXT,
    CONSTRAINT unique_course_code UNIQUE (program_id, course_code)
);

-- Peer Universities
CREATE TABLE peer_universities (
    university_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    website_url TEXT,
    programs_url TEXT,
    last_analyzed_at TIMESTAMP
);

-- Peer Programs
CREATE TABLE peer_programs (
    peer_program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES peer_universities(university_id),
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    courses_data JSONB,
    analysis_date TIMESTAMP DEFAULT NOW()
);

-- Gap Analyses
CREATE TABLE gap_analyses (
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(program_id),
    analysis_type VARCHAR(50),
    gaps_identified JSONB,
    recommendations TEXT[],
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comparison Reports
CREATE TABLE comparison_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ceu_program_id UUID REFERENCES programs(program_id),
    peer_program_ids UUID[],
    similarities JSONB,
    differences JSONB,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Workflows
CREATE TABLE agent_workflows (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiating_user UUID REFERENCES users(user_id),
    agents_involved TEXT[],
    status VARCHAR(50),
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    results JSONB,
    model_configurations JSONB
);

-- Chat Sessions
CREATE TABLE chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    conversation_history JSONB,
    context_data JSONB,
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(50),
    file_path TEXT,
    processed_content TEXT,
    extraction_metadata JSONB,
    uploaded_by UUID REFERENCES users(user_id)
);

-- LLM Model Configurations
CREATE TABLE llm_model_configurations (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    agent_type VARCHAR(50),
    model_provider VARCHAR(50),
    model_name VARCHAR(100),
    api_key_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_agent_config UNIQUE (user_id, agent_type)
);

-- System Status
CREATE TABLE system_status (
    status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(50),
    last_heartbeat TIMESTAMP,
    performance_metrics JSONB,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_programs_department ON programs(department);
CREATE INDEX idx_courses_program ON courses(program_id);
CREATE INDEX idx_gap_analyses_program ON gap_analyses(program_id);
CREATE INDEX idx_workflows_user ON agent_workflows(initiating_user);
CREATE INDEX idx_workflows_status ON agent_workflows(status);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_system_status_agent ON system_status(agent_name);
```

## API Design

### RESTful API Endpoints

#### Authentication & User Management
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/preferences
PUT    /api/users/preferences/llm-models
```

#### Program Management
```
GET    /api/programs
GET    /api/programs/{id}
POST   /api/programs
PUT    /api/programs/{id}
DELETE /api/programs/{id}
GET    /api/programs/{id}/courses
POST   /api/programs/{id}/courses
```

#### Data Collection
```
POST   /api/collection/timeedit
POST   /api/collection/documents
GET    /api/collection/status/{workflowId}
POST   /api/collection/peer-universities
```

#### Analysis Operations
```
POST   /api/analysis/gap
POST   /api/analysis/comparison
POST   /api/analysis/semantic-search
GET    /api/analysis/results/{analysisId}
```

#### Report Generation
```
POST   /api/reports/generate
GET    /api/reports/{reportId}
GET    /api/reports/{reportId}/download/{format}
```

#### Chat Interface
```
WebSocket /ws/chat
POST   /api/chat/sessions
GET    /api/chat/sessions/{sessionId}
POST   /api/chat/sessions/{sessionId}/messages
```

#### System Management
```
GET    /api/system/status
GET    /api/system/agents
PUT    /api/system/agents/{agentName}/config
GET    /api/system/models/available
GET    /api/system/models/costs
```

### API Gateway Configuration

```yaml
openapi: 3.0.0
info:
  title: CEU Curriculum Alignment API
  version: 1.0.0
  
x-amazon-apigateway-request-validators:
  all:
    validateRequestBody: true
    validateRequestParameters: true
    
x-amazon-apigateway-gateway-responses:
  DEFAULT_4XX:
    responseParameters:
      gatewayresponse.header.Access-Control-Allow-Origin: "'*'"
    responseTemplates:
      application/json: '{"error": "$context.error.message"}'
      
paths:
  /api/analysis/gap:
    post:
      x-amazon-apigateway-integration:
        type: aws_proxy
        httpMethod: POST
        uri: 
          Fn::Sub: arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${AccreditationExpertAgent.Arn}/invocations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                programId:
                  type: string
                  format: uuid
                modelPreference:
                  type: string
                  enum: [gpt-4, claude-3.5-sonnet, grok-3]
              required:
                - programId
```

## Frontend Design

### Component Architecture

```
src/
├── components/
│   ├── layout/
│   │   ├── TopAppBar.tsx
│   │   ├── BottomStatusBar.tsx
│   │   └── MainLayout.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   └── TypingIndicator.tsx
│   ├── dashboard/
│   │   ├── ProgramOverview.tsx
│   │   ├── AgentStatus.tsx
│   │   └── WorkflowProgress.tsx
│   ├── configuration/
│   │   ├── LLMModelSelector.tsx
│   │   ├── ModelCostDisplay.tsx
│   │   └── ConfigurationMenu.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── Toast.tsx
├── store/
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── programSlice.ts
│   │   ├── analysisSlice.ts
│   │   ├── chatSlice.ts
│   │   └── systemSlice.ts
│   └── store.ts
├── services/
│   ├── api/
│   │   ├── authService.ts
│   │   ├── programService.ts
│   │   ├── analysisService.ts
│   │   └── chatService.ts
│   └── websocket/
│       └── chatWebSocket.ts
└── styles/
    ├── globals.css
    └── tailwind.config.js
```

### UI Component Specifications

#### Top App Bar
```tsx
interface TopAppBarProps {
  user: User;
  onModelConfigClick: () => void;
  onUserMenuClick: () => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({ user, onModelConfigClick, onUserMenuClick }) => {
  return (
    <header className="bg-ceu-blue text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* CEU Logo */}
        <div className="flex items-center space-x-4">
          <img src="/ceu-logo.svg" alt="CEU" className="h-10 w-auto" />
          <nav className="hidden md:flex space-x-6">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/programs">Programs</NavLink>
            <NavLink to="/analysis">Analysis</NavLink>
            <NavLink to="/reports">Reports</NavLink>
          </nav>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* LLM Model Configuration */}
          <button
            onClick={onModelConfigClick}
            className="flex items-center space-x-2 px-4 py-2 bg-ceu-gold text-ceu-blue rounded-md hover:bg-opacity-90 transition-colors"
          >
            <ConfigIcon className="h-5 w-5" />
            <span className="hidden lg:inline">Configure Models</span>
          </button>
          
          {/* User Menu */}
          <UserMenu user={user} onClick={onUserMenuClick} />
        </div>
      </div>
    </header>
  );
};
```

#### Bottom Status Bar
```tsx
interface BottomStatusBarProps {
  activeAgents: AgentStatus[];
  workflowProgress: number;
  systemHealth: SystemHealth;
}

const BottomStatusBar: React.FC<BottomStatusBarProps> = ({ 
  activeAgents, 
  workflowProgress, 
  systemHealth 
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white border-t border-gray-700">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Active Agents */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">Active Agents:</span>
            <div className="flex space-x-2">
              {activeAgents.map(agent => (
                <AgentIndicator
                  key={agent.name}
                  name={agent.name}
                  status={agent.status}
                  className={getStatusColor(agent.status)}
                />
              ))}
            </div>
          </div>
          
          {/* Workflow Progress */}
          <div className="flex items-center space-x-3">
            <span className="text-sm">Workflow Progress:</span>
            <div className="w-32 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-ceu-gold h-2 rounded-full transition-all duration-300"
                style={{ width: `${workflowProgress}%` }}
              />
            </div>
            <span className="text-sm">{workflowProgress}%</span>
          </div>
          
          {/* System Health */}
          <div className="flex items-center space-x-2">
            <SystemHealthIndicator health={systemHealth} />
          </div>
        </div>
      </div>
    </footer>
  );
};
```

#### LLM Model Configuration Menu
```tsx
interface ModelConfig {
  agentType: string;
  provider: string;
  model: string;
  costPerToken: number;
  performance: 'fast' | 'balanced' | 'quality';
}

const LLMConfigurationMenu: React.FC = () => {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  
  const agents = [
    'Chat Interface',
    'Accreditation Expert',
    'QA Agent',
    'Semantic Search',
    'Web Search',
    'Browser Agent',
    'Document Processing'
  ];
  
  const models = {
    'OpenAI': ['gpt-4', 'gpt-3.5-turbo'],
    'Anthropic': ['claude-3.5-sonnet', 'claude-3-haiku'],
    'Grok': ['grok-3', 'grok-2', 'grok-1'],
    'Google': ['gemini-pro', 'gemini-flash'],
    'Azure': ['azure-gpt-4', 'azure-gpt-35']
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">LLM Model Configuration</h2>
        </div>
        
        <div className="px-6 py-4 space-y-6">
          {agents.map(agent => (
            <div key={agent} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">{agent}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModelSelector
                  label="Provider"
                  options={Object.keys(models)}
                  onChange={(provider) => handleProviderChange(agent, provider)}
                />
                <ModelSelector
                  label="Model"
                  options={models[selectedProvider]}
                  onChange={(model) => handleModelChange(agent, model)}
                />
                <CostDisplay
                  costPerToken={getModelCost(selectedProvider, selectedModel)}
                  estimatedMonthly={calculateMonthlyCost(agent, selectedModel)}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
          <div className="text-sm text-gray-600">
            Estimated Total Monthly Cost: <span className="font-bold text-lg">${totalMonthlyCost}</span>
          </div>
          <div className="space-x-3">
            <button className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
            <button className="px-4 py-2 bg-ceu-blue text-white rounded-md hover:bg-opacity-90">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Responsive Design Patterns

```css
/* Tailwind Configuration */
module.exports = {
  theme: {
    extend: {
      colors: {
        'ceu-blue': '#0033A0',
        'ceu-gold': '#FFC72C',
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'ultrawide': '1920px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

/* Responsive Grid Layout */
.dashboard-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}

/* Adaptive Navigation */
.nav-menu {
  @apply hidden md:flex;
}

.mobile-menu {
  @apply flex md:hidden;
}

/* Touch-Optimized Controls */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* Orientation-Aware Layouts */
@media (orientation: landscape) and (max-height: 500px) {
  .landscape-compact {
    @apply py-1 text-sm;
  }
}
```

## Infrastructure as Code

### AWS SAM Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, prod]
  PostgresConnectionString:
    Type: String
    NoEcho: true
  QdrantApiKey:
    Type: String
    NoEcho: true

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 300
    MemorySize: 1024
    Environment:
      Variables:
        ENVIRONMENT: !Ref Environment
        POSTGRES_URL: !Ref PostgresConnectionString
        QDRANT_API_KEY: !Ref QdrantApiKey

Resources:
  # API Gateway
  CurriculumAPI:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Environment
      Cors:
        AllowMethods: "'*'"
        AllowHeaders: "'*'"
        AllowOrigin: "'*'"
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn

  # Cognito User Pool
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub ${AWS::StackName}-users
      AutoVerifiedAttributes:
        - email
      Schema:
        - Name: email
          Required: true
          Mutable: false

  # Lambda Functions
  CoordinatorAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/coordinator
      Handler: index.handler
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref CurriculumAPI
            Path: /api/workflow/start
            Method: POST

  WebSearchAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/web-search
      Handler: index.handler
      Environment:
        Variables:
          SEARCH_API_KEY: !Ref SearchApiKey

  BrowserAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/browser
      Handler: index.handler
      Layers:
        - !Ref StagehandLayer
      MemorySize: 2048

  DocumentProcessingAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/document-processing
      Handler: index.handler
      Environment:
        Variables:
          S3_BUCKET: !Ref DocumentBucket

  AccreditationExpertAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/accreditation-expert
      Handler: index.handler
      Environment:
        Variables:
          DEFAULT_LLM_MODEL: gpt-4

  QAAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/qa-agent
      Handler: index.handler
      Environment:
        Variables:
          DEFAULT_LLM_MODEL: claude-3-haiku

  SemanticSearchAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/semantic-search
      Handler: index.handler
      Environment:
        Variables:
          DEFAULT_LLM_MODEL: grok-1
          QDRANT_URL: !Ref QdrantEndpoint

  ChatInterfaceAgent:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./lambda/chat-interface
      Handler: index.handler
      Environment:
        Variables:
          DEFAULT_LLM_MODEL: claude-3.5-sonnet

  # Step Functions
  WorkflowStateMachine:
    Type: AWS::Serverless::StateMachine
    Properties:
      DefinitionUri: ./statemachine/workflow.asl.json
      Role: !GetAtt StatesExecutionRole.Arn

  # S3 Buckets
  DocumentBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      VersioningConfiguration:
        Status: Enabled

  StaticWebsiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: error.html
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false

  # CloudFront Distribution
  WebDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - Id: S3-Website
            DomainName: !GetAtt StaticWebsiteBucket.WebsiteURL
            CustomOriginConfig:
              OriginProtocolPolicy: http-only
        Enabled: true
        DefaultRootObject: index.html
        DefaultCacheBehavior:
          TargetOriginId: S3-Website
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS

  # DLQ for Failed Processing
  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      MessageRetentionPeriod: 1209600  # 14 days
      VisibilityTimeout: 300

Outputs:
  APIEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub https://${CurriculumAPI}.execute-api.${AWS::Region}.amazonaws.com/${Environment}
  WebsiteURL:
    Description: CloudFront distribution URL
    Value: !GetAtt WebDistribution.DomainName
```

## Security Design

### Authentication & Authorization Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Client    │────▶│   Cognito    │────▶│  API Gateway │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   JWT Token  │────▶│    Lambda    │
                     └──────────────┘     └──────────────┘
```

### Security Measures

1. **API Security**
   - AWS WAF for API Gateway protection
   - Rate limiting and throttling
   - Request validation
   - CORS configuration

2. **Data Security**
   - Encryption at rest (S3, PostgreSQL)
   - Encryption in transit (TLS 1.3)
   - AWS Secrets Manager for API keys
   - VPC endpoints for private communication

3. **Agent Security**
   - IAM roles with least privilege
   - Lambda function isolation
   - Environment variable encryption
   - DLQ for failed processing

## Deployment Strategy

### CI/CD Pipeline

```yaml
# GitHub Actions Workflow
name: Deploy to AWS

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Tests
        run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build Lambda Functions
        run: |
          npm ci
          npm run build
      
      - name: Deploy SAM Application
        run: |
          sam build
          sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
      
      - name: Build and Deploy Frontend
        run: |
          cd frontend
          npm ci
          npm run build
          aws s3 sync dist/ s3://${{ secrets.STATIC_BUCKET }}
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} --paths "/*"
```

### Environment Configuration

```bash
# .env.development
VITE_API_ENDPOINT=http://localhost:3000
VITE_WS_ENDPOINT=ws://localhost:3001
POSTGRES_URL=postgresql://user:pass@localhost:5432/curriculum_dev
QDRANT_URL=http://localhost:6333

# .env.production
VITE_API_ENDPOINT=https://api.ceu-curriculum.edu
VITE_WS_ENDPOINT=wss://ws.ceu-curriculum.edu
POSTGRES_URL=${SUPABASE_CONNECTION_STRING}
QDRANT_URL=${QDRANT_CLOUD_URL}
```

## Performance Optimization

### Caching Strategy
1. **CloudFront CDN** - Static assets caching
2. **API Gateway Caching** - Response caching for GET requests
3. **Lambda Layer Caching** - Shared dependencies
4. **PostgreSQL Query Caching** - Prepared statements
5. **Qdrant Index Caching** - Vector similarity caching

### Scalability Measures
1. **Lambda Concurrency** - Reserved concurrency for critical functions
2. **PostgreSQL Connection Pooling** - pgBouncer integration
3. **S3 Transfer Acceleration** - Fast uploads
4. **Auto-scaling Policies** - Based on CloudWatch metrics

## Monitoring & Observability

### CloudWatch Dashboards

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
          ["AWS/Lambda", "Errors", {"stat": "Sum"}],
          ["AWS/Lambda", "Duration", {"stat": "Average"}],
          ["AWS/Lambda", "ConcurrentExecutions", {"stat": "Maximum"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Agent Performance"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "Count", {"stat": "Sum"}],
          ["AWS/ApiGateway", "4XXError", {"stat": "Sum"}],
          ["AWS/ApiGateway", "5XXError", {"stat": "Sum"}],
          ["AWS/ApiGateway", "Latency", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "API Gateway Metrics"
      }
    }
  ]
}
```

### Alerts Configuration

```yaml
Alarms:
  HighErrorRate:
    MetricName: Errors
    Namespace: AWS/Lambda
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 2
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
    
  HighLatency:
    MetricName: Duration
    Namespace: AWS/Lambda
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 5000  # 5 seconds
    ComparisonOperator: GreaterThanThreshold
```

## Cost Optimization

### Model Selection Strategy
- **Semantic Analysis**: Grok-1 ($0.002/1K tokens)
- **QA Tasks**: Claude-3-Haiku ($0.003/1K tokens)
- **Complex Analysis**: GPT-4 only when necessary ($0.10/1K tokens)
- **Default Fallback**: GPT-3.5-Turbo ($0.01/1K tokens)

### Cost Monitoring
```typescript
interface CostTracker {
  trackUsage(agent: string, model: string, tokens: number): void;
  getDailyCost(): number;
  getMonthlyCost(): number;
  getProjectedCost(): number;
}

class LLMCostTracker implements CostTracker {
  private usage: Map<string, ModelUsage> = new Map();
  
  trackUsage(agent: string, model: string, tokens: number): void {
    const cost = this.calculateCost(model, tokens);
    // Store in PostgreSQL for analysis
  }
  
  getDailyCost(): number {
    // Query PostgreSQL for daily totals
  }
}
```

## Testing Strategy

### Unit Testing
```typescript
// Agent Unit Test Example
describe('AccreditationExpertAgent', () => {
  it('should identify curriculum gaps', async () => {
    const mockProgram = createMockProgram();
    const result = await agent.analyzeGaps(mockProgram);
    expect(result.gaps).toHaveLength(3);
    expect(result.recommendations).toBeDefined();
  });
});
```

### Integration Testing
```typescript
// Workflow Integration Test
describe('Curriculum Analysis Workflow', () => {
  it('should complete end-to-end analysis', async () => {
    const workflowId = await startWorkflow({
      programId: 'test-program',
      analysisType: 'comprehensive'
    });
    
    await waitForCompletion(workflowId);
    const result = await getWorkflowResult(workflowId);
    
    expect(result.status).toBe('completed');
    expect(result.agents).toContain('AccreditationExpertAgent');
  });
});
```

### Load Testing
```yaml
# k6 Load Test Script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.post('${API_ENDPOINT}/api/analysis/gap', {
    programId: 'load-test-program'
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}
```

## Rollback Strategy

### Blue-Green Deployment
1. Deploy new version to green environment
2. Run smoke tests
3. Switch traffic gradually (10% → 50% → 100%)
4. Monitor error rates
5. Rollback if errors exceed threshold

### Database Migration Rollback
```sql
-- Migration Scripts with Rollback
-- UP Migration
ALTER TABLE programs ADD COLUMN new_field TEXT;

-- DOWN Migration (Rollback)
ALTER TABLE programs DROP COLUMN new_field;
```

## Success Criteria

### Technical Metrics
- API response time < 1 second for 95% of requests
- System uptime > 99.9%
- Lambda cold start < 3 seconds
- Cost per analysis < $0.50

### Business Metrics
- Process 100% of CEU programs within first quarter
- Achieve 80% cost reduction vs. manual process
- Generate reports in < 5 minutes
- Support 50+ concurrent users

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM API Rate Limits | Medium | High | Implement queueing and retry logic |
| PostgreSQL Connection Limits | Low | High | Use connection pooling |
| Web Scraping Blocks | Medium | Medium | Rotate user agents, implement delays |
| Cost Overrun | Medium | Medium | Real-time cost monitoring and alerts |
| Data Privacy Breach | Low | Critical | Encryption, access controls, audit logs |

## Conclusion

This design document provides a comprehensive technical blueprint for implementing the Multi-Agent Curriculum Alignment System. The serverless architecture ensures scalability and cost-effectiveness, while the multi-agent design enables sophisticated curriculum analysis capabilities. The system's modular design allows for future enhancements and easy maintenance.
# MACAS API Examples

This guide provides practical examples of common MACAS API integration patterns, complete workflows, and code samples in multiple programming languages.

## Common Integration Patterns

### 1. Complete Program Analysis Workflow

This example demonstrates a complete workflow from program creation to report generation.

#### Python Implementation

```python
import requests
import time
import os
from datetime import datetime

class MacasClient:
    def __init__(self, api_key, base_url="https://api.curriculum-alignment.ceu.edu/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_program(self, program_data):
        """Create a new curriculum program."""
        response = requests.post(
            f"{self.base_url}/programs",
            json=program_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['data']
    
    def upload_document(self, program_id, file_path, document_metadata):
        """Upload a document to a program."""
        with open(file_path, 'rb') as file:
            files = {'file': file}
            data = document_metadata
            
            # Remove Content-Type for multipart requests
            headers = {'X-API-Key': self.api_key}
            
            response = requests.post(
                f"{self.base_url}/programs/{program_id}/documents",
                files=files,
                data=data,
                headers=headers
            )
        response.raise_for_status()
        return response.json()['data']
    
    def start_analysis(self, program_id, analysis_config):
        """Start curriculum analysis."""
        response = requests.post(
            f"{self.base_url}/programs/{program_id}/analyses",
            json=analysis_config,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['data']
    
    def monitor_analysis(self, analysis_id, check_interval=30):
        """Monitor analysis progress until completion."""
        while True:
            response = requests.get(
                f"{self.base_url}/analyses/{analysis_id}/status",
                headers=self.headers
            )
            status_data = response.json()['data']
            
            print(f"Analysis {analysis_id}: {status_data['status']} ({status_data['progress']}%)")
            
            if status_data['status'] in ['completed', 'failed', 'cancelled']:
                return status_data
            
            time.sleep(check_interval)
    
    def generate_report(self, analysis_id, report_config):
        """Generate analysis report."""
        response = requests.post(
            f"{self.base_url}/analyses/{analysis_id}/reports",
            json=report_config,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['data']
    
    def download_report(self, report_id, save_path):
        """Download generated report."""
        response = requests.get(
            f"{self.base_url}/reports/{report_id}/download",
            headers=self.headers
        )
        response.raise_for_status()
        
        with open(save_path, 'wb') as f:
            f.write(response.content)
        
        return save_path

# Usage Example
def complete_analysis_workflow():
    client = MacasClient(os.getenv('MACAS_API_KEY'))
    
    # Step 1: Create Program
    program_data = {
        "name": "AI and Data Science Master",
        "shortName": "AI-DS-MS",
        "department": "Computer Science",
        "academicLevel": "graduate",
        "degreeType": "MS",
        "language": "en",
        "duration": 4,
        "totalCredits": 60,
        "academicYear": "2024-2025"
    }
    
    program = client.create_program(program_data)
    print(f"Created program: {program['id']}")
    
    # Step 2: Upload Documents
    documents = [
        {
            'file_path': 'course-catalog.pdf',
            'metadata': {
                'title': 'Course Catalog 2024-2025',
                'type': 'catalog',
                'language': 'en',
                'academicYear': '2024-2025'
            }
        },
        {
            'file_path': 'program-handbook.pdf',
            'metadata': {
                'title': 'Program Handbook',
                'type': 'handbook',
                'language': 'en',
                'academicYear': '2024-2025'
            }
        }
    ]
    
    uploaded_docs = []
    for doc in documents:
        uploaded_doc = client.upload_document(
            program['id'], 
            doc['file_path'], 
            doc['metadata']
        )
        uploaded_docs.append(uploaded_doc)
        print(f"Uploaded document: {uploaded_doc['id']}")
    
    # Step 3: Wait for Document Processing
    print("Waiting for document processing...")
    time.sleep(30)  # Wait for processing to complete
    
    # Step 4: Start Analysis
    analysis_config = {
        "type": "comprehensive",
        "parameters": {
            "detailLevel": "intermediate",
            "peerInstitutions": ["harvard", "mit", "stanford"],
            "focusAreas": ["core-curriculum", "emerging-technologies"],
            "includeHistoricalData": False
        }
    }
    
    analysis = client.start_analysis(program['id'], analysis_config)
    print(f"Started analysis: {analysis['id']}")
    
    # Step 5: Monitor Analysis
    final_status = client.monitor_analysis(analysis['id'])
    
    if final_status['status'] == 'completed':
        print("Analysis completed successfully!")
        
        # Step 6: Generate Reports
        report_configs = [
            {
                "type": "executive",
                "format": "pdf",
                "parameters": {
                    "includeCharts": True,
                    "customBranding": True
                }
            },
            {
                "type": "detailed",
                "format": "pdf",
                "parameters": {
                    "includeCharts": True,
                    "includeAppendices": True
                }
            }
        ]
        
        for config in report_configs:
            report = client.generate_report(analysis['id'], config)
            print(f"Generated {config['type']} report: {report['id']}")
            
            # Wait for report generation
            time.sleep(10)
            
            # Download report
            filename = f"{config['type']}-report-{datetime.now().strftime('%Y%m%d')}.pdf"
            client.download_report(report['id'], filename)
            print(f"Downloaded report: {filename}")
    
    else:
        print(f"Analysis failed with status: {final_status['status']}")

if __name__ == "__main__":
    complete_analysis_workflow()
```

### 2. Batch Program Synchronization

This example shows how to synchronize multiple programs with an external system.

#### Node.js Implementation

```javascript
const axios = require('axios');
const fs = require('fs');

class MacasClient {
    constructor(apiKey, baseUrl = 'https://api.curriculum-alignment.ceu.edu/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    async getAllPrograms() {
        const allPrograms = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.client.get(`/programs?page=${page}&limit=100`);
            const { data, pagination } = response.data;
            
            allPrograms.push(...data);
            hasMore = pagination.hasNext;
            page++;
        }

        return allPrograms;
    }

    async syncPrograms(externalPrograms) {
        const macasPrograms = await this.getAllPrograms();
        const results = {
            created: [],
            updated: [],
            errors: []
        };

        for (const extProgram of externalPrograms) {
            try {
                const existingProgram = macasPrograms.find(
                    p => p.programCode === extProgram.code
                );

                if (existingProgram) {
                    // Update existing program
                    const updateData = this.mapExternalToMacas(extProgram);
                    const response = await this.client.put(
                        `/programs/${existingProgram.id}`,
                        updateData
                    );
                    results.updated.push(response.data.data);
                } else {
                    // Create new program
                    const createData = this.mapExternalToMacas(extProgram);
                    const response = await this.client.post('/programs', createData);
                    results.created.push(response.data.data);
                }
            } catch (error) {
                results.errors.push({
                    program: extProgram,
                    error: error.response?.data || error.message
                });
            }
        }

        return results;
    }

    mapExternalToMacas(externalProgram) {
        return {
            name: externalProgram.name,
            shortName: externalProgram.abbreviation,
            department: externalProgram.department,
            programCode: externalProgram.code,
            academicLevel: this.mapAcademicLevel(externalProgram.level),
            degreeType: externalProgram.degree,
            language: externalProgram.language || 'en',
            totalCredits: externalProgram.credits,
            academicYear: externalProgram.year
        };
    }

    mapAcademicLevel(level) {
        const mapping = {
            'bachelor': 'undergraduate',
            'master': 'graduate',
            'phd': 'graduate',
            'certificate': 'certificate'
        };
        return mapping[level.toLowerCase()] || 'undergraduate';
    }
}

// Usage
async function syncWithExternalSystem() {
    const client = new MacasClient(process.env.MACAS_API_KEY);
    
    // Load programs from external system (JSON file in this example)
    const externalPrograms = JSON.parse(fs.readFileSync('programs.json', 'utf8'));
    
    console.log(`Syncing ${externalPrograms.length} programs...`);
    
    const results = await client.syncPrograms(externalPrograms);
    
    console.log(`Sync completed:`);
    console.log(`- Created: ${results.created.length} programs`);
    console.log(`- Updated: ${results.updated.length} programs`);
    console.log(`- Errors: ${results.errors.length} programs`);
    
    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(error => {
            console.log(`- ${error.program.name}: ${error.error.message || error.error}`);
        });
    }
}
```

### 3. Real-time Analysis Monitoring with WebSockets

Monitor analysis progress in real-time using WebSocket connections.

#### JavaScript WebSocket Implementation

```javascript
class MacasWebSocketClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.ws = null;
        this.eventHandlers = {};
    }

    connect() {
        const wsUrl = `wss://api.curriculum-alignment.ceu.edu/ws?apiKey=${this.apiKey}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.emit('connected');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.emit(data.event, data);
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.emit('disconnected', event);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };
    }

    subscribe(analysisId) {
        this.send({
            action: 'subscribe',
            resource: 'analysis',
            resourceId: analysisId
        });
    }

    unsubscribe(analysisId) {
        this.send({
            action: 'unsubscribe',
            resource: 'analysis',
            resourceId: analysisId
        });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => handler(data));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Usage
const wsClient = new MacasWebSocketClient(apiKey);

wsClient.on('connected', () => {
    console.log('Ready to monitor analyses');
});

wsClient.on('analysis.progress', (data) => {
    console.log(`Analysis ${data.analysisId}: ${data.progress}% complete`);
    updateProgressBar(data.analysisId, data.progress);
});

wsClient.on('analysis.completed', (data) => {
    console.log(`Analysis ${data.analysisId} completed!`);
    loadAnalysisResults(data.analysisId);
});

wsClient.on('analysis.failed', (data) => {
    console.error(`Analysis ${data.analysisId} failed:`, data.error);
    showErrorMessage(data.analysisId, data.error);
});

wsClient.connect();
```

### 4. Automated Report Generation Pipeline

Create an automated pipeline that generates and distributes reports based on analysis completion.

#### Python with Celery Implementation

```python
from celery import Celery
import requests
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText

# Celery setup
app = Celery('macas_pipeline')
app.config_from_object('celeryconfig')

class ReportPipeline:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.curriculum-alignment.ceu.edu/v1"
        self.headers = {'X-API-Key': api_key, 'Content-Type': 'application/json'}
    
    def get_analysis(self, analysis_id):
        response = requests.get(
            f"{self.base_url}/analyses/{analysis_id}",
            headers=self.headers
        )
        return response.json()['data']
    
    def generate_report(self, analysis_id, report_type, format='pdf'):
        config = {
            "type": report_type,
            "format": format,
            "parameters": {
                "includeCharts": True,
                "customBranding": True,
                "includeAppendices": report_type == 'detailed'
            }
        }
        
        response = requests.post(
            f"{self.base_url}/analyses/{analysis_id}/reports",
            json=config,
            headers=self.headers
        )
        return response.json()['data']
    
    def download_report(self, report_id):
        response = requests.get(
            f"{self.base_url}/reports/{report_id}/download",
            headers=self.headers
        )
        return response.content
    
    def send_report_email(self, recipients, analysis_data, report_content, report_type):
        msg = MIMEMultipart()
        msg['From'] = 'reports@curriculum-alignment.ceu.edu'
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = f"Curriculum Analysis Report - {analysis_data['programName']}"
        
        # Email body
        body = f"""
        Dear Team,
        
        The curriculum analysis for {analysis_data['programName']} has been completed.
        
        Analysis Summary:
        - Type: {analysis_data['type']}
        - Overall Score: {analysis_data['results']['overallScore']}/100
        - Completed: {analysis_data['completedAt']}
        
        Please find the {report_type} report attached.
        
        Best regards,
        MACAS Automated Reports
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach report
        report_attachment = MIMEApplication(report_content, _subtype='pdf')
        report_attachment.add_header(
            'Content-Disposition', 
            f'attachment; filename="{report_type}-report.pdf"'
        )
        msg.attach(report_attachment)
        
        # Send email
        with smtplib.SMTP('smtp.ceu.edu', 587) as server:
            server.starttls()
            server.login('reports@curriculum-alignment.ceu.edu', 'password')
            server.send_message(msg)

@app.task
def process_completed_analysis(analysis_id):
    """Celery task to process completed analysis."""
    pipeline = ReportPipeline(os.getenv('MACAS_API_KEY'))
    
    try:
        # Get analysis details
        analysis = pipeline.get_analysis(analysis_id)
        
        # Generate reports
        reports_to_generate = [
            {'type': 'executive', 'recipients': ['dean@ceu.edu', 'chair@cs.ceu.edu']},
            {'type': 'detailed', 'recipients': ['faculty@cs.ceu.edu']},
            {'type': 'action-plan', 'recipients': ['curriculum-committee@ceu.edu']}
        ]
        
        for report_config in reports_to_generate:
            # Generate report
            report = pipeline.generate_report(analysis_id, report_config['type'])
            
            # Wait for generation (in production, use callbacks or polling)
            import time
            time.sleep(30)
            
            # Download and send
            report_content = pipeline.download_report(report['id'])
            pipeline.send_report_email(
                report_config['recipients'],
                analysis,
                report_content,
                report_config['type']
            )
            
        return f"Successfully processed analysis {analysis_id}"
        
    except Exception as e:
        # Log error and potentially retry
        print(f"Error processing analysis {analysis_id}: {str(e)}")
        raise

# Webhook handler to trigger the pipeline
@app.route('/webhook/analysis-completed', methods=['POST'])
def handle_analysis_webhook():
    data = request.json
    if data['event'] == 'analysis.completed':
        # Queue the processing task
        process_completed_analysis.delay(data['data']['analysisId'])
        return {'status': 'queued'}, 200
    return {'status': 'ignored'}, 200
```

### 5. Program Portfolio Dashboard

Create a dashboard that displays information about multiple programs.

#### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MacasClient = axios.create({
    baseURL: 'https://api.curriculum-alignment.ceu.edu/v1',
    headers: {
        'X-API-Key': process.env.REACT_APP_MACAS_API_KEY
    }
});

const ProgramPortfolioDashboard = () => {
    const [programs, setPrograms] = useState([]);
    const [analyses, setAnalyses] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPortfolioData();
    }, []);

    const loadPortfolioData = async () => {
        try {
            setLoading(true);
            
            // Load all programs
            const programsResponse = await MacasClient.get('/programs');
            const programsData = programsResponse.data.data;
            setPrograms(programsData);
            
            // Load recent analyses for each program
            const analysesPromises = programsData.map(async (program) => {
                try {
                    const analysisResponse = await MacasClient.get(
                        `/programs/${program.id}/analyses?limit=1`
                    );
                    return {
                        programId: program.id,
                        analysis: analysisResponse.data.data[0] || null
                    };
                } catch (err) {
                    return { programId: program.id, analysis: null };
                }
            });
            
            const analysesResults = await Promise.all(analysesPromises);
            const analysesMap = {};
            analysesResults.forEach(result => {
                analysesMap[result.programId] = result.analysis;
            });
            setAnalyses(analysesMap);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const startAnalysis = async (programId) => {
        try {
            const analysisConfig = {
                type: 'comprehensive',
                parameters: {
                    detailLevel: 'intermediate'
                }
            };
            
            await MacasClient.post(`/programs/${programId}/analyses`, analysisConfig);
            
            // Refresh data
            loadPortfolioData();
        } catch (err) {
            console.error('Failed to start analysis:', err);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading) return <div>Loading portfolio...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Program Portfolio Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map(program => {
                    const analysis = analyses[program.id];
                    
                    return (
                        <div key={program.id} className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-xl font-semibold mb-2">{program.name}</h3>
                            <p className="text-gray-600 mb-4">{program.department}</p>
                            
                            {analysis ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Last Analysis:</span>
                                        <span className="text-sm text-gray-500">
                                            {new Date(analysis.completedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    {analysis.results && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span>Overall Score:</span>
                                                <span className={getScoreColor(analysis.results.overallScore)}>
                                                    {analysis.results.overallScore}/100
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>Completeness: {analysis.results.componentScores.completeness}</div>
                                                <div>Innovation: {analysis.results.componentScores.innovation}</div>
                                                <div>Competitiveness: {analysis.results.componentScores.competitiveness}</div>
                                                <div>Coherence: {analysis.results.componentScores.coherence}</div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={() => startAnalysis(program.id)}
                                        className="w-full mt-4 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                                    >
                                        Run New Analysis
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-gray-500 mb-4">No analysis available</p>
                                    <button 
                                        onClick={() => startAnalysis(program.id)}
                                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                    >
                                        Start First Analysis
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgramPortfolioDashboard;
```

## Error Handling Patterns

### Comprehensive Error Handling

```python
import requests
from requests.exceptions import RequestException
import time
import logging

class MacasApiError(Exception):
    """Custom exception for MACAS API errors."""
    def __init__(self, message, response=None, error_code=None):
        super().__init__(message)
        self.response = response
        self.error_code = error_code

class RobustMacasClient:
    def __init__(self, api_key, max_retries=3):
        self.api_key = api_key
        self.base_url = "https://api.curriculum-alignment.ceu.edu/v1"
        self.max_retries = max_retries
        self.headers = {'X-API-Key': api_key, 'Content-Type': 'application/json'}
    
    def make_request(self, method, endpoint, **kwargs):
        """Make API request with comprehensive error handling and retries."""
        for attempt in range(self.max_retries):
            try:
                response = requests.request(
                    method=method,
                    url=f"{self.base_url}/{endpoint}",
                    headers=self.headers,
                    timeout=30,
                    **kwargs
                )
                
                # Handle specific HTTP status codes
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 201:
                    return response.json()
                elif response.status_code == 204:
                    return None
                elif response.status_code == 401:
                    raise MacasApiError("Authentication failed - check API key", response, "AUTH_ERROR")
                elif response.status_code == 403:
                    raise MacasApiError("Insufficient permissions", response, "PERMISSION_ERROR")
                elif response.status_code == 404:
                    raise MacasApiError("Resource not found", response, "NOT_FOUND")
                elif response.status_code == 409:
                    error_data = response.json()
                    raise MacasApiError(error_data.get('error', {}).get('message', 'Conflict'), response, "CONFLICT")
                elif response.status_code == 413:
                    raise MacasApiError("File too large", response, "FILE_TOO_LARGE")
                elif response.status_code == 422:
                    error_data = response.json()
                    raise MacasApiError(f"Validation error: {error_data.get('error', {}).get('message')}", response, "VALIDATION_ERROR")
                elif response.status_code == 429:
                    # Rate limited - wait and retry
                    retry_after = int(response.headers.get('Retry-After', 60))
                    logging.warning(f"Rate limited. Waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue
                elif response.status_code >= 500:
                    # Server error - retry with exponential backoff
                    wait_time = (2 ** attempt) * 1  # 1, 2, 4 seconds
                    logging.warning(f"Server error {response.status_code}. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    response.raise_for_status()
                    
            except RequestException as e:
                if attempt == self.max_retries - 1:
                    raise MacasApiError(f"Network error after {self.max_retries} attempts: {str(e)}")
                
                wait_time = (2 ** attempt) * 1
                logging.warning(f"Network error on attempt {attempt + 1}. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
        
        raise MacasApiError(f"Failed after {self.max_retries} attempts")
    
    def create_program_safe(self, program_data):
        """Create program with comprehensive error handling."""
        try:
            return self.make_request('POST', 'programs', json=program_data)
        except MacasApiError as e:
            if e.error_code == 'CONFLICT':
                logging.info(f"Program {program_data.get('name')} already exists")
                # Try to find existing program
                programs = self.make_request('GET', f"programs?name={program_data.get('name')}")
                if programs and programs.get('data'):
                    return programs['data'][0]
            raise
```

## Testing API Integrations

### Unit Tests with pytest

```python
import pytest
import requests_mock
from macas_client import MacasClient

class TestMacasClient:
    def setup_method(self):
        self.client = MacasClient('test-api-key')
        self.base_url = 'https://api.curriculum-alignment.ceu.edu/v1'
    
    @requests_mock.Mocker()
    def test_create_program_success(self, m):
        # Mock successful program creation
        mock_response = {
            'data': {
                'id': 'test-program-id',
                'name': 'Test Program',
                'status': 'draft'
            }
        }
        m.post(f'{self.base_url}/programs', json=mock_response, status_code=201)
        
        program_data = {
            'name': 'Test Program',
            'department': 'Computer Science',
            'academicLevel': 'undergraduate'
        }
        
        result = self.client.create_program(program_data)
        
        assert result['id'] == 'test-program-id'
        assert result['name'] == 'Test Program'
    
    @requests_mock.Mocker()
    def test_create_program_validation_error(self, m):
        # Mock validation error
        mock_error = {
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Department is required'
            }
        }
        m.post(f'{self.base_url}/programs', json=mock_error, status_code=400)
        
        program_data = {
            'name': 'Test Program',
            'academicLevel': 'undergraduate'
            # Missing required department
        }
        
        with pytest.raises(Exception) as exc_info:
            self.client.create_program(program_data)
        
        assert 'Department is required' in str(exc_info.value)
    
    @requests_mock.Mocker()
    def test_rate_limiting_retry(self, m):
        # Mock rate limiting then success
        m.post(f'{self.base_url}/programs', [
            {'status_code': 429, 'headers': {'Retry-After': '1'}},
            {'json': {'data': {'id': 'test-id'}}, 'status_code': 201}
        ])
        
        program_data = {'name': 'Test', 'department': 'CS', 'academicLevel': 'undergraduate'}
        result = self.client.create_program(program_data)
        
        assert result['id'] == 'test-id'
        assert m.call_count == 2  # First call rate limited, second succeeded

# Run tests
if __name__ == "__main__":
    pytest.main([__file__])
```

For more examples and integration patterns, visit our [GitHub repository](https://github.com/ceu-edu/macas-examples) or contact api-support@ceu.edu.
import type { Program, Course } from '../store/slices/curriculumSlice'
import type { AnalysisResult, Workflow } from '../store/slices/analysisSlice'
import type { Report, ReportTemplate } from '../store/slices/reportSlice'

// Sample Courses
const sampleCourses: any[] = [
  {
    id: 'cs101',
    code: 'CS 101',
    title: 'Introduction to Computer Science',
    description: 'Fundamental concepts in computer science including algorithms, data structures, and programming.',
    credits: 4,
    prerequisites: [],
    corequisites: [],
    level: 'undergraduate',
    department: 'Computer Science',
    semester: ['Fall', 'Spring'],
    status: 'active'
  },
  {
    id: 'cs201',
    code: 'CS 201',
    title: 'Data Structures and Algorithms',
    description: 'Advanced study of data structures, algorithms, and their analysis.',
    credits: 4,
    prerequisites: ['cs101'],
    corequisites: [],
    level: 'undergraduate',
    department: 'Computer Science',
    semester: ['Fall', 'Spring'],
    status: 'active'
  },
  {
    id: 'cs301',
    code: 'CS 301',
    title: 'Software Engineering',
    description: 'Principles and practices of software development and engineering.',
    credits: 3,
    prerequisites: ['cs201'],
    corequisites: [],
    level: 'undergraduate',
    department: 'Computer Science',
    semester: ['Fall'],
    status: 'active'
  },
  {
    id: 'math101',
    code: 'MATH 101',
    title: 'Calculus I',
    description: 'Differential calculus with applications.',
    credits: 4,
    prerequisites: [],
    corequisites: [],
    level: 'undergraduate',
    department: 'Mathematics',
    semester: ['Fall', 'Spring'],
    status: 'active'
  },
  {
    id: 'math201',
    code: 'MATH 201',
    title: 'Linear Algebra',
    description: 'Vector spaces, matrices, and linear transformations.',
    credits: 3,
    prerequisites: ['math101'],
    corequisites: [],
    level: 'undergraduate',
    department: 'Mathematics',
    semester: ['Spring'],
    status: 'active'
  }
]

// Sample Programs
export const samplePrograms: any[] = [
  {
    id: 'ceu-cs-bs',
    name: 'Computer Science',
    degree: 'Bachelor of Science',
    university: 'Central European University',
    totalCredits: 120,
    duration: '4 years',
    department: 'Department of Computer Science',
    description: 'A comprehensive program covering fundamental and advanced topics in computer science, preparing students for careers in technology and research.',
    courses: sampleCourses.slice(0, 3),
    requirements: {
      core: ['cs101', 'cs201', 'cs301'],
      electives: {
        categories: ['Advanced CS', 'Mathematics', 'Science'],
        minimumCredits: 24
      },
      general: ['math101', 'math201']
    },
    lastUpdated: '2024-09-15',
    version: '2024.1'
  },
  {
    id: 'mit-cs-bs',
    name: 'Computer Science and Engineering',
    degree: 'Bachelor of Science',
    university: 'Massachusetts Institute of Technology',
    totalCredits: 132,
    duration: '4 years',
    department: 'Electrical Engineering and Computer Science',
    description: 'World-class education in computer science and engineering with emphasis on theoretical foundations and practical applications.',
    courses: sampleCourses,
    requirements: {
      core: ['cs101', 'cs201', 'cs301'],
      electives: {
        categories: ['Theory', 'Systems', 'AI/ML'],
        minimumCredits: 36
      },
      general: ['math101', 'math201']
    },
    lastUpdated: '2024-08-20',
    version: '2024.2'
  },
  {
    id: 'stanford-cs-ms',
    name: 'Computer Science',
    degree: 'Master of Science',
    university: 'Stanford University',
    totalCredits: 45,
    duration: '2 years',
    department: 'Computer Science',
    description: 'Graduate program focusing on cutting-edge research and advanced topics in computer science.',
    courses: sampleCourses.slice(1, 4),
    requirements: {
      core: ['cs201', 'cs301'],
      electives: {
        categories: ['AI', 'Systems', 'Theory', 'HCI'],
        minimumCredits: 30
      },
      general: []
    },
    lastUpdated: '2024-09-01',
    version: '2024.3'
  }
]

// Sample Analyses
export const sampleAnalyses: AnalysisResult[] = [
  {
    id: 'analysis-001',
    type: 'curriculum-comparison',
    status: 'completed',
    progress: 100,
    createdAt: '2024-09-20T10:00:00Z',
    completedAt: '2024-09-20T10:15:00Z',
    parameters: {
      sourceProgram: 'ceu-cs-bs',
      targetProgram: 'mit-cs-bs',
      standards: ['ABET'],
      analysisOptions: { includePrerequisites: true, weightCredits: true }
    },
    results: {
      overallScore: 87,
      similarities: [
        { category: 'Core Courses', score: 92, details: 'Strong alignment in fundamental CS courses' },
        { category: 'Mathematics', score: 85, details: 'Similar mathematical foundation requirements' }
      ],
      differences: [
        { category: 'Total Credits', description: 'MIT requires 12 more credits (132 vs 120)' },
        { category: 'Electives', description: 'MIT offers more specialized tracks' }
      ],
      gaps: [
        { area: 'Systems Programming', severity: 'medium', recommendation: 'Add operating systems course' }
      ],
      recommendations: [
        'Consider adding advanced systems courses',
        'Strengthen theoretical computer science track'
      ]
    }
  },
  {
    id: 'analysis-002',
    type: 'accreditation-analysis',
    status: 'in-progress',
    progress: 65,
    createdAt: '2024-09-23T09:30:00Z',
    parameters: {
      sourceProgram: 'ceu-cs-bs',
      standards: ['ABET', 'EUR-ACE'],
      analysisOptions: { detailedMapping: true }
    },
    results: {
      overallScore: 78,
      compliance: {
        'ABET': { score: 82, status: 'compliant', gaps: 2 },
        'EUR-ACE': { score: 74, status: 'partial', gaps: 5 }
      }
    }
  },
  {
    id: 'analysis-003',
    type: 'gap-analysis',
    status: 'failed',
    progress: 45,
    createdAt: '2024-09-22T14:20:00Z',
    parameters: {
      sourceProgram: 'stanford-cs-ms'
    },
    error: 'Insufficient data for comparison. Please upload more detailed curriculum information.'
  }
]

// Sample Workflows
export const sampleWorkflows: Workflow[] = [
  {
    id: 'workflow-001',
    name: 'Multi-University Comparison',
    status: 'completed',
    progress: 100,
    steps: [
      { name: 'Data Collection', status: 'completed', startTime: '2024-09-20T10:00:00Z', endTime: '2024-09-20T10:05:00Z' },
      { name: 'Preprocessing', status: 'completed', startTime: '2024-09-20T10:05:00Z', endTime: '2024-09-20T10:08:00Z' },
      { name: 'Analysis', status: 'completed', startTime: '2024-09-20T10:08:00Z', endTime: '2024-09-20T10:12:00Z' },
      { name: 'Report Generation', status: 'completed', startTime: '2024-09-20T10:12:00Z', endTime: '2024-09-20T10:15:00Z' }
    ],
    createdAt: '2024-09-20T10:00:00Z',
    estimatedDuration: 900, // 15 minutes
    actualDuration: 900
  },
  {
    id: 'workflow-002',
    name: 'ABET Compliance Check',
    status: 'running',
    progress: 65,
    steps: [
      { name: 'Standards Loading', status: 'completed', startTime: '2024-09-23T09:30:00Z', endTime: '2024-09-23T09:32:00Z' },
      { name: 'Curriculum Mapping', status: 'completed', startTime: '2024-09-23T09:32:00Z', endTime: '2024-09-23T09:40:00Z' },
      { name: 'Compliance Analysis', status: 'running', startTime: '2024-09-23T09:40:00Z' },
      { name: 'Gap Identification', status: 'pending' },
      { name: 'Recommendations', status: 'pending' }
    ],
    createdAt: '2024-09-23T09:30:00Z',
    estimatedDuration: 1800 // 30 minutes
  }
]

// Sample Report Templates
export const sampleReportTemplates: ReportTemplate[] = [
  {
    id: 'template-comparison',
    name: 'Curriculum Comparison Report',
    description: 'Comprehensive comparison between two or more curriculum programs',
    type: 'comparison',
    sections: [
      { id: 'executive-summary', title: 'Executive Summary', type: 'summary', required: true, configurable: false },
      { id: 'program-overview', title: 'Program Overview', type: 'table', required: true, configurable: true },
      { id: 'course-mapping', title: 'Course Mapping', type: 'table', required: true, configurable: true },
      { id: 'credit-analysis', title: 'Credit Analysis', type: 'chart', required: false, configurable: true },
      { id: 'recommendations', title: 'Recommendations', type: 'list', required: true, configurable: true }
    ],
    defaultConfig: {
      includePrerequisites: true,
      showCredits: true,
      chartType: 'bar'
    }
  },
  {
    id: 'template-accreditation',
    name: 'Accreditation Compliance Report',
    description: 'Detailed analysis of curriculum compliance with accreditation standards',
    type: 'accreditation',
    sections: [
      { id: 'compliance-overview', title: 'Compliance Overview', type: 'summary', required: true, configurable: false },
      { id: 'standards-mapping', title: 'Standards Mapping', type: 'table', required: true, configurable: false },
      { id: 'gap-analysis', title: 'Gap Analysis', type: 'list', required: true, configurable: true },
      { id: 'action-plan', title: 'Action Plan', type: 'list', required: true, configurable: true }
    ],
    defaultConfig: {
      includeEvidence: true,
      detailLevel: 'comprehensive'
    }
  }
]

// Sample Reports
export const sampleReports: Report[] = [
  {
    id: 'report-001',
    title: 'CEU vs MIT Computer Science Comparison',
    type: 'comparison',
    status: 'completed',
    progress: 100,
    createdAt: '2024-09-20T10:15:00Z',
    completedAt: '2024-09-20T10:18:00Z',
    parameters: {
      templateId: 'template-comparison',
      analysisId: 'analysis-001',
      customConfig: { includeFuturePlanning: true }
    }
  },
  {
    id: 'report-002',
    title: 'ABET Compliance Assessment - CEU CS Program',
    type: 'accreditation',
    status: 'generating',
    progress: 75,
    createdAt: '2024-09-23T09:45:00Z',
    parameters: {
      templateId: 'template-accreditation',
      analysisId: 'analysis-002'
    }
  },
  {
    id: 'report-003',
    title: 'Quarterly Program Review',
    type: 'custom',
    status: 'draft',
    progress: 0,
    createdAt: '2024-09-23T08:00:00Z',
    parameters: {
      templateId: 'template-custom',
      customConfig: { customSections: ['overview', 'metrics', 'goals'] }
    }
  }
]

// Sample uploaded documents
export const sampleUploadedDocuments = [
  {
    id: 'doc-001',
    name: 'CEU_CS_Curriculum_2024.pdf',
    type: 'application/pdf',
    status: 'completed' as const,
    url: '/uploads/ceu-cs-curriculum.pdf',
    extractedData: { courses: 25, credits: 120, lastUpdated: '2024-09-15' }
  },
  {
    id: 'doc-002',
    name: 'MIT_EECS_Requirements.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    status: 'completed' as const,
    url: '/uploads/mit-eecs-requirements.docx',
    extractedData: { courses: 30, credits: 132, lastUpdated: '2024-08-20' }
  },
  {
    id: 'doc-003',
    name: 'Stanford_CS_Graduate.pdf',
    type: 'application/pdf',
    status: 'processing' as const,
    extractedData: null
  }
]
// CEU Faculty Configuration
// This can be managed by administrators through the settings panel

export interface Faculty {
  id: string
  name: string
  shortName: string
  description?: string
  active: boolean
}

// Default CEU faculties - can be modified by admins
export const DEFAULT_CEU_FACULTIES: Faculty[] = [
  {
    id: 'business',
    name: 'CEU Business School',
    shortName: 'Business',
    description: 'Graduate business education and executive education',
    active: true
  },
  {
    id: 'public-policy',
    name: 'School of Public Policy',
    shortName: 'Public Policy',
    description: 'Public policy analysis and governance studies',
    active: true
  },
  {
    id: 'legal-studies',
    name: 'Department of Legal Studies',
    shortName: 'Legal Studies',
    description: 'Legal education and comparative law studies',
    active: true
  },
  {
    id: 'medieval-studies',
    name: 'Department of Medieval Studies',
    shortName: 'Medieval Studies',
    description: 'Medieval history, literature, and culture',
    active: true
  },
  {
    id: 'history',
    name: 'Department of History',
    shortName: 'History',
    description: 'Historical studies and research',
    active: true
  },
  {
    id: 'political-science',
    name: 'Department of Political Science',
    shortName: 'Political Science',
    description: 'Political analysis and international relations',
    active: true
  },
  {
    id: 'economics',
    name: 'Department of Economics and Business',
    shortName: 'Economics',
    description: 'Economic analysis and business studies',
    active: true
  },
  {
    id: 'mathematics',
    name: 'Department of Mathematics and its Applications',
    shortName: 'Mathematics',
    description: 'Mathematics and computational sciences',
    active: true
  },
  {
    id: 'environmental',
    name: 'Department of Environmental Sciences and Policy',
    shortName: 'Environmental',
    description: 'Environmental studies and sustainability',
    active: true
  },
  {
    id: 'network-science',
    name: 'Department of Network and Data Science',
    shortName: 'Data Science',
    description: 'Network analysis and data science',
    active: true
  },
  {
    id: 'cognitive-science',
    name: 'Department of Cognitive Science',
    shortName: 'Cognitive Science',
    description: 'Cognitive science and psychology',
    active: true
  },
  {
    id: 'philosophy',
    name: 'Department of Philosophy',
    shortName: 'Philosophy',
    description: 'Philosophy and ethics',
    active: true
  }
]

// Helper functions
export const getActiveFaculties = (faculties: Faculty[] = DEFAULT_CEU_FACULTIES): Faculty[] => {
  return faculties.filter(faculty => faculty.active)
}

export const getFacultyById = (id: string, faculties: Faculty[] = DEFAULT_CEU_FACULTIES): Faculty | undefined => {
  return faculties.find(faculty => faculty.id === id)
}

export const getFacultyByName = (name: string, faculties: Faculty[] = DEFAULT_CEU_FACULTIES): Faculty | undefined => {
  return faculties.find(faculty => 
    faculty.name.toLowerCase() === name.toLowerCase() || 
    faculty.shortName.toLowerCase() === name.toLowerCase()
  )
}
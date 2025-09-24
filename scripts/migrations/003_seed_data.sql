-- Seed Data Migration  
-- Multi-Agent Curriculum Alignment System
-- 
-- This migration provides comprehensive seed data for the system including:
-- - Extended university and program data for testing
-- - Sample courses and curriculum structures
-- - Test users with different roles
-- - Sample analysis sessions and results
-- - Configuration data for development and testing

-- =============================================================================
-- EXTENDED UNIVERSITY DATA
-- =============================================================================

-- Add more universities for comprehensive testing
INSERT INTO universities (id, name, country, city, website_url, ranking_national, ranking_international, established_year, student_count, accreditation_bodies, metadata) VALUES

-- United States Universities
('550e8400-e29b-41d4-a716-446655440001', 'Carnegie Mellon University', 'United States', 'Pittsburgh', 'https://cmu.edu', 5, 15, 1900, 14500, ARRAY['Middle States Commission on Higher Education'], 
 '{"specializations": ["Computer Science", "Engineering", "Business"], "research_focus": ["AI", "Robotics", "Cybersecurity"]}'),

('550e8400-e29b-41d4-a716-446655440002', 'University of California, Berkeley', 'United States', 'Berkeley', 'https://berkeley.edu', 6, 8, 1868, 45000, ARRAY['WASC Senior College and University Commission'],
 '{"specializations": ["Engineering", "Business", "Public Policy"], "research_focus": ["Technology", "Sustainability", "Social Sciences"]}'),

('550e8400-e29b-41d4-a716-446655440003', 'Georgia Institute of Technology', 'United States', 'Atlanta', 'https://gatech.edu', 7, 25, 1885, 36000, ARRAY['Southern Association of Colleges and Schools'],
 '{"specializations": ["Engineering", "Computing", "Sciences"], "research_focus": ["Technology", "Innovation", "Research"]}'),

-- United Kingdom Universities  
('550e8400-e29b-41d4-a716-446655440004', 'Imperial College London', 'United Kingdom', 'London', 'https://imperial.ac.uk', 3, 6, 1907, 17000, ARRAY['Quality Assurance Agency for Higher Education'],
 '{"specializations": ["Science", "Engineering", "Medicine", "Business"], "research_focus": ["STEM", "Innovation", "Healthcare"]}'),

('550e8400-e29b-41d4-a716-446655440005', 'University College London', 'United Kingdom', 'London', 'https://ucl.ac.uk', 4, 10, 1826, 42000, ARRAY['Quality Assurance Agency for Higher Education'],
 '{"specializations": ["Medicine", "Engineering", "Arts", "Sciences"], "research_focus": ["Healthcare", "Technology", "Social Sciences"]}'),

-- European Universities
('550e8400-e29b-41d4-a716-446655440006', 'ETH Zurich', 'Switzerland', 'Zurich', 'https://ethz.ch', 1, 7, 1855, 22000, ARRAY['swissuniversities'],
 '{"specializations": ["Engineering", "Sciences", "Mathematics"], "research_focus": ["Technology", "Innovation", "Research"], "language": ["German", "English"]}'),

('550e8400-e29b-41d4-a716-446655440007', 'Technical University of Munich', 'Germany', 'Munich', 'https://tum.de', 1, 20, 1868, 45000, ARRAY['Akkreditierungsrat'],
 '{"specializations": ["Engineering", "Natural Sciences", "Medicine"], "research_focus": ["Technology", "Innovation", "Sustainability"], "language": ["German", "English"]}'),

-- Asian Universities
('550e8400-e29b-41d4-a716-446655440008', 'University of Tokyo', 'Japan', 'Tokyo', 'https://u-tokyo.ac.jp', 1, 23, 1877, 28000, ARRAY['Japan University Accreditation Association'],
 '{"specializations": ["Sciences", "Engineering", "Medicine", "Humanities"], "research_focus": ["Technology", "Science", "Innovation"], "language": ["Japanese", "English"]}'),

('550e8400-e29b-41d4-a716-446655440009', 'Tsinghua University', 'China', 'Beijing', 'https://tsinghua.edu.cn', 1, 17, 1911, 50000, ARRAY['Ministry of Education of China'],
 '{"specializations": ["Engineering", "Sciences", "Management"], "research_focus": ["Technology", "Innovation", "Research"], "language": ["Chinese", "English"]}'),

-- Canadian Universities
('550e8400-e29b-41d4-a716-446655440010', 'University of Toronto', 'Canada', 'Toronto', 'https://utoronto.ca', 1, 18, 1827, 97000, ARRAY['Ontario Universities Council on Quality Assurance'],
 '{"specializations": ["Medicine", "Engineering", "Business", "Arts"], "research_focus": ["Healthcare", "Technology", "Social Sciences"]}'),

('550e8400-e29b-41d4-a716-446655440011', 'University of British Columbia', 'Canada', 'Vancouver', 'https://ubc.ca', 2, 34, 1908, 66000, ARRAY['British Columbia Degree Quality Assessment Board'],
 '{"specializations": ["Sciences", "Engineering", "Medicine", "Forestry"], "research_focus": ["Sustainability", "Healthcare", "Technology"]}'),

-- Australian Universities
('550e8400-e29b-41d4-a716-446655440012', 'Australian National University', 'Australia', 'Canberra', 'https://anu.edu.au', 1, 27, 1946, 25000, ARRAY['Higher Education Standards Panel'],
 '{"specializations": ["Sciences", "Engineering", "Policy", "Arts"], "research_focus": ["Research", "Policy", "Innovation"]}');

-- =============================================================================
-- SAMPLE ACADEMIC PROGRAMS
-- =============================================================================

-- Computer Science Programs
INSERT INTO programs (id, university_id, name, description, program_type, duration_years, credit_hours, language, accreditation_bodies, admission_requirements, career_outcomes, tuition_annual, website_url, metadata, created_by) VALUES

-- MIT Computer Science
('660e8400-e29b-41d4-a716-446655440001', 
 (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology'),
 'Bachelor of Science in Computer Science',
 'Comprehensive computer science program covering algorithms, systems, theory, and applications with strong emphasis on research and innovation.',
 'bachelor', 4.0, 180, 'English',
 ARRAY['ABET', 'New England Commission of Higher Education'],
 'SAT/ACT scores, strong mathematics background, programming experience preferred',
 ARRAY['Software Engineer', 'Research Scientist', 'Data Scientist', 'Technology Entrepreneur'],
 55878.00, 'https://eecs.mit.edu/academics/undergraduate-programs/',
 '{"research_areas": ["AI/ML", "Systems", "Theory", "HCI"], "prerequisites": ["Calculus", "Physics", "Chemistry"], "graduation_rate": 96}',
 (SELECT id FROM users WHERE email = 'admin@curriculum-alignment.edu')),

-- Stanford Computer Science  
('660e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM universities WHERE name = 'Stanford University'), 
 'Bachelor of Science in Computer Science',
 'World-class computer science education with emphasis on entrepreneurship, innovation, and interdisciplinary collaboration.',
 'bachelor', 4.0, 180, 'English',
 ARRAY['ABET', 'WASC Senior College and University Commission'],
 'Exceptional academic record, SAT/ACT scores, leadership experience, personal essays',
 ARRAY['Software Engineer', 'Product Manager', 'Startup Founder', 'Research Scientist'],
 56169.00, 'https://cs.stanford.edu/degrees/undergrad/',
 '{"research_areas": ["AI", "HCI", "Systems", "Graphics"], "silicon_valley_connections": true, "startup_incubator": true}',
 (SELECT id FROM users WHERE email = 'admin@curriculum-alignment.edu')),

-- Carnegie Mellon Computer Science
('660e8400-e29b-41d4-a716-446655440003',
 '550e8400-e29b-41d4-a716-446655440001',
 'Bachelor of Science in Computer Science', 
 'Rigorous computer science program with strong focus on software engineering, AI, and human-computer interaction.',
 'bachelor', 4.0, 360, 'English',
 ARRAY['ABET', 'Middle States Commission on Higher Education'],
 'Strong mathematics and science background, programming experience, high academic achievement',
 ARRAY['Software Developer', 'AI Engineer', 'UX Designer', 'Systems Architect'],
 58924.00, 'https://csd.cs.cmu.edu/',
 '{"research_areas": ["AI", "Robotics", "HCI", "Software Engineering"], "industry_partnerships": true, "coop_program": true}',
 (SELECT id FROM users WHERE email = 'admin@curriculum-alignment.edu')),

-- Master's Programs
('660e8400-e29b-41d4-a716-446655440004',
 (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology'),
 'Master of Engineering in Computer Science',
 'Advanced computer science program for working professionals and researchers focusing on cutting-edge technologies.',
 'master', 1.5, 66, 'English', 
 ARRAY['ABET', 'New England Commission of Higher Education'],
 'Bachelor degree in CS or related field, programming experience, research experience preferred',
 ARRAY['Senior Software Engineer', 'Technical Lead', 'Research Scientist', 'CTO'],
 55878.00, 'https://eecs.mit.edu/academics/graduate-programs/',
 '{"thesis_required": true, "research_focus": ["Advanced AI", "Quantum Computing", "Systems"], "industry_collaboration": true}',
 (SELECT id FROM users WHERE email = 'admin@curriculum-alignment.edu')),

-- International Programs
('660e8400-e29b-41d4-a716-446655440005',
 '550e8400-e29b-41d4-a716-446655440006',
 'Bachelor of Science in Computer Science',
 'Computer science program with strong emphasis on mathematical foundations and theoretical computer science.',
 'bachelor', 3.0, 180, 'English',
 ARRAY['swissuniversities'],
 'Matura or equivalent, strong mathematics background, English proficiency',
 ARRAY['Software Engineer', 'Research Scientist', 'Quantitative Analyst', 'Systems Engineer'],
 1600.00, 'https://inf.ethz.ch/studies/bachelor.html',
 '{"research_areas": ["Algorithms", "Systems", "AI", "Security"], "international_exchange": true, "thesis_required": true}',
 (SELECT id FROM users WHERE email = 'admin@curriculum-alignment.edu'));

-- =============================================================================
-- SAMPLE COURSES
-- =============================================================================

-- MIT Computer Science Courses
INSERT INTO courses (program_id, code, name, description, credit_hours, course_level, prerequisites, learning_outcomes, assessment_methods, required, semester, year_level, instructor) VALUES

-- MIT CS Core Courses
((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology')),
 'CS 6.0001', 'Introduction to Computer Science and Programming in Python',
 'Introduction to computer science and programming for students with little or no programming experience using Python.',
 6.0, 'foundation', ARRAY[]::TEXT[],
 ARRAY['Understand basic programming concepts', 'Write simple Python programs', 'Use computational thinking to solve problems'],
 ARRAY['Problem sets', 'Quizzes', 'Final exam'], true, 'Fall', 1, 'Prof. John Guttag'),

((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology')),
 'CS 6.006', 'Introduction to Algorithms',
 'Introduction to mathematical analysis of algorithms and data structures.',
 12.0, 'intermediate', ARRAY['CS 6.0001', 'Mathematics'],
 ARRAY['Analyze algorithm complexity', 'Implement fundamental data structures', 'Solve algorithmic problems'],
 ARRAY['Problem sets', 'Quizzes', 'Final exam'], true, 'Spring', 2, 'Prof. Erik Demaine'),

((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology')),
 'CS 6.034', 'Artificial Intelligence', 
 'Introduction to representation, problem solving, and learning methods in artificial intelligence.',
 12.0, 'advanced', ARRAY['CS 6.006', 'Mathematics'],
 ARRAY['Understand AI problem-solving techniques', 'Implement basic AI algorithms', 'Apply AI to real-world problems'],
 ARRAY['Problem sets', 'Projects', 'Quizzes'], true, 'Fall', 3, 'Prof. Patrick Winston'),

-- Stanford CS Core Courses  
((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Stanford University')),
 'CS 106A', 'Programming Methodology',
 'Introduction to the engineering of computer applications emphasizing modern software engineering principles.',
 5.0, 'foundation', ARRAY[]::TEXT[],
 ARRAY['Learn fundamental programming concepts', 'Develop problem-solving skills', 'Understand software design principles'],
 ARRAY['Assignments', 'Midterm', 'Final exam'], true, 'Fall', 1, 'Prof. Mehran Sahami'),

((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Stanford University')),
 'CS 161', 'Design and Analysis of Algorithms',
 'Worst and average case analysis of algorithms and data structures.',
 5.0, 'intermediate', ARRAY['CS 106A', 'Math 51'],
 ARRAY['Analyze algorithm efficiency', 'Design efficient algorithms', 'Prove algorithm correctness'],
 ARRAY['Homework', 'Midterm', 'Final exam'], true, 'Spring', 2, 'Prof. Tim Roughgarden'),

((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Stanford University')),
 'CS 229', 'Machine Learning',
 'Broad introduction to machine learning and statistical pattern recognition.',
 4.0, 'advanced', ARRAY['CS 161', 'Math 51', 'Statistics'],
 ARRAY['Understand ML algorithms', 'Implement ML models', 'Apply ML to real datasets'],
 ARRAY['Problem sets', 'Midterm', 'Final project'], false, 'Fall', 3, 'Prof. Andrew Ng'),

-- Carnegie Mellon CS Courses
((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = '550e8400-e29b-41d4-a716-446655440001'),
 'CS 15-112', 'Fundamentals of Programming and Computer Science',
 'A technical introduction to the fundamentals of programming with an emphasis on producing clear, robust, and reasonably efficient code.',
 12.0, 'foundation', ARRAY[]::TEXT[],
 ARRAY['Master basic programming constructs', 'Develop algorithmic thinking', 'Write well-structured programs'],
 ARRAY['Homework', 'Quizzes', 'Term project'], true, 'Fall', 1, 'Prof. David Kosbie'),

((SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = '550e8400-e29b-41d4-a716-446655440001'),
 'CS 15-213', 'Introduction to Computer Systems',
 'Introduction to the basic concepts underlying all computer systems.',
 12.0, 'intermediate', ARRAY['CS 15-112'],
 ARRAY['Understand computer systems architecture', 'Learn systems programming', 'Optimize program performance'],
 ARRAY['Labs', 'Exams', 'Projects'], true, 'Spring', 2, 'Prof. Randal Bryant');

-- =============================================================================
-- TEST USERS WITH DIFFERENT ROLES
-- =============================================================================

INSERT INTO users (id, email, password_hash, name, role, is_active, email_verified_at, mfa_enabled) VALUES

-- Additional admin user
('770e8400-e29b-41d4-a716-446655440001', 
 'admin2@curriculum-alignment.edu',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6',
 'Secondary Administrator', 'admin', true, NOW(), true),

-- Coordinator users
('770e8400-e29b-41d4-a716-446655440002',
 'coordinator@curriculum-alignment.edu', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6',
 'Dr. Sarah Johnson', 'coordinator', true, NOW(), false),

('770e8400-e29b-41d4-a716-446655440003',
 'coordinator2@curriculum-alignment.edu',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6', 
 'Prof. Michael Chen', 'coordinator', true, NOW(), false),

-- Analyst users
('770e8400-e29b-41d4-a716-446655440004',
 'analyst@curriculum-alignment.edu',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6',
 'Dr. Emily Rodriguez', 'analyst', true, NOW(), false),

('770e8400-e29b-41d4-a716-446655440005',
 'analyst2@curriculum-alignment.edu',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6',
 'Dr. James Wilson', 'analyst', true, NOW(), false),

-- Viewer users
('770e8400-e29b-41d4-a716-446655440006',
 'viewer@curriculum-alignment.edu',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6',
 'Alice Thompson', 'viewer', true, NOW(), false),

('770e8400-e29b-41d4-a716-446655440007',
 'viewer2@curriculum-alignment.edu',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6',
 'Bob Martinez', 'viewer', true, NOW(), false);

-- =============================================================================
-- SAMPLE DOCUMENTS
-- =============================================================================

INSERT INTO documents (id, program_id, name, description, document_type, document_format, file_size, file_hash, storage_path, processing_status, extracted_text, extracted_metadata, ocr_confidence, uploaded_by) VALUES

-- MIT CS Program Documents
('880e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology')),
 'MIT EECS Curriculum Guide 2024',
 'Comprehensive curriculum guide for Electrical Engineering and Computer Science programs',
 'curriculum', 'pdf', 2450000, 'sha256:abc123def456', 
 '/documents/mit_eecs_curriculum_2024.pdf', 'completed',
 'ELECTRICAL ENGINEERING AND COMPUTER SCIENCE CURRICULUM... Foundation subjects include mathematics, physics, and introductory programming...',
 '{"pages": 45, "last_modified": "2024-01-15", "version": "2024.1"}',
 95.5, '770e8400-e29b-41d4-a716-446655440002'),

-- Stanford CS Program Documents  
('880e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Stanford University')),
 'Stanford CS Undergraduate Handbook',
 'Official handbook for computer science undergraduate students',
 'curriculum', 'pdf', 1890000, 'sha256:def456abc789',
 '/documents/stanford_cs_handbook_2024.pdf', 'completed',
 'COMPUTER SCIENCE UNDERGRADUATE PROGRAM... Core requirements include programming methodology, systems, theory, and applications...',
 '{"pages": 38, "last_modified": "2024-02-01", "version": "2024.2"}',
 92.8, '770e8400-e29b-41d4-a716-446655440002');

-- =============================================================================
-- SAMPLE ANALYSIS SESSIONS
-- =============================================================================

INSERT INTO analysis_sessions (id, name, description, target_program_id, comparison_programs, analysis_depth, analysis_status, configuration, results, progress_percentage, started_by, started_at, completed_at) VALUES

-- Completed analysis session
('990e8400-e29b-41d4-a716-446655440001',
 'MIT vs Stanford CS Comparison',
 'Comprehensive comparison of MIT and Stanford computer science undergraduate programs',
 (SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology')),
 ARRAY[(SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Stanford University'))],
 'comprehensive', 'completed',
 '{"include_course_mapping": true, "analyze_prerequisites": true, "compare_outcomes": true, "weight_factors": {"curriculum_depth": 0.4, "research_opportunities": 0.3, "industry_connections": 0.3}}',
 '{"overall_similarity": 78.5, "curriculum_alignment": 82.3, "research_focus_match": 75.2, "outcome_similarity": 80.1}',
 100, '770e8400-e29b-41d4-a716-446655440004', 
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

-- Running analysis session
('990e8400-e29b-41d4-a716-446655440002',
 'Multi-University CS Comparison',
 'Comparison of computer science programs across multiple top universities',
 (SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = '550e8400-e29b-41d4-a716-446655440001'),
 ARRAY[
   (SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology')),
   (SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Stanford University'))
 ],
 'standard', 'running',
 '{"include_course_mapping": true, "analyze_prerequisites": false, "compare_outcomes": true}',
 NULL, 65, '770e8400-e29b-41d4-a716-446655440005',
 NOW() - INTERVAL '4 hours', NULL);

-- =============================================================================
-- SAMPLE ANALYSIS RESULTS  
-- =============================================================================

INSERT INTO analysis_results (id, analysis_session_id, comparison_program_id, similarity_score, gap_analysis, course_mapping, recommendations, strengths, weaknesses, missing_topics, additional_topics, alignment_percentage) VALUES

('aa0e8400-e29b-41d4-a716-446655440001',
 '990e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM programs WHERE name = 'Bachelor of Science in Computer Science' AND university_id = (SELECT id FROM universities WHERE name = 'Stanford University')),
 78.5,
 '{"curriculum_gaps": ["Advanced Systems Programming", "Machine Learning Theory"], "strength_gaps": ["Entrepreneurship Focus", "Industry Partnerships"], "coverage_gaps": ["Human-Computer Interaction", "Computer Graphics"]}',
 '{"direct_matches": 12, "partial_matches": 8, "unique_courses": 6, "missing_equivalents": 4}',
 '{"high_priority": ["Add entrepreneurship component", "Strengthen industry connections"], "medium_priority": ["Expand HCI curriculum", "Add graphics courses"], "low_priority": ["Enhance seminar series"]}',
 ARRAY['Strong theoretical foundation', 'Excellent research opportunities', 'World-class faculty'],
 ARRAY['Limited industry exposure', 'Fewer startup opportunities', 'Less emphasis on practical skills'],
 ARRAY['Entrepreneurship', 'Product Management', 'Industry Internships'],
 ARRAY['Advanced Theory', 'Research Methodology', 'Academic Writing'],
 82.3);

-- =============================================================================
-- SAMPLE CURRICULUM GAPS
-- =============================================================================

INSERT INTO curriculum_gaps (id, analysis_result_id, gap_type, gap_category, description, severity, recommended_action, priority_score) VALUES

('bb0e8400-e29b-41d4-a716-446655440001',
 'aa0e8400-e29b-41d4-a716-446655440001',
 'missing_course', 'Practical Skills',
 'No dedicated entrepreneurship or startup methodology course equivalent to Stanford CS 183',
 'medium',
 'Introduce CS 6.901: Technology Entrepreneurship course covering startup fundamentals, product development, and business models',
 75),

('bb0e8400-e29b-41d4-a716-446655440002', 
 'aa0e8400-e29b-41d4-a716-446655440001',
 'insufficient_coverage', 'Industry Connection',
 'Limited industry internship integration compared to Stanford co-op and internship programs',
 'high',
 'Establish formal industry partnership program with mandatory internship component and industry mentorship',
 85),

('bb0e8400-e29b-41d4-a716-446655440003',
 'aa0e8400-e29b-41d4-a716-446655440001', 
 'prerequisite_gap', 'Foundation Skills',
 'Missing intermediate-level human-computer interaction course between basic UI and advanced HCI research',
 'low',
 'Add CS 6.831: User Interface Design and Implementation as bridge course',
 45);

-- =============================================================================
-- SAMPLE WORKFLOWS AND EXECUTIONS
-- =============================================================================

-- Insert sample workflow definition
INSERT INTO workflows (id, name, description, workflow_definition, version, created_by) VALUES
('cc0e8400-e29b-41d4-a716-446655440001',
 'Curriculum Analysis Workflow',
 'Standard workflow for comprehensive curriculum comparison and gap analysis',
 '{
   "steps": [
     {"id": "data_collection", "agent": "web-search", "description": "Collect program information from university websites"},
     {"id": "document_processing", "agent": "document-processing", "description": "Parse and extract curriculum documents"},
     {"id": "curriculum_analysis", "agent": "accreditation-expert", "description": "Perform detailed curriculum analysis"},
     {"id": "gap_identification", "agent": "accreditation-expert", "description": "Identify curriculum gaps and recommendations"},
     {"id": "quality_review", "agent": "qa-agent", "description": "Review and standardize terminology"},
     {"id": "report_generation", "agent": "coordinator", "description": "Generate final analysis report"}
   ],
   "dependencies": {
     "document_processing": ["data_collection"],
     "curriculum_analysis": ["document_processing"],
     "gap_identification": ["curriculum_analysis"],
     "quality_review": ["gap_identification"],
     "report_generation": ["quality_review"]
   }
 }',
 1, '770e8400-e29b-41d4-a716-446655440002');

-- Insert sample workflow execution
INSERT INTO workflow_executions (id, workflow_id, analysis_session_id, status, input_data, output_data, started_by, started_at, completed_at) VALUES
('dd0e8400-e29b-41d4-a716-446655440001',
 'cc0e8400-e29b-41d4-a716-446655440001',
 '990e8400-e29b-41d4-a716-446655440001',
 'completed',
 '{"target_program": "MIT CS", "comparison_programs": ["Stanford CS"], "analysis_depth": "comprehensive"}',
 '{"similarity_score": 78.5, "gaps_identified": 3, "recommendations_generated": 5, "processing_time": "2.5 hours"}',
 '770e8400-e29b-41d4-a716-446655440004',
 NOW() - INTERVAL '2 days',
 NOW() - INTERVAL '1 day');

-- =============================================================================
-- ADDITIONAL SYSTEM CONFIGURATION  
-- =============================================================================

-- Insert more detailed system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('ui.theme', '"default"', 'Default UI theme'),
('ui.items_per_page', '25', 'Default number of items per page in lists'),
('ui.enable_dark_mode', 'true', 'Enable dark mode toggle'),
('analysis.cache_results', 'true', 'Enable caching of analysis results'),
('analysis.max_concurrent', '5', 'Maximum concurrent analyses per user'),
('documents.ocr_threshold', '75', 'Minimum OCR confidence threshold for processing'),
('documents.auto_extract_metadata', 'true', 'Automatically extract document metadata'),
('notifications.email_enabled', 'true', 'Enable email notifications'),
('notifications.analysis_completion', 'true', 'Send notifications when analysis completes'),
('security.login_attempts_max', '5', 'Maximum login attempts before lockout'),
('security.session_timeout_hours', '8', 'Session timeout in hours'),
('integration.webhook_enabled', 'false', 'Enable webhook notifications'),
('integration.api_rate_limit_per_minute', '100', 'API calls per minute per user'),
('backup.retention_days', '30', 'Number of days to retain backups'),
('logging.level', '"info"', 'Default logging level'),
('monitoring.metrics_enabled', 'true', 'Enable performance metrics collection');

-- =============================================================================
-- SAMPLE API USAGE DATA
-- =============================================================================

-- Insert sample API usage for testing analytics
INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time, request_size, response_size, ip_address, user_agent, created_at) VALUES

-- Recent API usage  
('770e8400-e29b-41d4-a716-446655440004', '/api/programs', 'GET', 200, 145, 0, 2048, '192.168.1.100', 'Mozilla/5.0 (compatible)', NOW() - INTERVAL '1 hour'),
('770e8400-e29b-41d4-a716-446655440004', '/api/analysis', 'POST', 201, 2340, 1024, 512, '192.168.1.100', 'Mozilla/5.0 (compatible)', NOW() - INTERVAL '2 hours'),
('770e8400-e29b-41d4-a716-446655440005', '/api/programs/search', 'GET', 200, 234, 128, 1536, '192.168.1.101', 'Mozilla/5.0 (compatible)', NOW() - INTERVAL '30 minutes'),
('770e8400-e29b-41d4-a716-446655440006', '/api/documents', 'GET', 200, 89, 0, 4096, '192.168.1.102', 'Mozilla/5.0 (compatible)', NOW() - INTERVAL '15 minutes'),

-- Some failed requests for testing error analytics
('770e8400-e29b-41d4-a716-446655440007', '/api/analysis/999', 'GET', 404, 45, 0, 256, '192.168.1.103', 'Mozilla/5.0 (compatible)', NOW() - INTERVAL '1 day'),
('770e8400-e29b-41d4-a716-446655440007', '/api/admin/users', 'GET', 403, 23, 0, 128, '192.168.1.103', 'Mozilla/5.0 (compatible)', NOW() - INTERVAL '1 day');

-- =============================================================================
-- SAMPLE SYSTEM METRICS
-- =============================================================================

-- Insert sample system metrics for testing dashboards  
INSERT INTO system_metrics (metric_name, metric_value, metric_unit, tags, timestamp) VALUES
('cpu_usage_percent', 45.2, 'percent', '{"server": "app-01", "component": "api"}', NOW() - INTERVAL '5 minutes'),
('memory_usage_percent', 67.8, 'percent', '{"server": "app-01", "component": "api"}', NOW() - INTERVAL '5 minutes'),
('disk_usage_percent', 23.4, 'percent', '{"server": "app-01", "mount": "/"}', NOW() - INTERVAL '5 minutes'),
('active_users', 12, 'count', '{"type": "concurrent"}', NOW() - INTERVAL '5 minutes'),
('api_requests_per_minute', 145, 'count', '{"endpoint": "/api/programs"}', NOW() - INTERVAL '5 minutes'),
('database_connections', 8, 'count', '{"pool": "main"}', NOW() - INTERVAL '5 minutes'),
('analysis_queue_length', 3, 'count', '{"status": "pending"}', NOW() - INTERVAL '5 minutes'),
('document_processing_time', 2340, 'milliseconds', '{"type": "pdf"}', NOW() - INTERVAL '10 minutes'),
('agent_response_time', 890, 'milliseconds', '{"agent": "web-search"}', NOW() - INTERVAL '10 minutes'),
('cache_hit_rate', 78.5, 'percent', '{"cache": "redis", "type": "analysis"}', NOW() - INTERVAL '15 minutes');

-- =============================================================================
-- REFRESH MATERIALIZED VIEWS WITH NEW DATA
-- =============================================================================

-- Refresh materialized views to include new data
REFRESH MATERIALIZED VIEW university_program_stats;
REFRESH MATERIALIZED VIEW program_course_stats; 
REFRESH MATERIALIZED VIEW analysis_performance_stats;

-- =============================================================================
-- UPDATE STATISTICS FOR QUERY OPTIMIZATION
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE universities;
ANALYZE programs;
ANALYZE courses;
ANALYZE users;
ANALYZE analysis_sessions;
ANALYZE analysis_results;
ANALYZE documents;
ANALYZE workflows;
ANALYZE workflow_executions;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Seed data migration completed successfully!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '- Universities: %', (SELECT COUNT(*) FROM universities);
    RAISE NOTICE '- Programs: %', (SELECT COUNT(*) FROM programs);
    RAISE NOTICE '- Courses: %', (SELECT COUNT(*) FROM courses);
    RAISE NOTICE '- Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '- Documents: %', (SELECT COUNT(*) FROM documents);
    RAISE NOTICE '- Analysis Sessions: %', (SELECT COUNT(*) FROM analysis_sessions);
    RAISE NOTICE '- Analysis Results: %', (SELECT COUNT(*) FROM analysis_results);
    RAISE NOTICE '- Curriculum Gaps: %', (SELECT COUNT(*) FROM curriculum_gaps);
    RAISE NOTICE '- Workflows: %', (SELECT COUNT(*) FROM workflows);
    RAISE NOTICE '- System Config Entries: %', (SELECT COUNT(*) FROM system_config);
    RAISE NOTICE '';
    RAISE NOTICE 'Test Users Created:';
    RAISE NOTICE '- admin2@curriculum-alignment.edu (Admin)';
    RAISE NOTICE '- coordinator@curriculum-alignment.edu (Coordinator)';
    RAISE NOTICE '- coordinator2@curriculum-alignment.edu (Coordinator)';
    RAISE NOTICE '- analyst@curriculum-alignment.edu (Analyst)';
    RAISE NOTICE '- analyst2@curriculum-alignment.edu (Analyst)';
    RAISE NOTICE '- viewer@curriculum-alignment.edu (Viewer)';
    RAISE NOTICE '- viewer2@curriculum-alignment.edu (Viewer)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample Data Includes:';
    RAISE NOTICE '- Computer Science programs from MIT, Stanford, Carnegie Mellon';
    RAISE NOTICE '- International universities from UK, Switzerland, Germany, Japan, China';
    RAISE NOTICE '- Complete course structures with prerequisites and outcomes';
    RAISE NOTICE '- Sample analysis sessions and results';
    RAISE NOTICE '- Curriculum gap analysis with recommendations';
    RAISE NOTICE '- System metrics and API usage data for testing';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Login with any test user (password: admin123 - CHANGE THIS!)';
    RAISE NOTICE '2. Explore the sample programs and analysis results';
    RAISE NOTICE '3. Test the analysis workflow with sample data';
    RAISE NOTICE '4. Configure agents and run test analyses';
    RAISE NOTICE '=================================================================';
END $$;
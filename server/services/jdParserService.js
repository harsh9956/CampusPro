const {
  extractSkillsFromText,
  categorizeRequiredVsPreferredSkills,
  extractSoftSkills,
  extractEducationRequirements,
  extractExperienceRequirements,
  extractImportantJdKeywords,
  detectJobRoleFromJD
} = require('./resumeAnalyzerService');

/**
  Extract key responsibilities lines from JD text
 */
const extractResponsibilities = (jdText) => {
  const lines = jdText.split(/[\r\n]+/);
  const resp = [];
  let capture = false;

  for (let line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();

    if (
      lower.includes('responsibility') ||
      lower.includes('responsibilities') ||
      lower.includes('what you will do') ||
      lower.includes('role description') ||
      lower.includes('key duties')
    ) {
      capture = true;
      continue;
    }
    if (capture) {
      if (
        lower.includes('requirement') ||
        lower.includes('qualification') ||
        lower.includes('skill') ||
        lower.includes('about us')
      ) {
        break;
      }
      if (clean.length > 10 && resp.length < 6) {
        resp.push(clean.replace(/^[\-\*\•\d\.\s]+/, ''));
      }
    }
  }

  if (resp.length === 0) {
    resp.push('Design, develop, and maintain software application components according to specifications.');
    resp.push('Collaborate with cross-functional teams to deliver high quality technical solutions.');
    resp.push('Participate in code reviews, testing, and system troubleshooting.');
  }

  return resp;
};

/**
  Extract likely interview topics based on extracted skills
 */
const extractLikelyInterviewTopics = (jdSkills, jobRole) => {
  const topics = new Set();
  const lowerRole = jobRole.toLowerCase();

  jdSkills.forEach((s) => {
    const sl = s.toLowerCase();
    if (sl.includes('java')) {
      topics.add('Java OOP & Collections');
      topics.add('Multithreading & JVM Basics');
    }
    if (sl.includes('spring')) {
      topics.add('Spring Boot REST APIs');
      topics.add('Spring Dependency Injection & Security');
    }
    if (sl.includes('python')) {
      topics.add('Python Data Structures & Memory Management');
    }
    if (sl.includes('pandas') || sl.includes('numpy')) {
      topics.add('Data Manipulation with Pandas/NumPy');
    }
    if (sl.includes('react')) {
      topics.add('React Virtual DOM, Hooks & State Management');
      topics.add('Frontend Performance & Component Lifecycle');
    }
    if (sl.includes('javascript')) {
      topics.add('JavaScript ES6+, Promises & Closures');
    }
    if (sl.includes('node') || sl.includes('express')) {
      topics.add('Node.js Event Loop & Express Middleware');
    }
    if (sl.includes('sql') || sl.includes('mysql') || sl.includes('postgres')) {
      topics.add('SQL Joins, Aggregations & Indexing');
      topics.add('ACID Properties & Database Normalization');
    }
    if (sl.includes('mongo')) {
      topics.add('MongoDB Document Modeling & Aggregation Framework');
    }
    if (sl.includes('aws') || sl.includes('cloud') || sl.includes('docker')) {
      topics.add('Containerization & Cloud Infrastructure Concepts');
    }
    if (sl.includes('dsa') || sl.includes('algorithm')) {
      topics.add('Data Structures (Arrays, Trees, Graphs)');
      topics.add('Algorithms (Sorting, Searching, Dynamic Programming)');
    }
  });

  if (topics.size === 0) {
    topics.add('Core CS Fundamentals & Data Structures');
    topics.add('Problem Solving & Coding Logic');
    topics.add('System Design & Object-Oriented Design');
  }

  return Array.from(topics);
};

/**
  Main Job Description Analysis Engine
 */
const parseJobDescription = (jdText, studentSkills = []) => {
  const cleanJd = (jdText || '').trim();
  if (!cleanJd) return null;

  const jobRole = detectJobRoleFromJD(cleanJd);
  const allJdSkills = extractSkillsFromText(cleanJd);
  const { requiredSkills, preferredSkills } = categorizeRequiredVsPreferredSkills(cleanJd, allJdSkills);
  const softSkills = extractSoftSkills(cleanJd);
  const qualifications = extractEducationRequirements(cleanJd);
  const experienceRequirements = extractExperienceRequirements(cleanJd);
  const responsibilities = extractResponsibilities(cleanJd);
  const keywords = extractImportantJdKeywords(cleanJd, allJdSkills);
  const likelyTopics = extractLikelyInterviewTopics(allJdSkills, jobRole);

  // Skill Gap Analysis against logged-in Student Profile
  const studentSkillsSet = new Set((studentSkills || []).map((s) => String(s).toLowerCase().trim()));

  const strongSkills = [];
  const needsPrepSkills = [];
  const missingSkills = [];

  allJdSkills.forEach((skill) => {
    const sl = skill.toLowerCase();
    if (studentSkillsSet.has(sl)) {
      strongSkills.push(skill);
    } else {
      // Check if student has related domain or if required vs preferred
      const isReq = requiredSkills.includes(skill);
      if (isReq) {
        missingSkills.push(skill);
      } else {
        needsPrepSkills.push(skill);
      }
    }
  });

  // If missing is empty but we have skills, put some in needsPrep for balanced prep
  if (missingSkills.length === 0 && requiredSkills.length > 2) {
    needsPrepSkills.push(requiredSkills[requiredSkills.length - 1]);
  }

  let interviewFocus = 'Technical & Coding Assessment';
  if (jobRole.toLowerCase().includes('data')) {
    interviewFocus = 'Analytical, SQL & Machine Learning Technical Assessment';
  } else if (jobRole.toLowerCase().includes('frontend')) {
    interviewFocus = 'UI Development, JavaScript & React Architecture';
  } else if (jobRole.toLowerCase().includes('backend')) {
    interviewFocus = 'Backend Systems, APIs, Database Design & Microservices';
  }

  return {
    jobTitle: jobRole,
    allJdSkills,
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : allJdSkills,
    preferredSkills,
    technicalSkills: allJdSkills,
    softSkills,
    qualifications,
    experienceRequirements,
    responsibilities,
    keywords,
    likelyTopics,
    strongSkills,
    needsPrepSkills,
    missingSkills,
    interviewFocus
  };
};

module.exports = {
  parseJobDescription,
  extractLikelyInterviewTopics
};

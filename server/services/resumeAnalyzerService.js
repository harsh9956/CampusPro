const pdfParseModule = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * CONFIGURABLE ATS WEIGHT CONSTANTS (Total: 100%)
 */
const ATS_SCORE_WEIGHTS = {
  requiredTechnicalSkills: 35, // 35% Weight - Required technical skills
  importantKeywords: 20,       // 20% Weight - High-frequency JD keywords
  jobRoleRelevance: 15,        // 15% Weight - Job title & domain relevance
  educationQualification: 10,  // 10% Weight - Degree, CS background, CGPA
  projectsExperience: 10,      // 10% Weight - Tech stack in projects, action verbs
  preferredSkills: 5,          // 5% Weight - Bonus/preferred skills
  softSkills: 5                // 5% Weight - Soft skills alignment
};

/**
 * COMPREHENSIVE ALIAS & SKILL TAXONOMY DICTIONARY
 * Categorized into Technical Skills, Languages, Frameworks, Libraries, Databases,
 * Cloud, DevOps, Tools, APIs, Testing, Analytics, Soft Skills, Certifications.
 */
const DETAILED_TAXONOMY = [
  // Programming Languages
  { canonical: 'JavaScript', category: 'Programming Languages', regex: /\b(javascript|js|ecmascript)\b/i },
  { canonical: 'TypeScript', category: 'Programming Languages', regex: /\b(typescript|ts)\b/i },
  { canonical: 'Java', category: 'Programming Languages', regex: /\bjava\b/i },
  { canonical: 'Python', category: 'Programming Languages', regex: /\b(python|py)\b/i },
  { canonical: 'C++', category: 'Programming Languages', regex: /\b(c\+\+|cpp)\b/i },
  { canonical: 'C#', category: 'Programming Languages', regex: /\b(c\#|csharp)\b/i },
  { canonical: 'C Language', category: 'Programming Languages', regex: /\bC\b/ }, // Case sensitive C
  { canonical: 'Go', category: 'Programming Languages', regex: /\b(go|golang)\b/i },
  { canonical: 'Rust', category: 'Programming Languages', regex: /\brust\b/i },
  { canonical: 'PHP', category: 'Programming Languages', regex: /\bphp\b/i },
  { canonical: 'Ruby', category: 'Programming Languages', regex: /\bruby\b/i },
  { canonical: 'Swift', category: 'Programming Languages', regex: /\bswift\b/i },
  { canonical: 'Kotlin', category: 'Programming Languages', regex: /\bkotlin\b/i },
  { canonical: 'SQL', category: 'Programming Languages', regex: /\bsql\b/i },

  // Frameworks & Libraries
  { canonical: 'React', category: 'Frameworks', regex: /\b(react|react\.js|reactjs)\b/i },
  { canonical: 'Angular', category: 'Frameworks', regex: /\b(angular|angular\.js|angularjs)\b/i },
  { canonical: 'Vue.js', category: 'Frameworks', regex: /\b(vue|vue\.js|vuejs)\b/i },
  { canonical: 'Next.js', category: 'Frameworks', regex: /\b(next\.js|nextjs)\b/i },
  { canonical: 'Spring Boot', category: 'Frameworks', regex: /\b(spring\s*boot|springboot)\b/i },
  { canonical: 'Hibernate', category: 'Frameworks', regex: /\bhibernate\b/i },
  { canonical: 'Django', category: 'Frameworks', regex: /\bdjango\b/i },
  { canonical: 'Flask', category: 'Frameworks', regex: /\bflask\b/i },
  { canonical: 'Express.js', category: 'Frameworks', regex: /\b(express\.js|expressjs|express)\b/i },
  { canonical: 'Node.js', category: 'Frameworks', regex: /\b(node\.js|nodejs|node)\b/i },
  { canonical: 'Redux', category: 'Libraries', regex: /\bredux\b/i },
  { canonical: 'Tailwind CSS', category: 'Libraries', regex: /\b(tailwind|tailwindcss)\b/i },
  { canonical: 'Bootstrap', category: 'Libraries', regex: /\bbootstrap\b/i },
  { canonical: 'HTML/CSS', category: 'Libraries', regex: /\b(html5?|css3?)\b/i },

  // Databases
  { canonical: 'MongoDB', category: 'Databases', regex: /\b(mongodb|mongo)\b/i },
  { canonical: 'MySQL', category: 'Databases', regex: /\bmysql\b/i },
  { canonical: 'PostgreSQL', category: 'Databases', regex: /\b(postgresql|postgres)\b/i },
  { canonical: 'Oracle', category: 'Databases', regex: /\boracle\b/i },
  { canonical: 'Redis', category: 'Databases', regex: /\bredis\b/i },
  { canonical: 'SQLite', category: 'Databases', regex: /\bsqlite\b/i },
  { canonical: 'NoSQL', category: 'Databases', regex: /\bnosql\b/i },

  // Cloud Technologies
  { canonical: 'AWS', category: 'Cloud', regex: /\b(aws|amazon\s+web\s+services)\b/i },
  { canonical: 'Azure', category: 'Cloud', regex: /\bazure\b/i },
  { canonical: 'GCP', category: 'Cloud', regex: /\b(gcp|google\s+cloud)\b/i },
  { canonical: 'Firebase', category: 'Cloud', regex: /\bfirebase\b/i },

  // DevOps & Tools
  { canonical: 'Docker', category: 'DevOps', regex: /\bdocker\b/i },
  { canonical: 'Kubernetes', category: 'DevOps', regex: /\b(kubernetes|k8s)\b/i },
  { canonical: 'Jenkins', category: 'DevOps', regex: /\bjenkins\b/i },
  { canonical: 'CI/CD', category: 'DevOps', regex: /\b(ci\/cd|cicd|continuous\s+integration)\b/i },
  { canonical: 'Git', category: 'Tools', regex: /\bgit\b/i },
  { canonical: 'GitHub', category: 'Tools', regex: /\bgithub\b/i },
  { canonical: 'Linux', category: 'Tools', regex: /\b(linux|unix)\b/i },
  { canonical: 'Jira', category: 'Tools', regex: /\bjira\b/i },
  { canonical: 'Postman', category: 'Tools', regex: /\bpostman\b/i },
  { canonical: 'Figma', category: 'Tools', regex: /\bfigma\b/i },

  // APIs & Architectures
  { canonical: 'REST API', category: 'APIs', regex: /\b(restful\s+api|rest\s+api|restful\s+web\s+services|rest\s+apis|rest)\b/i },
  { canonical: 'GraphQL', category: 'APIs', regex: /\bgraphql\b/i },
  { canonical: 'Microservices', category: 'APIs', regex: /\bmicroservices\b/i },
  { canonical: 'Data Structures & Algorithms', category: 'Concepts', regex: /\b(dsa|data\s+structures|algorithms)\b/i },
  { canonical: 'OOP', category: 'Concepts', regex: /\b(oop|object\s+oriented\s+programming)\b/i },
  { canonical: 'DBMS', category: 'Concepts', regex: /\b(dbms|database\s+management)\b/i },

  // Testing & Analytics
  { canonical: 'JUnit / Jest', category: 'Testing', regex: /\b(junit|jest|cypress|selenium|mocha)\b/i },
  { canonical: 'PowerBI / Tableau', category: 'Analytics', regex: /\b(powerbi|tableau|excel|pandas)\b/i }
];

/**
 * SOFT SKILLS TAXONOMY
 */
const SOFT_SKILLS_LIST = [
  { canonical: 'Communication', regex: /\b(communication|verbal|written|presentation)\b/i },
  { canonical: 'Teamwork', regex: /\b(teamwork|collaboration|team\s+player)\b/i },
  { canonical: 'Problem Solving', regex: /\b(problem\s+solving|analytical|critical\s+thinking)\b/i },
  { canonical: 'Leadership', regex: /\b(leadership|ownership|mentoring)\b/i },
  { canonical: 'Time Management', regex: /\b(time\s+management|multitasking)\b/i },
  { canonical: 'Adaptability', regex: /\b(adaptability|flexible|fast\s+learner)\b/i }
];

/**
 * Robust helper to parse PDF buffers regardless of pdf-parse package version/export style
 */
const parsePdfBuffer = async (buffer) => {
  if (typeof pdfParseModule === 'function') {
    const data = await pdfParseModule(buffer);
    return data ? data.text : '';
  } else if (pdfParseModule && pdfParseModule.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    const data = await parser.getText();
    return data ? data.text : '';
  } else if (pdfParseModule && pdfParseModule.default && typeof pdfParseModule.default === 'function') {
    const data = await pdfParseModule.default(buffer);
    return data ? data.text : '';
  }
  throw new Error('PDF parsing library interface unavailable');
};

/**
 * Extract text from PDF / DOCX file buffer
 */
const extractTextFromFileBuffer = async (buffer, originalname, mimetype) => {
  const filename = (originalname || '').toLowerCase();

  try {
    if (filename.endsWith('.pdf') || mimetype === 'application/pdf') {
      const extractedText = await parsePdfBuffer(buffer);
      const text = (extractedText || '').trim();
      if (!text || text.length < 15) {
        throw new Error('Unable to extract readable text from PDF. The document may be empty, protected, or a scanned image-only PDF.');
      }
      return text;
    } else if (
      filename.endsWith('.docx') ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text || text.length < 15) {
        throw new Error('Unable to extract text from DOCX file. Please ensure the file contains readable body text.');
      }
      return text;
    } else {
      throw new Error('Unsupported file format. Only PDF and DOCX files are allowed.');
    }
  } catch (err) {
    if (err.message.includes('Unable to extract') || err.message.includes('Unsupported file')) {
      throw err;
    }
    throw new Error(`Failed to parse document (${filename}): ${err.message}`);
  }
};

/**
 * STRICT REGEX DETECT JOB ROLE FROM ACTUAL JD TEXT
 * Uses strict word boundary matching to prevent "qualifications" matching "QA"!
 */
const detectJobRoleFromJD = (jdText) => {
  const text = jdText.toLowerCase();
  
  if (/\b(frontend|front-end|react\s+developer|ui\s+developer|web\s+developer)\b/i.test(text)) {
    return 'Frontend Developer';
  }
  if (/\b(backend|back-end|node\s+developer|java\s+developer|python\s+developer)\b/i.test(text)) {
    return 'Backend Developer';
  }
  if (/\b(full\s*stack|fullstack|mern|mean)\b/i.test(text)) {
    return 'Full Stack Developer';
  }
  if (/\b(data\s+analyst|data\s+scientist|business\s+analyst)\b/i.test(text)) {
    return 'Data Analyst';
  }
  if (/\b(devops|cloud\s+engineer|sre|site\s+reliability)\b/i.test(text)) {
    return 'DevOps / Cloud Engineer';
  }
  if (/\b(qa\s+engineer|automation\s+engineer|quality\s+assurance\s+engineer)\b/i.test(text)) {
    return 'QA / Automation Engineer';
  }
  if (/\b(mobile|android|ios|flutter|react\s+native)\b/i.test(text)) {
    return 'Mobile App Developer';
  }
  return 'Software Engineer';
};

/**
 * Extract Education Requirements from actual JD text
 */
const extractEducationRequirements = (jdText) => {
  const reqs = [];
  const text = jdText.toLowerCase();

  if (text.includes('b.tech') || text.includes('btech') || text.includes('b.e') || text.includes('bachelor')) {
    reqs.push('Bachelor’s Degree (B.Tech / B.E. / B.Sc / BCA or equivalent)');
  }
  if (text.includes('m.tech') || text.includes('mtech') || text.includes('master') || text.includes('mca')) {
    reqs.push('Master’s Degree (M.Tech / MCA / M.Sc preferred or required)');
  }
  if (text.includes('computer science') || text.includes('cse') || text.includes('information technology') || text.includes('it') || text.includes('ece')) {
    reqs.push('Computer Science, IT, or related technical discipline');
  }
  if (text.includes('cgpa') || text.includes('percentage') || text.includes('7.0') || text.includes('60%')) {
    reqs.push('Good academic standing (60%+ / 6.5+ CGPA)');
  }

  if (reqs.length === 0) {
    reqs.push('Technical Degree in Computer Science or relevant field');
  }
  return reqs;
};

/**
 * Extract Experience Requirements from actual JD text
 */
const extractExperienceRequirements = (jdText) => {
  const reqs = [];
  const text = jdText.toLowerCase();

  if (/\b(fresher|0-1|0 to 1|entry level|2026|2027)\b/i.test(text)) {
    reqs.push('Fresher / Entry-Level (0–1 years experience)');
  } else if (/\b(1-2|1 to 2|1\+\s*years)\b/i.test(text)) {
    reqs.push('1–2 years of practical software development experience');
  } else if (/\b(2-3|2\+\s*years|3\+\s*years)\b/i.test(text)) {
    reqs.push('2+ years of relevant industry experience');
  } else if (/\b(intern|internship)\b/i.test(text)) {
    reqs.push('Prior internship or project building experience');
  } else {
    reqs.push('Demonstrated hands-on coding & project experience');
  }

  return reqs;
};

/**
 * Extract Soft Skills present in actual JD text
 */
const extractSoftSkills = (jdText) => {
  const matched = [];
  SOFT_SKILLS_LIST.forEach((sk) => {
    if (sk.regex.test(jdText)) {
      matched.push(sk.canonical);
    }
  });
  return matched.length > 0 ? matched : ['Communication', 'Problem Solving', 'Teamwork'];
};

/**
 * Extract all taxonomy skills present in text
 */
const extractSkillsFromText = (text) => {
  const found = [];
  DETAILED_TAXONOMY.forEach((item) => {
    if (item.regex.test(text)) {
      found.push(item.canonical);
    }
  });
  return Array.from(new Set(found));
};

/**
 * Categorize JD Skills into Required vs Preferred
 */
const categorizeRequiredVsPreferredSkills = (jdText, allJdSkills) => {
  const required = [];
  const preferred = [];

  const lines = jdText.split(/[\r\n\.\;\bullet\-\*]/);

  allJdSkills.forEach((skill) => {
    let isPref = false;
    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (lower.includes(skill.toLowerCase())) {
        if (
          lower.includes('preferred') ||
          lower.includes('nice to have') ||
          lower.includes('plus') ||
          lower.includes('bonus') ||
          lower.includes('good to have') ||
          lower.includes('advantage') ||
          lower.includes('desirable')
        ) {
          isPref = true;
        }
      }
    });

    if (isPref) {
      preferred.push(skill);
    } else {
      required.push(skill);
    }
  });

  return { requiredSkills: required, preferredSkills: preferred };
};

/**
 * Extract High-Frequency ATS Keywords from JD
 */
const extractImportantJdKeywords = (jdText, foundSkills) => {
  const normalized = jdText.toLowerCase().replace(/[^\w\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(w => w.length > 3);
  
  const stopWords = new Set([
    'with', 'from', 'this', 'that', 'have', 'will', 'your', 'team', 'work', 'role',
    'candidate', 'skills', 'experience', 'knowledge', 'strong', 'good', 'must',
    'should', 'required', 'years', 'working', 'responsibilities', 'qualifications',
    'about', 'description', 'looking', 'ability', 'opportunity', 'company'
  ]);

  const freqMap = {};
  tokens.forEach(token => {
    if (!stopWords.has(token) && !/^\d+$/.test(token)) {
      freqMap[token] = (freqMap[token] || 0) + 1;
    }
  });

  // Combine extracted canonical skills + top candidate words
  const keywords = new Set([...foundSkills]);
  Object.keys(freqMap)
    .sort((a, b) => freqMap[b] - freqMap[a])
    .slice(0, 10)
    .forEach(w => keywords.add(w.charAt(0).toUpperCase() + w.slice(1)));

  return Array.from(keywords).slice(0, 12);
};

/**
 * DYNAMIC EXPLAINABLE ATS ANALYSIS ENGINE
 */
const analyzeResumeAgainstJD = (resumeText, jdText) => {
  const cleanResume = (resumeText || '').trim();
  const cleanJd = (jdText || '').trim();

  // 1. Detect Job Role & Information from actual JD
  const jobRole = detectJobRoleFromJD(cleanJd);
  const educationRequirements = extractEducationRequirements(cleanJd);
  const experienceRequirements = extractExperienceRequirements(cleanJd);
  const softSkills = extractSoftSkills(cleanJd);

  // 2. Extract Skills from Resume and JD
  const resumeSkills = extractSkillsFromText(cleanResume);
  const allJdSkills = extractSkillsFromText(cleanJd);

  const { requiredSkills, preferredSkills } = categorizeRequiredVsPreferredSkills(cleanJd, allJdSkills);

  const resumeSkillsSet = new Set(resumeSkills.map((s) => s.toLowerCase()));

  // 3. Match Skills against Resume
  const matchedSkills = [];
  const missingRequiredSkills = [];
  const missingPreferredSkills = [];

  // Match Required Skills
  requiredSkills.forEach((skill) => {
    if (resumeSkillsSet.has(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingRequiredSkills.push({
        name: skill,
        priority: 'HIGH',
        requirement: 'Required',
        reason: 'Explicitly required in Job Description',
        action: `Learn and build genuine practical experience with ${skill} before adding it to your resume.`
      });
    }
  });

  // Match Preferred Skills
  preferredSkills.forEach((skill) => {
    if (resumeSkillsSet.has(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingPreferredSkills.push({
        name: skill,
        priority: 'MEDIUM',
        requirement: 'Preferred',
        reason: 'Mentioned as preferred/bonus skill in JD',
        action: `Acquiring ${skill} will give you an extra competitive advantage for this position.`
      });
    }
  });

  const uniqueMatchedSkills = Array.from(new Set(matchedSkills));

  // 4. Extract Important ATS Keywords & Compare Overlap
  const importantKeywords = extractImportantJdKeywords(cleanJd, allJdSkills);
  const matchedKeywords = [];
  const missingKeywords = [];

  importantKeywords.forEach((kw) => {
    const lowerKw = kw.toLowerCase();
    if (cleanResume.toLowerCase().includes(lowerKw)) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  // 5. EXPLAINABLE 7-PART WEIGHTED SCORE BREAKDOWN (Total: 100 Points)

  // (A) Required Technical Skills Score (Max 35 pts)
  const reqTotal = requiredSkills.length;
  const matchedReqCount = requiredSkills.filter(s => resumeSkillsSet.has(s.toLowerCase())).length;
  const techRatio = reqTotal > 0 ? matchedReqCount / reqTotal : (allJdSkills.length > 0 ? uniqueMatchedSkills.length / allJdSkills.length : 0.75);
  const scoreRequiredSkills = Math.round(techRatio * ATS_SCORE_WEIGHTS.requiredTechnicalSkills);

  // (B) Important JD Keywords Score (Max 20 pts)
  const kwRatio = importantKeywords.length > 0 ? matchedKeywords.length / importantKeywords.length : 0.6;
  const scoreJdKeywords = Math.round(kwRatio * ATS_SCORE_WEIGHTS.importantKeywords);

  // (C) Job Role Relevance Score (Max 15 pts)
  const lowerResume = cleanResume.toLowerCase();
  const roleKeywords = jobRole.toLowerCase().split(' ');
  let roleMatchCount = 0;
  roleKeywords.forEach(rk => {
    if (lowerResume.includes(rk)) roleMatchCount++;
  });
  const scoreRoleRelevance = Math.min(15, Math.round((roleMatchCount / roleKeywords.length) * 10) + 5);

  // (D) Education & Qualification Score (Max 10 pts)
  let scoreEducation = 0;
  if (lowerResume.includes('b.tech') || lowerResume.includes('btech') || lowerResume.includes('b.e') || lowerResume.includes('bachelor') || lowerResume.includes('computer science') || lowerResume.includes('it')) {
    scoreEducation += 6;
  } else {
    scoreEducation += 3;
  }
  if (lowerResume.includes('cgpa') || lowerResume.includes('percentage') || lowerResume.includes('%')) {
    scoreEducation += 4;
  }

  // (E) Projects / Experience Relevance Score (Max 10 pts)
  let scoreProjects = 0;
  if (lowerResume.includes('project') || lowerResume.includes('built') || lowerResume.includes('developed')) scoreProjects += 4;
  if (lowerResume.includes('git') || lowerResume.includes('github') || lowerResume.includes('repository')) scoreProjects += 3;
  if (lowerResume.includes('api') || lowerResume.includes('database') || lowerResume.includes('application')) scoreProjects += 3;

  // (F) Preferred Skills Score (Max 5 pts)
  const prefTotal = preferredSkills.length;
  const matchedPrefCount = preferredSkills.filter(s => resumeSkillsSet.has(s.toLowerCase())).length;
  const scorePreferredSkills = prefTotal > 0 ? Math.round((matchedPrefCount / prefTotal) * ATS_SCORE_WEIGHTS.preferredSkills) : 4;

  // (G) Soft Skills Score (Max 5 pts)
  let matchedSoftCount = 0;
  softSkills.forEach(ss => {
    if (lowerResume.includes(ss.toLowerCase())) matchedSoftCount++;
  });
  const scoreSoftSkills = Math.min(5, Math.round((matchedSoftCount / softSkills.length) * 5) + 1);

  // TOTAL ATS SCORE
  const totalScore = Math.min(99, Math.max(15,
    scoreRequiredSkills +
    scoreJdKeywords +
    scoreRoleRelevance +
    scoreEducation +
    scoreProjects +
    scorePreferredSkills +
    scoreSoftSkills
  ));

  let matchLevel = 'Good Match';
  if (totalScore >= 82) matchLevel = 'Very Strong Match';
  else if (totalScore >= 68) matchLevel = 'Good Match';
  else if (totalScore >= 45) matchLevel = 'Moderate Match';
  else matchLevel = 'Needs Improvement';

  // 6. Skill Gap Calculation
  const totalRequiredCount = requiredSkills.length || allJdSkills.length || 1;
  const matchedCount = matchedReqCount;
  const missingCount = missingRequiredSkills.length;
  const skillGapPercentage = Math.round((matchedCount / totalRequiredCount) * 100);

  const skillGap = {
    totalRequired: totalRequiredCount,
    matchedCount,
    missingCount,
    percentage: skillGapPercentage,
    alreadyHave: uniqueMatchedSkills,
    needToLearn: missingRequiredSkills.map(s => s.name)
  };

  // 7. Dynamic Preparation Checklist (What Student Needs to Learn)
  const preparationChecklist = {
    mustHave: missingRequiredSkills.map(s => s.name),
    stronglyRecommended: missingPreferredSkills.map(s => s.name),
    resumeImprovement: [
      'Quantify project achievements using metrics (e.g., "Reduced response latency by 25%").',
      'Describe technical responsibilities clearly in your project section.',
      'Provide direct links to GitHub repositories or live project demos.'
    ]
  };

  // 8. Actionable Tailored Suggestions
  const suggestions = [];
  if (missingRequiredSkills.length > 0) {
    const missingNames = missingRequiredSkills.slice(0, 3).map(s => s.name).join(', ');
    suggestions.push(`High Priority Required Skills: Focus on acquiring practical experience with ${missingNames}.`);
  }
  if (missingPreferredSkills.length > 0) {
    const prefNames = missingPreferredSkills.slice(0, 2).map(s => s.name).join(', ');
    suggestions.push(`Preferred Skill Boost: Learn ${prefNames} to stand out among candidates.`);
  }
  if (!lowerResume.includes('git') && !lowerResume.includes('github')) {
    suggestions.push('Add version control experience (Git / GitHub) to demonstrate source code management.');
  }
  suggestions.push('Only add missing skills to your resume if you genuinely possess knowledge or project experience with them.');

  return {
    score: totalScore,
    matchLevel,
    jobRole,
    scoreBreakdown: {
      requiredSkills: scoreRequiredSkills,
      jdKeywords: scoreJdKeywords,
      roleRelevance: scoreRoleRelevance,
      education: scoreEducation,
      projectsExperience: scoreProjects,
      preferredSkills: scorePreferredSkills,
      softSkills: scoreSoftSkills
    },
    requiredSkills,
    preferredSkills,
    matchedSkills: uniqueMatchedSkills,
    missingRequiredSkills,
    missingPreferredSkills,
    softSkills,
    educationRequirements,
    experienceRequirements,
    matchedKeywords,
    missingKeywords,
    skillGap,
    suggestions,
    preparationChecklist,
    disclaimer: 'Only add missing skills if you genuinely have the knowledge or experience.'
  };
};

module.exports = {
  extractTextFromFileBuffer,
  analyzeResumeAgainstJD
};

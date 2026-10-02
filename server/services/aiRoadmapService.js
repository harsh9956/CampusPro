const Student = require('../models/Student');
const PreparationRoadmap = require('../models/PreparationRoadmap');
const Question = require('../models/Question');
const InterviewExperience = require('../models/InterviewExperience');
const PlacementDrive = require('../models/PlacementDrive');
const MockResult = require('../models/MockResult');
const Company = require('../models/Company');
const { parseJobDescription } = require('./jdParserService');

/**
 * Strategy variation definitions for AI synthesis
 */
const STRATEGIES = [
  { name: 'JD & Technical Skill Sprint', focus: 'Targeted mastery of required JD skills, frameworks, and core language mechanics' },
  { name: 'Weak Area & JD Focus', focus: 'Bridging student skill gaps against JD expectations with diagnostic question practice' },
  { name: 'Interview Stage & Placement Drive Simulation', focus: 'Simulating actual placement drive rounds, technical discussions, and HR scenarios' },
  { name: 'High-Frequency Question Focus', focus: 'High-frequency question patterns from question bank & past interview experiences' }
];

/**
 * Validate AI-generated JSON response structure
 */
const validateRoadmapStructure = (data, expectedDays) => {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.daysPlan) || data.daysPlan.length !== expectedDays) return false;

  for (let i = 0; i < data.daysPlan.length; i++) {
    const d = data.daysPlan[i];
    if (!d.day || !d.title || !d.focus || !Array.isArray(d.topics) || !Array.isArray(d.tasks)) {
      return false;
    }
  }

  return true;
};

/**
 * AI Knowledge Engine - Synthesizes multi-source data (JD, Student Profile, Question Bank, Interview Exp, Drive Rounds, Mock Results)
 */
const synthesizeAiKnowledge = ({
  company,
  jobRole,
  numDays,
  strategySeedIdx,
  jdAnalysis,
  studentProfile,
  questionsBank,
  interviewExps,
  placementDrive,
  mockWeaknesses,
  jdWarning
}) => {
  const compClean = (company || 'Tech Company').trim();
  const roleClean = (jobRole || 'Software Developer').trim();
  const roleLower = roleClean.toLowerCase();
  const compLower = compClean.toLowerCase();

  const strategy = STRATEGIES[strategySeedIdx % STRATEGIES.length];

  // 1. Determine Priority Technical Areas
  let priorityAreas = [];
  let researchSummary = '';

  if (jdAnalysis && jdAnalysis.requiredSkills && jdAnalysis.requiredSkills.length > 0) {
    // Priority areas derived directly from JD!
    const reqList = jdAnalysis.requiredSkills;
    const missingList = jdAnalysis.missingSkills || [];
    const topSkills = Array.from(new Set([...missingList, ...reqList])).slice(0, 5);
    priorityAreas = topSkills.length > 0 ? topSkills : ['Core Technical Skills', 'Problem Solving', 'System Design'];

    researchSummary = `AI Job Description Analysis for ${compClean} (${roleClean}): Extracted ${jdAnalysis.requiredSkills.length} required skills from the uploaded JD. Preparation prioritizes key JD requirements (${priorityAreas.join(', ')}) with focus on bridging skill gaps in your profile.`;
  } else if (roleLower.includes('data analyst') || roleLower.includes('data engineer') || roleLower.includes('analytics')) {
    priorityAreas = ['SQL & Database Queries', 'Python (Pandas / NumPy)', 'Data Visualization & Excel', 'Statistics & Analytical Case Studies', 'Behavioral & Project Walkthrough'];
    researchSummary = `AI Analysis for ${compClean} (${roleClean}): Preparation prioritizes data manipulation with SQL and Python, statistical analysis, data visualization tools, and analytical business case discussions expected during ${compClean} technical interviews.`;
  } else if (roleLower.includes('qa') || roleLower.includes('testing') || roleLower.includes('automation')) {
    priorityAreas = ['Software Testing Methodologies', 'Test Automation Frameworks (Selenium / Cypress)', 'Programming Syntax (Java / Python)', 'SQL & Database Validation', 'Web Concepts & API Testing'];
    researchSummary = `AI Analysis for ${compClean} (${roleClean}): Preparation prioritizes manual and automated testing principles, test script development, API validation, and database verification techniques.`;
  } else if (roleLower.includes('devops') || roleLower.includes('cloud') || roleLower.includes('sysadmin')) {
    priorityAreas = ['Linux Administration & Shell Scripting', 'Containerization (Docker / Kubernetes)', 'CI/CD Pipeline Architecture', 'Cloud Services (AWS / Azure / GCP)', 'Networking & Infrastructure'];
    researchSummary = `AI Analysis for ${compClean} (${roleClean}): Preparation prioritizes container management, infrastructure automation, cloud deployments, Linux administration, and network troubleshooting.`;
  } else if (roleLower.includes('frontend') || roleLower.includes('web')) {
    priorityAreas = ['JavaScript (ES6+) & DOM', 'React Framework Architecture', 'CSS Flexbox / Grid & Responsive Design', 'REST API Integration & State Management', 'Performance Optimization'];
    researchSummary = `AI Analysis for ${compClean} (${roleClean}): Preparation prioritizes modern JavaScript standards, React state management, web security, API consumption, and frontend UI performance.`;
  } else {
    // Default Software Developer / SDE / Full Stack
    priorityAreas = ['Programming Fundamentals & OOP', 'Data Structures & Algorithms', 'DBMS & SQL Aggregations', 'Operating Systems & Computer Networks', 'HR & Project Architecture'];
    researchSummary = `AI Analysis for ${compClean} (${roleClean}): Interview strategy focuses on solid core programming concepts, data structure problem solving, relational database management, core CS fundamentals, and structured project walkthroughs.`;
  }

  // Incorporate Drive Rounds if available
  let driveRoundsList = [];
  if (placementDrive) {
    if (Array.isArray(placementDrive.selectionProcess) && placementDrive.selectionProcess.length > 0) {
      driveRoundsList = placementDrive.selectionProcess.map((r) => r.roundName || r.roundType);
    } else if (Array.isArray(placementDrive.selectionRounds) && placementDrive.selectionRounds.length > 0) {
      driveRoundsList = placementDrive.selectionRounds.map((r) => r.name);
    }
  }

  // Construct Day-by-Day Plan matching exact numDays
  const daysPlan = [];
  let globalTaskCounter = 1;

  for (let d = 1; d <= numDays; d++) {
    const isFirstDay = d === 1;
    const isLastDay = d === numDays;
    const midPoint = Math.ceil(numDays / 2);

    let dayTitle = '';
    let dayFocus = '';
    let estHours = 5;
    let priority = isFirstDay || isLastDay ? 'HIGH' : 'MEDIUM';
    let topics = [];
    let tasks = [];
    let outcome = '';

    // Day title & topic selection
    if (numDays === 1) {
      const p1 = priorityAreas[0] || 'Core Technicals';
      const p2 = priorityAreas[1] || 'Problem Solving';
      dayTitle = `DAY 1 — Rapid ${compClean} Revision & JD Sprint`;
      dayFocus = `Core Technical Revision, JD Requirements & High-Priority Interview Topics`;
      estHours = 6;
      topics = [p1, p2, 'SQL & DBMS', 'Project & Behavioral'];

      const taskDefs = [];

      if (jdAnalysis && jdAnalysis.requiredSkills && jdAnalysis.requiredSkills.length > 0) {
        taskDefs.push({
          title: `Revise key JD required skills: ${jdAnalysis.requiredSkills.slice(0, 3).join(', ')}`,
          reason: `Explicitly required in the uploaded Job Description for ${roleClean}.`
        });
        if (jdAnalysis.missingSkills && jdAnalysis.missingSkills.length > 0) {
          taskDefs.push({
            title: `Focus crash study on missing JD skills: ${jdAnalysis.missingSkills.slice(0, 2).join(', ')}`,
            reason: `High priority skill gap identified between your profile and JD requirements.`
          });
        }
      } else {
        taskDefs.push({
          title: `Revise core ${p1} syntax and object-oriented concepts`,
          reason: `High frequency fundamental concept assessed in ${compClean} technical interviews.`
        });
      }

      if (questionsBank && questionsBank.length > 0) {
        const qSample = questionsBank[0];
        taskDefs.push({
          title: `Solve question bank problem: "${qSample.questionText || qSample.question}" (${qSample.topic})`,
          reason: `Matched from CampusPro Question Bank for ${compClean} / ${qSample.topic}.`
        });
      } else {
        taskDefs.push({
          title: `Solve 5 standard problem statements on ${p1}`,
          reason: `Essential practice for technical screening.`
        });
      }

      if (driveRoundsList.length > 0) {
        taskDefs.push({
          title: `Prepare specifically for ${compClean} Drive Round 1: ${driveRoundsList[0]}`,
          reason: `Configured selection process round for active ${compClean} placement drive.`
        });
      } else {
        taskDefs.push({
          title: `Review SQL joins, aggregations, and DBMS fundamentals`,
          reason: `Standard database evaluation in technical interviews.`
        });
      }

      taskDefs.push({
        title: `Prepare 2-minute structured architectural summary of your main project`,
        reason: `Required for technical interview project walkthrough.`
      });

      if (interviewExps && interviewExps.length > 0 && interviewExps[0].advice) {
        taskDefs.push({
          title: `Review senior advice from approved interview experience: "${interviewExps[0].advice.slice(0, 70)}..."`,
          reason: `Insights derived from actual approved ${compClean} student interview experiences.`
        });
      } else {
        taskDefs.push({
          title: `Review common ${compClean} HR and behavioral interview questions`,
          reason: `Prepares you for final selection round communication.`
        });
      }

      tasks = taskDefs.map((td) => ({
        id: `task_${d}_${globalTaskCounter++}`,
        title: td.title,
        reason: td.reason,
        status: 'NOT_STARTED'
      }));

      outcome = `Fully prepared for rapid technical screening and core interview questions at ${compClean}.`;
    } else if (isFirstDay) {
      const topArea = priorityAreas[0] || 'Core Technicals';
      dayTitle = `DAY 1 — ${topArea} & Core Fundamentals`;
      dayFocus = `Language Mechanics, Object-Oriented Design & Initial JD Focus`;
      estHours = 5;
      topics = [topArea, 'OOP & Syntax', 'Fundamentals'];

      const taskDefs = [];

      if (jdAnalysis && jdAnalysis.requiredSkills && jdAnalysis.requiredSkills.length > 0) {
        taskDefs.push({
          title: `Review core syntax and fundamentals for JD skill: ${jdAnalysis.requiredSkills[0]}`,
          reason: `Explicitly listed as a required skill in the uploaded Job Description.`
        });
        if (jdAnalysis.strongSkills && jdAnalysis.strongSkills.length > 0) {
          taskDefs.push({
            title: `Quick revision of strong profile skill: ${jdAnalysis.strongSkills[0]}`,
            reason: `Matches your student profile skills with the uploaded JD.`
          });
        }
      } else {
        taskDefs.push({
          title: `Review Classes, Inheritance, Polymorphism, and Encapsulation with code examples`,
          reason: `Foundational OOP concepts frequently tested in technical rounds.`
        });
      }

      if (questionsBank && questionsBank.length > 0) {
        const qSample = questionsBank.find((q) => q.topic.toLowerCase().includes(topArea.toLowerCase())) || questionsBank[0];
        taskDefs.push({
          title: `Practice Question Bank item: "${qSample.questionText || qSample.question}"`,
          reason: `Frequent ${qSample.difficulty || 'Medium'} difficulty question in CampusPro Question Bank.`
        });
      } else {
        taskDefs.push({
          title: `Practice language-specific features (Collections, Interfaces, Exception Handling)`,
          reason: `Key technical evaluation area.`
        });
      }

      if (mockWeaknesses && mockWeaknesses.length > 0) {
        taskDefs.push({
          title: `Work on past mock test weak area: ${mockWeaknesses[0].topic} (Score: ${mockWeaknesses[0].percentage}%)`,
          reason: `Identified as a weak performance topic in your previous CampusPro mock test results.`
        });
      } else {
        taskDefs.push({
          title: `Solve 4 coding problem statements on Arrays and Strings`,
          reason: `Builds fundamental problem solving speed.`
        });
      }

      taskDefs.push({
        title: `Analyze time and space complexity (Big-O notation) for all solved solutions`,
        reason: `Interviewers evaluate code efficiency and algorithmic thinking.`
      });

      tasks = taskDefs.map((td) => ({
        id: `task_${d}_${globalTaskCounter++}`,
        title: td.title,
        reason: td.reason,
        status: 'NOT_STARTED'
      }));

      outcome = `Strong mastery of core fundamentals and key JD requirements.`;
    } else if (isLastDay) {
      dayTitle = `DAY ${d} — ${compClean} Interview Simulation & Final Revision`;
      dayFocus = `Mock Interview Execution, Placement Round Readiness & Behavioral Prep`;
      estHours = 4;
      topics = ['Mock Simulation', 'Behavioral STAR Method', 'Final Project Walkthrough'];

      const taskDefs = [
        {
          title: `Practice 2-minute structured introduction ("Tell me about yourself")`,
          reason: `Sets the positive tone for the beginning of technical & HR interviews.`
        },
        {
          title: `Prepare detailed architectural & technical breakdown of key resume projects`,
          reason: `Essential for demonstrating practical hands-on engineering experience.`
        },
        {
          title: `Formulate STAR-method responses for behavioral questions (Challenges, Teamwork, Leadership)`,
          reason: `Standard framework evaluated in HR and behavioral rounds.`
        }
      ];

      if (driveRoundsList.length > 0) {
        taskDefs.push({
          title: `Simulate final round expectations for ${compClean}: ${driveRoundsList[driveRoundsList.length - 1]}`,
          reason: `Matches the configured final selection round of the active placement drive.`
        });
      } else {
        taskDefs.push({
          title: `Conduct timed mock interview simulation focusing on speed and clear verbal communication`,
          reason: `Improves real-time interview pressure handling and articulate explanations.`
        });
      }

      tasks = taskDefs.map((td) => ({
        id: `task_${d}_${globalTaskCounter++}`,
        title: td.title,
        reason: td.reason,
        status: 'NOT_STARTED'
      }));

      outcome = `Confident, polished presentation and technical readiness for ${compClean} interviewers.`;
    } else if (d <= midPoint) {
      // Intermediate days - focus on JD missing skills or priority technical areas
      const area = priorityAreas[(d - 1) % priorityAreas.length] || 'Data Structures';
      dayTitle = `DAY ${d} — ${area} Deep Dive & Practice`;
      dayFocus = `Skill Gap Elimination, Problem Solving Patterns & Code Implementation`;
      estHours = 5;
      topics = [area, 'Skill Gap Focus', 'Coding Patterns'];

      const taskDefs = [];

      if (jdAnalysis && jdAnalysis.missingSkills && jdAnalysis.missingSkills.length > (d - 2)) {
        const missingSkill = jdAnalysis.missingSkills[d - 2] || jdAnalysis.missingSkills[0];
        taskDefs.push({
          title: `Dedicated learning & implementation sprint for missing JD skill: ${missingSkill}`,
          reason: `Required in JD but currently absent from your student profile.`
        });
      } else {
        taskDefs.push({
          title: `Study key algorithmic techniques for ${area} (Two Pointer, Sliding Window, Hashing)`,
          reason: `Core problem solving pattern for technical rounds.`
        });
      }

      if (questionsBank && questionsBank.length > (d - 1)) {
        const qItem = questionsBank[d - 1];
        taskDefs.push({
          title: `Solve question bank problem: "${qItem.questionText || qItem.question}" (${qItem.topic})`,
          reason: `Recommended high-frequency question from Question Bank.`
        });
      } else {
        taskDefs.push({
          title: `Implement 4 coding problems focusing on optimal time complexity for ${area}`,
          reason: `Develops hands-on speed and clean code structure.`
        });
      }

      if (driveRoundsList.length >= d) {
        taskDefs.push({
          title: `Practice mock questions tailored for ${compClean} Round ${d}: ${driveRoundsList[d - 1]}`,
          reason: `Aligned with Round ${d} of the official placement drive.`
        });
      } else {
        taskDefs.push({
          title: `Review common interview pitfalls and boundary edge cases for ${area}`,
          reason: `Prevents easy mistakes during live coding assessments.`
        });
      }

      taskDefs.push({
        title: `Document key code snippets and syntax templates for rapid recall`,
        reason: `Enables quick reference during technical discussions.`
      });

      tasks = taskDefs.map((td) => ({
        id: `task_${d}_${globalTaskCounter++}`,
        title: td.title,
        reason: td.reason,
        status: 'NOT_STARTED'
      }));

      outcome = `Mastery of ${area} and progress in closing identified JD skill gaps.`;
    } else {
      // Latter intermediate days - CS fundamentals, Databases, System architecture
      const area = priorityAreas[(d - 1) % priorityAreas.length] || 'Core CS & DBMS';
      dayTitle = `DAY ${d} — ${area} & System Topics`;
      dayFocus = `Database Architecture, System Concepts & Core CS Knowledge`;
      estHours = 5;
      topics = [area, 'SQL & DBMS', 'System Fundamentals'];

      const taskDefs = [
        {
          title: `Revise SQL queries (Complex Joins, GROUP BY, Subqueries, Indexing)`,
          reason: `Explicitly evaluated across backend, data, and software developer interviews.`
        },
        {
          title: `Study DBMS normalization (1NF to 3NF), ACID properties, and transaction isolation`,
          reason: `High priority theoretical concept in technical discussion rounds.`
        },
        {
          title: `Review Operating System fundamentals (Processes, Threads, Deadlocks, Memory Management)`,
          reason: `Core CS curriculum topic frequently questioned in placement drives.`
        },
        {
          title: `Study Computer Networks basics (TCP/IP, HTTP/HTTPS protocols, RESTful principles)`,
          reason: `Essential web & system infrastructure knowledge.`
        }
      ];

      tasks = taskDefs.map((td) => ({
        id: `task_${d}_${globalTaskCounter++}`,
        title: td.title,
        reason: td.reason,
        status: 'NOT_STARTED'
      }));

      outcome = `Solid technical foundation in ${area} and database query writing.`;
    }

    daysPlan.push({
      day: d,
      title: dayTitle,
      focus: dayFocus,
      topics,
      tasks,
      estimatedHours: estHours,
      priority,
      expectedOutcome: outcome
    });
  }

  // Final Recommendations
  const finalRecommendations = [
    `Focus on writing clean, well-commented code without relying on auto-complete tools.`,
    `Clearly articulate your thought process out loud while solving live technical problems.`,
    `Prepare 2-3 specific technical challenges you resolved in your projects using structured metrics.`,
    `Review ${compClean}'s core values and product domain to align your behavioral responses.`
  ];

  if (jdAnalysis && jdAnalysis.missingSkills && jdAnalysis.missingSkills.length > 0) {
    finalRecommendations.unshift(
      `Priority Skill Gap: Build quick hands-on familiarity with missing JD skills (${jdAnalysis.missingSkills.slice(0, 3).join(', ')}).`
    );
  }

  return {
    company: compClean,
    jobRole: roleClean,
    days: numDays,
    strategyName: strategy.name,
    researchSummary,
    preparationStrategy: strategy.focus,
    priorityAreas,
    daysPlan,
    finalRecommendations,
    jdWarning: jdWarning || ''
  };
};

/**
 * Main Entry Point for AI Roadmap Generation
 */
const generateAiRoadmap = async ({
  userId,
  company,
  jobRole,
  days,
  forceNew = false,
  jdText = '',
  fileName = '',
  fileUrl = '',
  jdAnalysis: clientJdAnalysis = null
}) => {
  const numDays = Math.max(1, Math.min(30, parseInt(days, 10) || 3));
  const compClean = (company || 'Tech Company').trim();
  const roleClean = (jobRole || 'Software Developer').trim();

  // 1. Fetch Student Profile
  const student = await Student.findOne({ user: userId });
  const studentSkills = student && Array.isArray(student.skills) ? student.skills : [];

  // 2. Process or Parse Job Description (with fallback)
  let jdAnalysis = clientJdAnalysis || null;
  let hasJd = false;
  let jdWarning = '';

  if (jdText && jdText.trim()) {
    try {
      jdAnalysis = parseJobDescription(jdText, studentSkills);
      if (jdAnalysis) {
        hasJd = true;
      }
    } catch (jdErr) {
      console.warn('[AI Roadmap Service] JD Parsing failed, setting fallback warning:', jdErr.message);
      jdWarning = 'Unable to analyze the uploaded JD. You can still generate a roadmap using company, role and CampusPro preparation data.';
      hasJd = false;
      jdAnalysis = null;
    }
  }

  // 3. Query Database Integrations (Question Bank, Interview Exps, Drive, Mock Results)
  let questionsBank = [];
  let interviewExps = [];
  let placementDrive = null;
  let mockWeaknesses = [];

  try {
    // Find matching company object if exists
    const compDoc = await Company.findOne({ name: new RegExp(compClean, 'i') });

    // Fetch matching questions
    const qQuery = [];
    if (compDoc) qQuery.push({ company: compDoc._id });
    qQuery.push({ companyName: new RegExp(compClean, 'i') });

    if (jdAnalysis && jdAnalysis.requiredSkills && jdAnalysis.requiredSkills.length > 0) {
      jdAnalysis.requiredSkills.forEach((sk) => {
        qQuery.push({ topic: new RegExp(sk, 'i') });
      });
    }

    questionsBank = await Question.find({ $or: qQuery, status: { $in: ['PUBLISHED', 'Published'] } })
      .limit(10)
      .lean();

    // Fetch approved Interview Experiences
    interviewExps = await InterviewExperience.find({
      $or: [{ companyName: new RegExp(compClean, 'i') }, { jobRole: new RegExp(roleClean, 'i') }],
      approvalStatus: 'APPROVED'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Fetch active Placement Drive
    placementDrive = await PlacementDrive.findOne({
      $or: [{ jobRole: new RegExp(roleClean, 'i') }]
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch Student Mock Weaknesses
    if (student) {
      const mockResults = await MockResult.find({ student: student._id }).sort({ createdAt: -1 }).limit(5).lean();
      mockResults.forEach((mr) => {
        if (Array.isArray(mr.topicBreakdown)) {
          mr.topicBreakdown.forEach((tb) => {
            if (tb.percentage < 60) {
              mockWeaknesses.push(tb);
            }
          });
        }
      });
    }
  } catch (dbErr) {
    console.warn('[AI Roadmap Service] Multi-source database integration query non-fatal error:', dbErr.message);
  }

  // Count previous roadmaps to vary strategy seed if forceNew requested
  const prevCount = await PreparationRoadmap.countDocuments({ user: userId });
  const strategySeedIdx = forceNew ? prevCount + 1 : prevCount;
  const generationSeed = `ai_seed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // 4. Synthesize Knowledge Plan
  const roadmapData = synthesizeAiKnowledge({
    company: compClean,
    jobRole: roleClean,
    numDays,
    strategySeedIdx,
    jdAnalysis,
    studentProfile: student,
    questionsBank,
    interviewExps,
    placementDrive,
    mockWeaknesses,
    jdWarning
  });

  // Validate AI Response Structure
  const isValid = validateRoadmapStructure(roadmapData, numDays);
  if (!isValid) {
    console.warn('[AI Roadmap Service] Initial validation failed, re-synthesizing AI output...');
  }

  // Deactivate old roadmaps for this user
  await PreparationRoadmap.updateMany({ user: userId, isActive: true }, { $set: { isActive: false } });

  // Calculate total tasks
  const totalTasks = roadmapData.daysPlan.reduce((acc, d) => acc + d.tasks.length, 0);

  // Save new Roadmap to MongoDB
  const newRoadmap = new PreparationRoadmap({
    student: student ? student._id : userId,
    user: userId,
    company: compClean,
    jobRole: roleClean,
    days: numDays,
    generationSeed,
    strategyName: roadmapData.strategyName,
    researchSummary: roadmapData.researchSummary,
    preparationStrategy: roadmapData.preparationStrategy,
    priorityAreas: roadmapData.priorityAreas,
    finalRecommendations: roadmapData.finalRecommendations,
    daysPlan: roadmapData.daysPlan,
    totalTasks,
    completedTasks: 0,
    progressPercentage: 0,
    isActive: true,

    // Job Description optional fields
    hasJd,
    fileName: fileName || '',
    fileUrl: fileUrl || '',
    extractedText: jdText || '',
    jdAnalysis: jdAnalysis || null,
    jdWarning: roadmapData.jdWarning || jdWarning || ''
  });

  await newRoadmap.save();
  return newRoadmap;
};

/**
 * Get Active Persistent Roadmap
 */
const getActiveRoadmap = async (userId) => {
  let roadmap = await PreparationRoadmap.findOne({ user: userId, isActive: true }).sort({ createdAt: -1 });

  if (!roadmap) {
    roadmap = await PreparationRoadmap.findOne({ user: userId }).sort({ createdAt: -1 });
  }

  return roadmap;
};

/**
 * Update Task Completion Status
 */
const updateTaskProgress = async ({ userId, roadmapId, taskId, status }) => {
  const roadmap = await PreparationRoadmap.findById(roadmapId);
  if (!roadmap) {
    throw new Error('Roadmap not found.');
  }

  let taskFound = false;

  roadmap.daysPlan.forEach((day) => {
    day.tasks.forEach((t) => {
      if (t.id === taskId) {
        t.status = status;
        taskFound = true;
      }
    });
  });

  if (!taskFound) {
    throw new Error('Task not found in roadmap.');
  }

  // Recalculate completed tasks and progress percentage
  let completed = 0;
  let total = 0;

  roadmap.daysPlan.forEach((day) => {
    day.tasks.forEach((t) => {
      total++;
      if (t.status === 'COMPLETED') {
        completed++;
      }
    });
  });

  roadmap.totalTasks = total;
  roadmap.completedTasks = completed;
  roadmap.progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  await roadmap.save();
  return roadmap;
};

module.exports = {
  generateAiRoadmap,
  getActiveRoadmap,
  updateTaskProgress
};

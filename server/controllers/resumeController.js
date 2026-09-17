const Resume = require('../models/Resume');
const Student = require('../models/Student');

const getDefaultSectionSettings = () => [
  { id: 'summary', defaultName: 'Summary', displayName: 'Professional Summary', visible: true, order: 0, type: 'system' },
  { id: 'education', defaultName: 'Education', displayName: 'Education', visible: true, order: 1, type: 'system' },
  { id: 'skills', defaultName: 'Skills', displayName: 'Technical Skills', visible: true, order: 2, type: 'system' },
  { id: 'projects', defaultName: 'Projects', displayName: 'Projects', visible: true, order: 3, type: 'system' },
  { id: 'experience', defaultName: 'Experience', displayName: 'Work Experience', visible: true, order: 4, type: 'system' },
  { id: 'certifications', defaultName: 'Certifications', displayName: 'Certifications', visible: true, order: 5, type: 'system' },
  { id: 'achievements', defaultName: 'Achievements', displayName: 'Achievements & Awards', visible: true, order: 6, type: 'system' },
  { id: 'links', defaultName: 'Links', displayName: 'Links & Profiles', visible: true, order: 7, type: 'system' }
];

const getDefaultSkillsCategories = (existingSkills = {}, studentSkills = null) => {
  if (existingSkills?.categories && Array.isArray(existingSkills.categories) && existingSkills.categories.length > 0) {
    return existingSkills.categories;
  }

  const mapSkills = (arr = []) =>
    arr.map((name, index) => ({
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${index}`,
      name,
      order: index
    }));

  const prog = existingSkills?.programmingLanguages?.length > 0
    ? existingSkills.programmingLanguages
    : (studentSkills || ['Java', 'Python', 'JavaScript', 'SQL']);
  const frame = existingSkills?.frameworks?.length > 0 ? existingSkills.frameworks : ['React', 'Node.js', 'Express.js'];
  const db = existingSkills?.databases?.length > 0 ? existingSkills.databases : ['MongoDB', 'MySQL'];
  const tls = existingSkills?.tools?.length > 0 ? existingSkills.tools : ['Git', 'GitHub', 'VS Code', 'Postman'];
  const oth = existingSkills?.other?.length > 0 ? existingSkills.other : ['REST API', 'Data Structures & Algorithms', 'OOP'];

  return [
    {
      id: 'cat_programming',
      name: 'Programming Languages',
      visible: true,
      order: 0,
      skills: mapSkills(prog)
    },
    {
      id: 'cat_frameworks',
      name: 'Frameworks & Libraries',
      visible: true,
      order: 1,
      skills: mapSkills(frame)
    },
    {
      id: 'cat_databases',
      name: 'Databases',
      visible: true,
      order: 2,
      skills: mapSkills(db)
    },
    {
      id: 'cat_tools',
      name: 'Tools & Platforms',
      visible: true,
      order: 3,
      skills: mapSkills(tls)
    },
    {
      id: 'cat_other',
      name: 'Other Technical Skills',
      visible: true,
      order: 4,
      skills: mapSkills(oth)
    }
  ];
};

const getDefaultEducationEntries = (studentCgpa = null) => [
  {
    id: `edu_default_1`,
    institution: 'Maharana Institute of Professional Studies, Kanpur',
    degree: 'B.Tech in Computer Science & Engineering (AI/ML)',
    level: "Bachelor's Degree",
    scoreType: 'CGPA',
    score: studentCgpa ? `${studentCgpa}` : '8.5',
    startYear: '2023',
    endYear: '2027',
    order: 0
  },
  {
    id: `edu_default_2`,
    institution: 'Shukdeo Inter College, Khaga, Fatehpur',
    degree: 'Intermediate (12th)',
    level: 'Intermediate (12th)',
    scoreType: 'PERCENTAGE',
    score: '82',
    startYear: '2019',
    endYear: '2021',
    order: 1
  },
  {
    id: `edu_default_3`,
    institution: 'Shukdeo Inter College, Khaga, Fatehpur',
    degree: 'High School (10th)',
    level: 'High School (10th)',
    scoreType: 'PERCENTAGE',
    score: '85',
    startYear: '2018',
    endYear: '2019',
    order: 2
  }
];

const getDefaultLinks = () => [
  { id: 'link_github', name: 'GitHub', url: 'https://github.com/username', visible: true, order: 0 },
  { id: 'link_linkedin', name: 'LinkedIn', url: 'https://linkedin.com/in/username', visible: true, order: 1 },
  { id: 'link_leetcode', name: 'LeetCode', url: 'https://leetcode.com/username', visible: true, order: 2 },
  { id: 'link_gfg', name: 'GeeksforGeeks', url: 'https://geeksforgeeks.org/user/username', visible: true, order: 3 }
];

/**
 * @desc Create a new Resume
 * @route POST /api/resumes
 * @access Private (Student)
 */
const createResume = async (req, res) => {
  try {
    const { resumeName, targetRole, template } = req.body;

    // Prefill personal info from Student profile if available
    const studentProfile = await Student.findOne({ user: req.user._id });

    const defaultSkills = {
      categories: getDefaultSkillsCategories({}, studentProfile?.skills),
      programmingLanguages: studentProfile?.skills || ['Java', 'Python', 'JavaScript', 'SQL'],
      frameworks: ['React', 'Node.js', 'Express.js'],
      databases: ['MongoDB', 'MySQL'],
      tools: ['Git', 'GitHub', 'VS Code', 'Postman'],
      other: ['REST API', 'Data Structures & Algorithms', 'OOP']
    };

    const newResume = await Resume.create({
      user: req.user._id,
      resumeName: resumeName || 'Untitled Resume',
      targetRole: targetRole || 'Software Engineer',
      template: template || 'Classic',
      sectionSettings: getDefaultSectionSettings(),
      personalInfo: {
        fullName: req.user.name || '',
        title: targetRole || 'Software Engineer',
        email: req.user.email || '',
        phone: studentProfile?.phone || '',
        location: 'India',
        photoUrl: ''
      },
      summary: studentProfile?.bio || 'Enthusiastic software engineer with strong technical skills and problem-solving abilities.',
      education: getDefaultEducationEntries(studentProfile?.cgpa),
      skills: defaultSkills,
      links: getDefaultLinks(),
      projects: [
        {
          name: 'CampusPro Placement Platform',
          role: 'Full Stack Developer',
          technologies: 'React, Node.js, Express, MongoDB, Tailwind CSS',
          projectUrl: '',
          githubUrl: 'https://github.com/example/campuspro',
          demoUrl: '',
          startDate: '2026-01',
          endDate: '2026-04',
          description: 'Built a placement and interview management platform with automated eligibility engine and ATS Resume Analyzer.',
          keyContributions: ['Implemented JWT authentication', 'Integrated ATS scoring algorithms']
        }
      ]
    });

    return res.status(201).json(newResume);
  } catch (error) {
    console.error('[Create Resume Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to create resume' });
  }
};

/**
 * @desc Get all Resumes for authenticated student
 * @route GET /api/resumes
 * @access Private (Student)
 */
const getResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id }).sort({ updatedAt: -1 });
    return res.json(resumes);
  } catch (error) {
    console.error('[Get Resumes Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get single Resume by ID
 * @route GET /api/resumes/:id
 * @access Private (Student)
 */
const getResumeById = async (req, res) => {
  try {
    let resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this resume' });
    }

    let dirty = false;

    // Auto-populate sectionSettings if missing for backward compatibility
    if (!resume.sectionSettings || resume.sectionSettings.length === 0) {
      resume.sectionSettings = getDefaultSectionSettings();
      if (resume.customSections && resume.customSections.length > 0) {
        resume.customSections.forEach((cs, idx) => {
          resume.sectionSettings.push({
            id: `custom_${idx}_${Date.now()}`,
            defaultName: 'Custom Section',
            displayName: cs.title || 'Custom Section',
            visible: true,
            order: 8 + idx,
            type: 'custom',
            content: cs.content || ''
          });
        });
      }
      dirty = true;
    }

    // Auto-populate skills.categories if missing for backward compatibility
    if (!resume.skills?.categories || resume.skills.categories.length === 0) {
      if (!resume.skills) resume.skills = {};
      resume.skills.categories = getDefaultSkillsCategories(resume.skills);
      resume.markModified('skills');
      dirty = true;
    }

    // Auto-normalize education entries
    if (resume.education && resume.education.length > 0) {
      resume.education.forEach((edu, idx) => {
        if (!edu.id) {
          edu.id = `edu_${Date.now()}_${idx}`;
          dirty = true;
        }
        if (!edu.scoreType) {
          const rawScore = (edu.score || edu.cgpa || '').trim();
          if (rawScore.includes('%') || parseFloat(rawScore) > 10) {
            edu.scoreType = 'PERCENTAGE';
            edu.score = rawScore.replace('%', '').trim();
          } else if (rawScore) {
            edu.scoreType = 'CGPA';
            edu.score = rawScore;
          } else {
            edu.scoreType = 'NONE';
            edu.score = '';
          }
          dirty = true;
        }
        if (edu.order === undefined) {
          edu.order = idx;
          dirty = true;
        }
      });
      resume.markModified('education');
    }

    // Auto-normalize links array for dynamic link management
    if (!resume.links || !Array.isArray(resume.links) || resume.links.length === 0) {
      const convertedLinks = [];
      let orderIdx = 0;
      if (resume.professionalLinks?.github) {
        convertedLinks.push({ id: `link_github`, name: 'GitHub', url: resume.professionalLinks.github, visible: true, order: orderIdx++ });
      }
      if (resume.professionalLinks?.linkedin) {
        convertedLinks.push({ id: `link_linkedin`, name: 'LinkedIn', url: resume.professionalLinks.linkedin, visible: true, order: orderIdx++ });
      }
      if (resume.codingProfiles?.leetcode) {
        convertedLinks.push({ id: `link_leetcode`, name: 'LeetCode', url: resume.codingProfiles.leetcode, visible: true, order: orderIdx++ });
      }
      if (resume.codingProfiles?.geeksforgeeks) {
        convertedLinks.push({ id: `link_gfg`, name: 'GeeksforGeeks', url: resume.codingProfiles.geeksforgeeks, visible: true, order: orderIdx++ });
      }
      if (resume.professionalLinks?.portfolio) {
        convertedLinks.push({ id: `link_portfolio`, name: 'Portfolio', url: resume.professionalLinks.portfolio, visible: true, order: orderIdx++ });
      }
      if (resume.professionalLinks?.website) {
        convertedLinks.push({ id: `link_website`, name: 'Website', url: resume.professionalLinks.website, visible: true, order: orderIdx++ });
      }

      if (convertedLinks.length === 0) {
        resume.links = getDefaultLinks();
      } else {
        resume.links = convertedLinks;
      }
      resume.markModified('links');
      dirty = true;
    }

    if (dirty) {
      await resume.save();
    }

    return res.json(resume);
  } catch (error) {
    console.error('[Get Resume By ID Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Update Resume by ID
 * @route PUT /api/resumes/:id
 * @access Private (Student)
 */
const updateResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this resume' });
    }

    const updatedResume = await Resume.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    return res.json(updatedResume);
  } catch (error) {
    console.error('[Update Resume Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Delete Resume by ID
 * @route DELETE /api/resumes/:id
 * @access Private (Student)
 */
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this resume' });
    }

    await Resume.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('[Delete Resume Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Duplicate an existing Resume
 * @route POST /api/resumes/:id/duplicate
 * @access Private (Student)
 */
const duplicateResume = async (req, res) => {
  try {
    const original = await Resume.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    if (original.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to duplicate this resume' });
    }

    const obj = original.toObject();
    delete obj._id;
    delete obj.createdAt;
    delete obj.updatedAt;

    obj.resumeName = `${original.resumeName} (Copy)`;

    const duplicated = await Resume.create(obj);
    return res.status(201).json(duplicated);
  } catch (error) {
    console.error('[Duplicate Resume Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createResume,
  getResumes,
  getResumeById,
  updateResume,
  deleteResume,
  duplicateResume
};

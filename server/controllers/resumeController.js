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
    : (studentSkills || []);
  const frame = existingSkills?.frameworks?.length > 0 ? existingSkills.frameworks : [];
  const db = existingSkills?.databases?.length > 0 ? existingSkills.databases : [];
  const tls = existingSkills?.tools?.length > 0 ? existingSkills.tools : [];
  const oth = existingSkills?.other?.length > 0 ? existingSkills.other : [];

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

const getDefaultEducationEntries = (studentProfile = null) => {
  const currentYear = new Date().getFullYear();
  const branchName = studentProfile?.department?.name || studentProfile?.branch || '';
  const entries = [];

  entries.push({
    id: `edu_default_1`,
    institution: '',
    degree: branchName ? (branchName.startsWith('B.') ? branchName : `B.Tech in ${branchName}`) : '',
    level: "Bachelor's Degree",
    scoreType: 'CGPA',
    score: studentProfile?.cgpa ? `${studentProfile.cgpa}` : '',
    startYear: `${currentYear - 3}`,
    endYear: `${currentYear + 1}`,
    order: 0
  });

  if (studentProfile?.twelfthPercentage) {
    entries.push({
      id: `edu_default_2`,
      institution: '',
      degree: 'Intermediate (12th)',
      level: 'Intermediate (12th)',
      scoreType: 'PERCENTAGE',
      score: `${studentProfile.twelfthPercentage}`,
      startYear: `${currentYear - 5}`,
      endYear: `${currentYear - 3}`,
      order: 1
    });
  }

  if (studentProfile?.tenthPercentage) {
    entries.push({
      id: `edu_default_3`,
      institution: '',
      degree: 'High School (10th)',
      level: 'High School (10th)',
      scoreType: 'PERCENTAGE',
      score: `${studentProfile.tenthPercentage}`,
      startYear: `${currentYear - 7}`,
      endYear: `${currentYear - 5}`,
      order: 2
    });
  }

  return entries;
};

const getDefaultLinksFromProfile = (profileLinks = {}) => {
  const linksArr = [];
  let idx = 0;
  if (profileLinks?.github) {
    linksArr.push({ id: 'link_github', name: 'GitHub', url: profileLinks.github, visible: true, order: idx++ });
  }
  if (profileLinks?.linkedin) {
    linksArr.push({ id: 'link_linkedin', name: 'LinkedIn', url: profileLinks.linkedin, visible: true, order: idx++ });
  }
  if (profileLinks?.leetcode) {
    linksArr.push({ id: 'link_leetcode', name: 'LeetCode', url: profileLinks.leetcode, visible: true, order: idx++ });
  }
  if (profileLinks?.geeksforgeeks) {
    linksArr.push({ id: 'link_gfg', name: 'GeeksforGeeks', url: profileLinks.geeksforgeeks, visible: true, order: idx++ });
  }
  if (Array.isArray(profileLinks?.custom)) {
    profileLinks.custom.forEach((c) => {
      if (c && c.url) {
        linksArr.push({ id: `link_custom_${idx}`, name: c.label || 'Portfolio', url: c.url, visible: true, order: idx++ });
      }
    });
  }
  if (linksArr.length === 0) {
    return [
      { id: 'link_github', name: 'GitHub', url: '', visible: true, order: 0 },
      { id: 'link_linkedin', name: 'LinkedIn', url: '', visible: true, order: 1 },
      { id: 'link_leetcode', name: 'LeetCode', url: '', visible: true, order: 2 },
      { id: 'link_gfg', name: 'GeeksforGeeks', url: '', visible: true, order: 3 }
    ];
  }
  return linksArr;
};

const getDefaultLinks = () => [
  { id: 'link_github', name: 'GitHub', url: '', visible: true, order: 0 },
  { id: 'link_linkedin', name: 'LinkedIn', url: '', visible: true, order: 1 },
  { id: 'link_leetcode', name: 'LeetCode', url: '', visible: true, order: 2 },
  { id: 'link_gfg', name: 'GeeksforGeeks', url: '', visible: true, order: 3 }
];

/**
 * @desc Create a new Resume
 * @route POST /api/resumes
 * @access Private (Student)
 */
const createResume = async (req, res) => {
  try {
    const {
      resumeName,
      targetRole,
      template,
      professionalLinks,
      codingProfiles,
      links,
      summary,
      personalInfo,
      education,
      skills,
      projects
    } = req.body;

    // Prefill personal info & canonical links from Student profile if available
    const studentProfile = await Student.findOne({ user: req.user._id });
    const pLinks = studentProfile?.profileLinks || {};

    const defaultSkills = {
      categories: getDefaultSkillsCategories({}, studentProfile?.skills),
      programmingLanguages: studentProfile?.skills || [],
      frameworks: [],
      databases: [],
      tools: [],
      other: []
    };

    const newResume = await Resume.create({
      user: req.user._id,
      resumeName: resumeName || 'Untitled Resume',
      targetRole: targetRole || '',
      template: template || 'Classic',
      sectionSettings: getDefaultSectionSettings(),
      personalInfo: {
        fullName: req.user.name || '',
        title: targetRole || '',
        email: req.user.email || '',
        phone: studentProfile?.studentMobileNumber || studentProfile?.phone || '',
        location: '',
        photoUrl: '',
        ...(personalInfo || {})
      },
      summary: summary || studentProfile?.bio || '',
      education: education || getDefaultEducationEntries(studentProfile),
      skills: skills || defaultSkills,
      links: links || getDefaultLinksFromProfile(pLinks),
      professionalLinks: {
        github: pLinks.github || '',
        linkedin: pLinks.linkedin || '',
        portfolio: '',
        website: '',
        ...(professionalLinks || {})
      },
      codingProfiles: {
        leetcode: pLinks.leetcode || '',
        geeksforgeeks: pLinks.geeksforgeeks || '',
        codechef: '',
        hackerrank: '',
        codeforces: '',
        ...(codingProfiles || {})
      },
      projects: projects || []
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

    // Load student profile to ensure canonical URLs are synced and zero dummy links exist
    const studentProfile = await Student.findOne({ user: req.user._id });
    const pl = studentProfile?.profileLinks || {};

    // Auto-normalize links array for dynamic link management
    if (!resume.links || !Array.isArray(resume.links) || resume.links.length === 0) {
      const convertedLinks = [];
      let orderIdx = 0;
      const githubUrl = pl.github || resume.professionalLinks?.github || '';
      const linkedinUrl = pl.linkedin || resume.professionalLinks?.linkedin || '';
      const leetcodeUrl = pl.leetcode || resume.codingProfiles?.leetcode || '';
      const gfgUrl = pl.geeksforgeeks || resume.codingProfiles?.geeksforgeeks || '';

      if (githubUrl && !githubUrl.includes('/username')) {
        convertedLinks.push({ id: `link_github`, name: 'GitHub', url: githubUrl, visible: true, order: orderIdx++ });
      }
      if (linkedinUrl && !linkedinUrl.includes('/username')) {
        convertedLinks.push({ id: `link_linkedin`, name: 'LinkedIn', url: linkedinUrl, visible: true, order: orderIdx++ });
      }
      if (leetcodeUrl && !leetcodeUrl.includes('/username')) {
        convertedLinks.push({ id: `link_leetcode`, name: 'LeetCode', url: leetcodeUrl, visible: true, order: orderIdx++ });
      }
      if (gfgUrl && !gfgUrl.includes('/username')) {
        convertedLinks.push({ id: `link_gfg`, name: 'GeeksforGeeks', url: gfgUrl, visible: true, order: orderIdx++ });
      }
      if (Array.isArray(pl.custom)) {
        pl.custom.forEach(c => {
          if (c && c.url && !c.url.includes('/username')) {
            convertedLinks.push({ id: `link_custom_${orderIdx}`, name: c.label || 'Portfolio', url: c.url, visible: true, order: orderIdx++ });
          }
        });
      }
      if (resume.professionalLinks?.portfolio && !resume.professionalLinks.portfolio.includes('/username')) {
        convertedLinks.push({ id: `link_portfolio`, name: 'Portfolio', url: resume.professionalLinks.portfolio, visible: true, order: orderIdx++ });
      }
      if (resume.professionalLinks?.website && !resume.professionalLinks.website.includes('/username')) {
        convertedLinks.push({ id: `link_website`, name: 'Website', url: resume.professionalLinks.website, visible: true, order: orderIdx++ });
      }

      if (convertedLinks.length === 0) {
        resume.links = getDefaultLinks();
      } else {
        resume.links = convertedLinks;
      }
      resume.markModified('links');
      dirty = true;
    } else {
      // Clean up any dummy '/username' placeholders and ensure canonical URLs from profile are reflected
      resume.links.forEach((l) => {
        if (l.url && l.url.includes('/username')) {
          l.url = '';
          dirty = true;
        }
        const nl = (l.name || '').toLowerCase();
        if (nl.includes('github') && pl.github && l.url !== pl.github) {
          l.url = pl.github;
          dirty = true;
        } else if (nl.includes('linkedin') && pl.linkedin && l.url !== pl.linkedin) {
          l.url = pl.linkedin;
          dirty = true;
        } else if (nl.includes('leetcode') && pl.leetcode && l.url !== pl.leetcode) {
          l.url = pl.leetcode;
          dirty = true;
        } else if ((nl.includes('geeksforgeeks') || nl.includes('gfg')) && pl.geeksforgeeks && l.url !== pl.geeksforgeeks) {
          l.url = pl.geeksforgeeks;
          dirty = true;
        }
      });

      // Sync custom links from profile if not yet in resume
      if (Array.isArray(pl.custom)) {
        pl.custom.forEach((c, cIdx) => {
          if (c && c.url && !resume.links.some(l => l.url === c.url)) {
            resume.links.push({
              id: `link_custom_${Date.now()}_${cIdx}`,
              name: c.label || 'Custom Link',
              url: c.url,
              visible: true,
              order: resume.links.length
            });
            dirty = true;
          }
        });
      }

      if (dirty) {
        resume.markModified('links');
      }
    }

    // Clean up professionalLinks & codingProfiles dummy placeholders
    if (resume.professionalLinks) {
      if (pl.github) resume.professionalLinks.github = pl.github;
      else if (resume.professionalLinks.github?.includes('/username')) resume.professionalLinks.github = '';

      if (pl.linkedin) resume.professionalLinks.linkedin = pl.linkedin;
      else if (resume.professionalLinks.linkedin?.includes('/username')) resume.professionalLinks.linkedin = '';
    }
    if (resume.codingProfiles) {
      if (pl.leetcode) resume.codingProfiles.leetcode = pl.leetcode;
      else if (resume.codingProfiles.leetcode?.includes('/username')) resume.codingProfiles.leetcode = '';

      if (pl.geeksforgeeks) resume.codingProfiles.geeksforgeeks = pl.geeksforgeeks;
      else if (resume.codingProfiles.geeksforgeeks?.includes('/username')) resume.codingProfiles.geeksforgeeks = '';
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

    // Explicit allowlist to prevent mass-assignment vulnerability
    const allowedFields = [
      'resumeName',
      'title',
      'targetRole',
      'template',
      'atsMode',
      'customization',
      'theme',
      'personalInfo',
      'summary',
      'education',
      'experience',
      'projects',
      'skills',
      'certifications',
      'achievements',
      'languages',
      'customSections',
      'links',
      'professionalLinks',
      'codingProfiles',
      'sectionSettings',
      'printSettings'
    ];

    const safeUpdate = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        safeUpdate[field] = req.body[field];
      }
    }
    if (safeUpdate.title && !safeUpdate.resumeName) {
      safeUpdate.resumeName = safeUpdate.title;
    }

    const updatedResume = await Resume.findByIdAndUpdate(
      req.params.id,
      { $set: safeUpdate },
      { new: true, runValidators: true }
    );

    // Sync canonical URLs back to Student.profileLinks
    try {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        if (!student.profileLinks) {
          student.profileLinks = { github: '', linkedin: '', leetcode: '', geeksforgeeks: '', custom: [] };
        }
        let profileChanged = false;

        const bodyLinks = Array.isArray(req.body.links) ? req.body.links : [];
        const bodyProf = req.body.professionalLinks || {};
        const bodyCoding = req.body.codingProfiles || {};

        const findLinkUrl = (matcher) => {
          const found = bodyLinks.find(l => (l.name || '').toLowerCase().includes(matcher));
          if (found && found.url && typeof found.url === 'string' && !found.url.includes('/username')) {
            return found.url.trim();
          }
          return '';
        };

        const newGithub = bodyProf.github?.trim() || findLinkUrl('github');
        if (newGithub && newGithub !== student.profileLinks.github && !newGithub.includes('/username')) {
          student.profileLinks.github = newGithub;
          profileChanged = true;
        }

        const newLinkedin = bodyProf.linkedin?.trim() || findLinkUrl('linkedin');
        if (newLinkedin && newLinkedin !== student.profileLinks.linkedin && !newLinkedin.includes('/username')) {
          student.profileLinks.linkedin = newLinkedin;
          profileChanged = true;
        }

        const newLeetcode = bodyCoding.leetcode?.trim() || findLinkUrl('leetcode');
        if (newLeetcode && newLeetcode !== student.profileLinks.leetcode && !newLeetcode.includes('/username')) {
          student.profileLinks.leetcode = newLeetcode;
          profileChanged = true;
        }

        const newGfg = bodyCoding.geeksforgeeks?.trim() || findLinkUrl('geeksforgeeks') || findLinkUrl('gfg');
        if (newGfg && newGfg !== student.profileLinks.geeksforgeeks && !newGfg.includes('/username')) {
          student.profileLinks.geeksforgeeks = newGfg;
          profileChanged = true;
        }

        // Custom links in bodyLinks
        const customLinksInBody = bodyLinks.filter(l => {
          const nl = (l.name || '').toLowerCase();
          return l.url && !l.url.includes('/username') && !['github', 'linkedin', 'leetcode', 'geeksforgeeks', 'gfg'].some(k => nl.includes(k));
        });

        if (customLinksInBody.length > 0) {
          if (!Array.isArray(student.profileLinks.custom)) student.profileLinks.custom = [];
          customLinksInBody.forEach(cl => {
            const trimmedUrl = cl.url.trim();
            const existing = student.profileLinks.custom.find(c => c.url === trimmedUrl);
            if (!existing) {
              student.profileLinks.custom.push({ label: cl.name || 'Custom Link', url: trimmedUrl });
              profileChanged = true;
            }
          });
        }

        if (profileChanged) {
          await student.save();
        }
      }
    } catch (profileSyncErr) {
      console.error('[Profile Sync Error in updateResume]', profileSyncErr);
    }

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

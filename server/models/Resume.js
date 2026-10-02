const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resumeName: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled Resume'
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
      default: 'General'
    },
    template: {
      type: String,
      enum: ['Classic', 'Modern', 'Minimal', 'Professional', 'ATS Friendly'],
      default: 'Classic'
    },
    atsMode: {
      type: Boolean,
      default: false
    },
    customization: {
      fontFamily: { type: String, default: 'Inter' },
      fontSize: { type: Number, default: 10.5 },
      headingSize: { type: Number, default: 14 },
      lineSpacing: { type: Number, default: 1.2 },
      margins: { type: String, default: 'Normal' },
      accentColor: { type: String, default: '#2563eb' },
      headingStyle: { type: String, default: 'bold-border' },
      showPhoto: { type: Boolean, default: false }
    },
    sectionSettings: [
      {
        id: { type: String, required: true },
        defaultName: { type: String, default: '' },
        displayName: { type: String, default: '' },
        visible: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        type: { type: String, enum: ['system', 'custom'], default: 'system' },
        content: { type: String, default: '' }
      }
    ],
    sectionOrder: {
      type: [String],
      default: [
        'summary',
        'education',
        'skills',
        'projects',
        'experience',
        'internships',
        'certifications',
        'codingProfiles',
        'professionalLinks',
        'achievements',
        'publications',
        'extracurricular',
        'languages',
        'interests',
        'customSections'
      ]
    },
    personalInfo: {
      fullName: { type: String, default: '' },
      title: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      photoUrl: { type: String, default: '' }
    },
    summary: {
      type: String,
      default: ''
    },
    education: [
      {
        id: { type: String, default: '' },
        degree: { type: String, default: '' },
        institution: { type: String, default: '' },
        location: { type: String, default: '' },
        level: { type: String, default: "Bachelor's Degree" },
        startYear: { type: String, default: '' },
        endYear: { type: String, default: '' },
        isCurrent: { type: Boolean, default: false },
        scoreType: { type: String, enum: ['CGPA', 'PERCENTAGE', 'NONE'], default: 'CGPA' },
        score: { type: String, default: '' },
        cgpa: { type: String, default: '' },
        relevantCoursework: { type: String, default: '' },
        description: { type: String, default: '' },
        order: { type: Number, default: 0 }
      }
    ],
    skills: {
      categories: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          visible: { type: Boolean, default: true },
          order: { type: Number, default: 0 },
          skills: [
            {
              id: { type: String, required: true },
              name: { type: String, required: true },
              order: { type: Number, default: 0 }
            }
          ]
        }
      ],
      programmingLanguages: [{ type: String }],
      frameworks: [{ type: String }],
      databases: [{ type: String }],
      tools: [{ type: String }],
      other: [{ type: String }]
    },
    projects: [
      {
        name: { type: String, default: '' },
        role: { type: String, default: '' },
        technologies: { type: String, default: '' },
        projectUrl: { type: String, default: '' },
        githubUrl: { type: String, default: '' },
        demoUrl: { type: String, default: '' },
        startDate: { type: String, default: '' },
        endDate: { type: String, default: '' },
        description: { type: String, default: '' },
        keyContributions: [{ type: String }]
      }
    ],
    experience: [
      {
        company: { type: String, default: '' },
        title: { type: String, default: '' },
        location: { type: String, default: '' },
        startDate: { type: String, default: '' },
        endDate: { type: String, default: '' },
        currentlyWorking: { type: Boolean, default: false },
        description: { type: String, default: '' },
        achievements: [{ type: String }]
      }
    ],
    internships: [
      {
        company: { type: String, default: '' },
        role: { type: String, default: '' },
        duration: { type: String, default: '' },
        description: { type: String, default: '' },
        technologies: { type: String, default: '' },
        certificateUrl: { type: String, default: '' }
      }
    ],
    certifications: [
      {
        name: { type: String, default: '' },
        organization: { type: String, default: '' },
        date: { type: String, default: '' },
        credentialId: { type: String, default: '' },
        credentialUrl: { type: String, default: '' }
      }
    ],
    links: [
      {
        id: { type: String, default: '' },
        name: { type: String, default: '' },
        url: { type: String, default: '' },
        visible: { type: Boolean, default: true },
        order: { type: Number, default: 0 }
      }
    ],
    codingProfiles: {
      leetcode: { type: String, default: '' },
      geeksforgeeks: { type: String, default: '' },
      codechef: { type: String, default: '' },
      hackerrank: { type: String, default: '' },
      codeforces: { type: String, default: '' }
    },
    professionalLinks: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      portfolio: { type: String, default: '' },
      website: { type: String, default: '' }
    },
    publications: [
      {
        title: { type: String, default: '' },
        publisher: { type: String, default: '' },
        date: { type: String, default: '' },
        url: { type: String, default: '' },
        description: { type: String, default: '' }
      }
    ],
    extracurricular: [{ type: String }],
    languages: [{ type: String }],
    interests: [{ type: String }],
    customSections: [
      {
        title: { type: String, default: 'Custom Section' },
        content: { type: String, default: '' }
      }
    ]
  },
  { timestamps: true }
);

// Performance Indexes
resumeSchema.index({ user: 1 });
resumeSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);


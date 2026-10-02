import React from 'react';

const AtsFriendlyTemplate = ({ data }) => {
  const {
    personalInfo = {},
    summary = '',
    education = [],
    skills = {},
    projects = [],
    experience = [],
    certifications = [],
    achievements = [],
    codingProfiles = {},
    professionalLinks = {},
    sectionSettings = [],
    sectionOrder = [],
    customization = {}
  } = data || {};

  const fontFamily = 'Arial, Helvetica, sans-serif';
  const fontSize = `${customization.fontSize || 10}pt`;
  const headingSize = `${customization.headingSize || 12}pt`;
  const lineSpacing = customization.lineSpacing || 1.25;

  const linksList = [];
  if (data?.links && Array.isArray(data.links) && data.links.length > 0) {
    linksList.push(
      ...[...data.links]
        .filter((l) => l.visible !== false && l.url && l.name && !l.url.includes('/username'))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((l) => ({ name: l.name, url: l.url }))
    );
  } else {
    if (professionalLinks.github) linksList.push({ name: 'GitHub', url: professionalLinks.github });
    if (professionalLinks.linkedin) linksList.push({ name: 'LinkedIn', url: professionalLinks.linkedin });
    if (professionalLinks.portfolio) linksList.push({ name: 'Portfolio', url: professionalLinks.portfolio });
    if (professionalLinks.website) linksList.push({ name: 'Website', url: professionalLinks.website });
    if (codingProfiles.leetcode) linksList.push({ name: 'LeetCode', url: codingProfiles.leetcode });
    if (codingProfiles.geeksforgeeks) linksList.push({ name: 'GeeksforGeeks', url: codingProfiles.geeksforgeeks });
    if (codingProfiles.codechef) linksList.push({ name: 'CodeChef', url: codingProfiles.codechef });
    if (codingProfiles.hackerrank) linksList.push({ name: 'HackerRank', url: codingProfiles.hackerrank });
  }

  // Build sorted list of active sections
  let activeSections = [];
  if (sectionSettings && sectionSettings.length > 0) {
    activeSections = [...sectionSettings]
      .filter((s) => s.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } else {
    const defaultIds = ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements'];
    const order = sectionOrder && sectionOrder.length > 0 ? sectionOrder : defaultIds;
    activeSections = order.map((id, index) => ({
      id,
      displayName: id.charAt(0).toUpperCase() + id.slice(1),
      visible: true,
      order: index,
      type: 'system'
    }));
  }

  const renderHeading = (secTitle) => (
    <h3
      className="font-bold text-black border-b border-black uppercase tracking-wider"
      style={{
        fontSize: headingSize,
        paddingBottom: '6px',
        marginBottom: '8px'
      }}
    >
      {secTitle}
    </h3>
  );

  const renderSectionContent = (sec) => {
    const key = sec.id || sec.type;

    if (sec.type === 'custom') {
      if (!sec.content) return null;
      return (
        <div key={sec.id} className="mb-4">
          {renderHeading(sec.displayName || 'CUSTOM SECTION')}
          <p className="text-black whitespace-pre-line leading-relaxed">{sec.content}</p>
        </div>
      );
    }

    switch (key) {
      case 'summary':
        if (!summary) return null;
        return (
          <div key="summary" className="mb-4">
            {renderHeading(sec.displayName || 'PROFESSIONAL SUMMARY')}
            <p className="text-black leading-relaxed">{summary}</p>
          </div>
        );

      case 'skills':
        let categoryLines = [];
        if (skills?.categories && Array.isArray(skills.categories) && skills.categories.length > 0) {
          categoryLines = [...skills.categories]
            .filter((cat) => cat.visible !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((cat) => {
              const activeSkills = [...(cat.skills || [])]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((s) => (typeof s === 'string' ? s : s.name))
                .filter(Boolean);
              return { name: cat.name, text: activeSkills.join(', ') };
            })
            .filter((c) => c.text.length > 0);
        } else {
          const allSkillsList = [
            ...(skills.programmingLanguages || []),
            ...(skills.frameworks || []),
            ...(skills.databases || []),
            ...(skills.tools || []),
            ...(skills.other || [])
          ];
          if (allSkillsList.length > 0) {
            categoryLines = [{ name: 'Skills', text: allSkillsList.join(', ') }];
          }
        }

        if (categoryLines.length === 0) return null;
        return (
          <div key="skills" className="mb-4">
            {renderHeading(sec.displayName || 'TECHNICAL SKILLS')}
            <div className="space-y-1">
              {categoryLines.map((cat, idx) => (
                <p key={idx} className="text-black leading-relaxed">
                  <strong>{cat.name}:</strong> {cat.text}
                </p>
              ))}
            </div>
          </div>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        const sortedEducationAts = [...education].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return (
          <div key="education" className="mb-4">
            {renderHeading(sec.displayName || 'EDUCATION')}
            <div className="space-y-2">
              {sortedEducationAts.map((edu, idx) => {
                const dates = edu.startYear && edu.endYear
                  ? edu.startYear === edu.endYear ? `${edu.startYear}` : `${edu.startYear} – ${edu.endYear}`
                  : edu.startYear || edu.endYear || '';

                const scoreVal = edu.score || edu.cgpa;
                let scoreText = '';
                if (edu.scoreType === 'PERCENTAGE') {
                  if (scoreVal) {
                    const cleanScore = scoreVal.toString().replace('%', '').trim();
                    if (cleanScore) scoreText = `Percentage: ${cleanScore}%`;
                  }
                } else if (edu.scoreType === 'NONE') {
                  scoreText = '';
                } else {
                  if (scoreVal) {
                    const cleanScore = scoreVal.toString().trim();
                    if (cleanScore) scoreText = `CGPA: ${cleanScore}`;
                  }
                }

                return (
                  <div key={edu.id || idx} className="flex justify-between items-start gap-4 text-xs">
                    <div className="text-left min-w-0 flex-1">
                      <strong className="block font-bold text-black">{edu.institution}</strong>
                      <span className="block font-normal text-black">{edu.degree}</span>
                    </div>
                    <div className="text-right shrink-0 text-black">
                      {dates && <span className="block font-semibold">{dates}</span>}
                      {scoreText && <span className="block font-semibold mt-0.5">{scoreText}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'projects':
        if (!projects || projects.length === 0) return null;
        return (
          <div key="projects" className="mb-4">
            {renderHeading(sec.displayName || 'PROJECTS')}
            <div className="space-y-2">
              {projects.map((proj, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <strong className="text-black">{proj.name}</strong>
                    <span className="text-black font-medium">{proj.startDate} – {proj.endDate || 'Present'}</span>
                  </div>
                  {proj.technologies && <p className="text-black italic text-[0.9em]">Technologies: {proj.technologies}</p>}
                  {proj.description && <p className="text-black mt-0.5">{proj.description}</p>}
                  {proj.githubUrl && (
                    <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-blue-800 underline text-[0.9em]">
                      {proj.githubUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <div key="experience" className="mb-4">
            {renderHeading(sec.displayName || 'EXPERIENCE')}
            <div className="space-y-2">
              {experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <strong className="text-black">{exp.title} — {exp.company}</strong>
                    <span className="text-black font-medium">{exp.startDate} – {exp.currentlyWorking ? 'Present' : exp.endDate}</span>
                  </div>
                  {exp.description && <p className="text-black mt-0.5">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <div key="certifications" className="mb-4">
            {renderHeading(sec.displayName || 'CERTIFICATIONS')}
            <ul className="list-disc list-inside text-black">
              {certifications.map((cert, idx) => (
                <li key={idx}>
                  <strong>{cert.name}</strong> — {cert.organization} ({cert.date})
                </li>
              ))}
            </ul>
          </div>
        );

      case 'achievements':
        if (!achievements || achievements.length === 0) return null;
        return (
          <div key="achievements" className="mb-4">
            {renderHeading(sec.displayName || 'ACHIEVEMENTS')}
            <ul className="list-disc list-inside text-black">
              {achievements.map((ach, idx) => (
                <li key={idx}>{ach}</li>
              ))}
            </ul>
          </div>
        );

      case 'links':
        return null;

      default:
        return null;
    }
  };

  return (
    <div
      id="printable-resume"
      className="bg-white text-black p-8 max-w-[210mm] min-h-[297mm] mx-auto text-xs leading-normal"
      style={{ fontFamily, fontSize, lineHeight: lineSpacing }}
    >
      {/* ATS Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold uppercase text-black tracking-tight">{personalInfo.fullName || 'YOUR NAME'}</h1>
        {personalInfo.title && <h2 className="text-xs font-bold text-black uppercase mt-0.5">{personalInfo.title}</h2>}
        <div className="text-[0.9em] text-black font-medium mt-1">
          {personalInfo.email && <span>Email: {personalInfo.email} | </span>}
          {personalInfo.phone && <span>Phone: {personalInfo.phone} | </span>}
          {personalInfo.location && <span>Location: {personalInfo.location}</span>}
        </div>
        {linksList.length > 0 && (
          <div className="profile-links flex flex-wrap items-center justify-center text-[0.9em] font-medium mt-1.5" style={{ gap: 0 }}>
            {linksList.map((link, idx) => (
              <React.Fragment key={idx}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#000', textDecoration: 'none' }}
                  className="profile-link no-underline hover:underline font-semibold"
                >
                  {link.name}
                </a>
                {idx < linksList.length - 1 && (
                  <span className="profile-separator text-slate-500 font-normal" style={{ margin: '0 10px' }}>
                    |
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {activeSections.map((sec) => renderSectionContent(sec))}
    </div>
  );
};

export default AtsFriendlyTemplate;

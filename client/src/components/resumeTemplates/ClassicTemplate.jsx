import React from 'react';

const ClassicTemplate = ({ data }) => {
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
    customization = {},
    sectionSettings = [],
    sectionOrder = [],
    atsMode = false
  } = data || {};

  const accent = atsMode ? '#1e293b' : (customization.accentColor || '#2563eb');
  const fontFamily = atsMode ? 'Arial, sans-serif' : (customization.fontFamily || 'Inter, sans-serif');
  const fontSize = `${customization.fontSize || 10}pt`;
  const headingSize = `${customization.headingSize || 12}pt`;
  const lineSpacing = customization.lineSpacing || 1.3;

  const marginPadding =
    customization.margins === 'Compact'
      ? '16px 24px'
      : customization.margins === 'Spacious'
      ? '40px 48px'
      : '28px 36px';

  const linksList = [];
  if (data?.links && Array.isArray(data.links) && data.links.length > 0) {
    linksList.push(
      ...[...data.links]
        .filter((l) => l.visible !== false && l.url && l.name)
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

  const renderHeading = (secTitle) => {
    const styleOpt = customization.headingStyle || 'bold-border';
    let text = secTitle;
    if (styleOpt === 'uppercase') text = secTitle.toUpperCase();

    const inlineStyles = {
      color: accent,
      fontSize: headingSize,
      lineHeight: 1.2,
      paddingBottom: '6px',
      marginBottom: '8px'
    };

    if (styleOpt === 'bold-border') {
      inlineStyles.borderBottom = `1.5px solid ${accent}`;
    } else if (styleOpt === 'bold-underline') {
      inlineStyles.textDecoration = 'underline';
      inlineStyles.textDecorationColor = accent;
    }

    return <h3 className="font-bold tracking-tight" style={inlineStyles}>{text}</h3>;
  };

  // Build sorted list of active sections based on sectionSettings or sectionOrder fallback
  let activeSections = [];
  if (sectionSettings && sectionSettings.length > 0) {
    activeSections = [...sectionSettings]
      .filter((s) => s.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } else {
    const defaultIds = ['summary', 'education', 'skills', 'projects', 'experience', 'certifications', 'achievements', 'links'];
    const order = sectionOrder && sectionOrder.length > 0 ? sectionOrder : defaultIds;
    activeSections = order.map((id, index) => ({
      id,
      displayName: id.charAt(0).toUpperCase() + id.slice(1),
      visible: true,
      order: index,
      type: 'system'
    }));
  }

  const renderSectionContent = (sec) => {
    const key = sec.id || sec.type;

    if (sec.type === 'custom') {
      if (!sec.content) return null;
      return (
        <div key={sec.id} className="mb-4">
          {renderHeading(sec.displayName || 'Custom Section')}
          <p className="text-slate-700 whitespace-pre-line leading-relaxed">{sec.content}</p>
        </div>
      );
    }

    switch (key) {
      case 'summary':
        if (!summary) return null;
        return (
          <div key="summary" className="mb-4">
            {renderHeading(sec.displayName || 'Professional Summary')}
            <p className="text-slate-700 leading-relaxed">{summary}</p>
          </div>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        const sortedEducation = [...education].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return (
          <div key="education" className="mb-4">
            {renderHeading(sec.displayName || 'Education')}
            <div className="space-y-3">
              {sortedEducation.map((edu, idx) => {
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
                  <div key={edu.id || idx} className="flex justify-between items-start gap-4">
                    <div className="text-left min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900">{edu.institution}</h4>
                      <p className="text-slate-600 font-normal">{edu.degree}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {dates && <span className="block text-slate-500 text-[0.9em] font-semibold">{dates}</span>}
                      {scoreText && <span className="block font-bold text-slate-800 text-[0.9em] mt-0.5">{scoreText}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'skills':
        let skillCategories = [];
        if (skills?.categories && Array.isArray(skills.categories) && skills.categories.length > 0) {
          skillCategories = [...skills.categories]
            .filter((cat) => cat.visible !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((cat) => {
              const activeSkills = [...(cat.skills || [])]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((s) => (typeof s === 'string' ? s : s.name))
                .filter(Boolean);
              return { title: cat.name, list: activeSkills };
            })
            .filter((cat) => cat.list.length > 0);
        } else {
          skillCategories = [
            { title: 'Programming Languages', list: skills.programmingLanguages },
            { title: 'Frameworks & Libraries', list: skills.frameworks },
            { title: 'Databases', list: skills.databases },
            { title: 'Tools & Platforms', list: skills.tools },
            { title: 'Other Technical Skills', list: skills.other }
          ].filter((c) => c.list && c.list.length > 0);
        }

        if (skillCategories.length === 0) return null;
        return (
          <div key="skills" className="mb-4">
            {renderHeading(sec.displayName || 'Technical Skills')}
            <div className="space-y-1">
              {skillCategories.map((cat, idx) => (
                <div key={idx} className="flex items-start">
                  <span className="font-bold text-slate-900 w-44 shrink-0">{cat.title}:</span>
                  <span className="text-slate-700">{cat.list.join(' • ')}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'projects':
        if (!projects || projects.length === 0) return null;
        return (
          <div key="projects" className="mb-4">
            {renderHeading(sec.displayName || 'Projects')}
            <div className="space-y-3">
              {projects.map((proj, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-slate-900">
                      {proj.name} {proj.role ? <span className="font-normal text-slate-600">({proj.role})</span> : ''}
                    </h4>
                    <div className="text-right text-[0.9em] text-slate-500 font-medium">
                      {proj.startDate} {proj.endDate ? `– ${proj.endDate}` : ''}
                    </div>
                  </div>
                  {proj.technologies && (
                    <p className="text-[0.9em] font-semibold text-slate-600">Tech Stack: {proj.technologies}</p>
                  )}
                  {proj.description && <p className="text-slate-700 mt-0.5">{proj.description}</p>}
                  {proj.keyContributions && proj.keyContributions.length > 0 && (
                    <ul className="list-disc list-inside text-slate-700 mt-1 space-y-0.5">
                      {proj.keyContributions.map((kc, kIdx) => (
                        <li key={kIdx}>{kc}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-3 text-[0.9em] mt-1">
                    {proj.githubUrl && (
                      <a href={proj.githubUrl} target="_blank" rel="noreferrer" style={{ color: accent }} className="underline font-medium">
                        GitHub Repo
                      </a>
                    )}
                    {proj.demoUrl && (
                      <a href={proj.demoUrl} target="_blank" rel="noreferrer" style={{ color: accent }} className="underline font-medium">
                        Live Demo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <div key="experience" className="mb-4">
            {renderHeading(sec.displayName || 'Work Experience')}
            <div className="space-y-3">
              {experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-slate-900">
                      {exp.title} <span className="font-semibold text-slate-700">@ {exp.company}</span>
                    </h4>
                    <span className="text-slate-500 text-[0.9em]">
                      {exp.startDate} – {exp.currentlyWorking ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.description && <p className="text-slate-700 mt-0.5">{exp.description}</p>}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="list-disc list-inside text-slate-700 mt-1 space-y-0.5">
                      {exp.achievements.map((ach, aIdx) => (
                        <li key={aIdx}>{ach}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <div key="certifications" className="mb-4">
            {renderHeading(sec.displayName || 'Certifications')}
            <div className="space-y-1">
              {certifications.map((cert, idx) => (
                <div key={idx} className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-slate-900">{cert.name}</span>
                    <span className="text-slate-600"> — {cert.organization}</span>
                    {cert.credentialUrl && (
                      <a href={cert.credentialUrl} target="_blank" rel="noreferrer" style={{ color: accent }} className="ml-2 underline text-[0.9em]">
                        Verify
                      </a>
                    )}
                  </div>
                  <span className="text-slate-500 text-[0.9em]">{cert.date}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'achievements':
        if (!achievements || achievements.length === 0) return null;
        return (
          <div key="achievements" className="mb-4">
            {renderHeading(sec.displayName || 'Achievements & Awards')}
            <ul className="list-disc list-inside text-slate-700 space-y-0.5">
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
      className="bg-white text-slate-900 shadow-sm max-w-[210mm] min-h-[297mm] mx-auto transition-all"
      style={{
        fontFamily,
        fontSize,
        lineHeight: lineSpacing,
        padding: marginPadding
      }}
    >
      {/* Header */}
      <div className="text-center border-b pb-4 mb-4 border-slate-200">
        <h1 className="font-black text-[1.8em] tracking-tight uppercase" style={{ color: accent }}>
          {personalInfo.fullName || 'YOUR NAME'}
        </h1>
        {personalInfo.title && (
          <h2 className="font-bold text-slate-600 uppercase tracking-widest text-[0.9em] mt-0.5">{personalInfo.title}</h2>
        )}

        {/* Contact Info Line */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[0.9em] text-slate-600 font-medium mt-2">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>• {personalInfo.phone}</span>}
          {personalInfo.location && <span>• {personalInfo.location}</span>}
        </div>

        {/* Links Line */}
        {linksList.length > 0 && (
          <div className="profile-links flex flex-wrap items-center justify-center text-[0.9em] font-medium mt-2" style={{ gap: 0 }}>
            {linksList.map((link, idx) => (
              <React.Fragment key={idx}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: accent, textDecoration: 'none' }}
                  className="profile-link no-underline hover:underline font-semibold"
                >
                  {link.name}
                </a>
                {idx < linksList.length - 1 && (
                  <span className="profile-separator text-slate-400 font-normal" style={{ margin: '0 10px' }}>
                    |
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Sections rendered dynamically */}
      {activeSections.map((sec) => renderSectionContent(sec))}
    </div>
  );
};

export default ClassicTemplate;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Save,
  Download,
  Printer,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  GripVertical,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
  MoveRight,
  Palette,
  Type,
  Sliders,
  Layout,
  Settings,
  UploadCloud
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import API from '../../services/api';
import TemplateDispatcher from '../../components/resumeTemplates/TemplateDispatcher';

const ResumeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('Saved ✓'); // 'Saved ✓', 'Saving...', 'Failed'
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'summary', 'education', 'skills', 'projects', 'experience', 'certifications', 'links', 'customSections', 'sectionOrder', 'customization'
  const [mobileView, setMobileView] = useState('edit'); // 'edit' or 'preview'

  // Drag & Drop State
  const [draggedSectionIndex, setDraggedSectionIndex] = useState(null);
  const [draggedCatIndex, setDraggedCatIndex] = useState(null);
  const [draggedSkillState, setDraggedSkillState] = useState(null); // { catId, index }
  const [draggedEduIndex, setDraggedEduIndex] = useState(null);

  // Skill Editor & Transfer State
  const [newSkillInputs, setNewSkillInputs] = useState({});
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editingSkillName, setEditingSkillName] = useState('');
  const [moveSkillModal, setMoveSkillModal] = useState(null); // { fromCatId, skillId, skillName }

  // Link Management State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [linkForm, setLinkForm] = useState({ name: '', url: '' });

  // Debounced Autosave ref
  const autosaveTimerRef = useRef(null);

  useEffect(() => {
    fetchResume();
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [id]);

  const fetchResume = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/resumes/${id}`);
      setResumeData(data);
      setSaveStatus('Saved ✓');
    } catch (err) {
      console.error(err);
      alert('Failed to load resume data.');
      navigate('/student/resume-builder');
    } finally {
      setLoading(false);
    }
  };

  // Save handler (Manual & Debounced)
  const saveResumeToBackend = async (dataToSave) => {
    setSaveStatus('Saving...');
    try {
      await API.put(`/resumes/${id}`, dataToSave);
      setSaveStatus('Saved ✓');
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed');
    }
  };

  // Trigger debounced autosave on change
  const handleDataChange = (updated) => {
    setResumeData(updated);
    setSaveStatus('Saving...');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveResumeToBackend(updated);
    }, 1200);
  };

  // PDF Export Handler
  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-resume');
    if (!element) return;

    const filename = `${(resumeData.resumeName || 'Resume').replace(/\s+/g, '_')}.pdf`;

    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const [savingToProfile, setSavingToProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Save generated PDF to official student profile resume storage
  const handleSaveToProfileResume = async () => {
    const element = document.getElementById('printable-resume');
    if (!element) return;

    setSavingToProfile(true);
    setProfileSaveSuccess(false);

    try {
      const filename = `${(resumeData.resumeName || 'Resume').replace(/\s+/g, '_')}.pdf`;
      const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      const uploadData = new FormData();
      uploadData.append('resume', file);

      await API.post('/users/student-resume', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save to student profile:', err);
      alert(err.response?.data?.message || 'Failed to save generated resume to profile.');
    } finally {
      setSavingToProfile(false);
    }
  };

  // Integration with Resume Analyzer: Compile text & navigate to Analyzer
  const handleAnalyzeResume = () => {
    if (!resumeData) return;

    // Compile skills from categories
    let compiledSkills = '';
    if (resumeData.skills?.categories && resumeData.skills.categories.length > 0) {
      compiledSkills = resumeData.skills.categories
        .filter((c) => c.visible !== false)
        .map(
          (c) =>
            `${c.name}: ${
              c.skills
                ?.map((s) => (typeof s === 'string' ? s : s.name))
                .join(', ') || ''
            }`
        )
        .join('\n');
    } else {
      compiledSkills = `Languages: ${resumeData.skills?.programmingLanguages?.join(', ') || ''}\nFrameworks: ${resumeData.skills?.frameworks?.join(', ') || ''}`;
    }

    const compiledText = `
Name: ${resumeData.personalInfo?.fullName || ''}
Target Role: ${resumeData.targetRole || ''}
Summary: ${resumeData.summary || ''}

Education:
${resumeData.education?.map((e) => `${e.degree} - ${e.institution} (${e.startYear}-${e.endYear}) Score: ${e.score || e.cgpa || ''}`).join('\n')}

Technical Skills:
${compiledSkills}

Projects:
${resumeData.projects?.map((p) => `${p.name} (${p.role}): ${p.description} Tech: ${p.technologies}`).join('\n')}

Experience:
${resumeData.experience?.map((ex) => `${ex.title} at ${ex.company}: ${ex.description}`).join('\n')}
    `.trim();

    localStorage.setItem('campuspro_builder_resume_text', compiledText);
    navigate('/student/resume-analyzer');
  };

  // ==========================================
  // SECTION REORDERING & MANAGING HANDLERS
  // ==========================================
  const moveSection = (index, direction) => {
    const settings = [...(resumeData.sectionSettings || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.length) return;

    const temp = settings[index];
    settings[index] = settings[targetIndex];
    settings[targetIndex] = temp;

    settings.forEach((item, idx) => {
      item.order = idx;
    });

    handleDataChange({ ...resumeData, sectionSettings: settings });
  };

  const handleRenameSection = (id, newName) => {
    const settings = (resumeData.sectionSettings || []).map((sec) =>
      sec.id === id ? { ...sec, displayName: newName } : sec
    );
    handleDataChange({ ...resumeData, sectionSettings: settings });
  };

  const handleToggleVisibility = (id) => {
    const settings = (resumeData.sectionSettings || []).map((sec) =>
      sec.id === id ? { ...sec, visible: sec.visible === false ? true : false } : sec
    );
    handleDataChange({ ...resumeData, sectionSettings: settings });
  };

  const handleAddCustomSection = () => {
    const title = prompt(
      'Enter Title for Custom Section (e.g. Key Highlights, Leadership, Volunteering):',
      'Custom Section'
    );
    if (!title || !title.trim()) return;

    const newId = `custom_${Date.now()}`;
    const currentSettings = resumeData.sectionSettings || [];
    const newSetting = {
      id: newId,
      defaultName: 'Custom Section',
      displayName: title.trim(),
      visible: true,
      order: currentSettings.length,
      type: 'custom',
      content: 'Add your custom details, bullet points, or description here...'
    };

    const newCustomSections = [
      ...(resumeData.customSections || []),
      { id: newId, title: title.trim(), content: 'Add your custom details, bullet points, or description here...' }
    ];

    handleDataChange({
      ...resumeData,
      sectionSettings: [...currentSettings, newSetting],
      customSections: newCustomSections
    });
  };

  const handleDeleteCustomSection = (id) => {
    if (!window.confirm('Are you sure you want to delete this custom section?')) return;

    const settings = (resumeData.sectionSettings || []).filter((s) => s.id !== id);
    settings.forEach((item, idx) => {
      item.order = idx;
    });

    const customSections = (resumeData.customSections || []).filter((cs) => cs.id !== id);

    handleDataChange({
      ...resumeData,
      sectionSettings: settings,
      customSections
    });
  };

  const handleCustomContentChange = (id, content) => {
    const settings = (resumeData.sectionSettings || []).map((sec) =>
      sec.id === id ? { ...sec, content } : sec
    );
    handleDataChange({ ...resumeData, sectionSettings: settings });
  };

  // ==========================================
  // EDUCATION MANAGEMENT HANDLERS
  // ==========================================
  const handleAddEducation = () => {
    const currentEdu = resumeData.education || [];
    const newEntry = {
      id: `edu_${Date.now()}`,
      institution: '',
      location: '',
      degree: '',
      level: "Bachelor's Degree",
      startYear: '',
      endYear: '',
      isCurrent: false,
      scoreType: 'CGPA',
      score: '',
      cgpa: '',
      relevantCoursework: '',
      description: '',
      order: currentEdu.length
    };
    handleDataChange({
      ...resumeData,
      education: [...currentEdu, newEntry]
    });
  };

  const handleDeleteEducation = (idx) => {
    if (!window.confirm('Are you sure you want to remove this education entry?')) return;
    const filtered = (resumeData.education || []).filter((_, i) => i !== idx);
    filtered.forEach((e, i) => (e.order = i));
    handleDataChange({ ...resumeData, education: filtered });
  };

  const handleMoveEducation = (index, direction) => {
    const eduList = [...(resumeData.education || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= eduList.length) return;

    const temp = eduList[index];
    eduList[index] = eduList[targetIndex];
    eduList[targetIndex] = temp;

    eduList.forEach((e, i) => (e.order = i));
    handleDataChange({ ...resumeData, education: eduList });
  };

  // ==========================================
  // SKILLS CATEGORY & INDIVIDUAL SKILL HANDLERS
  // ==========================================
  const handleAddCategory = () => {
    const name = prompt('Enter Category Name (e.g. Frontend Technologies, Cloud & DevOps):', 'New Category');
    if (!name || !name.trim()) return;

    const currentCategories = resumeData.skills?.categories || [];
    const newCat = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      visible: true,
      order: currentCategories.length,
      skills: []
    };

    const updatedSkills = {
      ...resumeData.skills,
      categories: [...currentCategories, newCat]
    };

    handleDataChange({ ...resumeData, skills: updatedSkills });
  };

  const handleRenameCategory = (catId, newName) => {
    const categories = (resumeData.skills?.categories || []).map((c) =>
      c.id === catId ? { ...c, name: newName } : c
    );
    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleToggleCategoryVisible = (catId) => {
    const categories = (resumeData.skills?.categories || []).map((c) =>
      c.id === catId ? { ...c, visible: c.visible === false ? true : false } : c
    );
    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleDeleteCategory = (catId, catName) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}" and all its skills?`)) return;
    const categories = (resumeData.skills?.categories || []).filter((c) => c.id !== catId);
    categories.forEach((c, idx) => (c.order = idx));
    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleMoveCategory = (index, direction) => {
    const categories = [...(resumeData.skills?.categories || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const temp = categories[index];
    categories[index] = categories[targetIndex];
    categories[targetIndex] = temp;

    categories.forEach((c, idx) => (c.order = idx));
    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleAddSkillToCategory = (catId) => {
    const skillName = newSkillInputs[catId];
    if (!skillName || !skillName.trim()) return;

    const categories = (resumeData.skills?.categories || []).map((c) => {
      if (c.id === catId) {
        const currentSkills = c.skills || [];
        const newSkill = {
          id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: skillName.trim(),
          order: currentSkills.length
        };
        return { ...c, skills: [...currentSkills, newSkill] };
      }
      return c;
    });

    setNewSkillInputs({ ...newSkillInputs, [catId]: '' });
    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleSaveEditSkill = (catId, skillId) => {
    if (!editingSkillName || !editingSkillName.trim()) return;
    const categories = (resumeData.skills?.categories || []).map((c) => {
      if (c.id === catId) {
        const updatedSkills = (c.skills || []).map((s) =>
          s.id === skillId ? { ...s, name: editingSkillName.trim() } : s
        );
        return { ...c, skills: updatedSkills };
      }
      return c;
    });

    setEditingSkillId(null);
    setEditingSkillName('');
    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleDeleteSkill = (catId, skillId, skillName) => {
    if (!window.confirm(`Are you sure you want to remove "${skillName}" from this category?`)) return;
    const categories = (resumeData.skills?.categories || []).map((c) => {
      if (c.id === catId) {
        const filtered = (c.skills || []).filter((s) => s.id !== skillId);
        filtered.forEach((s, idx) => (s.order = idx));
        return { ...c, skills: filtered };
      }
      return c;
    });

    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleMoveSkillInCat = (catId, index, direction) => {
    const categories = (resumeData.skills?.categories || []).map((c) => {
      if (c.id === catId) {
        const skills = [...(c.skills || [])];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= skills.length) return c;

        const temp = skills[index];
        skills[index] = skills[targetIndex];
        skills[targetIndex] = temp;

        skills.forEach((s, idx) => (s.order = idx));
        return { ...c, skills };
      }
      return c;
    });

    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  const handleTransferSkillToCategory = (fromCatId, skillId, toCatId) => {
    if (fromCatId === toCatId) return;
    let targetSkillObj = null;

    let categories = (resumeData.skills?.categories || []).map((c) => {
      if (c.id === fromCatId) {
        targetSkillObj = (c.skills || []).find((s) => s.id === skillId);
        const filtered = (c.skills || []).filter((s) => s.id !== skillId);
        filtered.forEach((s, idx) => (s.order = idx));
        return { ...c, skills: filtered };
      }
      return c;
    });

    if (!targetSkillObj) return;

    categories = categories.map((c) => {
      if (c.id === toCatId) {
        const currentSkills = c.skills || [];
        targetSkillObj.order = currentSkills.length;
        return { ...c, skills: [...currentSkills, targetSkillObj] };
      }
      return c;
    });

    setMoveSkillModal(null);
    handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
  };

  // ==========================================
  // DYNAMIC LINKS & PROFILES HANDLERS
  // ==========================================
  const getNormalizedLinks = (data) => {
    if (data?.links && Array.isArray(data.links) && data.links.length > 0) {
      return [...data.links]
        .map(l => ({ ...l, url: l.url && l.url.includes('/username') ? '' : (l.url || '') }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    const links = [];
    let orderCount = 0;
    const p = data?.professionalLinks || {};
    const c = data?.codingProfiles || {};
    if (p.github && !p.github.includes('/username')) links.push({ id: `link_github`, name: 'GitHub', url: p.github, visible: true, order: orderCount++ });
    if (p.linkedin && !p.linkedin.includes('/username')) links.push({ id: `link_linkedin`, name: 'LinkedIn', url: p.linkedin, visible: true, order: orderCount++ });
    if (c.leetcode && !c.leetcode.includes('/username')) links.push({ id: `link_leetcode`, name: 'LeetCode', url: c.leetcode, visible: true, order: orderCount++ });
    if (c.geeksforgeeks && !c.geeksforgeeks.includes('/username')) links.push({ id: `link_gfg`, name: 'GeeksforGeeks', url: c.geeksforgeeks, visible: true, order: orderCount++ });
    if (p.portfolio && !p.portfolio.includes('/username')) links.push({ id: `link_portfolio`, name: 'Portfolio', url: p.portfolio, visible: true, order: orderCount++ });
    if (p.website && !p.website.includes('/username')) links.push({ id: `link_website`, name: 'Website', url: p.website, visible: true, order: orderCount++ });

    if (links.length === 0) {
      return [
        { id: 'link_github', name: 'GitHub', url: '', visible: true, order: 0 },
        { id: 'link_linkedin', name: 'LinkedIn', url: '', visible: true, order: 1 },
        { id: 'link_leetcode', name: 'LeetCode', url: '', visible: true, order: 2 },
        { id: 'link_gfg', name: 'GeeksforGeeks', url: '', visible: true, order: 3 }
      ];
    }
    return links;
  };

  const handleSaveLinkModal = () => {
    let name = (linkForm.name || '').trim();
    let url = (linkForm.url || '').trim();

    if (!name) {
      alert('Please enter a link name.');
      return;
    }
    if (!url) {
      alert('Please enter a link URL.');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch (e) {
      alert('Please enter a valid URL format (e.g. https://github.com/username)');
      return;
    }

    const currentLinks = getNormalizedLinks(resumeData);

    if (editingLinkIndex !== null && editingLinkIndex >= 0 && editingLinkIndex < currentLinks.length) {
      currentLinks[editingLinkIndex] = {
        ...currentLinks[editingLinkIndex],
        name,
        url
      };
    } else {
      currentLinks.push({
        id: `link_${Date.now()}`,
        name,
        url,
        visible: true,
        order: currentLinks.length
      });
    }

    currentLinks.forEach((l, i) => (l.order = i));

    handleDataChange({
      ...resumeData,
      links: currentLinks
    });

    setIsLinkModalOpen(false);
    setEditingLinkIndex(null);
    setLinkForm({ name: '', url: '' });
  };

  const handleToggleLinkVisibility = (idx) => {
    const currentLinks = getNormalizedLinks(resumeData);
    if (idx < 0 || idx >= currentLinks.length) return;
    currentLinks[idx].visible = currentLinks[idx].visible === false ? true : false;
    handleDataChange({ ...resumeData, links: currentLinks });
  };

  const handleDeleteLink = (idx) => {
    const currentLinks = getNormalizedLinks(resumeData);
    if (idx < 0 || idx >= currentLinks.length) return;
    if (!window.confirm(`Are you sure you want to delete "${currentLinks[idx].name}"?`)) return;
    const filtered = currentLinks.filter((_, i) => i !== idx);
    filtered.forEach((l, i) => (l.order = i));
    handleDataChange({ ...resumeData, links: filtered });
  };

  const handleMoveLink = (index, direction) => {
    const currentLinks = getNormalizedLinks(resumeData);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentLinks.length) return;

    const temp = currentLinks[index];
    currentLinks[index] = currentLinks[targetIndex];
    currentLinks[targetIndex] = temp;

    currentLinks.forEach((l, i) => (l.order = i));
    handleDataChange({ ...resumeData, links: currentLinks });
  };

  const handleOpenEditLinkModal = (idx) => {
    const currentLinks = getNormalizedLinks(resumeData);
    if (idx < 0 || idx >= currentLinks.length) return;
    setEditingLinkIndex(idx);
    setLinkForm({ name: currentLinks[idx].name, url: currentLinks[idx].url });
    setIsLinkModalOpen(true);
  };

  if (loading || !resumeData) {
    return (
      <div className="py-24 text-center text-xs font-bold text-slate-400 space-y-2">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600" />
        <p>Loading Resume Editor...</p>
      </div>
    );
  }

  // Quality check warnings
  const warnings = [];
  if (!resumeData.summary || resumeData.summary.length < 20) warnings.push('Professional Summary is missing or too short.');
  if (!resumeData.projects || resumeData.projects.length === 0) warnings.push('No projects listed. Adding 1–2 key projects boosts ATS score.');
  if (!resumeData.professionalLinks?.github && !resumeData.professionalLinks?.linkedin) warnings.push('No GitHub or LinkedIn link provided.');

  const getSectionDisplayName = (id, defaultTitle) => {
    const found = (resumeData.sectionSettings || []).find((s) => s.id === id);
    return found?.displayName || defaultTitle;
  };

  const presetColors = [
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Navy', hex: '#1e3a8a' },
    { name: 'Classic Black', hex: '#000000' },
    { name: 'Dark Slate', hex: '#374151' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Purple', hex: '#7c3aed' },
    { name: 'Crimson', hex: '#dc2626' },
    { name: 'Teal', hex: '#0d9488' },
    { name: 'Amber', hex: '#d97706' }
  ];

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-16">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student/resume-builder')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">{resumeData.resumeName}</h1>
            <p className="text-[11px] font-medium text-slate-400">Target Role: {resumeData.targetRole}</p>
          </div>
        </div>

        {/* Autosave Status & Buttons */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            {saveStatus === 'Saving...' ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Saved ✓
              </>
            )}
          </span>

          <button
            onClick={handleAnalyzeResume}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs border border-blue-200 transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Analyze ATS
          </button>

          <button
            onClick={handleSaveToProfileResume}
            disabled={savingToProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition cursor-pointer disabled:opacity-50"
            title="Upload and set this PDF as your official student profile resume"
          >
            {profileSaveSuccess ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />}
            {savingToProfile ? 'Saving...' : (profileSaveSuccess ? 'Saved to Profile ✓' : 'Set as Profile Resume')}
          </button>

          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden bg-slate-200 p-1 rounded-xl font-bold text-xs text-center">
        <button
          onClick={() => setMobileView('edit')}
          className={`flex-1 py-2 rounded-lg transition ${mobileView === 'edit' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
        >
          Editor
        </button>
        <button
          onClick={() => setMobileView('preview')}
          className={`flex-1 py-2 rounded-lg transition ${mobileView === 'preview' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
        >
          Live Preview
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: EDITOR FORM */}
        <div className={`md:col-span-6 lg:col-span-5 space-y-4 ${mobileView === 'preview' ? 'hidden md:block' : 'block'}`}>
          {/* Section Navigation Tabs */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-1 text-[11px] font-bold">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'personal' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'summary' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {getSectionDisplayName('summary', 'Summary')}
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'education' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {getSectionDisplayName('education', 'Education')}
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'skills' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {getSectionDisplayName('skills', 'Skills')}
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'projects' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {getSectionDisplayName('projects', 'Projects')}
            </button>
            <button
              onClick={() => setActiveTab('experience')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'experience' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {getSectionDisplayName('experience', 'Experience')}
            </button>
            <button
              onClick={() => setActiveTab('certifications')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'certifications' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {getSectionDisplayName('certifications', 'Certs')}
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'links' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {getSectionDisplayName('links', 'Links')}
            </button>
            <button
              onClick={() => setActiveTab('customSections')}
              className={`px-2.5 py-1.5 rounded-lg transition ${activeTab === 'customSections' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Custom Sections
            </button>
            <button
              onClick={() => setActiveTab('sectionOrder')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'sectionOrder' ? 'bg-slate-900 text-white' : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'}`}
            >
              <GripVertical className="h-3 w-3" /> Reorder Sections
            </button>
            <button
              onClick={() => setActiveTab('customization')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'customization' ? 'bg-blue-600 text-white' : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'}`}
            >
              <Palette className="h-3 w-3" /> Style & Fonts
            </button>
          </div>

          {/* Form Content Cards */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {/* 1. Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Personal Information</h3>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={resumeData.personalInfo?.fullName || ''}
                    onChange={(e) =>
                      handleDataChange({
                        ...resumeData,
                        personalInfo: { ...resumeData.personalInfo, fullName: e.target.value }
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Professional Title</label>
                  <input
                    type="text"
                    value={resumeData.personalInfo?.title || ''}
                    onChange={(e) =>
                      handleDataChange({
                        ...resumeData,
                        personalInfo: { ...resumeData.personalInfo, title: e.target.value }
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email</label>
                    <input
                      type="email"
                      value={resumeData.personalInfo?.email || ''}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          personalInfo: { ...resumeData.personalInfo, email: e.target.value }
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phone</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo?.phone || ''}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          personalInfo: { ...resumeData.personalInfo, phone: e.target.value }
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Location</label>
                  <input
                    type="text"
                    value={resumeData.personalInfo?.location || ''}
                    onChange={(e) =>
                      handleDataChange({
                        ...resumeData,
                        personalInfo: { ...resumeData.personalInfo, location: e.target.value }
                      })
                    }
                    placeholder="City, Country"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* 2. Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-2">
                  {getSectionDisplayName('summary', 'Professional Summary')}
                </h3>
                <p className="text-[11px] text-slate-500 italic">Content Guidance: Keep summary to 2–4 lines highlighting core stack and goal.</p>
                <textarea
                  rows="6"
                  value={resumeData.summary || ''}
                  onChange={(e) => handleDataChange({ ...resumeData, summary: e.target.value })}
                  placeholder="Write a concise overview of your background, skills, and engineering aspirations..."
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* 3. Multi-Entry Education Tab (ONLY 6 Core Fields) */}
            {activeTab === 'education' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {getSectionDisplayName('education', 'Education History')}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Drag handle <strong className="text-slate-800 font-bold">☰</strong> to reorder entries. Each entry supports independent score types (CGPA / Percentage / None).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xs transition shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Education
                  </button>
                </div>

                {/* Education Entries List */}
                <div className="space-y-4">
                  {(resumeData.education || []).map((edu, idx, arr) => {
                    const scoreType = edu.scoreType || 'CGPA';
                    const scoreVal = edu.score !== undefined ? edu.score : edu.cgpa || '';
                    const numScore = parseFloat(scoreVal);
                    let valWarning = '';

                    if (scoreType === 'CGPA' && scoreVal && (isNaN(numScore) || numScore < 0 || numScore > 10)) {
                      valWarning = 'CGPA should normally be between 0.0 and 10.0';
                    } else if (scoreType === 'PERCENTAGE' && scoreVal && (isNaN(numScore) || numScore < 0 || numScore > 100)) {
                      valWarning = 'Percentage should normally be between 0% and 100%';
                    }

                    const startY = parseInt(edu.startYear);
                    const endY = parseInt(edu.endYear);
                    let dateWarning = '';
                    if (startY && endY && endY < startY) {
                      dateWarning = 'End year cannot be earlier than start year.';
                    }

                    return (
                      <div
                        key={edu.id || idx}
                        draggable
                        onDragStart={(e) => {
                          setDraggedEduIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedEduIndex === null || draggedEduIndex === idx) return;
                          const list = [...(resumeData.education || [])];
                          const [draggedItem] = list.splice(draggedEduIndex, 1);
                          list.splice(idx, 0, draggedItem);
                          list.forEach((item, i) => (item.order = i));
                          setDraggedEduIndex(null);
                          handleDataChange({ ...resumeData, education: list });
                        }}
                        className={`p-4 rounded-2xl border bg-slate-50/70 space-y-3 transition ${
                          draggedEduIndex === idx ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200' : 'border-slate-200 shadow-2xs'
                        }`}
                      >
                        {/* Header & Controls */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700" title="Drag to reorder entry">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              Entry #{idx + 1}: {edu.degree || 'Degree'} ({edu.institution || 'Institute'})
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveEducation(idx, 'up')}
                              className="p-1 rounded bg-white border border-slate-200 hover:bg-blue-50 disabled:opacity-30"
                              title="Move Entry Up"
                            >
                              <MoveUp className="h-3 w-3 text-slate-600" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === arr.length - 1}
                              onClick={() => handleMoveEducation(idx, 'down')}
                              className="p-1 rounded bg-white border border-slate-200 hover:bg-blue-50 disabled:opacity-30"
                              title="Move Entry Down"
                            >
                              <MoveDown className="h-3 w-3 text-slate-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEducation(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                              title="Delete Education Entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Strictly 6 Form Fields */}
                        <div className="space-y-3">
                          {/* 1. Institute Name * */}
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Institute Name *</label>
                            <input
                              type="text"
                              value={edu.institution || ''}
                              onChange={(e) => {
                                const copy = [...resumeData.education];
                                copy[idx].institution = e.target.value;
                                handleDataChange({ ...resumeData, education: copy });
                              }}
                              placeholder="e.g. Maharana Institute of Professional Studies, Kanpur"
                              className="w-full rounded-xl border border-slate-200 p-2.5 font-medium bg-white"
                            />
                          </div>

                          {/* 2. Degree / Qualification * & 3. Education Level / Type */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Degree / Qualification *</label>
                              <input
                                type="text"
                                value={edu.degree || ''}
                                onChange={(e) => {
                                  const copy = [...resumeData.education];
                                  copy[idx].degree = e.target.value;
                                  handleDataChange({ ...resumeData, education: copy });
                                }}
                                placeholder="e.g. B.Tech in Computer Science & Engineering (AI/ML)"
                                className="w-full rounded-xl border border-slate-200 p-2.5 font-medium bg-white"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Education Level / Type</label>
                              <select
                                value={edu.level || "Bachelor's Degree"}
                                onChange={(e) => {
                                  const copy = [...resumeData.education];
                                  copy[idx].level = e.target.value;
                                  handleDataChange({ ...resumeData, education: copy });
                                }}
                                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 bg-white"
                              >
                                <option value="Bachelor's Degree">Bachelor's Degree</option>
                                <option value="Master's Degree">Master's Degree</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Intermediate (12th)">Intermediate (12th)</option>
                                <option value="High School (10th)">High School (10th)</option>
                                <option value="Class 12">Class 12</option>
                                <option value="Class 10">Class 10</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          {/* 4. Academic Score Type & Score Field */}
                          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Academic Score Type</label>
                              <select
                                value={scoreType}
                                onChange={(e) => {
                                  const copy = [...resumeData.education];
                                  copy[idx].scoreType = e.target.value;
                                  handleDataChange({ ...resumeData, education: copy });
                                }}
                                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-slate-800 bg-slate-50"
                              >
                                <option value="CGPA">CGPA</option>
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="NONE">None</option>
                              </select>
                            </div>

                            {scoreType !== 'NONE' && (
                              <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                  {scoreType === 'CGPA' ? 'CGPA (0–10)' : 'Percentage % (0–100)'}
                                </label>
                                <input
                                  type="text"
                                  value={scoreVal}
                                  onChange={(e) => {
                                    const copy = [...resumeData.education];
                                    copy[idx].score = e.target.value;
                                    copy[idx].cgpa = e.target.value;
                                    handleDataChange({ ...resumeData, education: copy });
                                  }}
                                  placeholder={scoreType === 'CGPA' ? '8.5' : '85'}
                                  className="w-full rounded-xl border border-slate-200 p-2 font-medium bg-white"
                                />
                                {valWarning && (
                                  <span className="text-[10px] text-amber-600 font-semibold block mt-1">{valWarning}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 5. Start Year & 6. End Year */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold text-slate-700 block mb-1">Start Year</label>
                              <input
                                type="text"
                                value={edu.startYear || ''}
                                onChange={(e) => {
                                  const copy = [...resumeData.education];
                                  copy[idx].startYear = e.target.value;
                                  handleDataChange({ ...resumeData, education: copy });
                                }}
                                placeholder="2023"
                                className="w-full rounded-xl border border-slate-200 p-2.5 font-medium bg-white"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-slate-700 block mb-1">End Year</label>
                              <input
                                type="text"
                                value={edu.endYear || ''}
                                onChange={(e) => {
                                  const copy = [...resumeData.education];
                                  copy[idx].endYear = e.target.value;
                                  handleDataChange({ ...resumeData, education: copy });
                                }}
                                placeholder="2027"
                                className="w-full rounded-xl border border-slate-200 p-2.5 font-medium bg-white"
                              />
                            </div>
                          </div>

                          {dateWarning && (
                            <span className="text-xs text-rose-600 font-bold block pt-1">{dateWarning}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Fully Editable Technical Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {getSectionDisplayName('skills', 'Technical Skills')}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Add, rename, reorder (drag ☰), hide, or move skills between categories.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xs transition shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Skill Category
                  </button>
                </div>

                {/* Skill Categories List */}
                <div className="space-y-4">
                  {(resumeData.skills?.categories || []).map((cat, cIdx, cArr) => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedCatIndex(cIdx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedCatIndex === null || draggedCatIndex === cIdx) return;
                        const categories = [...(resumeData.skills?.categories || [])];
                        const [draggedItem] = categories.splice(draggedCatIndex, 1);
                        categories.splice(cIdx, 0, draggedItem);
                        categories.forEach((c, idx) => (c.order = idx));
                        setDraggedCatIndex(null);
                        handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
                      }}
                      className={`p-4 rounded-2xl border transition ${
                        cat.visible === false ? 'bg-slate-100/70 border-slate-200 opacity-60' : 'bg-slate-50/70 border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700" title="Drag to reorder category">
                            <GripVertical className="h-4 w-4" />
                          </span>

                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => handleRenameCategory(cat.id, e.target.value)}
                            className="font-bold text-slate-900 border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:border-blue-500"
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={cIdx === 0}
                            onClick={() => handleMoveCategory(cIdx, 'up')}
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-blue-50 disabled:opacity-30"
                            title="Move Category Up"
                          >
                            <MoveUp className="h-3 w-3 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            disabled={cIdx === cArr.length - 1}
                            onClick={() => handleMoveCategory(cIdx, 'down')}
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-blue-50 disabled:opacity-30"
                            title="Move Category Down"
                          >
                            <MoveDown className="h-3 w-3 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryVisible(cat.id)}
                            className={`p-1 rounded border transition ${
                              cat.visible !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-200 border-slate-300 text-slate-500'
                            }`}
                            title={cat.visible !== false ? 'Hide Category' : 'Show Category'}
                          >
                            {cat.visible !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1 rounded border border-slate-200 hover:bg-rose-50 text-rose-500 hover:text-rose-700"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Individual Skills List */}
                      <div className="space-y-1.5">
                        {(cat.skills || []).map((skill, sIdx, sArr) => {
                          const sId = skill.id || `skill_${sIdx}`;
                          const sName = typeof skill === 'string' ? skill : skill.name;
                          const isEditing = editingSkillId === sId;

                          return (
                            <div
                              key={sId}
                              draggable
                              onDragStart={(e) => {
                                setDraggedSkillState({ catId: cat.id, index: sIdx });
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (!draggedSkillState || draggedSkillState.catId !== cat.id || draggedSkillState.index === sIdx) return;
                                const categories = (resumeData.skills?.categories || []).map((c) => {
                                  if (c.id === cat.id) {
                                    const skillsList = [...(c.skills || [])];
                                    const [draggedItem] = skillsList.splice(draggedSkillState.index, 1);
                                    skillsList.splice(sIdx, 0, draggedItem);
                                    skillsList.forEach((s, i) => (s.order = i));
                                    return { ...c, skills: skillsList };
                                  }
                                  return c;
                                });
                                setDraggedSkillState(null);
                                handleDataChange({ ...resumeData, skills: { ...resumeData.skills, categories } });
                              }}
                              className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600" title="Drag to reorder skill">
                                  <GripVertical className="h-3.5 w-3.5" />
                                </span>

                                {isEditing ? (
                                  <div className="flex items-center gap-1 flex-1">
                                    <input
                                      type="text"
                                      value={editingSkillName}
                                      onChange={(e) => setEditingSkillName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEditSkill(cat.id, sId);
                                      }}
                                      className="font-semibold text-slate-900 border border-blue-500 rounded px-2 py-0.5 text-xs flex-1 focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditSkill(cat.id, sId)}
                                      className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSkillId(null);
                                        setEditingSkillName('');
                                      }}
                                      className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-slate-800">{sName}</span>
                                )}
                              </div>

                              {!isEditing && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={sIdx === 0}
                                    onClick={() => handleMoveSkillInCat(cat.id, sIdx, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                    title="Move Skill Up"
                                  >
                                    <MoveUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sIdx === sArr.length - 1}
                                    onClick={() => handleMoveSkillInCat(cat.id, sIdx, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                    title="Move Skill Down"
                                  >
                                    <MoveDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSkillId(sId);
                                      setEditingSkillName(sName);
                                    }}
                                    className="p-1 text-blue-600 hover:text-blue-800"
                                    title="Edit Skill Name"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMoveSkillModal({
                                        fromCatId: cat.id,
                                        skillId: sId,
                                        skillName: sName
                                      })
                                    }
                                    className="p-1 text-purple-600 hover:text-purple-800"
                                    title="Move to another category"
                                  >
                                    <MoveRight className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSkill(cat.id, sId, sName)}
                                    className="p-1 text-rose-500 hover:text-rose-700"
                                    title="Remove Skill"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Skill Input */}
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="text"
                            value={newSkillInputs[cat.id] || ''}
                            onChange={(e) =>
                              setNewSkillInputs({ ...newSkillInputs, [cat.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddSkillToCategory(cat.id);
                            }}
                            placeholder="Type new skill name (e.g. Docker, TypeScript)..."
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-xs bg-white focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSkillToCategory(cat.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs border border-blue-200 transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Skill
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Projects Tab */}
            {activeTab === 'projects' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {getSectionDisplayName('projects', 'Projects')}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      handleDataChange({
                        ...resumeData,
                        projects: [
                          ...(resumeData.projects || []),
                          { name: '', technologies: '', description: '' }
                        ]
                      })
                    }
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Project
                  </button>
                </div>

                {resumeData.projects?.map((proj, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Project #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDataChange({
                            ...resumeData,
                            projects: resumeData.projects.filter((_, i) => i !== idx)
                          })
                        }
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => {
                        const copy = [...resumeData.projects];
                        copy[idx].name = e.target.value;
                        handleDataChange({ ...resumeData, projects: copy });
                      }}
                      placeholder="Project Title"
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />

                    <input
                      type="text"
                      value={proj.technologies}
                      onChange={(e) => {
                        const copy = [...resumeData.projects];
                        copy[idx].technologies = e.target.value;
                        handleDataChange({ ...resumeData, projects: copy });
                      }}
                      placeholder="Tech Stack (e.g. React, Node.js, MongoDB)"
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />

                    <textarea
                      rows="3"
                      value={proj.description}
                      onChange={(e) => {
                        const copy = [...resumeData.projects];
                        copy[idx].description = e.target.value;
                        handleDataChange({ ...resumeData, projects: copy });
                      }}
                      placeholder="Project description & key contributions..."
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={proj.githubUrl || ''}
                        onChange={(e) => {
                          const copy = [...resumeData.projects];
                          copy[idx].githubUrl = e.target.value;
                          handleDataChange({ ...resumeData, projects: copy });
                        }}
                        placeholder="GitHub URL"
                        className="rounded-lg border border-slate-200 p-2 font-medium bg-white"
                      />
                      <input
                        type="text"
                        value={proj.demoUrl || ''}
                        onChange={(e) => {
                          const copy = [...resumeData.projects];
                          copy[idx].demoUrl = e.target.value;
                          handleDataChange({ ...resumeData, projects: copy });
                        }}
                        placeholder="Live Demo URL"
                        className="rounded-lg border border-slate-200 p-2 font-medium bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Experience Tab */}
            {activeTab === 'experience' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {getSectionDisplayName('experience', 'Work Experience')}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      handleDataChange({
                        ...resumeData,
                        experience: [
                          ...(resumeData.experience || []),
                          { company: '', title: '', startDate: '', endDate: '', description: '' }
                        ]
                      })
                    }
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Experience
                  </button>
                </div>

                {resumeData.experience?.map((exp, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Experience #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDataChange({
                            ...resumeData,
                            experience: resumeData.experience.filter((_, i) => i !== idx)
                          })
                        }
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => {
                        const copy = [...resumeData.experience];
                        copy[idx].company = e.target.value;
                        handleDataChange({ ...resumeData, experience: copy });
                      }}
                      placeholder="Company Name"
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />

                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => {
                        const copy = [...resumeData.experience];
                        copy[idx].title = e.target.value;
                        handleDataChange({ ...resumeData, experience: copy });
                      }}
                      placeholder="Role Title"
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />

                    <textarea
                      rows="3"
                      value={exp.description}
                      onChange={(e) => {
                        const copy = [...resumeData.experience];
                        copy[idx].description = e.target.value;
                        handleDataChange({ ...resumeData, experience: copy });
                      }}
                      placeholder="Key achievements and responsibilities..."
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 7. Certifications Tab */}
            {activeTab === 'certifications' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {getSectionDisplayName('certifications', 'Certifications')}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      handleDataChange({
                        ...resumeData,
                        certifications: [
                          ...(resumeData.certifications || []),
                          { name: '', organization: '', date: '' }
                        ]
                      })
                    }
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Certification
                  </button>
                </div>

                {resumeData.certifications?.map((cert, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Cert #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDataChange({
                            ...resumeData,
                            certifications: resumeData.certifications.filter((_, i) => i !== idx)
                          })
                        }
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={cert.name}
                      onChange={(e) => {
                        const copy = [...resumeData.certifications];
                        copy[idx].name = e.target.value;
                        handleDataChange({ ...resumeData, certifications: copy });
                      }}
                      placeholder="Certification Name"
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />

                    <input
                      type="text"
                      value={cert.organization}
                      onChange={(e) => {
                        const copy = [...resumeData.certifications];
                        copy[idx].organization = e.target.value;
                        handleDataChange({ ...resumeData, certifications: copy });
                      }}
                      placeholder="Issuing Organization"
                      className="w-full rounded-lg border border-slate-200 p-2 font-medium bg-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 8. Links & Profiles Tab */}
            {activeTab === 'links' && (() => {
              const currentLinksList = getNormalizedLinks(resumeData);
              return (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {getSectionDisplayName('links', 'Links & Profiles')}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Manage all your professional profile links and custom URLs rendered in your resume header.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLinkIndex(null);
                        setLinkForm({ name: '', url: '' });
                        setIsLinkModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-xs shrink-0 text-xs"
                    >
                      <Plus className="h-4 w-4" /> Add Link
                    </button>
                  </div>

                  <div className="space-y-2.5 mt-3">
                    {currentLinksList.map((link, idx) => (
                      <div
                        key={link.id || idx}
                        className={`flex items-center justify-between p-3 rounded-xl border transition ${
                          link.visible !== false ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <GripVertical className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{link.name}</span>
                              {link.visible === false && (
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline truncate block text-[11px] mt-0.5 font-medium"
                            >
                              {link.url}
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleToggleLinkVisibility(idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              link.visible !== false
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {link.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {link.visible !== false ? 'Shown' : 'Hidden'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditLinkModal(idx)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                            title="Edit Link"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveLink(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
                            title="Move Up"
                          >
                            <MoveUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveLink(idx, 'down')}
                            disabled={idx === currentLinksList.length - 1}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
                            title="Move Down"
                          >
                            <MoveDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLink(idx)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                            title="Delete Link"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {currentLinksList.length === 0 && (
                      <div className="text-center py-8 border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
                        <p className="text-slate-500 font-medium">No links added yet.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLinkIndex(null);
                            setLinkForm({ name: '', url: '' });
                            setIsLinkModalOpen(true);
                          }}
                          className="mt-2 text-blue-600 hover:underline font-bold text-xs"
                        >
                          + Add your first link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 9. Custom Sections Tab */}
            {activeTab === 'customSections' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Custom Sections</h3>
                  <button
                    type="button"
                    onClick={handleAddCustomSection}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Custom Section
                  </button>
                </div>

                {(resumeData.sectionSettings || []).filter((s) => s.type === 'custom').length === 0 ? (
                  <p className="text-slate-400 font-medium py-4 text-center">
                    No custom sections created yet. Click <strong className="text-blue-600">+ Add Custom Section</strong> to create one (e.g. Leadership, Publications, Key Coursework).
                  </p>
                ) : (
                  (resumeData.sectionSettings || [])
                    .filter((s) => s.type === 'custom')
                    .map((sec) => (
                      <div key={sec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={sec.displayName}
                            onChange={(e) => handleRenameSection(sec.id, e.target.value)}
                            placeholder="Section Title"
                            className="font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomSection(sec.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <textarea
                          rows="4"
                          value={sec.content || ''}
                          onChange={(e) => handleCustomContentChange(sec.id, e.target.value)}
                          placeholder="Enter details, achievements, or bullet points..."
                          className="w-full rounded-lg border border-slate-200 p-2.5 font-medium bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    ))
                )}
              </div>
            )}

            {/* 10. Free Drag & Drop Section Reordering Tab */}
            {activeTab === 'sectionOrder' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">SECTION ORDER & DISPLAY TITLES</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Drag handle <strong className="text-slate-800 font-bold">☰</strong> to place any section anywhere. Header details remain pinned at top.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomSection}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Custom Section
                  </button>
                </div>

                <div className="space-y-2">
                  {(resumeData.sectionSettings || []).map((sec, idx, arr) => (
                    <div
                      key={sec.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedSectionIndex(idx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedSectionIndex === null || draggedSectionIndex === idx) return;
                        const items = [...(resumeData.sectionSettings || [])];
                        const [draggedItem] = items.splice(draggedSectionIndex, 1);
                        items.splice(idx, 0, draggedItem);
                        items.forEach((item, i) => (item.order = i));
                        setDraggedSectionIndex(null);
                        handleDataChange({ ...resumeData, sectionSettings: items });
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                        draggedSectionIndex === idx
                          ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                          : sec.visible === false
                          ? 'bg-slate-100/70 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Drag Handle ☰ */}
                      <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-1" title="Drag to reorder section">
                        <GripVertical className="h-4 w-4" />
                      </span>

                      {/* Display Name Input */}
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {sec.type === 'custom' ? 'Custom Section' : `Default: ${sec.defaultName}`}
                        </span>
                        <input
                          type="text"
                          value={sec.displayName}
                          onChange={(e) => handleRenameSection(sec.id, e.target.value)}
                          className="w-full font-bold text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:border-blue-500"
                        />
                      </div>

                      {/* Accessibility Fallback ↑ ↓ Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSection(idx, 'up')}
                          className="p-1 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-30"
                          title="Move Up"
                        >
                          <MoveUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === arr.length - 1}
                          onClick={() => moveSection(idx, 'down')}
                          className="p-1 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-30"
                          title="Move Down"
                        >
                          <MoveDown className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(sec.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition ${
                          sec.visible !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {sec.visible !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {sec.visible !== false ? 'Shown' : 'Hidden'}
                      </button>

                      {/* Delete button for custom sections */}
                      {sec.type === 'custom' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomSection(sec.id)}
                          className="text-rose-500 hover:text-rose-700 p-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 11. Style & Formatting Tab */}
            {activeTab === 'customization' && (
              <div className="space-y-5 text-xs">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Templates & Formatting Options</h3>

                {/* Template Choice */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Template</label>
                  <select
                    value={resumeData.template || 'Classic'}
                    onChange={(e) => handleDataChange({ ...resumeData, template: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800"
                  >
                    <option value="Classic">Classic Template (Standard Corporate)</option>
                    <option value="Modern">Modern Template (Clean & Accent Borders)</option>
                    <option value="Minimal">Minimal Template (Sleek Typography)</option>
                    <option value="Professional">Professional Template (Executive)</option>
                    <option value="ATS Friendly">ATS Friendly (Single Column)</option>
                  </select>
                </div>

                {/* ATS Mode Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 block">ATS Friendly Mode</span>
                    <span className="text-[11px] text-slate-500 font-medium">Enforces clean single column, dark text for 100% parser pass rates</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={resumeData.atsMode || false}
                    onChange={(e) => handleDataChange({ ...resumeData, atsMode: e.target.checked })}
                    className="h-5 w-5 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                {/* Accent Color Customization */}
                <div className="space-y-2 border-t pt-3">
                  <label className="font-bold text-slate-700 block">Accent Color Swatches</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {presetColors.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        title={col.name}
                        onClick={() =>
                          handleDataChange({
                            ...resumeData,
                            customization: { ...resumeData.customization, accentColor: col.hex }
                          })
                        }
                        className={`h-7 w-7 rounded-full transition border cursor-pointer ${
                          resumeData.customization?.accentColor === col.hex ? 'scale-115 border-slate-900 ring-2 ring-blue-300' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      />
                    ))}
                  </div>

                  {/* Custom Hex Color Picker */}
                  <div className="flex items-center gap-3 pt-2">
                    <label className="font-bold text-slate-700 text-xs">Custom Hex Picker:</label>
                    <input
                      type="color"
                      value={resumeData.customization?.accentColor || '#2563eb'}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          customization: { ...resumeData.customization, accentColor: e.target.value }
                        })
                      }
                      className="h-8 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={resumeData.customization?.accentColor || '#2563eb'}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          customization: { ...resumeData.customization, accentColor: e.target.value }
                        })
                      }
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono font-bold text-slate-800 text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Heading Style */}
                <div className="border-t pt-3 space-y-1.5">
                  <label className="font-bold text-slate-700 block">Heading Style</label>
                  <select
                    value={resumeData.customization?.headingStyle || 'bold-border'}
                    onChange={(e) =>
                      handleDataChange({
                        ...resumeData,
                        customization: { ...resumeData.customization, headingStyle: e.target.value }
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 text-xs"
                  >
                    <option value="bold-border">Bold + Bottom Border</option>
                    <option value="bold-underline">Bold + Underline</option>
                    <option value="bold-only">Bold Text Only</option>
                    <option value="uppercase">Uppercase Bold</option>
                  </select>
                </div>

                {/* Typography Controls */}
                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Font Family</label>
                    <select
                      value={resumeData.customization?.fontFamily || 'Inter'}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          customization: { ...resumeData.customization, fontFamily: e.target.value }
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2 font-medium text-xs"
                    >
                      <option value="Inter">Inter (Sans-Serif)</option>
                      <option value="Roboto">Roboto (Sans-Serif)</option>
                      <option value="Open Sans">Open Sans (Sans-Serif)</option>
                      <option value="Lato">Lato (Sans-Serif)</option>
                      <option value="Georgia">Georgia (Serif)</option>
                      <option value="Garamond">Garamond (Serif)</option>
                      <option value="Courier New">Courier New (Monospace)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Base Font Size</label>
                    <select
                      value={resumeData.customization?.fontSize || 10}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          customization: { ...resumeData.customization, fontSize: parseFloat(e.target.value) }
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2 font-medium text-xs"
                    >
                      <option value="9">9 pt (Compact)</option>
                      <option value="9.5">9.5 pt</option>
                      <option value="10">10 pt (Standard)</option>
                      <option value="10.5">10.5 pt</option>
                      <option value="11">11 pt (Large)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Heading Size</label>
                    <select
                      value={resumeData.customization?.headingSize || 12}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          customization: { ...resumeData.customization, headingSize: parseFloat(e.target.value) }
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2 font-medium text-xs"
                    >
                      <option value="11">11 pt (Small)</option>
                      <option value="12">12 pt (Medium)</option>
                      <option value="14">14 pt (Large)</option>
                      <option value="16">16 pt (Extra Large)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Margins</label>
                    <select
                      value={resumeData.customization?.margins || 'Normal'}
                      onChange={(e) =>
                        handleDataChange({
                          ...resumeData,
                          customization: { ...resumeData.customization, margins: e.target.value }
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-2 font-medium text-xs"
                    >
                      <option value="Compact">Compact (Small Paddings)</option>
                      <option value="Normal">Normal (Balanced A4)</option>
                      <option value="Spacious">Spacious (Wide Margins)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quality Check Card */}
          {warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-medium space-y-2">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Quality Check Warnings
              </span>
              <ul className="space-y-1 text-amber-900">
                {warnings.map((w, idx) => (
                  <li key={idx}>&bull; {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <div className={`md:col-span-6 lg:col-span-7 space-y-4 ${mobileView === 'edit' ? 'hidden md:block' : 'block'}`}>
          <div className="bg-slate-100 p-4 rounded-3xl border border-slate-200 shadow-inner space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-2">
              <span>Live Printable A4 Preview</span>
              <span>
                Template: <strong className="text-slate-900">{resumeData.atsMode ? 'ATS Friendly' : resumeData.template}</strong>
              </span>
            </div>

            {/* Template Container */}
            <div className="overflow-x-auto rounded-2xl bg-white shadow-xl">
              <TemplateDispatcher data={resumeData} />
            </div>
          </div>
        </div>
      </div>

      {/* MOVE SKILL MODAL */}
      {moveSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-slate-900 text-sm">
              Move "{moveSkillModal.skillName}" to Category:
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(resumeData.skills?.categories || [])
                .filter((c) => c.id !== moveSkillModal.fromCatId)
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      handleTransferSkillToCategory(
                        moveSkillModal.fromCatId,
                        moveSkillModal.skillId,
                        cat.id
                      )
                    }
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 font-semibold text-slate-800 text-xs transition flex items-center justify-between"
                  >
                    <span>{cat.name}</span>
                    <MoveRight className="h-4 w-4 text-purple-600" />
                  </button>
                ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMoveSkillModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT LINK MODAL */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingLinkIndex !== null ? 'Edit Link' : 'Add New Link'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Link Name *</label>
                <input
                  type="text"
                  value={linkForm.name}
                  onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                  placeholder="e.g. Portfolio, GitHub, LinkedIn, LeetCode, CodeChef"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Link URL *</label>
                <input
                  type="text"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  placeholder="e.g. https://github.com/username or portfolio.com"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  If https:// is omitted, it will be added automatically.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLinkModal}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs"
              >
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeEditor;

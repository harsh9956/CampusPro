import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Building,
  BookOpen,
  Eye,
  Edit,
  Trash2,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  RotateCcw
} from 'lucide-react';
import questionService from '../../services/questionService';
import API from '../../services/api';

const STANDARD_TOPICS = [
  'Java',
  'C',
  'C++',
  'Python',
  'JavaScript',
  'React',
  'HTML',
  'CSS',
  'SQL',
  'DBMS',
  'OOP',
  'Operating System',
  'Computer Networks',
  'DSA',
  'Aptitude',
  'HR'
];

const ROUND_TYPES = [
  'Technical',
  'Coding',
  'Aptitude',
  'Technical Round 1',
  'Technical Round 2',
  'HR',
  'Managerial',
  'Other'
];

const FacultyQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    publishedCount: 0,
    draftCount: 0,
    companiesCount: 0,
    topicsCount: 0,
    highFrequencyCount: 0
  });
  const [dbCompanies, setDbCompanies] = useState([]);
  const [allTopics, setAllTopics] = useState(STANDARD_TOPICS);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedRoundType, setSelectedRoundType] = useState('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Notifications
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Form State
  const [form, setForm] = useState({
    questionText: '',
    answer: '',
    explanation: '',
    selectedCompanies: [],
    customCompany: '',
    topic: 'Java',
    customTopic: '',
    difficulty: 'Medium',
    roundType: 'Technical',
    frequency: 'High',
    yearAsked: 2026,
    tagsStr: '',
    status: 'PUBLISHED',
    isMcq: false,
    options: ['', '', '', ''],
    correctOptionIndex: 0
  });
  const [formError, setFormError] = useState(null);

  // Load Data
  const loadData = async (pageNum = 1) => {
    setLoading(true);
    try {
      const [compRes, qRes, statsRes, metaRes] = await Promise.all([
        API.get('/companies').catch(() => ({ data: [] })),
        questionService.getQuestions({
          page: pageNum,
          limit: 15,
          search,
          company: selectedCompany,
          topic: selectedTopic,
          difficulty: selectedDifficulty,
          roundType: selectedRoundType,
          frequency: selectedFrequency,
          status: selectedStatus
        }),
        questionService.getQuestionStats(),
        questionService.getQuestionMeta()
      ]);

      if (Array.isArray(compRes.data)) {
        setDbCompanies(compRes.data);
      }

      const qData = qRes.data || qRes;
      setQuestions(Array.isArray(qData) ? qData : qData.data || []);
      setTotalCount(qData.total || (Array.isArray(qData) ? qData.length : 0));
      setTotalPages(qData.pages || 1);
      setPage(qData.page || pageNum);

      if (statsRes && statsRes.data) {
        setStats(statsRes.data);
      }

      if (metaRes && metaRes.data) {
        if (metaRes.data.topics?.length) {
          setAllTopics(Array.from(new Set([...STANDARD_TOPICS, ...metaRes.data.topics])));
        }
        if (metaRes.data.dbCompanies?.length && (!compRes.data || compRes.data.length === 0)) {
          setDbCompanies(metaRes.data.dbCompanies);
        }
      }
    } catch (err) {
      console.error('Error loading question bank:', err);
      showToast('Failed to load questions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [selectedCompany, selectedTopic, selectedDifficulty, selectedRoundType, selectedFrequency, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData(1);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedCompany('ALL');
    setSelectedTopic('ALL');
    setSelectedDifficulty('ALL');
    setSelectedRoundType('ALL');
    setSelectedFrequency('ALL');
    setSelectedStatus('ALL');
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getCompanyDisplay = (q) => {
    if (Array.isArray(q.companies) && q.companies.length > 0) {
      const names = q.companies.map((c) => (typeof c === 'object' ? c.name : c)).filter(Boolean);
      if (names.length > 0) return names.join(', ');
    }
    if (q.company && typeof q.company === 'object' && q.company.name) {
      return q.company.name;
    }
    if (Array.isArray(q.companyNames) && q.companyNames.length > 0) {
      return q.companyNames.join(', ');
    }
    if (q.companyName) return q.companyName;
    return 'N/A';
  };

  const openCreateModal = () => {
    setEditingQuestionId(null);
    setForm({
      questionText: '',
      answer: '',
      explanation: '',
      selectedCompanies: dbCompanies.length > 0 ? [dbCompanies[0]] : [],
      customCompany: '',
      topic: 'Java',
      customTopic: '',
      difficulty: 'Medium',
      roundType: 'Technical',
      frequency: 'High',
      yearAsked: 2026,
      tagsStr: '',
      status: 'PUBLISHED',
      isMcq: true,
      options: ['', '', '', ''],
      correctOptionIndex: 0
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestionId(q._id);
    const existingTopicIsStandard = STANDARD_TOPICS.includes(q.topic);

    let initialSelected = [];
    if (Array.isArray(q.companies) && q.companies.length > 0) {
      initialSelected = q.companies
        .map((c) => (typeof c === 'object' ? c : dbCompanies.find((dbc) => dbc._id === c) || { _id: c, name: 'Company' }))
        .filter(Boolean);
    } else if (q.company) {
      const comp = typeof q.company === 'object' ? q.company : dbCompanies.find((dbc) => dbc._id === q.company) || { _id: q.company, name: q.companyName || 'Company' };
      if (comp) initialSelected = [comp];
    } else if (q.companyNames && q.companyNames.length > 0) {
      initialSelected = dbCompanies.filter((dbc) => q.companyNames.includes(dbc.name));
    }

    const hasOptions = Array.isArray(q.options) && q.options.length >= 2;

    setForm({
      questionText: q.questionText || q.question || '',
      answer: q.answer || '',
      explanation: q.explanation || '',
      selectedCompanies: initialSelected,
      customCompany: '',
      topic: existingTopicIsStandard ? q.topic : 'CUSTOM',
      customTopic: existingTopicIsStandard ? '' : q.topic,
      difficulty: q.difficulty || 'Medium',
      roundType: q.roundType || 'Technical',
      frequency: q.frequency || 'High',
      yearAsked: q.yearAsked || q.askedInYear || 2026,
      tagsStr: (q.tags || []).join(', '),
      status: q.status || 'PUBLISHED',
      isMcq: hasOptions,
      options: hasOptions ? [...q.options, '', '', ''].slice(0, 4) : ['', '', '', ''],
      correctOptionIndex: q.correctOptionIndex !== undefined && q.correctOptionIndex !== null ? q.correctOptionIndex : 0
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCreateCustomCompany = async () => {
    const nameStr = form.customCompany.trim();
    if (!nameStr) return;

    const existingInList = dbCompanies.find(
      (c) => c.name.toLowerCase() === nameStr.toLowerCase()
    );

    if (existingInList) {
      if (!form.selectedCompanies.some((sc) => sc._id === existingInList._id)) {
        setForm((prev) => ({
          ...prev,
          selectedCompanies: [...prev.selectedCompanies, existingInList],
          customCompany: ''
        }));
        showToast(`Selected existing company "${existingInList.name}".`, 'success');
      } else {
        showToast(`Company "${existingInList.name}" is already selected.`, 'info');
        setForm((prev) => ({ ...prev, customCompany: '' }));
      }
      return;
    }

    setCreatingCompany(true);
    setFormError(null);
    try {
      const res = await API.post('/companies', { name: nameStr });
      const newComp = res.data;
      showToast(`Created new company "${newComp.name}" in MongoDB!`, 'success');

      setDbCompanies((prev) => [newComp, ...prev]);
      setForm((prev) => ({
        ...prev,
        selectedCompanies: [...prev.selectedCompanies, newComp],
        customCompany: ''
      }));
    } catch (err) {
      console.error('Error creating custom company:', err);
      setFormError(err.response?.data?.message || 'Failed to create company in database.');
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const qText = form.questionText.trim();
    const ans = form.answer.trim();
    const finalTopic = form.topic === 'CUSTOM' ? form.customTopic.trim() : form.topic.trim();

    if (!qText) {
      setFormError('Question text is required.');
      return;
    }
    if (!ans && !form.isMcq) {
      setFormError('Answer / Solution is required.');
      return;
    }
    if (!finalTopic) {
      setFormError('Topic is required.');
      return;
    }
    if (!form.selectedCompanies || form.selectedCompanies.length === 0) {
      setFormError('Please select or add at least one company from the database.');
      return;
    }

    if (form.isMcq) {
      const validOpts = form.options.map((o) => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        setFormError('MCQ Questions require at least two non-empty options.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const companyIds = form.selectedCompanies.map((c) => c._id);
      const companyNames = form.selectedCompanies.map((c) => c.name);

      const payload = {
        questionText: qText,
        question: qText,
        answer: ans || (form.isMcq ? form.options[form.correctOptionIndex] : ''),
        explanation: form.explanation.trim(),
        companies: companyIds,
        companyId: companyIds[0],
        companyNames,
        companyName: companyNames.join(', '),
        topic: finalTopic,
        difficulty: form.difficulty,
        roundType: form.roundType,
        frequency: form.frequency,
        yearAsked: parseInt(form.yearAsked, 10) || 2026,
        tags: form.tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
        status: form.status
      };

      if (form.isMcq) {
        payload.options = form.options.map((o) => o.trim()).filter(Boolean);
        payload.correctOptionIndex = Number(form.correctOptionIndex) || 0;
        payload.questionType = 'Multiple Choice';
      }

      if (editingQuestionId) {
        await questionService.updateQuestion(editingQuestionId, payload);
        showToast('Question updated successfully.', 'success');
      } else {
        await questionService.createQuestion(payload);
        showToast('Question added successfully.', 'success');
      }

      setShowAddModal(false);
      await loadData(page);
    } catch (err) {
      console.error('Error saving question:', err);
      setFormError(err.response?.data?.message || 'Failed to save question.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return;
    setSubmitting(true);
    try {
      await questionService.deleteQuestion(deletingQuestion._id);
      showToast('Question deleted successfully.', 'success');
      setDeletingQuestion(null);
      await loadData(page);
    } catch (err) {
      console.error('Error deleting question:', err);
      showToast(err.response?.data?.message || 'Failed to delete question.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl px-5 py-3.5 text-xs font-black shadow-2xl flex items-center gap-2 border transition ${
            toastType === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastType === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Faculty Question Bank</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create, publish, and manage company-specific technical & MCQ interview questions
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" /> + Add Question
        </button>
      </div>

      {/* Statistics Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-blue-50 text-blue-600 mx-auto mb-2">
            <HelpCircle className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-400 block uppercase">Total</span>
          <span className="text-xl font-black text-slate-900">{stats.totalQuestions}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 mx-auto mb-2">
            <CheckCircle className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-400 block uppercase">Published</span>
          <span className="text-xl font-black text-emerald-600">{stats.publishedCount}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 text-amber-600 mx-auto mb-2">
            <AlertCircle className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-400 block uppercase">Drafts</span>
          <span className="text-xl font-black text-amber-600">{stats.draftCount}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-purple-50 text-purple-600 mx-auto mb-2">
            <Building className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-400 block uppercase">Companies</span>
          <span className="text-xl font-black text-purple-600">{dbCompanies.length || stats.companiesCount}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 mx-auto mb-2">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-400 block uppercase">Topics</span>
          <span className="text-xl font-black text-indigo-600">{stats.topicsCount}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-rose-50 text-rose-600 mx-auto mb-2">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-400 block uppercase">High Freq</span>
          <span className="text-xl font-black text-rose-600">{stats.highFrequencyCount}</span>
        </div>
      </div>

      {/* Search & Multi-Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions by text, company, topic, tags..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Companies</option>
              {dbCompanies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Topics</option>
              {allTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Round Type</label>
            <select
              value={selectedRoundType}
              onChange={(e) => setSelectedRoundType(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Rounds</option>
              {ROUND_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Frequency</label>
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Frequencies</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        {(search || selectedCompany !== 'ALL' || selectedTopic !== 'ALL' || selectedDifficulty !== 'ALL' || selectedRoundType !== 'ALL' || selectedFrequency !== 'ALL' || selectedStatus !== 'ALL') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium mt-3">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium">
          {totalCount === 0 && !search && selectedCompany === 'ALL'
            ? 'No questions added yet.'
            : 'No questions found for the selected filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const qTitle = q.questionText || q.question || 'Untitled Question';
            const companyDisplay = getCompanyDisplay(q);
            const isMcq = Array.isArray(q.options) && q.options.length >= 2;

            return (
              <div key={q._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-blue-50 text-blue-800 font-black px-2.5 py-0.5 rounded-full border border-blue-100">
                      {q.topic}
                    </span>
                    <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                      <Building className="h-3 w-3 text-blue-600" /> {companyDisplay}
                    </span>
                    {isMcq ? (
                      <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                        MCQ Ready
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                        Descriptive / Interview
                      </span>
                    )}
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                      {q.roundType} Round
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        q.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {q.status}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => setViewingQuestion(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition"
                        title="Edit Question"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingQuestion(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                        title="Delete Question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">{qTitle}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{q.answer}</p>
                </div>

                {isMcq && (
                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
                    {q.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-1.5 rounded-lg border ${
                          idx === q.correctOptionIndex
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}. {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
          <span className="text-slate-500 font-semibold">
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} Questions)
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => loadData(page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => loadData(page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT QUESTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingQuestionId ? 'Edit Question' : '+ Add New Question'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Question Text */}
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Question Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={form.questionText}
                  onChange={(e) => setForm({ ...form, questionText: e.target.value })}
                  placeholder="e.g. What is polymorphism in Java?"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {/* MCQ Options Toggle */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-purple-900 uppercase">Include MCQ Options (For Mock Test Compatibility)</label>
                  <input
                    type="checkbox"
                    checked={form.isMcq}
                    onChange={(e) => setForm({ ...form, isMcq: e.target.checked })}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>

                {form.isMcq && (
                  <div className="space-y-2 pt-1">
                    <label className="font-bold text-purple-800 text-[11px] uppercase block">Provide 4 Options & Select Correct Answer:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((label, idx) => (
                        <div key={label} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-purple-100">
                          <input
                            type="radio"
                            name="correctOptionIndex"
                            checked={Number(form.correctOptionIndex) === idx}
                            onChange={() => setForm({ ...form, correctOptionIndex: idx })}
                            className="h-4 w-4 text-purple-600"
                          />
                          <span className="font-extrabold text-purple-700">{label}.</span>
                          <input
                            type="text"
                            value={form.options[idx] || ''}
                            onChange={(e) => {
                              const newOpts = [...form.options];
                              newOpts[idx] = e.target.value;
                              setForm({ ...form, options: newOpts });
                            }}
                            placeholder={`Option ${label}`}
                            className="w-full text-xs font-medium focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Answer / Solution */}
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Answer / Solution {!form.isMcq && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={2}
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="Detailed answer, solution, or explanation..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {/* Company Selector UI */}
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Companies <span className="text-rose-500">*</span>
                </label>

                <div className="mt-1 flex gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const compObj = dbCompanies.find((c) => c._id === selectedId);
                      if (compObj && !form.selectedCompanies.some((c) => c._id === compObj._id)) {
                        setForm((prev) => ({
                          ...prev,
                          selectedCompanies: [...prev.selectedCompanies, compObj]
                        }));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none bg-white text-xs"
                  >
                    <option value="">-- Select Company --</option>
                    {dbCompanies.length === 0 ? (
                      <option value="" disabled>
                        No companies available. Please add a company first.
                      </option>
                    ) : (
                      dbCompanies.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} {c.industry ? `(${c.industry})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Selected Removable Chips */}
                {form.selectedCompanies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.selectedCompanies.map((c) => (
                      <span
                        key={c._id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 shadow-xs"
                      >
                        <Building className="h-3.5 w-3.5 text-blue-600" />
                        {c.name}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              selectedCompanies: prev.selectedCompanies.filter((sc) => sc._id !== c._id)
                            }))
                          }
                          className="hover:text-rose-600 font-black ml-1 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Custom Company */}
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    value={form.customCompany}
                    onChange={(e) => setForm({ ...form, customCompany: e.target.value })}
                    placeholder="+ Add custom company name..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCompany}
                    disabled={creatingCompany}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 disabled:opacity-50 transition"
                  >
                    {creatingCompany ? 'Creating...' : '+ Add'}
                  </button>
                </div>
              </div>

              {/* Topic & Custom Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">
                    Topic <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none bg-white"
                  >
                    {STANDARD_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Custom Topic...</option>
                  </select>
                </div>

                {form.topic === 'CUSTOM' && (
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Enter Custom Topic Name *</label>
                    <input
                      type="text"
                      value={form.customTopic}
                      onChange={(e) => setForm({ ...form, customTopic: e.target.value })}
                      placeholder="e.g. System Design, Next.js..."
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 uppercase">Difficulty *</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none bg-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Round Type, Frequency, Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Round Type *</label>
                  <select
                    value={form.roundType}
                    onChange={(e) => setForm({ ...form, roundType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none bg-white"
                  >
                    {ROUND_TYPES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Year Asked</label>
                  <input
                    type="number"
                    value={form.yearAsked}
                    onChange={(e) => setForm({ ...form, yearAsked: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Tags & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    value={form.tagsStr}
                    onChange={(e) => setForm({ ...form, tagsStr: e.target.value })}
                    placeholder="Java Collections, OOP, Core"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Approval / Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none bg-white"
                  >
                    <option value="PUBLISHED">Published (Visible to Students)</option>
                    <option value="DRAFT">Draft (Faculty Only)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {submitting ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW DETAILS */}
      {viewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-blue-600 uppercase">Question Details</span>
              <button onClick={() => setViewingQuestion(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Question</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {viewingQuestion.questionText || viewingQuestion.question}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Company</span>
                  <span className="font-extrabold text-slate-800">
                    {getCompanyDisplay(viewingQuestion)}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Topic</span>
                  <span className="font-extrabold text-blue-700">{viewingQuestion.topic}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Difficulty</span>
                  <span className="font-extrabold text-slate-800">{viewingQuestion.difficulty}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Round</span>
                  <span className="font-extrabold text-slate-800">{viewingQuestion.roundType}</span>
                </div>
              </div>

              {Array.isArray(viewingQuestion.options) && viewingQuestion.options.length >= 2 && (
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase block mb-1">MCQ Options</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {viewingQuestion.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border ${
                          idx === viewingQuestion.correctOptionIndex
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Answer / Solution</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                  {viewingQuestion.answer}
                </div>
              </div>

              {viewingQuestion.explanation && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Explanation</span>
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-700 leading-relaxed whitespace-pre-line">
                    {viewingQuestion.explanation}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingQuestion(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Are you sure you want to delete this question?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                "{deletingQuestion.questionText || deletingQuestion.question}"
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="px-6 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition shadow-md shadow-rose-500/20"
              >
                {submitting ? 'Deleting...' : 'Delete Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyQuestionBank;

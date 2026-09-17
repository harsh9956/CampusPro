import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  BookOpen,
  FileQuestion,
  HelpCircle,
  Building,
  User,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Play,
  Share2,
  Database,
  FileSpreadsheet,
  Download,
  RotateCcw
} from 'lucide-react';
import mockTestService from '../../services/mockTestService';
import testTypeService from '../../services/testTypeService';
import API from '../../services/api';

const FacultyMockTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED'
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState([]);
  const [testTypes, setTestTypes] = useState([]);
  const [testTypesLoading, setTestTypesLoading] = useState(false);

  // Add Company Modal State
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    website: '',
    industry: 'IT / Tech Services',
    location: 'India',
    description: ''
  });
  const [companyFormError, setCompanyFormError] = useState(null);
  const [savingCompany, setSavingCompany] = useState(false);

  // Add Test Type Modal State
  const [showAddTestTypeModal, setShowAddTestTypeModal] = useState(false);
  const [testTypeForm, setTestTypeForm] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [testTypeFormError, setTestTypeFormError] = useState(null);
  const [savingTestType, setSavingTestType] = useState(false);

  // Manage Test Types Modal State
  const [showManageTestTypesModal, setShowManageTestTypesModal] = useState(false);
  const [editingTypeItem, setEditingTypeItem] = useState(null);
  const [manageTypeError, setManageTypeError] = useState(null);
  const [manageTypeSuccess, setManageTypeSuccess] = useState(null);

  // Banners
  const [bannerMsg, setBannerMsg] = useState(null);
  const [bannerType, setBannerType] = useState('success');
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Create / Edit Test Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState('info'); // 'info' | 'questions'

  // Test Form Fields
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    category: 'General Placement Mock Test',
    testType: 'Company Specific',
    companyName: '',
    companyId: '',
    durationMinutes: 30,
    passingMarks: 12,
    difficulty: 'Medium',
    academicYear: '2026-27',
    status: 'DRAFT',
    questions: []
  });

  const [formErrors, setFormErrors] = useState({});

  // Question Form inside Modal
  const [editingQIndex, setEditingQIndex] = useState(null);
  const [qForm, setQForm] = useState({
    questionText: '',
    questionType: 'Multiple Choice',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    marks: 1,
    topic: 'Java',
    difficulty: 'Medium',
    explanation: ''
  });

  // Student Attempts View Modal & Filters
  const [viewingAttemptsTest, setViewingAttemptsTest] = useState(null);
  const [attemptsList, setAttemptsList] = useState([]);
  const [attemptsSummary, setAttemptsSummary] = useState({
    totalAttempts: 0,
    completedAttempts: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0,
    avgPercentage: 0
  });
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  // Attempt Filters
  const [resultsSearch, setResultsSearch] = useState('');
  const [resultsBranch, setResultsBranch] = useState('ALL');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  // Delete Confirmation Modal
  const [deletingTestId, setDeletingTestId] = useState(null);

  // Load Faculty Tests, Companies and Test Types
  const fetchFacultyTests = async () => {
    setLoading(true);
    try {
      const res = await mockTestService.getFacultyMockTests();
      const list = Array.isArray(res) ? res : res.data || [];
      setTests(list);
    } catch (err) {
      console.error('Error fetching faculty tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await API.get('/companies');
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchTestTypes = async () => {
    setTestTypesLoading(true);
    try {
      const res = await testTypeService.getTestTypes({ includeInactive: true });
      const list = res.data || [];
      setTestTypes(list);
    } catch (err) {
      console.error('Error fetching test types:', err);
    } finally {
      setTestTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyTests();
    fetchCompanies();
    fetchTestTypes();
  }, []);

  // Save New Company handler
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setCompanyFormError(null);
    if (!companyForm.name.trim()) {
      setCompanyFormError('Company name is required.');
      return;
    }
    setSavingCompany(true);
    try {
      const res = await API.post('/companies', companyForm);
      const newCompany = res.data;

      // Update companies list
      setCompanies((prev) => [newCompany, ...prev]);

      // Select newly created company in test form
      setTestForm((prev) => ({
        ...prev,
        companyName: newCompany.name,
        companyId: newCompany._id
      }));

      setBannerType('success');
      setBannerMsg(`Company "${newCompany.name}" added successfully and selected!`);
      setShowAddCompanyModal(false);
      setCompanyForm({ name: '', website: '', industry: 'IT / Tech Services', location: 'India', description: '' });
    } catch (err) {
      console.error('Error adding company:', err);
      setCompanyFormError(err.response?.data?.message || 'Failed to add company.');
    } finally {
      setSavingCompany(false);
    }
  };

  // Save New Test Type handler
  const handleSaveTestType = async (e) => {
    e.preventDefault();
    setTestTypeFormError(null);
    if (!testTypeForm.name.trim()) {
      setTestTypeFormError('Test type name is required.');
      return;
    }
    setSavingTestType(true);
    try {
      const res = await testTypeService.createTestType(testTypeForm);
      const newType = res.data;

      await fetchTestTypes();

      // Select newly created test type in test form
      setTestForm((prev) => ({
        ...prev,
        testType: newType.name
      }));

      setBannerType('success');
      setBannerMsg(`Test type "${newType.name}" added successfully and selected!`);
      setShowAddTestTypeModal(false);
      setTestTypeForm({ name: '', description: '', isActive: true });
    } catch (err) {
      console.error('Error adding test type:', err);
      setTestTypeFormError(err.response?.data?.message || 'Failed to add test type.');
    } finally {
      setSavingTestType(false);
    }
  };

  // Delete Test Type handler
  const handleDeleteTestType = async (typeId) => {
    setManageTypeError(null);
    setManageTypeSuccess(null);
    try {
      const res = await testTypeService.deleteTestType(typeId);
      setManageTypeSuccess(res.message || 'Test type deleted successfully.');
      await fetchTestTypes();
    } catch (err) {
      console.error('Error deleting test type:', err);
      setManageTypeError(err.response?.data?.message || 'Failed to delete test type.');
    }
  };

  // Update Test Type handler
  const handleUpdateTestType = async (e) => {
    e.preventDefault();
    if (!editingTypeItem || !editingTypeItem.name.trim()) return;
    setManageTypeError(null);
    setManageTypeSuccess(null);
    try {
      const res = await testTypeService.updateTestType(editingTypeItem._id, editingTypeItem);
      setManageTypeSuccess(res.message || 'Test type updated successfully.');
      setEditingTypeItem(null);
      await fetchTestTypes();
    } catch (err) {
      console.error('Error updating test type:', err);
      setManageTypeError(err.response?.data?.message || 'Failed to update test type.');
    }
  };

  // Summary Metrics
  const totalCount = tests.length;
  const publishedCount = tests.filter((t) => t.status === 'PUBLISHED').length;
  const draftCount = tests.filter((t) => t.status === 'DRAFT').length;
  const totalAttemptsCount = tests.reduce((acc, t) => acc + (t.attemptsCount || 0), 0);

  // Filtered Tests
  const filteredTests = tests.filter((t) => {
    const matchesStatus = statusTab === 'ALL' || t.status === statusTab;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchLower) ||
      (t.companyName || '').toLowerCase().includes(searchLower) ||
      (t.testType || '').toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // Open Create Test Modal
  const handleOpenCreate = () => {
    setEditingTestId(null);
    setTestForm({
      title: '',
      description: '',
      category: 'General Placement Mock Test',
      testType: 'Company Specific',
      companyName: companies.length > 0 ? companies[0].name : '',
      companyId: companies.length > 0 ? companies[0]._id : '',
      durationMinutes: 30,
      passingMarks: 8,
      difficulty: 'Medium',
      academicYear: '2026-27',
      status: 'DRAFT',
      questions: []
    });
    setFormErrors({});
    setActiveFormTab('info');
    setShowCreateModal(true);
  };

  // Open Edit Test Modal
  const handleOpenEdit = async (testId) => {
    setEditingTestId(testId);
    setFormErrors({});
    setActiveFormTab('info');
    try {
      const res = await mockTestService.getMockTestById(testId);
      const data = res.data || res;

      setTestForm({
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'General Placement Mock Test',
        testType: data.testType || 'General Placement',
        companyName: data.companyName || 'General',
        companyId: data.company?._id || data.company || '',
        durationMinutes: data.durationMinutes || 30,
        passingMarks: data.passingMarks || 0,
        difficulty: data.difficulty || 'Medium',
        academicYear: data.academicYear || '2026-27',
        status: data.status || 'DRAFT',
        questions: data.questions || []
      });
      setShowCreateModal(true);
    } catch (err) {
      console.error('Error fetching test detail for edit:', err);
    }
  };

  // Save Manual Question into Test Questions Array
  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!qForm.questionText.trim()) return;

    const newQ = { ...qForm, marks: Number(qForm.marks) || 1 };
    let updatedQuestions = [...testForm.questions];

    if (editingQIndex !== null) {
      updatedQuestions[editingQIndex] = newQ;
    } else {
      updatedQuestions.push(newQ);
    }

    setTestForm({ ...testForm, questions: updatedQuestions });
    setEditingQIndex(null);
    setQForm({
      questionText: '',
      questionType: 'Multiple Choice',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      marks: 1,
      topic: 'Java',
      difficulty: 'Medium',
      explanation: ''
    });
  };

  const handleRemoveQuestion = (idx) => {
    const updated = testForm.questions.filter((_, i) => i !== idx);
    setTestForm({ ...testForm, questions: updated });
  };

  const handleMoveQuestion = (idx, direction) => {
    const updated = [...testForm.questions];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;

    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setTestForm({ ...testForm, questions: updated });
  };

  // Save Test Form (Draft or Publish)
  const handleSaveTest = async (targetStatus) => {
    setProcessing(true);
    setBannerMsg(null);

    const totalMarksVal = testForm.questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);

    const payload = {
      ...testForm,
      totalMarks: totalMarksVal,
      status: targetStatus
    };

    try {
      let res;
      if (editingTestId) {
        res = await mockTestService.updateMockTest(editingTestId, payload);
      } else {
        res = await mockTestService.createMockTest(payload);
      }

      setBannerType('success');
      setBannerMsg(res.message || `Test ${targetStatus === 'PUBLISHED' ? 'published' : 'saved as draft'} successfully.`);
      setShowCreateModal(false);
      await fetchFacultyTests();
    } catch (err) {
      console.error('Error saving mock test:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to save mock test.');
    } finally {
      setProcessing(false);
    }
  };

  // Publish / Unpublish Actions
  const handlePublishToggle = async (test) => {
    setProcessing(true);
    try {
      let res;
      if (test.status === 'PUBLISHED') {
        res = await mockTestService.unpublishMockTest(test._id);
      } else {
        res = await mockTestService.publishMockTest(test._id);
      }
      setBannerType('success');
      setBannerMsg(res.message || 'Status updated successfully.');
      await fetchFacultyTests();
    } catch (err) {
      console.error('Error toggling publish status:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to update test status.');
    } finally {
      setProcessing(false);
    }
  };

  // Delete Action
  const handleDeleteTestConfirm = async () => {
    if (!deletingTestId) return;
    setProcessing(true);
    try {
      const res = await mockTestService.deleteMockTest(deletingTestId);
      setBannerType('success');
      setBannerMsg(res.message || 'Mock test deleted successfully.');
      setDeletingTestId(null);
      await fetchFacultyTests();
    } catch (err) {
      console.error('Error deleting test:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to delete test.');
    } finally {
      setProcessing(false);
    }
  };

  // Open Student Attempts View Modal
  const fetchAttemptsWithFilters = async (testId, customParams = {}) => {
    setAttemptsLoading(true);
    try {
      const params = {
        search: customParams.search !== undefined ? customParams.search : resultsSearch,
        branch: customParams.branch !== undefined ? customParams.branch : resultsBranch,
        minScore: customParams.minScore !== undefined ? customParams.minScore : minScore,
        maxScore: customParams.maxScore !== undefined ? customParams.maxScore : maxScore
      };

      const res = await mockTestService.getMockTestResults(testId, params);
      setAttemptsList(Array.isArray(res.data) ? res.data : []);
      if (res.summary) setAttemptsSummary(res.summary);
    } catch (err) {
      console.error('Error fetching student attempts:', err);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const handleViewAttempts = (test) => {
    setViewingAttemptsTest(test);
    setResultsSearch('');
    setResultsBranch('ALL');
    setMinScore('');
    setMaxScore('');
    fetchAttemptsWithFilters(test._id, { search: '', branch: 'ALL', minScore: '', maxScore: '' });
  };

  // Trigger Excel Export (.xlsx) Download
  const triggerExcelDownload = async (isFiltered = false) => {
    if (!viewingAttemptsTest) return;
    setExporting(true);
    try {
      const params = isFiltered
        ? { search: resultsSearch, branch: resultsBranch, minScore, maxScore }
        : {};

      const res = await mockTestService.exportMockTestResults(viewingAttemptsTest._id, params);

      // Extract filename from header or build clean default
      let filename = `CampusPro_${(viewingAttemptsTest.companyName || 'General').replace(/[^a-zA-Z0-9]/g, '_')}_${(
        viewingAttemptsTest.title || 'MockTest'
      ).replace(/[^a-zA-Z0-9]/g, '_')}_Results.xlsx`;

      const disposition = res.headers ? res.headers['content-disposition'] : null;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename="([^"]*)"/.exec(disposition);
        if (matches && matches[1]) filename = matches[1];
      }

      // Create blob download
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setBannerType('success');
      setBannerMsg(`Excel file "${filename}" downloaded successfully.`);
    } catch (err) {
      console.error('Excel Export error:', err);
      setBannerType('error');
      let errMsg = 'Failed to export Excel results.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.message) {
          errMsg = err.response.data.message;
        }
      }
      setBannerMsg(errMsg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mock Test Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create, manage and publish company-wise placement mock tests for students
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" /> Create Mock Test
        </button>
      </div>

      {/* Global Alert Banner */}
      {bannerMsg && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold flex items-center justify-between border ${
            bannerType === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerType === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
            <span>{bannerMsg}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusTab('ALL')}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusTab === 'ALL' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Mock Tests</span>
            <FileQuestion className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
        </div>

        <div
          onClick={() => setStatusTab('PUBLISHED')}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusTab === 'PUBLISHED' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Published Tests</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{publishedCount}</p>
        </div>

        <div
          onClick={() => setStatusTab('DRAFT')}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusTab === 'DRAFT' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Draft Tests</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{draftCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase">Student Attempts</span>
            <Award className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-900 mt-2">{totalAttemptsCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex gap-2 text-xs font-bold">
            {['ALL', 'PUBLISHED', 'DRAFT', 'UNPUBLISHED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusTab(st)}
                className={`px-3.5 py-2 rounded-xl transition ${
                  statusTab === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Tests' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by test title, company..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Mock Tests List / Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium mt-3">Loading mock tests...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium space-y-3">
          <FileQuestion className="h-8 w-8 mx-auto text-slate-300" />
          <p>No mock tests created yet.</p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md"
          >
            <Plus className="h-4 w-4" /> Create Mock Test
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Test Title & Company</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Questions</th>
                  <th className="p-4">Duration & Marks</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Attempts</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTests.map((test) => (
                  <tr key={test._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <span className="font-extrabold text-blue-600 uppercase text-[11px] block">{test.companyName}</span>
                      <span className="font-bold text-slate-900 text-sm block">{test.title}</span>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                        {test.testType}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-900">
                      {test.questions?.length || test.totalQuestions || 0} Ques
                    </td>

                    <td className="p-4 text-slate-600 font-semibold">
                      {test.durationMinutes} Mins • {test.totalMarks || 0} Marks
                    </td>

                    <td className="p-4 font-bold">
                      {test.status === 'PUBLISHED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Published
                        </span>
                      )}
                      {test.status === 'DRAFT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3" /> Draft
                        </span>
                      )}
                      {test.status === 'UNPUBLISHED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-slate-100 text-slate-700">
                          Unpublished
                        </span>
                      )}
                    </td>

                    <td className="p-4 font-extrabold text-indigo-700">
                      {test.attemptsCount || 0} attempts
                    </td>

                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewAttempts(test)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                          title="View Student Attempts & Export Excel"
                        >
                          Attempts
                        </button>
                        <button
                          onClick={() => handleOpenEdit(test._id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Edit Test"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePublishToggle(test)}
                          disabled={processing}
                          className={`px-2.5 py-1.5 rounded-lg text-white font-bold text-xs transition ${
                            test.status === 'PUBLISHED' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {test.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => setDeletingTestId(test._id)}
                          disabled={processing}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                          title="Delete Test"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {editingTestId ? 'Edit Mock Test' : 'Create New Placement Mock Test'}
                </h2>
                <p className="text-slate-500 font-medium">Configure test parameters and question paper</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-4 font-bold">
              <button
                type="button"
                onClick={() => setActiveFormTab('info')}
                className={`pb-2.5 transition border-b-2 ${
                  activeFormTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                1. Test Details
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('questions')}
                className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
                  activeFormTab === 'questions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                2. Questions ({testForm.questions.length})
              </button>
            </div>

            {/* TAB 1: TEST DETAILS */}
            {activeFormTab === 'info' && (
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">
                    Test Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={testForm.title}
                    onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                    placeholder="e.g. Placement Mock Test 2026"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 uppercase">
                        Company <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyFormError(null);
                          setShowAddCompanyModal(true);
                        }}
                        className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add New Company
                      </button>
                    </div>
                    <select
                      value={testForm.companyName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchComp = companies.find((c) => c.name === val);
                        setTestForm({
                          ...testForm,
                          companyName: val,
                          companyId: matchComp ? matchComp._id : ''
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none bg-white shadow-sm"
                    >
                      <option value="General">General Placement Test (Non-Company)</option>
                      {companies.map((c) => (
                        <option key={c._id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 uppercase">
                        Test Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTestTypeFormError(null);
                            setShowAddTestTypeModal(true);
                          }}
                          className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setManageTypeError(null);
                            setManageTypeSuccess(null);
                            setShowManageTestTypesModal(true);
                          }}
                          className="text-[11px] font-extrabold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1"
                        >
                          <Layers className="h-3 w-3" /> Manage
                        </button>
                      </div>
                    </div>
                    <select
                      value={testForm.testType}
                      onChange={(e) => setTestForm({ ...testForm, testType: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none bg-white shadow-sm"
                    >
                      {testTypes.length > 0 ? (
                        testTypes.map((t) => (
                          <option key={t._id} value={t.name}>
                            {t.name} {!t.isActive ? '(Inactive)' : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Company Specific">Company Specific</option>
                          <option value="General Placement">General Placement</option>
                          <option value="DSA (Data Structures & Algorithms)">DSA (Data Structures & Algorithms)</option>
                          <option value="Aptitude & Reasoning">Aptitude & Reasoning</option>
                          <option value="Technical Domain">Technical Domain</option>
                          <option value="Core CS Subjects">Core CS Subjects</option>
                          <option value="Verbal & Communication">Verbal & Communication</option>
                          <option value="HR & Soft Skills">HR & Soft Skills</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Description</label>
                  <textarea
                    rows="2"
                    value={testForm.description}
                    onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                    placeholder="Brief instructions or overview of topics covered..."
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={testForm.durationMinutes}
                      onChange={(e) => setTestForm({ ...testForm, durationMinutes: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase">Passing Marks</label>
                    <input
                      type="number"
                      min="0"
                      value={testForm.passingMarks}
                      onChange={(e) => setTestForm({ ...testForm, passingMarks: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase">Difficulty</label>
                    <select
                      value={testForm.difficulty}
                      onChange={(e) => setTestForm({ ...testForm, difficulty: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none bg-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('questions')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 font-bold text-white shadow-md hover:bg-blue-700"
                  >
                    Next: Manage Questions →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: QUESTIONS BUILDER */}
            {activeFormTab === 'questions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-700">Total Questions: {testForm.questions.length}</span>
                  <span className="text-xs font-bold text-slate-500">
                    Total Marks: {testForm.questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0)}
                  </span>
                </div>

                {/* Question Add / Edit Form */}
                <form onSubmit={handleSaveQuestion} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                  <h4 className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                    {editingQIndex !== null ? `Edit Question ${editingQIndex + 1}` : '+ Add Manual Question'}
                  </h4>

                  <div>
                    <label className="font-bold text-slate-700">Question Text *</label>
                    <input
                      type="text"
                      required
                      value={qForm.questionText}
                      onChange={(e) => setQForm({ ...qForm, questionText: e.target.value })}
                      placeholder="e.g. What is the average time complexity of HashMap get() operation?"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {qForm.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="font-bold text-slate-500 w-4">{String.fromCharCode(65 + oIdx)}.</span>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...qForm.options];
                            newOpts[oIdx] = e.target.value;
                            setQForm({ ...qForm, options: newOpts });
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          className="flex-1 rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none bg-white"
                        />
                        <input
                          type="radio"
                          name="correctOption"
                          checked={qForm.correctOptionIndex === oIdx}
                          onChange={() => setQForm({ ...qForm, correctOptionIndex: oIdx })}
                          className="h-4 w-4 text-blue-600"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="font-bold text-slate-700">Topic</label>
                      <select
                        value={qForm.topic}
                        onChange={(e) => setQForm({ ...qForm, topic: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none bg-white"
                      >
                        <option value="Java">Java</option>
                        <option value="DSA">DSA</option>
                        <option value="SQL">SQL</option>
                        <option value="DBMS">DBMS</option>
                        <option value="OOP">OOP</option>
                        <option value="Aptitude">Aptitude</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">Marks</label>
                      <input
                        type="number"
                        min="1"
                        value={qForm.marks}
                        onChange={(e) => setQForm({ ...qForm, marks: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">Difficulty</label>
                      <select
                        value={qForm.difficulty}
                        onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none bg-white"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingQIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQIndex(null);
                          setQForm({
                            questionText: '',
                            questionType: 'Multiple Choice',
                            options: ['', '', '', ''],
                            correctOptionIndex: 0,
                            marks: 1,
                            topic: 'Java',
                            difficulty: 'Medium',
                            explanation: ''
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 font-bold text-slate-600"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button type="submit" className="px-4 py-1.5 rounded-xl bg-blue-600 font-bold text-white shadow-sm">
                      {editingQIndex !== null ? 'Update Question' : 'Add Question'}
                    </button>
                  </div>
                </form>

                {/* Added Questions List */}
                <div className="space-y-2">
                  {testForm.questions.map((q, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600 text-xs">
                            Q{idx + 1}. {q.topic || 'General'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-bold text-slate-500">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              value={q.marks || 1}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                const updated = [...testForm.questions];
                                updated[idx].marks = val;
                                setTestForm({ ...testForm, questions: updated });
                              }}
                              className="w-12 text-center rounded-lg border border-slate-200 p-1 font-bold text-slate-800"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === testForm.questions.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQIndex(idx);
                                setQForm(q);
                              }}
                              className="p-1 text-slate-600 hover:text-blue-600"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                              title="Remove from Mock Test"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="font-extrabold text-slate-800">{q.questionText}</p>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {q.options?.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-1.5 rounded-lg border ${
                              oIdx === q.correctOptionIndex
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('info')}
                    className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600"
                  >
                    ← Back to Details
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => handleSaveTest('DRAFT')}
                      className="px-4 py-2 rounded-xl bg-slate-200 font-bold text-slate-700 hover:bg-slate-300"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => handleSaveTest('PUBLISHED')}
                      className="px-5 py-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
                    >
                      Publish Test
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDENT ATTEMPTS & EXCEL EXPORT MODAL */}
      {viewingAttemptsTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 uppercase">{viewingAttemptsTest.companyName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {viewingAttemptsTest.testType}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{viewingAttemptsTest.title} – Student Results</h3>
              </div>
              <button
                onClick={() => setViewingAttemptsTest(null)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Summary Analytics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Attempts</span>
                <span className="text-lg font-black text-slate-900">{attemptsSummary.totalAttempts}</span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 block uppercase">Completed</span>
                <span className="text-lg font-black text-emerald-900">{attemptsSummary.completedAttempts}</span>
              </div>

              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-700 block uppercase">Average Score</span>
                <span className="text-lg font-black text-blue-900">{attemptsSummary.avgScore}</span>
              </div>

              <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-700 block uppercase">Highest Score</span>
                <span className="text-lg font-black text-indigo-900">{attemptsSummary.highestScore}</span>
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 block uppercase">Lowest Score</span>
                <span className="text-lg font-black text-amber-900">{attemptsSummary.lowestScore}</span>
              </div>

              <div className="bg-violet-50 p-3 rounded-2xl border border-violet-200">
                <span className="text-[10px] font-bold text-violet-700 block uppercase">Avg Percentage</span>
                <span className="text-lg font-black text-violet-900">{attemptsSummary.avgPercentage}%</span>
              </div>
            </div>

            {/* Filter & Export Bar */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search & Branch Filters */}
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={resultsSearch}
                      onChange={(e) => {
                        setResultsSearch(e.target.value);
                        fetchAttemptsWithFilters(viewingAttemptsTest._id, { search: e.target.value });
                      }}
                      placeholder="Search student, enrollment, email..."
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none bg-white"
                    />
                  </div>

                  <select
                    value={resultsBranch}
                    onChange={(e) => {
                      setResultsBranch(e.target.value);
                      fetchAttemptsWithFilters(viewingAttemptsTest._id, { branch: e.target.value });
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-700 focus:outline-none bg-white text-xs"
                  >
                    <option value="ALL">All Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="AI-ML">AI-ML</option>
                  </select>

                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => {
                      setMinScore(e.target.value);
                      fetchAttemptsWithFilters(viewingAttemptsTest._id, { minScore: e.target.value });
                    }}
                    placeholder="Min Score"
                    className="w-20 rounded-xl border border-slate-200 px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none bg-white text-xs"
                  />

                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => {
                      setMaxScore(e.target.value);
                      fetchAttemptsWithFilters(viewingAttemptsTest._id, { maxScore: e.target.value });
                    }}
                    placeholder="Max Score"
                    className="w-20 rounded-xl border border-slate-200 px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none bg-white text-xs"
                  />

                  <button
                    onClick={() => {
                      setResultsSearch('');
                      setResultsBranch('ALL');
                      setMinScore('');
                      setMaxScore('');
                      fetchAttemptsWithFilters(viewingAttemptsTest._id, { search: '', branch: 'ALL', minScore: '', maxScore: '' });
                    }}
                    className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Export Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => triggerExcelDownload(false)}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Export Excel
                  </button>

                  <button
                    onClick={() => triggerExcelDownload(true)}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    <Download className="h-4 w-4" /> Export Filtered Results
                  </button>
                </div>
              </div>
            </div>

            {/* 15-Column Results Table */}
            {attemptsLoading ? (
              <div className="text-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-slate-400 font-medium text-xs mt-2">Loading attempts...</p>
              </div>
            ) : attemptsList.length === 0 ? (
              <div className="py-12 rounded-2xl border border-slate-200 bg-slate-50 text-center text-slate-400 font-bold text-xs space-y-1">
                <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300" />
                <p>No completed attempts available for export matching your criteria.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-slate-100 z-10">
                      <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="p-3">#</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Enrollment No</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Mock Test</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Total Marks</th>
                        <th className="p-3">Percentage</th>
                        <th className="p-3">Correct</th>
                        <th className="p-3">Wrong</th>
                        <th className="p-3">Unattempted</th>
                        <th className="p-3">Time Taken</th>
                        <th className="p-3">Attempt Date</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {attemptsList.map((res, idx) => {
                        const studentUser = res.student?.user || {};
                        const studentDoc = res.student || {};
                        const sName = studentUser.name || studentDoc.name || 'Student Candidate';
                        const sEnrollment = studentDoc.enrollmentNo || 'N/A';
                        const sBranch = studentDoc.branch || studentDoc.department || 'N/A';
                        const sEmail = studentUser.email || 'N/A';

                        const wrongCount = res.incorrectAnswers !== undefined ? res.incorrectAnswers : res.wrongAnswers || 0;
                        const unattemptedCount = res.unanswered !== undefined ? res.unanswered : res.unattempted || 0;

                        return (
                          <tr key={res._id} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-black text-slate-900">{sName}</td>
                            <td className="p-3 font-semibold text-slate-600">{sEnrollment}</td>
                            <td className="p-3 font-bold text-slate-800">{sBranch}</td>
                            <td className="p-3 text-slate-500">{sEmail}</td>
                            <td className="p-3 font-bold text-slate-900">{viewingAttemptsTest.title}</td>
                            <td className="p-3 font-bold text-blue-600">{viewingAttemptsTest.companyName || 'General'}</td>
                            <td className="p-3 font-black text-blue-700 text-xs">{res.score}</td>
                            <td className="p-3 text-slate-600 font-semibold">{res.totalScore}</td>
                            <td className="p-3 font-black text-indigo-700">{res.percentage}%</td>
                            <td className="p-3 font-bold text-emerald-600">{res.correctAnswers}</td>
                            <td className="p-3 font-bold text-rose-600">{wrongCount}</td>
                            <td className="p-3 font-bold text-amber-600">{unattemptedCount}</td>
                            <td className="p-3 text-slate-600">{res.timeTakenMinutes || 0} Mins</td>
                            <td className="p-3 text-slate-500">
                              {new Date(res.completedAt || res.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-bold">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                                {res.status || 'COMPLETED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">Delete Mock Test</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this mock test? Deleting this test will also permanently remove all associated student test attempt records.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTestId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTestConfirm}
                disabled={processing}
                className="px-5 py-2 rounded-xl bg-rose-600 font-bold text-xs text-white shadow-md hover:bg-rose-700"
              >
                Delete Mock Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW COMPANY MODAL */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Add New Company</h3>
                <p className="text-slate-500 font-medium">Save company to database for mock test assignment</p>
              </div>
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {companyFormError && (
              <div className="rounded-xl p-3 bg-rose-50 text-rose-800 border border-rose-200 font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{companyFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="e.g. Acrois Tech"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Industry</label>
                  <input
                    type="text"
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    placeholder="e.g. IT / Tech Services"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Location</label>
                  <input
                    type="text"
                    value={companyForm.location}
                    onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                    placeholder="e.g. Noida / Remote"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Website</label>
                <input
                  type="text"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  placeholder="https://company.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Description</label>
                <textarea
                  rows="2"
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  placeholder="Brief company overview..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  {savingCompany ? 'Saving...' : 'Save Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW TEST TYPE MODAL */}
      {showAddTestTypeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Add New Test Type</h3>
                <p className="text-slate-500 font-medium">Create custom placement mock test category</p>
              </div>
              <button
                onClick={() => setShowAddTestTypeModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {testTypeFormError && (
              <div className="rounded-xl p-3 bg-rose-50 text-rose-800 border border-rose-200 font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{testTypeFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTestType} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Test Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={testTypeForm.name}
                  onChange={(e) => setTestTypeForm({ ...testTypeForm, name: e.target.value })}
                  placeholder="e.g. Cloud & DevOps"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Description</label>
                <textarea
                  rows="2"
                  value={testTypeForm.description}
                  onChange={(e) => setTestTypeForm({ ...testTypeForm, description: e.target.value })}
                  placeholder="Brief description of this assessment category..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testTypeActive"
                  checked={testTypeForm.isActive}
                  onChange={(e) => setTestTypeForm({ ...testTypeForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="testTypeActive" className="font-bold text-slate-700">
                  Active status (visible for mock test creation)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTestTypeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTestType}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  {savingTestType ? 'Saving...' : 'Save Test Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE TEST TYPES MODAL */}
      {showManageTestTypesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Manage Test Types</h3>
                <p className="text-slate-500 font-medium">View, edit or remove mock test categories</p>
              </div>
              <button
                onClick={() => {
                  setShowManageTestTypesModal(false);
                  setEditingTypeItem(null);
                  setManageTypeError(null);
                  setManageTypeSuccess(null);
                }}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {manageTypeSuccess && (
              <div className="rounded-xl p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{manageTypeSuccess}</span>
              </div>
            )}

            {manageTypeError && (
              <div className="rounded-xl p-3 bg-rose-50 text-rose-800 border border-rose-200 font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{manageTypeError}</span>
              </div>
            )}

            {/* Inline Edit Form */}
            {editingTypeItem ? (
              <form onSubmit={handleUpdateTestType} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                <h4 className="font-extrabold text-blue-900 text-sm">Edit Test Type</h4>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Test Type Name</label>
                  <input
                    type="text"
                    required
                    value={editingTypeItem.name}
                    onChange={(e) => setEditingTypeItem({ ...editingTypeItem, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Description</label>
                  <input
                    type="text"
                    value={editingTypeItem.description || ''}
                    onChange={(e) => setEditingTypeItem({ ...editingTypeItem, description: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editTypeActive"
                    checked={editingTypeItem.isActive}
                    onChange={(e) => setEditingTypeItem({ ...editingTypeItem, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="editTypeActive" className="font-bold text-slate-700">Active</label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTypeItem(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow"
                  >
                    Update
                  </button>
                </div>
              </form>
            ) : null}

            {/* List Table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="p-3">Name</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {testTypes.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-400">No test types found.</td>
                    </tr>
                  ) : (
                    testTypes.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{t.name}</td>
                        <td className="p-3 text-slate-500">{t.description || '—'}</td>
                        <td className="p-3 font-bold">
                          {t.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">Active</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">Inactive</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setEditingTypeItem(t)}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                              title="Edit Test Type"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTestType(t._id)}
                              className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600"
                              title="Delete Test Type"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyMockTests;

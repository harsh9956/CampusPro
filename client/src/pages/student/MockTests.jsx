import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  BarChart2,
  Search,
  Filter,
  Building,
  Check,
  XCircle,
  HelpCircle,
  Zap,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import mockTestService from '../../services/mockTestService';

const MockTests = () => {
  const [mockTests, setMockTests] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [pastResults, setPastResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  // Pagination states
  const [testPage, setTestPage] = useState(1);
  const testPageSize = 6;
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;

  // Countdown Timer State (in seconds)
  const [timeLeft, setTimeLeft] = useState(0);

  const fetchTestsAndResults = async () => {
    setLoading(true);
    try {
      const [testsRes, resultsRes] = await Promise.all([
        mockTestService.getPublishedMockTests(),
        mockTestService.getMyResults()
      ]);

      const testList = Array.isArray(testsRes) ? testsRes : testsRes.data || [];
      const resultList = Array.isArray(resultsRes) ? resultsRes : resultsRes.data || [];

      setMockTests(testList);
      setPastResults(resultList);
    } catch (err) {
      console.error('Error fetching mock tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [testsRes, resultsRes] = await Promise.all([
          mockTestService.getPublishedMockTests(),
          mockTestService.getMyResults()
        ]);

        if (!isMounted) return;
        const testList = Array.isArray(testsRes) ? testsRes : testsRes.data || [];
        const resultList = Array.isArray(resultsRes) ? resultsRes : resultsRes.data || [];

        setMockTests(testList);
        setPastResults(resultList);
      } catch (err) {
        if (isMounted) console.error('Error fetching mock tests:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    if (!activeTest || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest(true); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest, timeLeft]);

  // Format Timer MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Test
  const startTest = async (testId) => {
    try {
      const res = await mockTestService.getMockTestById(testId);
      const data = res.data || res;
      setActiveTest(data);
      setUserAnswers({});
      setTestResult(null);
      setTimeLeft((data.durationMinutes || 30) * 60);
    } catch (err) {
      console.error('Error starting test:', err);
    }
  };

  const handleOptionSelect = (questionId, optionIndex) => {
    setUserAnswers({ ...userAnswers, [questionId]: optionIndex });
  };

  // Submit Test Handler
  const handleSubmitTest = async (autoSubmit = false) => {
    if (!activeTest || submitting) return;
    setSubmitting(true);

    try {
      const formattedAnswers = Object.keys(userAnswers).map((qId) => ({
        questionId: qId,
        selectedOptionIndex: userAnswers[qId]
      }));

      const elapsedMins = Math.ceil(((activeTest.durationMinutes || 30) * 60 - timeLeft) / 60);

      const res = await mockTestService.submitMockTest(activeTest._id, {
        answers: formattedAnswers,
        timeTakenMinutes: elapsedMins
      });

      setTestResult(res.result || res);
      setActiveTest(null);
      await fetchTestsAndResults();
    } catch (err) {
      console.error('Error submitting test:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter List Options
  const companyOptions = Array.from(new Set(mockTests.map((t) => t.companyName || 'General'))).filter(Boolean);
  const typeOptions = Array.from(new Set(mockTests.map((t) => t.testType || 'General Placement'))).filter(Boolean);

  const filteredTests = mockTests.filter((t) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchLower) ||
      (t.companyName || '').toLowerCase().includes(searchLower) ||
      (t.description || '').toLowerCase().includes(searchLower);

    const matchesCompany = selectedCompany === 'ALL' || (t.companyName || 'General').toLowerCase() === selectedCompany.toLowerCase();
    const matchesType = selectedType === 'ALL' || (t.testType || '').toLowerCase() === selectedType.toLowerCase();
    const matchesDifficulty = selectedDifficulty === 'ALL' || (t.difficulty || '').toLowerCase() === selectedDifficulty.toLowerCase();

    return matchesSearch && matchesCompany && matchesType && matchesDifficulty;
  });

  const totalTestPages = Math.ceil(filteredTests.length / testPageSize) || 1;
  const paginatedFilteredTests = filteredTests.slice((testPage - 1) * testPageSize, testPage * testPageSize);

  const totalHistoryPages = Math.ceil(pastResults.length / historyPageSize) || 1;
  const paginatedPastResults = pastResults.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

  // ACTIVE TEST TAKING VIEW
  if (activeTest) {
    const questionList = activeTest.questions || [];
    const answeredCount = Object.keys(userAnswers).length;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Test Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{activeTest.companyName || 'General Placement'}</span>
            <h2 className="text-xl font-black text-slate-900 mt-0.5">{activeTest.title}</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {questionList.length} Questions • Total Marks: {activeTest.totalMarks || questionList.length}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 font-black text-sm border ${
              timeLeft < 300 ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questionList.map((q, qIdx) => (
            <div key={q._id || qIdx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-400">
                  Question {qIdx + 1} of {questionList.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {q.topic || 'General'}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {q.marks || 1} {q.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base leading-relaxed">{q.questionText}</h3>

              <div className="space-y-2.5 pt-1">
                {q.options?.map((opt, optIdx) => {
                  const isSelected = userAnswers[q._id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleOptionSelect(q._id, optIdx)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs font-bold transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-6 w-6 rounded-xl flex items-center justify-center font-black text-xs ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Submit Bar */}
        <div className="sticky bottom-4 rounded-3xl bg-slate-900 p-4 shadow-2xl flex items-center justify-between text-white border border-slate-800">
          <span className="text-xs font-bold text-slate-300">
            Answered: <strong className="text-white">{answeredCount}</strong> of {questionList.length} Questions
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to exit this test? Your answers will not be saved.')) {
                  setActiveTest(null);
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold hover:bg-slate-700 transition"
            >
              Exit Test
            </button>
            <button
              disabled={submitting}
              onClick={() => handleSubmitTest(false)}
              className="px-6 py-2 rounded-xl bg-blue-600 text-xs font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Submitting...' : 'Submit Test Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Interactive Placement Mock Tests</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Evaluate your DSA, Java, SQL, OOP, and Aptitude readiness under timed conditions
        </p>
      </div>

      {/* Test Score Result Card */}
      {testResult && (
        <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 uppercase">{testResult.companyName || 'Placement Test'}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    testResult.resultStatus === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {testResult.resultStatus || (testResult.percentage >= 50 ? 'PASS' : 'FAIL')}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{testResult.testTitle}</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Obtained Score: <strong className="text-blue-700 font-extrabold text-sm">{testResult.score} / {testResult.totalScore}</strong> ({testResult.percentage}%)
              </p>
            </div>
            <button onClick={() => setTestResult(null)} className="text-slate-400 font-bold hover:text-slate-600">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Correct</span>
              <span className="text-lg font-black text-emerald-600">{testResult.correctAnswers || testResult.score}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Incorrect</span>
              <span className="text-lg font-black text-rose-600">{testResult.incorrectAnswers || 0}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Unanswered</span>
              <span className="text-lg font-black text-amber-600">{testResult.unanswered || 0}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Percentage</span>
              <span className="text-lg font-black text-blue-600">{testResult.percentage}%</span>
            </div>
          </div>

          {/* Topic Breakdown */}
          {testResult.topicBreakdown?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Topic Breakdown:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {testResult.topicBreakdown.map((t, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{t.topic}</span>
                    <span className="text-sm font-black text-slate-900">{t.percentage}%</span>
                    <span className="text-[10px] text-slate-400 block">{t.correct}/{t.total} Correct</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search test title or company..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Company Filter */}
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 focus:outline-none bg-white"
            >
              <option value="ALL">All Companies</option>
              {companyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Test Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 focus:outline-none bg-white"
            >
              <option value="ALL">All Test Types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 focus:outline-none bg-white"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Available Published Tests */}
      <h2 className="text-base font-extrabold text-slate-900">Available Published Tests</h2>
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium mt-3">Loading practice tests...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium">
          {mockTests.length === 0 ? 'No published mock tests available.' : 'No mock tests match your selected criteria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedFilteredTests.map((t) => {
            const questionCount = t.questions?.length || t.totalQuestions || 0;
            const totalMarksVal = t.totalMarks || questionCount;

            return (
              <div
                key={t._id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{t.companyName || 'General Placement'}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{t.difficulty || 'Medium'}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description || 'Practice test for placement preparation.'}</p>

                  {t.topicsCovered?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.topicsCovered.map((topic, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-slate-200">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-slate-500 font-semibold space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {t.durationMinutes} Mins • {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                    </div>
                    <div className="text-[11px] text-slate-400">Total Marks: {totalMarksVal}</div>
                  </div>

                  <button
                    onClick={() => startTest(t._id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
                  >
                    <Play className="h-3.5 w-3.5" /> Start Test
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tests Pagination Controls */}
      {!loading && filteredTests.length > testPageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{(testPage - 1) * testPageSize + 1}–{Math.min(testPage * testPageSize, filteredTests.length)}</strong> of <strong className="text-slate-900">{filteredTests.length}</strong> tests
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTestPage((p) => Math.max(1, p - 1))}
              disabled={testPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="px-3 py-1 font-bold text-slate-700">
              Page {testPage} of {totalTestPages}
            </span>
            <button
              onClick={() => setTestPage((p) => Math.min(totalTestPages, p + 1))}
              disabled={testPage >= totalTestPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Past Test History */}
      {pastResults.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-base font-extrabold text-slate-900">Your Past Test Attempts</h2>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-2">
            {paginatedPastResults.map((res) => (
              <div key={res._id} className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 block">{res.testTitle}</span>
                  <span className="text-slate-400 text-[10px]">
                    Attempted on {new Date(res.completedAt || res.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-black text-blue-700 text-sm block">{res.score} / {res.totalScore} ({res.percentage}%)</span>
                    <span className="text-slate-400 text-[10px]">{res.correctAnswers || res.score} Correct</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      res.resultStatus === 'PASS' || res.percentage >= 50
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {res.resultStatus || (res.percentage >= 50 ? 'PASS' : 'FAIL')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* History Pagination */}
          {pastResults.length > historyPageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm text-xs text-slate-600">
              <div>
                Showing <strong className="text-slate-900">{(historyPage - 1) * historyPageSize + 1}–{Math.min(historyPage * historyPageSize, pastResults.length)}</strong> of <strong className="text-slate-900">{pastResults.length}</strong> attempts
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="px-3 py-1 font-bold text-slate-700">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                  disabled={historyPage >= totalHistoryPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MockTests;

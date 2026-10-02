import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building,
  Tag,
  Zap,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import questionService from '../../services/questionService';
import API from '../../services/api';
import { useAcademicYear } from '../../context/AcademicYearContext';

const TOPIC_OPTIONS = [
  'ALL',
  'Java',
  'C',
  'C++',
  'JavaScript',
  'React',
  'SQL',
  'DBMS',
  'OOP',
  'DSA',
  'Operating System',
  'Computer Networks',
  'Aptitude',
  'HR'
];

const DIFFICULTY_OPTIONS = ['ALL', 'Easy', 'Medium', 'Hard'];

const QuestionBank = () => {
  const { availableYears } = useAcademicYear();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    companiesCount: 0,
    highFrequencyCount: 0
  });
  const [dbCompanies, setDbCompanies] = useState([]);
  const [allTopics, setAllTopics] = useState(TOPIC_OPTIONS);

  // Filters State
  const [topic, setTopic] = useState('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [difficulty, setDifficulty] = useState('ALL');
  const [roundType, setRoundType] = useState('ALL');
  const [frequency, setFrequency] = useState('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination & Expanded State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Load static metadata (companies, topics, stats) once on mount
  useEffect(() => {
    let isMounted = true;
    const loadMetadata = async () => {
      try {
        const [compRes, metaRes, statsRes] = await Promise.all([
          API.get('/companies').catch(() => ({ data: [] })),
          questionService.getQuestionMeta().catch(() => null),
          questionService.getQuestionStats().catch(() => null)
        ]);

        if (!isMounted) return;

        if (Array.isArray(compRes.data)) {
          setDbCompanies(compRes.data);
        }

        if (metaRes && metaRes.data) {
          if (metaRes.data.topics?.length) {
            setAllTopics(Array.from(new Set([...TOPIC_OPTIONS, ...metaRes.data.topics])));
          }
          if (metaRes.data.dbCompanies?.length && (!compRes.data || compRes.data.length === 0)) {
            setDbCompanies(metaRes.data.dbCompanies);
          }
        }

        if (statsRes && statsRes.data) {
          setStats({
            totalQuestions: statsRes.data.publishedCount || statsRes.data.totalQuestions || 0,
            companiesCount: compRes.data?.length || statsRes.data.companiesCount || 0,
            highFrequencyCount: statsRes.data.highFrequencyCount || 0
          });
        }
      } catch (err) {
        console.error('Error fetching question bank metadata:', err);
      }
    };
    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Fetch only paginated questions when filters or debounced search change
  const fetchQuestionsData = async (pageNum = 1) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const res = await questionService.getQuestions({
        page: pageNum,
        limit: 12,
        search: debouncedSearch.trim() || undefined,
        topic: topic !== 'ALL' ? topic : undefined,
        company: selectedCompanyId !== 'ALL' ? selectedCompanyId : undefined,
        difficulty: difficulty !== 'ALL' ? difficulty : undefined,
        roundType: roundType !== 'ALL' ? roundType : undefined,
        frequency: frequency !== 'ALL' ? frequency : undefined,
        academicYear: academicYearFilter !== 'ALL' ? academicYearFilter : undefined,
        status: 'PUBLISHED'
      }, controller.signal);

      const qData = res.data || res;
      setQuestions(Array.isArray(qData) ? qData : qData.data || []);
      setTotalCount(qData.total || (Array.isArray(qData) ? qData.length : 0));
      setTotalPages(qData.pages || 1);
      setPage(qData.page || pageNum);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') return;
      console.error('Error fetching student question bank:', err);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchQuestionsData(1);
  }, [topic, selectedCompanyId, difficulty, roundType, frequency, academicYearFilter, debouncedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestionsData(1);
  };

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setTopic('ALL');
    setSelectedCompanyId('ALL');
    setDifficulty('ALL');
    setRoundType('ALL');
    setFrequency('ALL');
    setAcademicYearFilter('ALL');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Interview Question Bank</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Practice real, high-frequency technical and HR questions asked in top tech company interview rounds
        </p>
      </div>

      {/* Statistics Quick Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider block">Available Practice Questions</span>
            <span className="text-2xl font-black">{stats.totalQuestions}</span>
          </div>
          <HelpCircle className="h-8 w-8 text-blue-200/50" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Top Companies Covered</span>
            <span className="text-2xl font-black text-slate-900">{dbCompanies.length || stats.companiesCount}</span>
          </div>
          <Building className="h-8 w-8 text-purple-500/40" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">High-Frequency Questions</span>
            <span className="text-2xl font-black text-emerald-600">{stats.highFrequencyCount}</span>
          </div>
          <Zap className="h-8 w-8 text-emerald-500/40" />
        </div>
      </div>

      {/* Company Quick Selector Bar */}
      {dbCompanies.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Practice By Company:</label>
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCompanyId('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                selectedCompanyId === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🏢 All Companies
            </button>
            {dbCompanies.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedCompanyId(c._id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                  selectedCompanyId === c._id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic Quick Selector Bar */}
      <div className="space-y-1.5">
        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Practice By Topic:</label>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {allTopics.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                topic === t
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL' ? '📚 All Topics' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions (e.g. polymorphism, normalization, OOP)..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              {allTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
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
            <label className="font-bold text-slate-400 uppercase text-[10px]">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Round Type</label>
            <select
              value={roundType}
              onChange={(e) => setRoundType(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Rounds</option>
              <option value="Technical">Technical</option>
              <option value="Coding">Coding</option>
              <option value="Aptitude">Aptitude</option>
              <option value="HR">HR</option>
              <option value="Managerial">Managerial</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Frequencies</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-400 uppercase text-[10px]">Academic Year</label>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none bg-white"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(search || topic !== 'ALL' || selectedCompanyId !== 'ALL' || difficulty !== 'ALL' || roundType !== 'ALL' || frequency !== 'ALL' || academicYearFilter !== 'ALL') && (
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
          <p className="text-xs text-slate-400 font-medium mt-3">Loading practice questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium">
          {totalCount === 0 && !search && topic === 'ALL' && selectedCompanyId === 'ALL'
            ? 'No questions added yet.'
            : 'No questions found for the selected filters.'}
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const isExpanded = expandedId === q._id;
            const qTitle = q.questionText || q.question || 'Question';
            const compDisplay = getCompanyDisplay(q);

            return (
              <div
                key={q._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-blue-50 text-blue-800 font-black text-xs px-2.5 py-0.5 rounded-full border border-blue-100">
                      {q.topic}
                    </span>
                    <span className="bg-slate-100 text-slate-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                      <Building className="h-3 w-3 text-blue-600" /> {compDisplay}
                    </span>
                    <span
                      className={`font-bold text-xs px-2.5 py-0.5 rounded-full ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    {q.academicYear && (
                      <span className="bg-purple-50 text-purple-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-purple-200">
                        {q.academicYear}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                    <span>Asked in: <strong className="text-slate-700">{q.roundType} Round</strong></span>
                    <span>Frequency: <strong className="text-rose-600">{q.frequency || 'High'}</strong></span>
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base leading-snug">{qTitle}</h3>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : q._id)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  {isExpanded ? (
                    <>
                      Hide Solution & Explanation <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show Solution & Explanation <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <div>
                      <p className="font-black text-slate-900 uppercase text-[10px] tracking-wider mb-1">Answer / Solution:</p>
                      <p className="whitespace-pre-line font-medium text-slate-800">{q.answer}</p>
                    </div>

                    {q.explanation && (
                      <div className="border-t border-slate-200 pt-2">
                        <p className="font-black text-blue-800 uppercase text-[10px] tracking-wider mb-1">Explanation & Context:</p>
                        <p className="whitespace-pre-line text-slate-700">{q.explanation}</p>
                      </div>
                    )}

                    {q.tags?.length > 0 && (
                      <div className="border-t border-slate-200 pt-2 flex flex-wrap items-center gap-1">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {q.tags.map((t, idx) => (
                          <span key={idx} className="bg-white text-slate-600 font-semibold px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
          <span className="text-slate-500 font-semibold">
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} Questions)
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchQuestionsData(page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchQuestionsData(page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;

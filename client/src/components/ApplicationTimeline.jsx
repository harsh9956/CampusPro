import React from 'react';
import { CheckCircle2, Clock, XCircle, Lock } from 'lucide-react';

const ApplicationTimeline = ({ application }) => {
  if (!application) return null;

  const { status, currentRoundOrder, currentRound, drive, driveRounds, results = [] } = application;

  // Normalize drive rounds dynamically from drive object if driveRounds prop is missing
  let rounds = driveRounds;
  if (!rounds || rounds.length === 0) {
    if (drive && Array.isArray(drive.selectionProcess) && drive.selectionProcess.length > 0) {
      rounds = drive.selectionProcess.map((r, idx) => ({
        order: r.order || idx + 1,
        roundName: r.roundName || `Round ${idx + 1}`
      }));
    } else if (drive && Array.isArray(drive.selectionRounds) && drive.selectionRounds.length > 0) {
      rounds = drive.selectionRounds.map((r, idx) => ({
        order: r.roundNumber || idx + 1,
        roundName: r.name || `Round ${idx + 1}`
      }));
    } else {
      rounds = [];
    }
  }

  const isSelected = status === 'SELECTED';
  const isRejected = status === 'REJECTED';
  const isWithdrawn = status === 'WITHDRAWN';

  // Find candidate's current round order index
  let activeOrder = currentRoundOrder || 1;
  if (!currentRoundOrder && currentRound) {
    const matchIdx = rounds.findIndex(r => r.roundName.trim().toLowerCase() === currentRound.trim().toLowerCase());
    if (matchIdx !== -1) activeOrder = rounds[matchIdx].order;
  }

  // Find round order where student failed if rejected
  const failedResult = isRejected ? results.find(r => r.status === 'FAILED') : null;
  const failedOrder = failedResult ? failedResult.roundOrder : activeOrder;

  return (
    <div className="w-full py-4 space-y-4">
      {/* Tracker Steps Pipeline */}
      <div className="flex items-center justify-between relative">
        {/* Connecting Background Line */}
        <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>

        {/* 1. Registration Step */}
        <div className="flex flex-col items-center relative z-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-blue-600 border-blue-600 text-white shadow-md font-bold text-xs">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="mt-1.5 text-[11px] font-extrabold text-blue-900 text-center max-w-[80px] truncate" title="Registered">
            Registered
          </span>
        </div>

        {/* 2. Drive Selection Rounds Steps */}
        {rounds.map((r) => {
          const rEval = results.find((res) => Number(res.roundOrder) === Number(r.order));
          const isPassed = isSelected || (rEval && rEval.status === 'PASSED') || (!isRejected && r.order < activeOrder);
          const isFailed = isRejected && (rEval?.status === 'FAILED' || r.order === failedOrder);
          const isCurrent = !isSelected && !isRejected && !isWithdrawn && r.order === activeOrder;
          const isLocked = !isPassed && !isFailed && !isCurrent;

          return (
            <div key={r.order} className="flex flex-col items-center relative z-10">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold text-xs transition ${
                  isPassed
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : isFailed
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20'
                    : isCurrent
                    ? 'bg-blue-600 border-blue-600 text-white animate-pulse shadow-md shadow-blue-500/30'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isFailed ? (
                  <XCircle className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-slate-300" />
                )}
              </div>

              <span
                className={`mt-1.5 text-[11px] font-bold text-center max-w-[90px] truncate ${
                  isPassed
                    ? 'text-emerald-800'
                    : isFailed
                    ? 'text-rose-600 font-extrabold'
                    : isCurrent
                    ? 'text-blue-900 font-black'
                    : 'text-slate-400'
                }`}
                title={`Round ${r.order}: ${r.roundName}`}
              >
                {r.roundName}
              </span>

              {rEval && rEval.score !== null && rEval.score !== undefined && (
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Score: {rEval.score}</span>
              )}
            </div>
          );
        })}

        {/* 3. Final Selection Step */}
        <div className="flex flex-col items-center relative z-10">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold text-xs transition ${
              isSelected
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-100'
                : 'bg-white border-slate-300 text-slate-400'
            }`}
          >
            {isSelected ? '🎉' : <Lock className="h-3.5 w-3.5 text-slate-300" />}
          </div>
          <span
            className={`mt-1.5 text-[11px] font-bold text-center max-w-[85px] truncate ${
              isSelected ? 'text-emerald-800 font-black' : 'text-slate-400'
            }`}
          >
            Final Selected
          </span>
        </div>
      </div>

      {/* Overall Status Banner */}
      {isRejected && (
        <div className="text-center pt-2">
          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 text-xs font-bold px-3.5 py-1 rounded-full border border-rose-200">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            Application Status: Rejected in {rounds.find(r => r.order === failedOrder)?.roundName || 'Selection Process'}
          </span>
        </div>
      )}

      {isSelected && (
        <div className="text-center pt-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 text-xs font-black px-4 py-1 rounded-full border border-emerald-200 shadow-xs">
            🎉 Congratulations! You cleared all selection rounds and have been SELECTED!
          </span>
        </div>
      )}
    </div>
  );
};

export default ApplicationTimeline;

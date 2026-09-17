import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const EligibilityBadge = ({ eligibility }) => {
  const [showModal, setShowModal] = useState(false);

  if (!eligibility) return null;

  if (eligibility.eligible) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle className="h-3.5 w-3.5" />
        You are eligible
      </span>
    );
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 transition"
      >
        <XCircle className="h-3.5 w-3.5 text-rose-600" />
        Not eligible (View reason)
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Eligibility Criteria Breakdown</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Our automated Eligibility Engine evaluated your academic record against this drive's criteria:
            </p>
            <div className="space-y-2 mb-6">
              {eligibility.reasons && eligibility.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-xs font-medium text-rose-800">
                  <span className="text-rose-500 mt-0.5">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EligibilityBadge;

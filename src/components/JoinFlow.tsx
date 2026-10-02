import React, { useState } from 'react';
import { User, Trip } from '../types';
import { joinTrip } from '../api/client';
import { KeyRound, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

interface JoinFlowProps {
  currentUser: User;
  onJoinedTrip: (trip: Trip) => void;
  onCancel: () => void;
}

export const JoinFlow: React.FC<JoinFlowProps> = ({
  currentUser,
  onJoinedTrip,
  onCancel
}) => {
  const [tripTitle, setTripTitle] = useState('');
  const [password, setPassword] = useState('');
  const [camperName, setCamperName] = useState(currentUser.name);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter the trip password provided by the host.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await joinTrip({
        tripTitle: tripTitle.trim(),
        password: password.trim(),
        userEmail: currentUser.email,
        userName: camperName.trim(),
        userId: currentUser.id
      });

      onJoinedTrip(res.trip);
    } catch (err: any) {
      setErrorMsg(err.message || 'Wrong trip name or password, please ask Host for the correct one');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-14 px-4 sm:px-6">
      
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home</span>
      </button>

      <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
        
        <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center mb-4">
          <KeyRound className="w-5 h-5" />
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 mb-1">
          Join a Camping Trip
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mb-6 leading-relaxed">
          Enter the Trip Name &amp; Password shared by your trip host in chat to join.
        </p>

        {errorMsg && (
          <div
            id="join-error-banner"
            className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2.5 font-medium leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
              Trip Name (Optional / Verification)
            </label>
            <input
              type="text"
              id="join-trip-title-input"
              value={tripTitle}
              onChange={(e) => {
                setTripTitle(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. Algonquin Fall Trip 2026"
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
              Trip Password
            </label>
            <input
              type="text"
              id="join-password-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. pine-cone-2026"
              className="w-full font-mono text-sm px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
              autoFocus
              required
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Ask your Trip Host if you need the trip password.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
              Your Name
            </label>
            <input
              type="text"
              value={camperName}
              onChange={(e) => setCamperName(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              id="join-submit-btn"
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-semibold"
            >
              <span>{isLoading ? 'Verifying Password...' : 'Unlock & Join Trip'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

        <div className="mt-6 pt-4 border-t border-neutral-100 text-[11px] text-neutral-400 text-center">
          No email verification needed. The host holds the gate key.
        </div>

      </div>

    </div>
  );
};

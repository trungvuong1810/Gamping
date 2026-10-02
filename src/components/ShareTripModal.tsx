import React, { useState } from 'react';
import { Trip, User } from '../types';
import { Copy, Check, Share2, X } from 'lucide-react';

interface ShareTripModalProps {
  trip: Trip;
  currentUser: User;
  onClose: () => void;
}

export const ShareTripModal: React.FC<ShareTripModalProps> = ({
  trip,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  const shareText = `🏕️ Join our camping trip: "${trip.title}"!

📍 Location: ${trip.location}
📅 Dates: ${trip.startDate} - ${trip.endDate}

🔑 Trip Name: ${trip.title}
🔒 Password: ${trip.password}

Join at: ${window.location.origin}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Camping Trip: ${trip.title}`,
          text: shareText,
          url: window.location.origin
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-950">Share Trip Credentials</h3>
              <p className="text-xs text-neutral-500">Copy details and share with friends via chat.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 font-medium">Trip Name:</span>
              <span className="font-bold text-neutral-900">{trip.title}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-neutral-200/60 pt-2">
              <span className="text-neutral-500 font-medium">Trip Password:</span>
              <span className="font-mono font-bold text-neutral-950 bg-neutral-200/70 px-2 py-0.5 rounded">
                {trip.password}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
            💡 Friends click <strong>"Join a Trip"</strong> on the home page and enter the <strong>Trip Name</strong> &amp; <strong>Password</strong> to access the trip!
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via App</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Trip Details</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

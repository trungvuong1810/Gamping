import React, { useState } from 'react';
import { Trip, User, Friend } from '../types';
import { sendTripInvitations } from '../api/client';
import { Mail, Check, Copy, Sparkles, Send, X, ExternalLink, ShieldCheck } from 'lucide-react';

interface EmailInviteModalProps {
  trip: Trip;
  currentUser: User;
  frequentFriends?: Friend[];
  onClose: () => void;
  onInvitationsSent?: () => void;
}

export const EmailInviteModal: React.FC<EmailInviteModalProps> = ({
  trip,
  currentUser,
  frequentFriends = [],
  onClose,
  onInvitationsSent
}) => {
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [inputEmail, setInputEmail] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<{
    invitations: any[];
    dispatchResults?: Array<{ email: string; sent: boolean; reason?: string; isSandboxRestricted?: boolean }>;
    anySandboxBlocked?: boolean;
    emailServiceUsed: string;
    message: string;
  } | null>(null);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  const toggleFriend = (email: string) => {
    const clean = email.toLowerCase().trim();
    if (recipientEmails.includes(clean)) {
      setRecipientEmails(recipientEmails.filter(e => e !== clean));
    } else {
      setRecipientEmails([...recipientEmails, clean]);
    }
  };

  const handleAddManualEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputEmail.trim()) return;
    const clean = inputEmail.toLowerCase().trim();
    if (!recipientEmails.includes(clean)) {
      setRecipientEmails([...recipientEmails, clean]);
    }
    setInputEmail('');
  };

  const handleSend = async () => {
    if (recipientEmails.length === 0) {
      setErrorMessage('Please add at least one friend email address.');
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    try {
      const response = await sendTripInvitations(trip.id, {
        hostId: currentUser.id,
        hostName: currentUser.name,
        recipientEmails,
        customMessage: customNote
      });

      setResult({
        invitations: response.invitations,
        dispatchResults: response.dispatchResults,
        anySandboxBlocked: response.anySandboxBlocked,
        emailServiceUsed: response.emailServiceUsed,
        message: response.message
      });

      if (onInvitationsSent) {
        onInvitationsSent();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch email invitations.');
    } finally {
      setIsSending(false);
    }
  };

  const copyLink = (link: string, idx: number) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkIndex(idx);
    setTimeout(() => setCopiedLinkIndex(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
              Invite Friends via Email
            </h2>
            <p className="text-xs text-neutral-500 font-mono">1-Click Auto-Join Links</p>
          </div>
        </div>

        <p className="text-xs text-neutral-600 mb-5 leading-relaxed">
          Friends receive a direct link in their email. When they click the link, they <strong>automatically join "{trip.title}"</strong> and land directly on their checklists—no passwords or codes to type.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs">
            {errorMessage}
          </div>
        )}

        {!result ? (
          <div className="space-y-4">
            
            {/* Quick Friend Selector from Roster */}
            {frequentFriends.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                  Select from People I Camp With
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {frequentFriends.map((friend) => {
                    const isSelected = recipientEmails.includes(friend.friendEmail.toLowerCase());
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => toggleFriend(friend.friendEmail)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-neutral-950 text-white border-neutral-950 font-medium'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <span>{friend.friendName}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Email input field */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Recipient Emails
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="camper.friend@example.com"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualEmail();
                    }
                  }}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950"
                />
                <button
                  type="button"
                  onClick={() => handleAddManualEmail()}
                  className="px-3 py-2 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition"
                >
                  Add
                </button>
              </div>

              {/* Tag badges of selected emails */}
              {recipientEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {recipientEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => toggleFriend(email)}
                        className="text-neutral-400 hover:text-red-500 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Personal message */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Optional Note / Instructions
              </label>
              <input
                type="text"
                placeholder="e.g. Can't wait for our trip! Check out the campsite and claim what you can bring."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950"
              />
            </div>

            {/* Service info banner */}
            <div className="p-3 rounded-xl border border-neutral-100 bg-neutral-50/80 text-[11px] text-neutral-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-neutral-900">Zero-Friction Invitation: </span>
                Uses <strong>Resend</strong> cloud email delivery (free: 3,000 emails/month). If an API key is not yet set, copyable 1-click magic links are generated instantly.
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || recipientEmails.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-medium disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Invitations ({recipientEmails.length})</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ) : (
          /* Success Screen with generated 1-click links */
          <div className="space-y-4 animate-in fade-in">
            <div className={`p-4 rounded-xl border ${
              result.anySandboxBlocked 
                ? 'border-amber-200 bg-amber-50/70 text-amber-950' 
                : 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
            }`}>
              <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                <Check className={`w-4 h-4 ${result.anySandboxBlocked ? 'text-amber-600' : 'text-emerald-600'}`} />
                <span>{result.message}</span>
              </div>
              <p className={`text-[11px] ${result.anySandboxBlocked ? 'text-amber-800' : 'text-emerald-800'}`}>
                Engine: <span className="font-mono font-medium">{result.emailServiceUsed}</span>
              </p>
              {result.anySandboxBlocked && (
                <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                  💡 <strong>Resend Sandbox Notice:</strong> Free Resend accounts can only send test emails to the account owner (<code>qtru49@gmail.com</code>). To send actual emails to other domains, add and verify your custom domain in Resend. In the meantime, each friend below has a guaranteed <strong>1-Click Direct Join Link</strong> generated. You can copy and text or message it to them!
                </div>
              )}
            </div>

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                1-Click Direct Links (Copy & Share Anytime)
              </span>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {result.invitations.map((inv, idx) => {
                  const dispatch = result.dispatchResults?.find(d => d.email.toLowerCase() === inv.recipientEmail.toLowerCase());
                  return (
                    <div
                      key={inv.id || idx}
                      className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-900 truncate">{inv.recipientEmail}</span>
                          {dispatch && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              dispatch.sent 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : dispatch.isSandboxRestricted
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-200 text-neutral-700'
                            }`}>
                              {dispatch.sent ? '✓ Emailed' : dispatch.isSandboxRestricted ? 'Sandbox (Copy Link)' : 'Link Ready'}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400 truncate">{inv.inviteLink}</div>
                      </div>
                      <button
                        onClick={() => copyLink(inv.inviteLink, idx)}
                        className="px-2.5 py-1.5 rounded bg-white border border-neutral-300 hover:border-neutral-950 text-neutral-800 text-[11px] font-medium transition shrink-0 flex items-center gap-1"
                      >
                        {copiedLinkIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

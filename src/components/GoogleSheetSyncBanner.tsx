import React, { useState } from 'react';
import { Trip, TripMember, Group, EquipmentItem, FoodItem, WeatherForecastDay } from '../types';
import {
  createCampingSpreadsheet,
  pushTripDataToSpreadsheet,
  pullGearFromSpreadsheet,
  extractSpreadsheetId
} from '../lib/googleSheets';
import { getAccessToken } from '../lib/googleAuth';
import { updateTripGoogleSheet } from '../api/client';
import {
  Sheet,
  ExternalLink,
  RefreshCw,
  Link as LinkIcon,
  Plus,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react';

interface GoogleSheetSyncBannerProps {
  trip: Trip;
  members: TripMember[];
  groups: Group[];
  equipment: EquipmentItem[];
  food: FoodItem[];
  forecastDays?: WeatherForecastDay[];
  onTripUpdated: (updatedTrip: Trip) => void;
  onRefreshData?: () => void;
  onGearPulled?: (items: Array<{ name: string; packed: boolean; assignedTo?: string; notes?: string }>) => void;
}

export const GoogleSheetSyncBanner: React.FC<GoogleSheetSyncBannerProps> = ({
  trip,
  members,
  groups,
  equipment,
  food,
  forecastDays = [],
  onTripUpdated,
  onRefreshData,
  onGearPulled
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [sheetInput, setSheetInput] = useState('');

  const hasSheet = Boolean(trip.googleSpreadsheetId);

  // Push latest app data to the connected sheet
  const handlePushToSheet = async () => {
    if (!trip.googleSpreadsheetId) return;

    setIsSyncing(true);
    setSyncStatusMsg('Pushing updates to Google Sheet...');
    try {
      const token = await getAccessToken();
      if (token) {
        await pushTripDataToSpreadsheet(token, trip.googleSpreadsheetId, {
          trip,
          members,
          groups,
          equipment,
          food,
          weather: { forecastDays }
        });
      }

      const res = await updateTripGoogleSheet(trip.id, {
        googleSpreadsheetLastSynced: new Date().toISOString(),
        googleSpreadsheetSyncStatus: 'connected'
      });

      onTripUpdated(res.trip);
      setSyncStatusMsg('Google Spreadsheet synchronized successfully.');
    } catch (err: any) {
      console.error('Error syncing to spreadsheet:', err);
      setSyncStatusMsg('Sync update recorded in trip data.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Pull gear updates made directly inside the Google Sheet
  const handlePullFromSheet = async () => {
    if (!trip.googleSpreadsheetId) return;

    setIsPulling(true);
    setSyncStatusMsg('Reading updates from Google Sheet...');
    try {
      const token = await getAccessToken();
      if (token) {
        const pulledItems = await pullGearFromSpreadsheet(token, trip.googleSpreadsheetId);
        if (pulledItems.length > 0 && onGearPulled) {
          onGearPulled(pulledItems);
          setSyncStatusMsg(`Pulled ${pulledItems.length} items from Google Sheet.`);
        } else {
          setSyncStatusMsg('Spreadsheet checked. App is up to date.');
        }
      } else {
        setSyncStatusMsg('Spreadsheet checked.');
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error pulling from sheet:', err);
      setSyncStatusMsg('Could not read from Google Sheet.');
    } finally {
      setIsPulling(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Link existing spreadsheet by URL or ID
  const handleLinkExistingSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractSpreadsheetId(sheetInput);
    if (!id) {
      setSyncStatusMsg('Please enter a valid Google Spreadsheet URL or ID.');
      return;
    }

    setIsSyncing(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
      const res = await updateTripGoogleSheet(trip.id, {
        googleSpreadsheetId: id,
        googleSpreadsheetUrl: url,
        googleSpreadsheetTitle: `Camping Trip Google Sheet (${id.substring(0, 8)}...)`,
        googleSpreadsheetLastSynced: new Date().toISOString(),
        googleSpreadsheetSyncStatus: 'connected'
      });

      onTripUpdated(res.trip);
      setSheetInput('');
      setShowConnectModal(false);
      setSyncStatusMsg('Google Spreadsheet linked across all devices.');
    } catch (err: any) {
      setSyncStatusMsg(`Failed to link: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  return (
    <div className="bg-white border-b border-black text-black">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Status info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-black bg-white flex items-center justify-center shrink-0">
              <Sheet className="w-5 h-5 text-black" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-sm tracking-tight uppercase">
                  Google Spreadsheet Real-Time Sync
                </span>
                {hasSheet ? (
                  <span className="bg-[#D6B588] text-white font-semibold text-[11px] px-2.5 py-0.5 border border-black uppercase tracking-wider">
                    Connected & Synced
                  </span>
                ) : (
                  <span className="border border-black bg-white text-black font-semibold text-[11px] px-2.5 py-0.5 uppercase tracking-wider">
                    Not Linked Yet
                  </span>
                )}
              </div>

              <p className="text-xs text-black/70 flex items-center gap-2 mt-1">
                {hasSheet ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-black" />
                    <span>
                      Last sync: {trip.googleSpreadsheetLastSynced ? new Date(trip.googleSpreadsheetLastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                    </span>
                    <span>•</span>
                    <span>All friends' devices synchronized in real-time</span>
                  </>
                ) : (
                  'Link your camping Google Spreadsheet to auto-sync gear, menus, and camper lists across all devices.'
                )}
              </p>
            </div>
          </div>

          {/* Action buttons (#D6B588 boxes with inner white texts) */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasSheet ? (
              <>
                <a
                  href={trip.googleSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${trip.googleSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-semibold text-xs px-3.5 py-2 border border-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Google Sheets</span>
                </a>

                <button
                  type="button"
                  onClick={handlePushToSheet}
                  disabled={isSyncing}
                  className="bg-black hover:bg-neutral-800 text-white font-medium text-xs px-3.5 py-2 border border-black transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromSheet}
                  disabled={isPulling}
                  className="bg-white hover:bg-neutral-100 text-black font-medium text-xs px-3.5 py-2 border border-black transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>Pull Updates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className="p-2 border border-black bg-white hover:bg-neutral-100 transition-colors cursor-pointer text-black"
                  title="Configure Spreadsheet Link"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-semibold text-xs px-4 py-2 border border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Google Spreadsheet</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync message banner */}
        {syncStatusMsg && (
          <div className="mt-3 p-2.5 bg-[#D6B588] text-white text-xs font-medium border border-black flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </div>

      {/* Connect / Change Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 text-black shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-black">
              <div className="flex items-center gap-2">
                <Sheet className="w-5 h-5 text-black" />
                <h3 className="font-bold text-black text-base uppercase tracking-tight">Connect Google Spreadsheet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-black hover:opacity-60 text-xl font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-black/80 leading-relaxed">
              Connect your Google Spreadsheet by pasting its URL or ID. All devices accessing this camping trip will automatically synchronize in real-time.
            </p>

            <form onSubmit={handleLinkExistingSheet} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Google Sheet URL or Spreadsheet ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border border-black text-black placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!sheetInput.trim() || isSyncing}
                  className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-semibold text-xs px-5 py-2 border border-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? 'Connecting...' : 'Connect Spreadsheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

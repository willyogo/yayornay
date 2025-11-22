import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppHeader } from './AppHeader';
import { AppView } from '../types/view';
import { useZoraCoin } from '../hooks/useZoraCoin';
import { calculate24hChange, formatCurrency } from '../lib/zora';

interface SubmitPageProps {
  onSelectView: (view: AppView) => void;
  currentView: AppView;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const FALLBACK_DISPLAY = {
  marketCap: '$12.5K',
  volume24h: '$3.2K',
  change24h: 8.5,
  holders: 142,
  profileImage: null as string | null,
  coverImage: null as string | null,
  displayName: null as string | null,
  bio: null as string | null,
};

const DEBOUNCE_MS = 400;

const mockSubmitCreator = async (creator: string) => {
  // Simulate sending the creator handle to an API endpoint
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log('Mock submit payload', { creator });
};

export function SubmitPage({ onSelectView, currentView }: SubmitPageProps) {
  const [handleInput, setHandleInput] = useState('');
  const [debouncedHandle, setDebouncedHandle] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');

  const creatorIdentifier = debouncedHandle
    ? `@${debouncedHandle.replace(/^@+/, '')}`
    : null;

  const { coinData, loading, error } = useZoraCoin(creatorIdentifier);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedHandle(handleInput.trim().replace(/^@+/, ''));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [handleInput]);

  const displayData = useMemo(() => {
    if (coinData) {
      return {
        marketCap: formatCurrency(coinData.marketCap),
        volume24h: formatCurrency(coinData.volume24h),
        change24h: calculate24hChange(
          coinData.marketCap,
          coinData.marketCapDelta24h
        ),
        holders: coinData.uniqueHolders,
        profileImage:
          coinData.creatorProfile?.avatar?.previewImage?.medium ||
          coinData.creatorProfile?.avatar?.previewImage?.small ||
          null,
        coverImage: coinData.mediaContent?.previewImage?.medium,
        displayName:
          coinData.creatorProfile?.displayName || coinData.creatorProfile?.handle,
        bio: coinData.creatorProfile?.bio,
      };
    }

    return FALLBACK_DISPLAY;
  }, [coinData]);

  const changeIsPositive = displayData.change24h >= 0;
  const canSubmit =
    Boolean(creatorIdentifier) &&
    !loading &&
    submissionState !== 'submitting';

  const showDetails = Boolean(creatorIdentifier && !loading && coinData);
  const creatorLabel = creatorIdentifier || '@creator';
  const profileImage =
    displayData.profileImage || getAvatarUrl(creatorIdentifier || '@creator');

  const handleInputChange = (value: string) => {
    const normalized = value.replace(/^@+/, '').replace(/\s+/g, '');
    setHandleInput(normalized);
    setSubmissionState('idle');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!creatorIdentifier || !canSubmit) return;

    try {
      setSubmissionState('submitting');
      await mockSubmitCreator(creatorIdentifier);
      setSubmissionState('success');
      setTimeout(() => setSubmissionState('idle'), 2000);
    } catch (err) {
      console.error('Mock submission failed', err);
      setSubmissionState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader view={currentView} onChange={onSelectView} />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                    @
                  </span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-9 py-3 text-lg font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                    placeholder="zora_creator"
                    inputMode="text"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm uppercase tracking-wide transition-colors ${
                    canSubmit
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {submissionState === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>

              {submissionState === 'success' && (
                <div className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Submission received for {creatorIdentifier}
                </div>
              )}

              {submissionState === 'error' && (
                <div className="inline-flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />
                  Something went wrong. Please try again.
                </div>
              )}
            </form>
          </section>

          <div className="space-y-3">
            {error && (
              <div className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                We could not find a creator coin for that handle. You can still submit.
              </div>
            )}

            {loading && creatorIdentifier && (
              <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching data
              </div>
            )}

            {showDetails && (
              <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-lg fade-in">
                <div className="px-6 py-4 flex items-center gap-3 bg-white">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-md bg-white flex-shrink-0">
                    <img
                      src={profileImage}
                      alt={creatorLabel}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getAvatarUrl(creatorLabel);
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight truncate">
                      {displayData.displayName || creatorLabel}
                    </h2>
                    {displayData.holders && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {displayData.holders.toLocaleString()} holders
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-2.5 border border-blue-200/50">
                      <div className="flex items-center gap-1.5 text-blue-700 text-[10px] mb-0.5 font-medium">
                        <DollarSign className="w-3 h-3" />
                        Market Cap
                      </div>
                      <div className="text-base font-bold text-gray-900">
                        {displayData.marketCap}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-2.5 border border-purple-200/50">
                      <div className="flex items-center gap-1.5 text-purple-700 text-[10px] mb-0.5 font-medium">
                        <TrendingUp className="w-3 h-3" />
                        24h Volume
                      </div>
                      <div className="text-base font-bold text-gray-900">
                        {displayData.volume24h}
                      </div>
                    </div>

                    <div
                      className={`rounded-xl p-2.5 col-span-2 border ${
                        changeIsPositive
                          ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200/50'
                          : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-[10px] mb-0.5 font-medium ${
                          changeIsPositive ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {changeIsPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        24h Change
                      </div>
                      <div
                        className={`text-base font-bold ${
                          changeIsPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {changeIsPositive ? '+' : ''}
                        {displayData.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function getAvatarUrl(username: string) {
  const cleanUsername = username.replace('@', '') || 'creator';
  return `https://avatar.vercel.sh/${cleanUsername}`;
}

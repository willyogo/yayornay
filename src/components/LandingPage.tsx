import { Heart, TrendingUp, Users, Gavel } from 'lucide-react';
import { WalletConnect } from './WalletConnect';

interface LandingPageProps {
  onBecomeVoter: () => void;
}

export function LandingPage({ onBecomeVoter }: LandingPageProps) {
  const features = [
    {
      icon: TrendingUp,
      title: '[Unstoppable] Creator Coin Treasury',
      description: 'User-friendly app on the front. Onchain, nounish governance on the back.',
      accent: 'from-emerald-300/90 to-cyan-300/80',
    },
    {
      icon: Users,
      title: 'Community Owned, AI Assisted',
      description: 'Anyone can submit a creator for consideration by Agent Nay. In lieu of suggestions, Nay scours Zora for promising creators, and in all cases the community votes with their swipes.',
      accent: 'from-blue-300/80 to-fuchsia-400/80',
    },
    {
      icon: Heart,
      title: 'Powered by the BEST',
      description: 'Fully onchain artwork, auctions, and governance powered by nouns.build. Smart embedded wallets, gasless (sponsored) voting, autonomous agent with a wallet, and everything onchain powered by Base/Coinbase. Creators powered by Zora, Zora powered by creators.',
      accent: 'from-fuchsia-300/85 to-rose-300/85',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060a] text-white">
      <div className="absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: "url('/images/retro-grid.png'), url('/images/retro-grid-placeholder.svg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-emerald-950/40 to-fuchsia-900/60" />
        <div className="absolute inset-0 mix-blend-screen opacity-60 bg-[radial-gradient(circle_at_20%_25%,rgba(16,185,129,0.35),transparent_25%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.35),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0)_35%),linear-gradient(295deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0)_45%)]" />
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl space-y-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_25px_120px_rgba(0,0,0,0.55)]">
          <div className="px-8 pt-10 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-sm tracking-[0.25em] uppercase text-gray-100/80">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              <span>Voting is live</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_6px_40px_rgba(236,72,153,0.45)]">
                Yay or Nay?
              </span>
            </h1>

            <p className="text-lg text-gray-100/80 max-w-2xl mx-auto leading-relaxed">
              That is the question. Creator coins are the subject. The community is the judge, jury, and executor. The agent is Nay.
            </p>
          </div>

          <div className="px-8 space-y-3 md:space-y-0 md:flex md:items-center md:justify-center md:gap-4">
            <div className="w-full md:max-w-sm">
              <WalletConnect />
            </div>
            <button
              onClick={onBecomeVoter}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-400 to-fuchsia-500 text-gray-900 font-semibold text-lg tracking-tight shadow-[0_20px_70px_rgba(236,72,153,0.35)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_24px_80px_rgba(52,211,153,0.35)]"
            >
              <Gavel className="w-5 h-5" />
              buy votes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8">
            {features.map(({ icon: Icon, title, description, accent }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-5 md:py-6 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:-translate-y-1 hover:border-white/20"
              >
                <div
                  className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-gray-900 ring-1 ring-white/40 shadow-[0_10px_40px_rgba(255,255,255,0.12)] group-hover:shadow-[0_14px_50px_rgba(255,255,255,0.18)]`}
                >
                  <Icon className="h-6 w-6 drop-shadow-[0_0_12px_rgba(0,0,0,0.25)]" />
                </div>
                <div className="text-left space-y-2">
                  <h3 className="text-lg font-semibold text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.25)]">{title}</h3>
                  <p className="text-sm text-gray-100/75 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-8 pb-10">
            <p className="text-sm text-center text-gray-100/70">
            Built with 💚 by the blank.space team at ETHGlobal Argentina
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

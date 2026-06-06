import { useState } from 'react';
import { Search01Icon, ArrowRight01Icon, ArrowLeft01Icon, Home01Icon, Activity01Icon, Shield01Icon } from 'hugeicons-react';

interface OnboardingWizardProps {
  onComplete: (domain: string) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => Math.max(1, prev - 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    let url = domain.trim().toLowerCase();
    if (!url) return;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    try {
      const parsedUrl = new URL(url);
      onComplete(parsedUrl.hostname);
    } catch (err) {
      setError('Please enter a valid URL (e.g., example.com)');
    }
  };

  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center p-8 relative overflow-hidden bg-[var(--bg-base)]">
      <style>{`
        @keyframes blob-1 {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          20% { transform: translate(300px, -200px) scale(1.4) rotate(90deg); }
          40% { transform: translate(-400px, 300px) scale(0.6) rotate(180deg); }
          60% { transform: translate(500px, 400px) scale(1.2) rotate(270deg); }
          80% { transform: translate(-300px, -400px) scale(0.8) rotate(360deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(450deg); }
        }
        @keyframes blob-2 {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          25% { transform: translate(-500px, -300px) scale(0.7) rotate(-90deg); }
          50% { transform: translate(400px, -400px) scale(1.5) rotate(-180deg); }
          75% { transform: translate(-300px, 500px) scale(0.9) rotate(-270deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(-360deg); }
        }
        @keyframes blob-3 {
          0% { transform: translate(0px, 0px) scale(1); }
          20% { transform: translate(400px, 500px) scale(1.3); }
          40% { transform: translate(-200px, -500px) scale(0.7); }
          60% { transform: translate(-500px, 200px) scale(1.4); }
          80% { transform: translate(300px, -300px) scale(0.8); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes blob-4 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-400px, 200px) scale(1.5); }
          66% { transform: translate(500px, -200px) scale(0.5); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob-1 { animation: blob-1 8s infinite ease-in-out; }
        .animate-blob-2 { animation: blob-2 11s infinite ease-in-out; }
        .animate-blob-3 { animation: blob-3 9s infinite ease-in-out; }
        .animate-blob-4 { animation: blob-4 13s infinite ease-in-out; }
      `}</style>

      {/* Animated dynamic gradient blobs */}
      <div 
        className={`absolute inset-0 transition-opacity ease-in-out pointer-events-none z-0 ${
          step === 3 
            ? 'opacity-0 duration-[3000ms]' 
            : (isHovering || step === 2) 
              ? 'opacity-100 duration-700' 
              : 'opacity-0 duration-700'
        }`}
      >
         <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--accent-primary)]/30 rounded-full mix-blend-screen filter blur-[150px] animate-blob-1" />
         <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-emerald-500/30 rounded-full mix-blend-screen filter blur-[150px] animate-blob-2" />
         <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-cyan-500/30 rounded-full mix-blend-screen filter blur-[150px] animate-blob-3" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[150px] animate-blob-4" />
      </div>

      {step > 1 && (
        <button 
          onClick={handleBack}
          className="absolute top-8 left-8 p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors flex items-center gap-2 font-medium z-50"
        >
          <ArrowLeft01Icon size={20} /> Back
        </button>
      )}

      <div className="w-full max-w-3xl relative z-10 min-h-[500px] flex flex-col items-center justify-center">
        
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 text-white leading-[1.4]" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
              Hey there. <br/> I'm so glad you're here.
            </h1>
            <p className="text-xl text-zinc-400 font-medium max-w-xl mx-auto leading-relaxed mb-10">
              I built Oxide to be the lightning-fast, subscription-free SEO engine you actually deserve.
            </p>
            <button 
              onClick={handleNext}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 text-zinc-200 font-medium rounded-xl hover:bg-white/10 hover:text-white hover:border-white/20 transition-all flex items-center gap-3 text-base group z-10 shadow-xl"
            >
              Get Started <ArrowRight01Icon size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Step 2: Architecture */}
        {step === 2 && (
          <div className="flex flex-col items-center w-full animate-in slide-in-from-right-16 fade-in duration-500">
            <h2 className="text-3xl font-bold text-white mb-12 tracking-tight">Designed differently.</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-xl">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4">
                  <Home01Icon size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Yours to keep.</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">No subscriptions, no cloud limits. All of your data lives right here on your own computer.</p>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent pointer-events-none" />
                <div className="w-12 h-12 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full flex items-center justify-center mb-4 relative z-10">
                  <Activity01Icon size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2 relative z-10">Incredibly fast.</h3>
                <p className="text-zinc-400 text-sm leading-relaxed relative z-10">Built to fly. Because your time is too valuable to spend waiting on loading bars.</p>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-xl">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-4">
                  <Shield01Icon size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Total privacy.</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">What happens on your machine, stays on your machine. Your work is perfectly safe.</p>
              </div>
            </div>

            <button 
              onClick={handleNext}
              className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 text-zinc-200 font-medium rounded-xl hover:bg-white/10 hover:text-white hover:border-white/20 transition-all flex items-center gap-3 text-base group z-10 shadow-xl"
            >
              Continue <ArrowRight01Icon size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Step 3: First Project */}
        {step === 3 && (
          <div className="flex flex-col items-center w-full animate-in slide-in-from-right-16 fade-in duration-500">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Initialize Workspace</h2>
            <p className="text-lg text-zinc-400 font-medium mb-10">Enter a domain to run your first local audit.</p>
            
            <form onSubmit={handleSubmit} className="relative group w-full max-w-xl">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search01Icon size={24} className="text-zinc-500 group-focus-within:text-[var(--accent-primary)] transition-colors" />
              </div>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g., example.com"
                className={`w-full bg-[var(--bg-surface)] border ${error ? 'border-red-500' : 'border-[var(--border-strong)]'} rounded-full py-5 pl-16 pr-36 text-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all shadow-2xl`}
                autoFocus
                required
              />
              <button
                type="submit"
                className="absolute inset-y-2 right-2 px-8 bg-white text-black font-bold rounded-full hover:bg-zinc-200 hover:scale-105 transition-all flex items-center gap-2 text-lg z-10 shadow-lg"
              >
                Launch
              </button>
              {error && (
                <p className="absolute -bottom-8 left-0 w-full text-center text-red-500 font-medium animate-in fade-in slide-in-from-top-2">
                  {error}
                </p>
              )}
            </form>

            <div className="mt-12 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
              <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
              <div className="w-6 h-2 rounded-full bg-[var(--accent-primary)]"></div>
            </div>
          </div>
        )}

        {/* Step Indicators for steps 1 and 2 */}
        {step < 3 && (
          <div className="absolute bottom-[-40px] flex gap-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step === 1 ? 'w-6 bg-white' : 'bg-zinc-700'}`}></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step === 2 ? 'w-6 bg-[var(--accent-primary)]' : 'bg-zinc-700'}`}></div>
            <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
          </div>
        )}
      </div>
    </div>
  );
}

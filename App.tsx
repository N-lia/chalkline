import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AppState, ProjectData, AnimationScene } from './types';
import Stickman from './components/Stickman';
import ChalkBoard from './components/ChalkBoard';

// --- Hand-Drawn Chalk Style Decorations ---
const ChalkDecor: React.FC<{ type: string; className?: string; color?: string }> = ({ type, className, color = "#ffffff" }) => {
  const decorations: Record<string, React.ReactNode> = {
    'EQUATION': (
      <g fill={color} opacity="0.9">
        <text x="5" y="14" fontSize="6" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="300">E = mc²</text>
      </g>
    ),
    'FORMULA': (
      <g fill={color} opacity="0.9">
        <text x="5" y="14" fontSize="5" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="300">a² + b² = c²</text>
      </g>
    ),
    'INTEGRAL': (
      <g fill={color} opacity="0.9">
        <text x="5" y="14" fontSize="6" fontFamily="Georgia, serif" fontWeight="300">∫ f(x) dx</text>
      </g>
    ),
    'SIGMA': (
      <g fill={color} opacity="0.9">
        <text x="5" y="14" fontSize="6" fontFamily="Georgia, serif" fontWeight="300">Σ xₙ</text>
      </g>
    ),
    'PI': (
      <g fill={color} opacity="0.9">
        <text x="5" y="14" fontSize="5" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="300">π ≈ 3.14159</text>
      </g>
    ),
    'WAVE': (
      <g stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
        {/* Axes */}
        <path d="M2 12h50M5 2v20" opacity="0.5" />
        {/* Sine Wave */}
        <path d="M5 12c5-8 15-8 20 0s15 8 20 0" />
      </g>
    )
  };

  return (
    <svg viewBox="0 0 60 20" className={className} xmlns="http://www.w3.org/2000/svg">
      {decorations[type] || decorations['EQUATION']}
    </svg>
  );
};

// --- Utilities ---
const encode = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.byteLength; i++) s += String.fromCharCode(b[i]); return btoa(s); };
const decode = (s: string) => { const b = atob(s); const r = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) r[i] = b.charCodeAt(i); return r; };
async function decodeAudioData(d: Uint8Array, ctx: AudioContext, sr: number, ch: number): Promise<AudioBuffer> {
  const i16 = new Int16Array(d.buffer);
  const buf = ctx.createBuffer(ch, i16.length / ch, sr);
  for (let c = 0; c < ch; c++) {
    const cd = buf.getChannelData(c);
    for (let i = 0; i < buf.length; i++) cd[i] = i16[i * ch + c] / 32768.0;
  }
  return buf;
}

const INITIAL_PROJECT: ProjectData = {
  title: "EXPLAINER SYSTEM V1.0",
  scenes: [
    { id: 's1', title: 'OSCILLATION THEORY', narrative: 'The convergence of sine and cosine functions defines harmonic stability.', stickmanAction: 'pointing', assetId: '1', mathContent: 'EQUATION', duration: 4 },
    { id: 's2', title: 'VOLUME INTEGRATION', narrative: 'Calculating mass density across three-dimensional Euclidean space.', stickmanAction: 'explaining', assetId: '3', mathContent: 'INTEGRAL', duration: 6 },
    { id: 's3', title: 'POLAR COORDINATES', narrative: 'Mapping circular motion using radial and angular displacement vectors.', stickmanAction: 'thinking', assetId: '1', mathContent: 'WAVE', duration: 5 }
  ]
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [project, setProject] = useState<ProjectData>(INITIAL_PROJECT);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [transcriptions, setTranscriptions] = useState<{ text: string, sender: 'user' | 'model' }[]>([]);

  const playRef = useRef<number | null>(null);

  const currentScene = project.scenes[currentSceneIndex];

  // GSAP Refs
  const appContainer = useRef<HTMLDivElement>(null);
  const logoGroup = useRef<HTMLDivElement>(null);
  const titleText = useRef<HTMLHeadingElement>(null);
  const subtitleText = useRef<HTMLParagraphElement>(null);
  const loadButton = useRef<HTMLButtonElement>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);

  const bgIcon1 = useRef<HTMLDivElement>(null);
  const bgIcon2 = useRef<HTMLDivElement>(null);
  const bgIcon3 = useRef<HTMLDivElement>(null);
  const bgIcon4 = useRef<HTMLDivElement>(null);

  const stickmanContainer = useRef<HTMLDivElement>(null);
  const mathContainer = useRef<HTMLDivElement>(null);
  const progressBar = useRef<HTMLDivElement>(null);
  const narrativeText = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    // Landing Page Animations
    if (state === AppState.IDLE) {
      if (bgIcon1.current) gsap.to(bgIcon1.current, { y: 25, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
      if (bgIcon2.current) gsap.to(bgIcon2.current, { x: 25, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
      if (bgIcon3.current) gsap.to(bgIcon3.current, { rotation: 15, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
      if (bgIcon4.current) gsap.to(bgIcon4.current, { scale: 1.15, duration: 8, ease: "sine.inOut", repeat: -1, yoyo: true });

      const tl = gsap.timeline();
      if (logoGroup.current) tl.fromTo(logoGroup.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1 });
      if (titleText.current) tl.fromTo(titleText.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "circ.out" }, "-=0.5");
      if (subtitleText.current) tl.fromTo(subtitleText.current, { opacity: 0 }, { opacity: 0.7, duration: 1 }, "-=0.3");
      if (topicInputRef.current) tl.fromTo(topicInputRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, "-=0.5");
      if (loadButton.current) tl.fromTo(loadButton.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, "-=0.5");
    }
  }, { scope: appContainer, dependencies: [state] });

  useGSAP(() => {
    if (state === AppState.EDITOR) {
      if (stickmanContainer.current) {
        gsap.timeline({ repeat: -1, yoyo: true }).to(stickmanContainer.current, { y: -12, duration: 2.25, ease: "sine.inOut" });
      }
      if (mathContainer.current) {
        gsap.fromTo(mathContainer.current, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5 });
      }
    }
  }, { scope: appContainer, dependencies: [state, currentScene?.mathContent] });

  useGSAP(() => {
    if (state === AppState.EDITOR && progressBar.current) {
      gsap.to(progressBar.current, { width: `${progress}%`, duration: 0.5, ease: "power1.out" });
    }
  }, { dependencies: [progress, state] });

  useGSAP(() => {
    if (state === AppState.EDITOR && narrativeText.current) {
      gsap.fromTo(narrativeText.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 });
    }
  }, { dependencies: [currentScene?.narrative, state] });

  useEffect(() => {
    if (isPlaying) {
      const step = 100 / (currentScene.duration * 60);
      playRef.current = window.setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            if (currentSceneIndex < project.scenes.length - 1) {
              setCurrentSceneIndex(i => i + 1); return 0;
            } else { setIsPlaying(false); return 100; }
          }
          return p + step;
        });
      }, 16.6);
    } else if (playRef.current) clearInterval(playRef.current);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, currentSceneIndex, project, currentScene?.duration]);

  const [isLoading, setIsLoading] = useState(false);

  const handleVisualizeClick = async () => {
    if (!topicInput.trim()) return;
    setIsLoading(true);
    setSelectedFileName(topicInput);

    try {
      const result = await import('./services/api').then(m => m.generateLesson(topicInput));
      let newScenes: AnimationScene[] = [];
      if (typeof result === 'object' && 'script' in result && Array.isArray(result.script)) {
        newScenes = result.script.map((s: any, i: number) => ({
          id: s.id || `s${i + 1}`,
          title: `SCENE ${i + 1}`,
          narrative: s.narration || s.narrative || "...",
          stickmanAction: ['pointing', 'explaining', 'thinking'][i % 3] as any,
          assetId: '1',
          mathContent: ['EQUATION', 'INTEGRAL', 'WAVE', 'SIGMA', 'PI'][i % 5],
          duration: s.duration || 5
        }));
      } else if (typeof result === 'string') {
        newScenes = [{
          id: 's1', title: 'GENERATED RESPONSE', narrative: result.substring(0, 100) + "...", stickmanAction: 'explaining', assetId: '1', mathContent: 'EQUATION', duration: 10
        }];
      }
      if (newScenes.length > 0) setProject(prev => ({ ...prev, scenes: newScenes }));
      setTimeout(() => setState(AppState.EDITOR), 800);
    } catch (error) {
      console.error("Failed to generate lesson:", error);
      setTimeout(() => setState(AppState.EDITOR), 800);
    } finally {
      setIsLoading(false);
    }
  };

  const startLive = async () => {
    alert("Live consultation is currently handled by the backend. This frontend feature is being migrated.");
  };
  const stopLive = () => { setIsLiveActive(false); };

  if (state === AppState.IDLE) {
    return (
      <div ref={appContainer} className="app-frame relative flex flex-col items-center overflow-hidden" style={{ cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='8' y='2' width='6' height='24' rx='2' fill='white' transform='rotate(30 16 16)'/%3E%3C/svg%3E") 4 28, auto` }}>
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id="unopaq" x="-50%" y="-50%" width="200%" height="200%"><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3 0" /></filter>
        </svg>
        <ChalkBoard />
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.2]">
          <div ref={bgIcon1} className="absolute top-[5%] left-[5%]"><ChalkDecor type="EQUATION" className="w-[450px]" color="#ffffff" /></div>
          <div ref={bgIcon2} className="absolute bottom-[10%] right-[5%]"><ChalkDecor type="WAVE" className="w-[400px]" color="#f8e16c" /></div>
          <div ref={bgIcon3} className="absolute top-[45%] right-[10%]"><ChalkDecor type="INTEGRAL" className="w-[350px]" color="#ffffff" /></div>
          <div ref={bgIcon4} className="absolute bottom-[35%] left-[8%]"><ChalkDecor type="SIGMA" className="w-[500px]" color="#f8e16c" /></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ffffff08_1px,transparent_1px)] bg-[size:80px_80px]"></div>
        </div>
        <div className="notched-header-container z-10 w-full flex justify-center">
          <div className="notched-header">
            <span>ARCHIVE_ACCESS: GRANTED</span><span className="opacity-30">|</span><span>NODE_ID: 0x92BC</span><span className="opacity-30">|</span><span>BUILD: V1.1.2</span>
          </div>
        </div>
        <div className="flex-1 w-full max-w-4xl px-10 flex flex-col items-center justify-center z-10 relative text-center">
          <div ref={logoGroup} className="text-3xl font-black mb-10 flex items-center gap-4 group">
            <div className="p-3 bg-[#f8e16c] text-black rounded-2xl shadow-[0_0_30px_rgba(248,225,108,0.3)]"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg></div>
            <span className="text-white">2D</span> <span className="text-[#f8e16c]/60 text-xs font-bold tracking-[0.4em] mt-2 uppercase">Simplified Learning</span>
          </div>
          <h1 ref={titleText} className="heavy-title mb-10 text-white">chalkline</h1>
          <p ref={subtitleText} className="max-w-3xl text-4xl font-black leading-tight mb-24 text-white italic chalk-font tracking-wide">"Visualize knowledge instantly. Get simplified animations that make understanding effortless."</p>
          <div className="relative w-full max-w-2xl group">
            <div className="laser-btn pill-button h-24 w-full relative border-[#f8e16c] flex items-center justify-center overflow-visible">
              <div className="beam l"></div><div className="beam r"></div><div className="beam t"></div><div className="beam b"></div>
              <input ref={topicInputRef} type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVisualizeClick()} placeholder="ENTER TOPIC TO VISUALIZE..." className="w-full h-full bg-transparent border-none outline-none text-2xl font-black text-center text-white placeholder:text-white/30 uppercase tracking-widest relative z-20 px-12" />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 z-20"><div className="w-10 h-10 border-2 border-[#f8e16c] rounded flex items-center justify-center text-[#f8e16c] text-xs font-bold font-mono">↵</div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={appContainer} className="app-frame flex flex-col bg-[#050505]">
      <div className="px-10 py-6 flex items-center justify-between border-b-[2px] border-[#222] bg-black/60 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-8">
          <div className="text-3xl font-black lowercase cursor-pointer text-white" onClick={() => setState(AppState.IDLE)}>chalkline <span className="text-[11px] text-[#f8e16c] font-black ml-2 uppercase tracking-tighter">RENDER_ENGINE</span></div>
          <div className="h-8 w-[2px] bg-white/10"></div>
          {selectedFileName && <div className="mono text-[10px] font-black text-[#f8e16c] truncate max-w-[250px]">TOPIC: {selectedFileName.toUpperCase()}</div>}
        </div>
        <div className="flex items-center gap-5">
          <button onClick={startLive} className="pill-button h-14 bg-[#111] border-[#333]">
            <div className="w-3 h-3 rounded-full bg-[#f8e16c]" />
            <span className="font-black text-xs">CONSULT AI OPERATOR</span>
          </button>
          <button className="pill-button h-14 px-8" onClick={() => setState(AppState.IDLE)}>EXIT</button>
        </div>
      </div>
      <div className="editor-layout overflow-y-auto bg-[#080808]">
        <div className="flex gap-10 items-stretch h-full">
          <div className="viewport-container flex-[5] min-h-[600px] flex flex-col p-0 overflow-hidden relative border-[#222] bg-[#0c0c0c]">
            <div ref={stickmanContainer} className="absolute bottom-36 right-16 w-[240px] h-[280px] z-20 pointer-events-none">
              <Stickman action={isModelSpeaking ? 'explaining' : currentScene.stickmanAction} color="#f8e16c" style="sketchy" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-20 relative">
              <div ref={mathContainer} className="w-full max-w-6xl"><ChalkDecor type={currentScene.mathContent} className="w-full h-auto max-h-[500px]" color="#ffffff" /></div>
            </div>
            <div className="bg-black/90 border-t-[2px] border-[#222] p-5 px-10 flex items-center gap-10 relative z-30">
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-[#f8e16c] text-black rounded-2xl flex items-center justify-center transition-all shadow-[0_0_25px_rgba(248,225,108,0.2)]">
                <span className="text-2xl">{isPlaying ? '⏸' : '▶'}</span>
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center"><div className="px-3 py-1 bg-[#f8e16c] text-black rounded font-black text-[10px] uppercase tracking-[0.2em]">SEQ_ID: {currentScene.id}</div><div className="mono text-[10px] font-black text-white/40 uppercase tracking-widest">{currentScene.title}</div></div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden relative"><div ref={progressBar} className="h-full bg-[#f8e16c]" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>
            <div className="bg-[#0a0a0a] p-12 border-t-[4px] border-[#222] relative z-30"><p ref={narrativeText} className="font-bold text-4xl uppercase tracking-tighter text-white italic chalk-font leading-tight">"{currentScene.narrative}"</p></div>
          </div>
          <div className="w-[460px] flex flex-col gap-10 h-full">
            <div className="ai-console-wrapper flex-1 max-w-none">
              <div className="ai-card-notch !bg-[#121212] !border-[#222] !text-[#f8e16c] !text-[11px] !py-3">CONSULTANT_OPERATOR_v2.4</div>
              <div className="ai-card-body h-full flex flex-col gap-8 !bg-[#121212] !border-[#222] !p-8">
                <div className="flex-1 overflow-y-auto custom-log-scroll mono text-[12px] leading-relaxed opacity-90 pr-4">
                  <div className="italic opacity-30 px-4 py-8 border-2 border-dashed border-white/10 rounded-3xl chalk-font text-2xl text-center">"Live communication is currently handled by the backend."</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
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

// --- Academic Stick Figure Background Icons ---
const StickAcademicIcon: React.FC<{ type: 'math' | 'science' | 'book' | 'logic'; className?: string }> = ({ type, className }) => {
  const strokeColor = "currentColor";
  const strokeWidth = "2.2";

  const variants = {
    math: (
      <g>
        <circle cx="12" cy="6" r="3.5" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M12 9.5v6.5m-3.5 4l3.5-4 3.5 4" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M16 4l4 4m0-4l-4 4" stroke="#f8e16c" strokeWidth="1.5" />
      </g>
    ),
    science: (
      <g>
        <circle cx="9" cy="6" r="3.5" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M9 9.5v6.5m-3.5 4l3.5-4 3.5 4" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M16 10l1.5 6h-5z" fill="none" stroke="#f8e16c" strokeWidth="1.5" />
      </g>
    ),
    book: (
      <g>
        <circle cx="12" cy="6" r="3.5" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M12 9.5v6.5m-3.5 4l3.5-4 3.5 4" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M7 13.5c1 0 5-1 5-1s4 1 5 1v3" stroke="#f8e16c" strokeWidth="1.5" />
      </g>
    ),
    logic: (
      <g>
        <circle cx="10" cy="6" r="3.5" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M10 9.5v6.5m-3.5 4l3.5-4 3.5 4" stroke={strokeColor} strokeWidth={strokeWidth} />
        <circle cx="18" cy="7" r="2" stroke="#f8e16c" strokeWidth="1.5" />
        <circle cx="18" cy="15" r="2" stroke="#f8e16c" strokeWidth="1.5" />
      </g>
    )
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {variants[type]}
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
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [transcriptions, setTranscriptions] = useState<{ text: string, sender: 'user' | 'model' }[]>([]);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const playRef = useRef<number | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentScene = project.scenes[currentSceneIndex];

  // GSAP Refs
  const appContainer = useRef<HTMLDivElement>(null);
  const logoGroup = useRef<HTMLDivElement>(null);
  const titleText = useRef<HTMLHeadingElement>(null);
  const subtitleText = useRef<HTMLParagraphElement>(null);
  const loadButton = useRef<HTMLButtonElement>(null);

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
      // Background Icons Loops
      if (bgIcon1.current) gsap.to(bgIcon1.current, { y: 25, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
      if (bgIcon2.current) gsap.to(bgIcon2.current, { x: 25, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
      if (bgIcon3.current) gsap.to(bgIcon3.current, { rotation: 15, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
      if (bgIcon4.current) gsap.to(bgIcon4.current, { scale: 1.15, duration: 8, ease: "sine.inOut", repeat: -1, yoyo: true });

      // Entry Animations
      const tl = gsap.timeline();
      if (logoGroup.current) tl.fromTo(logoGroup.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1 });
      if (titleText.current) tl.fromTo(titleText.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "circ.out" }, "-=0.5");
      if (subtitleText.current) tl.fromTo(subtitleText.current, { opacity: 0 }, { opacity: 0.7, duration: 1 }, "-=0.3");
      if (loadButton.current) tl.fromTo(loadButton.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, "-=0.5");
    }
  }, { scope: appContainer, dependencies: [state] });

  // Editor View Animations
  useGSAP(() => {
    if (state === AppState.EDITOR) {
      // Stickman Bobbing
      if (stickmanContainer.current) {
        const tl = gsap.timeline({ repeat: -1, yoyo: true });
        tl.to(stickmanContainer.current, { y: -12, duration: 2.25, ease: "sine.inOut" });
      }

      // Math Entry
      if (mathContainer.current) {
        gsap.fromTo(mathContainer.current, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5 });
      }
    }
  }, { scope: appContainer, dependencies: [state, currentScene.mathContent] });

  // Editor Stickman Speaking Animation
  useGSAP(() => {
    if (state === AppState.EDITOR && stickmanContainer.current) {
      if (isModelSpeaking) {
        gsap.to(stickmanContainer.current, { x: 6, duration: 0.1, yoyo: true, repeat: -1, ease: "linear" });
      } else {
        gsap.to(stickmanContainer.current, { x: 0, duration: 0.2 });
      }
    }
  }, { dependencies: [isModelSpeaking, state] });

  // Progress Bar Animation
  useGSAP(() => {
    if (state === AppState.EDITOR && progressBar.current) {
      gsap.to(progressBar.current, { width: `${progress}%`, duration: 0.5, ease: "power1.out" }); // animate width changes smoothly from state updates
    }
  }, { dependencies: [progress, state] });

  // Narrative Text Entry
  useGSAP(() => {
    if (state === AppState.EDITOR && narrativeText.current) {
      gsap.fromTo(narrativeText.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 });
    }
  }, { dependencies: [currentScene.narrative, state] });


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
  }, [isPlaying, currentSceneIndex, project, currentScene.duration]);

  const handleInitiateClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') { alert('System Error: Please select a valid PDF document.'); return; }
      setSelectedFileName(file.name);
      setTimeout(() => setState(AppState.EDITOR), 800);
    }
  };

  const startLive = async () => {
    if (isLiveActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              const data = e.inputBuffer.getChannelData(0);
              const i16 = new Int16Array(data.length);
              for (let i = 0; i < data.length; i++) i16[i] = data[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(i16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(proc); proc.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              setIsModelSpeaking(true);
              const buf = await decodeAudioData(decode(msg.serverContent.modelTurn.parts[0].inlineData.data), outputCtx, 24000, 1);
              const node = outputCtx.createBufferSource(); node.buffer = buf; node.connect(outputCtx.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              node.start(nextStartTimeRef.current); nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(node); node.onended = () => { sourcesRef.current.delete(node); if (sourcesRef.current.size === 0) setIsModelSpeaking(false); };
            }
            if (msg.serverContent?.outputTranscription) setTranscriptions(p => [...p.slice(-5), { text: msg.serverContent!.outputTranscription!.text, sender: 'model' }]);
            if (msg.serverContent?.inputTranscription) setTranscriptions(p => [...p.slice(-5), { text: msg.serverContent!.inputTranscription!.text, sender: 'user' }]);
          },
        },
        config: { responseModalities: [Modality.AUDIO], systemInstruction: "Technical explainer tutor specializing in advanced mathematics and physics.", inputAudioTranscription: {}, outputAudioTranscription: {} }
      });
      liveSessionRef.current = await sessionPromise;
      setIsLiveActive(true);
    } catch (e) { console.error(e); }
  };

  const stopLive = () => { liveSessionRef.current?.close(); audioContextsRef.current?.input.close(); audioContextsRef.current?.output.close(); setIsLiveActive(false); setTranscriptions([]); };

  if (state === AppState.IDLE) {
    return (
      <div ref={appContainer} className="app-frame relative flex flex-col items-center overflow-hidden" style={{ cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='8' y='2' width='6' height='24' rx='2' fill='white' transform='rotate(30 16 16)'/%3E%3C/svg%3E") 4 28, auto` }}>
        {/* SVG Filter for Button Effect */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id="unopaq" x="-50%" y="-50%" width="200%" height="200%">
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3 0" />
          </filter>
        </svg>
        <ChalkBoard />
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />

        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.2]">
          <div ref={bgIcon1} className="absolute top-[5%] left-[5%]"><ChalkDecor type="EQUATION" className="w-[450px]" color="#ffffff" /></div>
          <div ref={bgIcon2} className="absolute bottom-[10%] right-[5%]"><ChalkDecor type="WAVE" className="w-[400px]" color="#f8e16c" /></div>
          <div ref={bgIcon3} className="absolute top-[45%] right-[10%]"><ChalkDecor type="INTEGRAL" className="w-[350px]" color="#ffffff" /></div>
          <div ref={bgIcon4} className="absolute bottom-[35%] left-[8%]"><ChalkDecor type="SIGMA" className="w-[500px]" color="#f8e16c" /></div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ffffff08_1px,transparent_1px)] bg-[size:80px_80px]"></div>
        </div>

        <div className="notched-header-container z-10 w-full flex justify-center">
          <div className="notched-header">
            <span className="flex items-center gap-2">ARCHIVE_ACCESS: GRANTED</span>
            <span className="opacity-30">|</span>
            <span>NODE_ID: 0x92BC</span>
            <span className="opacity-30">|</span>
            <span>BUILD: V1.1.2</span>
          </div>
        </div>

        <div className="flex-1 w-full max-w-4xl px-10 flex flex-col items-center justify-center z-10 relative text-center">
          <div ref={logoGroup} className="text-3xl font-black mb-10 flex items-center gap-4 group">
            <div className="p-3 bg-[#f8e16c] text-black rounded-2xl group-hover:rotate-6 transition-all duration-500 shadow-[0_0_30px_rgba(248,225,108,0.3)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            </div>
            <span className="text-white">Stickman</span> <span className="text-[#f8e16c]/60 text-xs font-bold tracking-[0.4em] mt-2 uppercase">Simplified Learning</span>
          </div>

          <h1 ref={titleText} className="heavy-title mb-10 text-white">
            chalkline
          </h1>

          <p ref={subtitleText} className="max-w-2xl text-2xl font-medium leading-relaxed mb-16 text-white italic chalk-font">
            "Visualize knowledge instantly. Transform complex documents into clear, simplified animations that make understanding effortless."
          </p>

          <button
            ref={loadButton}
            className="laser-btn pill-button px-16 h-28 text-3xl group overflow-visible relative border-[#f8e16c]" onClick={handleInitiateClick}
            onMouseDown={() => gsap.to(loadButton.current, { scale: 0.95, duration: 0.1 })}
            onMouseUp={() => gsap.to(loadButton.current, { scale: 1.05, duration: 0.1 })}
          >
            <div className="beam l"></div>
            <div className="beam r"></div>
            <div className="beam t"></div>
            <div className="beam b"></div>

            <span className="text relative z-10 flex items-center gap-8 font-black tracking-tight text-white group-hover:text-black transition-colors">
              LOAD_PDF_DOCUMENT
              <div className="w-14 h-14 bg-black text-[#f8e16c] rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M4 17l6-6-6-6M12 19h8" /></svg>
              </div>
            </span>
            <div className="absolute inset-0 bg-[#f8e16c] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
          </button>
        </div>

        <div className="absolute bottom-10 left-10 flex items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-500 cursor-default">
          <div className="w-12 h-12 border-2 border-[#f8e16c] rounded-xl flex items-center justify-center text-[#f8e16c]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></div>
          <div className="mono text-[10px] font-bold tracking-widest uppercase text-white">System_Status: Optimal</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={appContainer} className="app-frame flex flex-col bg-[#050505]">
      <div className="px-10 py-6 flex items-center justify-between border-b-[2px] border-[#222] bg-black/60 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-8">
          <div className="text-3xl font-black lowercase cursor-pointer text-white" onClick={() => setState(AppState.IDLE)}>
            chalkline <span className="text-[11px] text-[#f8e16c] font-black ml-2 uppercase tracking-tighter">RENDER_ENGINE</span>
          </div>
          <div className="h-8 w-[2px] bg-white/10"></div>
          <div className="flex items-center gap-5">
            <div className="acid-badge">HIGH_PRECISION</div>
            {selectedFileName && <div className="mono text-[10px] font-black text-[#f8e16c] truncate max-w-[250px]">SOURCE: {selectedFileName.toUpperCase()}</div>}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={isLiveActive ? stopLive : startLive} className={`pill-button h-14 ${isLiveActive ? 'bg-[#f8e16c] !text-black border-transparent' : 'bg-[#111]'}`}>
            <div className={`w-3 h-3 rounded-full ${isLiveActive ? 'bg-black animate-pulse' : 'bg-[#f8e16c]'}`} />
            <span className="font-black text-xs">{isLiveActive ? 'OPERATOR CONSULTANT ONLINE' : 'CONSULT AI OPERATOR'}</span>
          </button>
          <button className="pill-button h-14 px-8" onClick={() => setState(AppState.IDLE)}>EXIT</button>
        </div>
      </div>

      <div className="editor-layout overflow-y-auto bg-[#080808]">
        <div className="flex gap-10 items-stretch h-full">
          <div className="viewport-container flex-[5] min-h-[600px] flex flex-col p-0 overflow-hidden relative group/video border-[#222] bg-[#0c0c0c]">
            <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]"></div>

            <div
              ref={stickmanContainer}
              className="absolute bottom-36 right-16 w-[240px] h-[280px] z-20 pointer-events-none"
            >
              <Stickman action={isModelSpeaking ? 'explaining' : currentScene.stickmanAction} color="#f8e16c" style="sketchy" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-20 relative">
              <div ref={mathContainer} className="w-full max-w-6xl">
                <ChalkDecor type={currentScene.mathContent} className="w-full h-auto max-h-[500px]" color="#ffffff" />
              </div>
            </div>

            <div className="bg-black/90 border-t-[2px] border-[#222] p-5 px-10 flex items-center gap-10 relative z-30">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 bg-[#f8e16c] text-black rounded-2xl flex items-center justify-center transition-all shadow-[0_0_25px_rgba(248,225,108,0.2)]"
                onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.1, duration: 0.2 })}
                onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })}
                onMouseDown={(e) => gsap.to(e.currentTarget, { scale: 0.9, duration: 0.1 })}
                onMouseUp={(e) => gsap.to(e.currentTarget, { scale: 1.1, duration: 0.1 })}
              >
                <span className="text-2xl">{isPlaying ? '⏸' : '▶'}</span>
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="px-3 py-1 bg-[#f8e16c] text-black rounded font-black text-[10px] uppercase tracking-[0.2em]">SEQ_ID: {currentScene.id}</div>
                  <div className="mono text-[10px] font-black text-white/40 uppercase tracking-widest">{currentScene.title}</div>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                  <div ref={progressBar} className="h-full bg-[#f8e16c]" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="bg-[#0a0a0a] p-12 border-t-[4px] border-[#222] relative z-30">
              <p ref={narrativeText} className="font-bold text-4xl uppercase tracking-tighter text-white italic chalk-font leading-tight">
                "{currentScene.narrative}"
              </p>
            </div>
          </div>

          <div className="w-[460px] flex flex-col gap-10 h-full">
            <div className="ai-console-wrapper flex-1 max-w-none">
              <div className="ai-card-notch !bg-[#121212] !border-[#222] !text-[#f8e16c] !text-[11px] !py-3">CONSULTANT_OPERATOR_v2.4</div>
              <div className="ai-card-body h-full flex flex-col gap-8 !bg-[#121212] !border-[#222] !p-8">
                <div className="flex-1 overflow-y-auto custom-log-scroll mono text-[12px] leading-relaxed opacity-90 pr-4">
                  {transcriptions.length > 0 ? transcriptions.map((t, i) => (
                    <div key={i} className={`mb-6 flex gap-4 ${t.sender === 'user' ? 'text-white' : 'text-[#f8e16c]'}`}>
                      <span className={`font-black h-7 w-7 flex items-center justify-center rounded text-[10px] ${t.sender === 'user' ? 'bg-white/20' : 'bg-[#f8e16c]/20'}`}>{t.sender[0].toUpperCase()}</span>
                      <span className="font-medium flex-1 pt-0.5">{t.text}</span>
                    </div>
                  )) : <div className="italic opacity-30 px-4 py-8 border-2 border-dashed border-white/10 rounded-3xl chalk-font text-2xl text-center">"Awaiting operational parameters and PDF synthesis..."</div>}
                </div>
                <div className="flex flex-col gap-5">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && isLiveActive) { liveSessionRef.current?.sendRealtimeInput({ text: chatInput }); setChatInput(''); } }}
                    disabled={!isLiveActive} className="w-full h-16 bg-black border-[2.5px] border-[#333] rounded-2xl px-6 font-bold text-sm outline-none focus:border-[#f8e16c] transition-all placeholder:opacity-20 text-white"
                    placeholder={isLiveActive ? "Input query vector..." : "Connect for consultation..."} />
                  <button onClick={() => { if (!isLiveActive) startLive(); else if (chatInput) { liveSessionRef.current?.sendRealtimeInput({ text: chatInput }); setChatInput(''); } }}
                    className="pill-button h-16 w-full justify-between group border-[#333] !px-8">
                    <span className="font-black text-[11px] tracking-[0.3em]">{isLiveActive ? 'TRANSMIT_SIGNAL' : 'INITIALIZE_CONSULTANT'}</span>
                    <div className="w-10 h-10 bg-[#f8e16c] rounded-full border-2 border-black flex items-center justify-center text-black group-hover:rotate-12 transition-transform">↓</div>
                  </button>
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

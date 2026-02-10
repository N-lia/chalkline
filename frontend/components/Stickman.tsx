import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { StickmanStyle } from '../types';

interface StickmanProps {
  action: 'pointing' | 'explaining' | 'thinking' | 'waving';
  style?: StickmanStyle;
  color?: string;
}

const Stickman: React.FC<StickmanProps> = ({ action, style = 'sketchy', color = '#f8e16c' }) => {
  const strokeWidth = 3;
  const container = useRef<SVGSVGElement>(null);
  const head = useRef<SVGCircleElement>(null);
  const leftArm = useRef<SVGLineElement>(null);
  const rightArm = useRef<SVGLineElement>(null);

  useGSAP(() => {
    // Initial entry
    gsap.fromTo(container.current,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.5 }
    );

    // Head bobbing - slightly wobbly
    if (head.current) {
      gsap.to(head.current, {
        y: "+=1", x: "+=1",
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        modifiers: {
          // simple wobble simulation by alternating targets or using separate tweens
          // simplified for readability:
        }
      });
      // More random wobble
      gsap.to(head.current, { x: 1, duration: 1, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(head.current, { y: 1, duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.2 });
    }

    // Reset arms first
    gsap.killTweensOf([leftArm.current, rightArm.current]);

    // Define arm positions based on action
    // Note: SVG rotation origin is top-left by default, we need to transform origin to shoulder (50, 58)
    const setOrigin = (el: SVGLineElement | null) => {
      if (el) gsap.set(el, { transformOrigin: "50px 58px" });
    };
    setOrigin(leftArm.current);
    setOrigin(rightArm.current);

    if (action === 'pointing') {
      gsap.to(leftArm.current, { rotate: 5, y: 0, x: 0, duration: 0.5 });
      gsap.to(rightArm.current, { rotate: -65, x: 8, y: -8, duration: 0.5 });
    } else if (action === 'explaining') {
      // Left arm
      gsap.to(leftArm.current, {
        rotate: 0, x: 0, y: 0, duration: 0.5,
        onComplete: () => {
          gsap.to(leftArm.current, {
            rotate: -35, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut"
          });
        }
      });
      // Right arm
      gsap.to(rightArm.current, {
        rotate: 0, x: 0, y: 0, duration: 0.5,
        onComplete: () => {
          gsap.to(rightArm.current, {
            rotate: 35, duration: 1.75, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.2
          });
        }
      });
    } else if (action === 'thinking') {
      gsap.to(leftArm.current, { rotate: -15, x: 0, y: 0, duration: 0.5 });
      gsap.to(rightArm.current, { rotate: 140, y: -22, x: -8, duration: 0.5 });
    } else if (action === 'waving') {
      gsap.to(leftArm.current, { rotate: 5, x: 0, y: 0, duration: 0.5 });
      gsap.to(rightArm.current, {
        rotate: -10, x: 0, y: 0, duration: 0.5,
        onComplete: () => {
          gsap.to(rightArm.current, {
            rotate: -90, duration: 0.75, yoyo: true, repeat: -1, ease: "sine.inOut"
          });
        }
      });
    }

  }, { scope: container, dependencies: [action] });

  return (
    <svg
      ref={container}
      viewBox="0 0 100 150"
      className="w-full h-full overflow-visible drop-shadow-[0px_0px_10px_rgba(248,225,108,0.2)]"
    >
      {/* Head */}
      <circle
        ref={head}
        cx="50" cy="30" r="14"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* Spine */}
      <line x1="50" y1="44" x2="50" y2="100" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Arms */}
      <line
        ref={leftArm}
        x1="50" y1="58" x2="18" y2="82"
        stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        ref={rightArm}
        x1="50" y1="58" x2="82" y2="82"
        stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Legs */}
      <line x1="50" y1="100" x2="28" y2="142" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="50" y1="100" x2="72" y2="142" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Character Detail - sketchy lines */}
      <path d="M42,28 Q50,24 58,28" fill="none" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <path d="M48,15 Q50,10 52,15" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
    </svg>
  );
};

export default Stickman;

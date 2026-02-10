import React, { useRef, useEffect } from 'react';

const ChalkBoard: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
        const handleStart = (e: MouseEvent | TouchEvent) => {
            isDrawingRef.current = true;
            const { clientX, clientY } = 'touches' in e ? e.touches[0] : (e as MouseEvent);
            lastPos.current = { x: clientX, y: clientY };
        };

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDrawingRef.current || !lastPos.current) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const { clientX, clientY } = 'touches' in e ? e.touches[0] : (e as MouseEvent);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Chalk effect
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(clientX, clientY);
            ctx.stroke();

            // Texture/Noise
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                const offsetX = (Math.random() - 0.5) * 2;
                const offsetY = (Math.random() - 0.5) * 2;
                ctx.moveTo(lastPos.current.x + offsetX, lastPos.current.y + offsetY);
                ctx.lineTo(clientX + offsetX, clientY + offsetY);
                ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                ctx.stroke();
            }

            lastPos.current = { x: clientX, y: clientY };
        };

        const handleEnd = () => {
            isDrawingRef.current = false;
            lastPos.current = null;
        };

        window.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchstart', handleStart);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousedown', handleStart);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchstart', handleStart);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[9999] pointer-events-none"
        />
    );
};

export default ChalkBoard;

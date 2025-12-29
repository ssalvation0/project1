import { useEffect, useRef, useCallback } from 'react';
import './Particles.css';

// Configuration - reduce particle count significantly for better performance
const PARTICLE_COUNT = 70;
const FRAME_INTERVAL = 1000 / 30; // Cap at 30 FPS instead of 60

const Particles = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);
    const lastFrameTimeRef = useRef(0);
    const isVisibleRef = useRef(true);

    const initParticles = useCallback((canvas) => {
        const particles = [];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const isLeftSide = i < PARTICLE_COUNT / 2;
            particles.push({
                x: isLeftSide
                    ? Math.random() * (canvas.width / 2)
                    : Math.random() * (canvas.width / 2) + (canvas.width / 2),
                y: Math.random() * canvas.height,
                type: isLeftSide ? 'star' : 'spark',
                size: Math.random() * 2 + 1,
                speedY: Math.random() * 0.3 + 0.2, // Slower movement
                speedX: (Math.random() - 0.5) * 0.2,
                opacity: Math.random(),
                fadeSpeed: Math.random() * 0.015 + 0.005 // Slower fade
            });
        }

        return particles;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });

        // Set canvas size
        const updateSize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR for performance
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);

            // Reinitialize particles on resize
            particlesRef.current = initParticles({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        updateSize();

        // Visibility observer - pause animation when not visible
        const observer = new IntersectionObserver(
            (entries) => {
                isVisibleRef.current = entries[0].isIntersecting;
                if (isVisibleRef.current && !animationRef.current) {
                    animate(performance.now());
                }
            },
            { threshold: 0 }
        );
        observer.observe(canvas);

        // Animation loop with frame limiting
        const animate = (currentTime) => {
            if (!isVisibleRef.current) {
                animationRef.current = null;
                return;
            }

            animationRef.current = requestAnimationFrame(animate);

            // Frame rate limiting
            const deltaTime = currentTime - lastFrameTimeRef.current;
            if (deltaTime < FRAME_INTERVAL) return;
            lastFrameTimeRef.current = currentTime - (deltaTime % FRAME_INTERVAL);

            const width = window.innerWidth;
            const height = window.innerHeight;

            ctx.clearRect(0, 0, width, height);

            // Batch similar operations
            const particles = particlesRef.current;

            // Draw stars first (batch by type to reduce context switches)
            ctx.fillStyle = '#cfe2ff';
            particles.forEach(p => {
                if (p.type !== 'star') return;

                // Update
                p.y += p.speedY;
                p.x += p.speedX;
                p.opacity += p.fadeSpeed;
                if (p.opacity >= 1 || p.opacity <= 0) p.fadeSpeed = -p.fadeSpeed;
                if (p.y > height) {
                    p.y = 0;
                    p.x = Math.random() * (width / 2);
                }

                // Draw (without expensive shadowBlur)
                ctx.globalAlpha = p.opacity * 0.8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw sparks
            ctx.fillStyle = '#fb1b1b';
            particles.forEach(p => {
                if (p.type !== 'spark') return;

                // Update
                p.y += p.speedY;
                p.x += p.speedX;
                p.opacity += p.fadeSpeed;
                if (p.opacity >= 1 || p.opacity <= 0) p.fadeSpeed = -p.fadeSpeed;
                if (p.y > height) {
                    p.y = 0;
                    p.x = Math.random() * (width / 2) + (width / 2);
                }

                // Draw (without expensive shadowBlur)
                ctx.globalAlpha = p.opacity * 0.8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalAlpha = 1;
        };

        // Start animation
        particlesRef.current = initParticles({ width: window.innerWidth, height: window.innerHeight });
        animate(performance.now());

        // Debounced resize handler
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateSize, 200);
        };

        window.addEventListener('resize', handleResize, { passive: true });

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [initParticles]);

    return <canvas ref={canvasRef} className="particles-canvas" />;
};

export default Particles;
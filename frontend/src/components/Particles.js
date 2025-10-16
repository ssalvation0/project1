import { useEffect, useRef } from 'react';
import './Particles.css';

const Particles = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const particlesCount = 100;

        class Particle {
            constructor(x, y, type) {
                this.x = x;
                this.y = y;
                this.type = type;
                this.size = Math.random() * 2 + 1;
                this.speedY = Math.random() * 0.5 + 0.1;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random();
                this.fadeSpeed = Math.random() * 0.02 + 0.01;
            }

            update() {
                this.y += this.speedY;
                this.x += this.speedX;

                this.opacity += this.fadeSpeed;
                if (this.opacity >= 1 || this.opacity <= 0) {
                    this.fadeSpeed = -this.fadeSpeed;
                }

                if (this.y > canvas.height) {
                    this.y = 0;
                    this.x = this.type === 'star'
                        ? Math.random() * (canvas.width / 2)
                        : Math.random() * (canvas.width / 2) + (canvas.width / 2);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;

                if (this.type === 'star') {
                    ctx.fillStyle = '#cfe2ff';
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = '#cfe2ff';
                } else {
                    ctx.fillStyle = '#fb1b1bff';
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = '#fb1b1bff';
                }

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        for (let i = 0; i < particlesCount; i++) {
            const isLeftSide = i < particlesCount / 2;
            const x = isLeftSide
                ? Math.random() * (canvas.width / 2)
                : Math.random() * (canvas.width / 2) + (canvas.width / 2);
            const y = Math.random() * canvas.height;
            const type = isLeftSide ? 'star' : 'spark';
            
            particles.push(new Particle(x, y, type));
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="particles-canvas" />;
};

export default Particles;
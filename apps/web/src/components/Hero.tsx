'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTypingEffect } from '@/lib/hooks';
import { ArrowRightIcon, SparkleIcon, ChevronDownIcon } from './icons';

const TYPING_TEXTS = [
  'бронирования',
  'аналитику',
  'платежи',
  'каналы продаж',
  'уведомления',
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.min(Math.floor((width * height) / 15000), 80);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        hue: Math.random() > 0.5 ? 42 : 210,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150 * 0.02;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Speed limit
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1) {
          p.vx *= 0.99;
          p.vy *= 0.99;
        }

        // Draw particle
        const color = p.hue === 42 ? `rgba(212, 168, 67, ${p.opacity})` : `rgba(30, 58, 95, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ddx = p.x - p2.x;
          const ddy = p.y - p2.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(212, 168, 67, ${(1 - d / 120) * 0.08})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{ opacity: 0.8 }}
    />
  );
}

export function Hero() {
  const typedText = useTypingEffect(TYPING_TEXTS, 90, 60, 1800);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero-pattern wave-divider noise-overlay">
      {/* Particle canvas */}
      <ParticleCanvas />

      {/* Morphing gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-sardoba-gold/10 blur-3xl animate-morph" />
        <div className="absolute bottom-32 right-[15%] w-96 h-96 bg-sardoba-blue-light/15 blur-3xl animate-morph" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/3 right-[30%] w-48 h-48 bg-sardoba-gold/5 blur-2xl animate-morph" style={{ animationDelay: '-5s' }} />

        {/* Geometric decorations with enhanced animations */}
        <div className="absolute top-32 right-[20%] w-16 h-16 border border-sardoba-gold/20 rotate-45 animate-spin-slow" />
        <div className="absolute bottom-40 left-[15%] w-12 h-12 border border-white/10 rounded-full animate-bounce-subtle" />
        <div className="absolute top-[60%] right-[10%] w-8 h-8 bg-sardoba-gold/10 rounded animate-float" />
        <div className="absolute top-[20%] left-[5%] w-6 h-6 border border-sardoba-gold/15 rounded-full animate-counter-spin" />
        <div className="absolute bottom-[30%] right-[5%] w-10 h-10 border border-white/5 rotate-12 animate-float-x" />

        {/* Orbiting elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px]">
          <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-sardoba-gold/30 animate-orbit" />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-sardoba-blue-light/30 animate-orbit-reverse" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,168,67,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial light rays */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] opacity-[0.04]"
          style={{
            background: 'conic-gradient(from 0deg at 50% 0%, transparent 0deg, rgba(212,168,67,0.5) 30deg, transparent 60deg, transparent 120deg, rgba(212,168,67,0.3) 150deg, transparent 180deg, transparent 240deg, rgba(212,168,67,0.4) 270deg, transparent 300deg)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-premium mb-8 animate-fade-in animated-border">
          <SparkleIcon size={16} className="text-sardoba-gold animate-scale-pulse" />
          <span className="text-sardoba-sand text-sm font-medium">
            PMS нового поколения для Узбекистана
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 animate-slide-up">
          Управляйте отелем
          <br />
          <span className="text-gradient-premium animate-text-glow">как профессионалы</span>
        </h1>

        {/* Typing subtitle */}
        <div className="text-lg sm:text-xl md:text-2xl text-white/60 mb-4 animate-fade-in h-8">
          Автоматизируйте{' '}
          <span className="text-sardoba-gold font-semibold inline-block min-w-[200px] text-left">
            {typedText}
            <span className="inline-block w-0.5 h-6 bg-sardoba-gold ml-0.5 animate-pulse" />
          </span>
        </div>

        <p className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Единая платформа для бутик-отелей и гостевых домов.
          Booking.com, Payme, Telegram — всё в одном месте.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <a href="#contact" className="group relative btn-gold flex items-center gap-2 text-lg overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              Попробовать бесплатно
              <ArrowRightIcon size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-sardoba-gold-light to-sardoba-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
          <a href="#dashboard" className="btn-outline flex items-center gap-2 text-lg group">
            <span className="relative">Смотреть демо</span>
            <div className="w-2 h-2 rounded-full bg-sardoba-gold animate-pulse" />
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-white/30 text-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
          {['14 дней бесплатно', 'Без привязки карты', 'Поддержка на русском и узбекском'].map((text) => (
            <div key={text} className="flex items-center gap-2 group/badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sardoba-gold/60 group-hover/badge:text-sardoba-gold transition-colors">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="group-hover/badge:text-white/50 transition-colors">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-subtle">
        <span className="text-white/30 text-xs uppercase tracking-widest">Узнать больше</span>
        <ChevronDownIcon size={20} className="text-sardoba-gold/50" />
      </div>
    </section>
  );
}

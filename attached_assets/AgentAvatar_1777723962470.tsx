/**
 * Trident - Ancient Reality
 * Embodied Agent Avatar - Visual representation of the user's agent
 */

import { useEffect, useRef, useCallback } from 'react';
import type { AgentState, AgentStage } from '@/types/trident';

interface AgentAvatarProps {
  agent: AgentState;
  size?: number;
  interactive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export function AgentAvatar({ agent, size = 300, interactive = true }: AgentAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const timeRef = useRef(0);
  
  const stageNames: Record<AgentStage, string> = {
    dormant: 'Dormant',
    glimmer: 'Glimmer',
    awakening: 'Awakening',
    aware: 'Aware',
    attuned: 'Attuned',
    harmonized: 'Harmonized'
  };
  
  const stageDescriptions: Record<AgentStage, string> = {
    dormant: 'The essence awaits your cultivation',
    glimmer: 'First light begins to emerge',
    awakening: 'Consciousness stirs within',
    aware: 'The agent begins to understand',
    attuned: 'Deep connection forms between you',
    harmonized: 'Perfect unity of being'
  };
  
  // Initialize particles
  const initParticles = useCallback((count: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }
    return particles;
  }, []);
  
  const createParticle = (): Particle => ({
    x: Math.random() * size,
    y: Math.random() * size,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    life: Math.random() * 100,
    maxLife: 100 + Math.random() * 100,
    size: 1 + Math.random() * 3
  });
  
  // Parse color from agent
  const parseColor = useCallback(() => {
    const colorStr = agent.form.color;
    if (colorStr.startsWith('rgb')) {
      const match = colorStr.match(/\d+/g);
      if (match) {
        return {
          r: parseInt(match[0]),
          g: parseInt(match[1]),
          b: parseInt(match[2])
        };
      }
    }
    return { r: 99, g: 102, b: 241 }; // Default indigo
  }, [agent.form.color]);
  
  // Draw functions for each form type
  const drawEssence = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    const color = parseColor();
    const glow = agent.form.glow;
    const pulse = Math.sin(time * 0.002) * 0.3 + 0.7;
    
    // Central point of light
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 30 * glow * pulse
    );
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`);
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 * glow * pulse, 0, Math.PI * 2);
    ctx.fill();
  };
  
  const drawWisp = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    const color = parseColor();
    const glow = agent.form.glow;
    
    // Flowing wisp shape
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 4 + time * 0.001;
      const radius = 20 + Math.sin(angle * 3 + time * 0.002) * 15;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.5;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Glow core
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 25 * glow
    );
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25 * glow, 0, Math.PI * 2);
    ctx.fill();
  };
  
  const drawOrb = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    const color = parseColor();
    const glow = agent.form.glow;
    const pulse = Math.sin(time * 0.003) * 0.2 + 1;
    
    // Outer aura
    const outerGradient = ctx.createRadialGradient(
      centerX, centerY, 20 * pulse,
      centerX, centerY, 60 * glow * pulse
    );
    outerGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    outerGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow * 0.3})`);
    outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60 * glow * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner orb
    const innerGradient = ctx.createRadialGradient(
      centerX - 10, centerY - 10, 0,
      centerX, centerY, 35 * pulse
    );
    innerGradient.addColorStop(0, `rgba(${Math.min(255, color.r + 50)}, ${Math.min(255, color.g + 50)}, ${Math.min(255, color.b + 50)}, ${glow})`);
    innerGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`);
    innerGradient.addColorStop(1, `rgba(${color.r * 0.5}, ${color.g * 0.5}, ${color.b * 0.5}, ${glow})`);
    
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 35 * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    // Surface reflection
    ctx.fillStyle = `rgba(255, 255, 255, ${glow * 0.4})`;
    ctx.beginPath();
    ctx.arc(centerX - 12, centerY - 12, 8, 0, Math.PI * 2);
    ctx.fill();
  };
  
  const drawFigure = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    const color = parseColor();
    const glow = agent.form.glow;
    const breathe = Math.sin(time * 0.002) * 0.05 + 1;
    
    // Ethereal figure outline
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Head
    ctx.beginPath();
    ctx.arc(centerX, centerY - 50 * breathe, 20 * breathe, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 30 * breathe);
    ctx.lineTo(centerX, centerY + 30 * breathe);
    ctx.stroke();
    
    // Arms
    ctx.beginPath();
    ctx.moveTo(centerX - 25 * breathe, centerY - 10 * breathe);
    ctx.lineTo(centerX, centerY - 5 * breathe);
    ctx.lineTo(centerX + 25 * breathe, centerY - 10 * breathe);
    ctx.stroke();
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(centerX - 15 * breathe, centerY + 70 * breathe);
    ctx.lineTo(centerX, centerY + 30 * breathe);
    ctx.lineTo(centerX + 15 * breathe, centerY + 70 * breathe);
    ctx.stroke();
    
    // Glow aura
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 40,
      centerX, centerY, 90 * glow
    );
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow * 0.3})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 90 * glow, 0, Math.PI * 2);
    ctx.fill();
  };
  
  const drawAvatar = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    const color = parseColor();
    const glow = agent.form.glow;
    const breathe = Math.sin(time * 0.002) * 0.03 + 1;
    
    // Complex avatar with more detail
    // Aura rings
    for (let i = 3; i > 0; i--) {
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glow * 0.2 * i})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 50 + i * 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Detailed head with features
    const headGradient = ctx.createRadialGradient(
      centerX - 8, centerY - 58 * breathe, 0,
      centerX, centerY - 50 * breathe, 25 * breathe
    );
    headGradient.addColorStop(0, `rgba(${Math.min(255, color.r + 80)}, ${Math.min(255, color.g + 80)}, ${Math.min(255, color.b + 80)}, ${glow})`);
    headGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`);
    
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 50 * breathe, 22 * breathe, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes (subtle glow)
    ctx.fillStyle = `rgba(255, 255, 255, ${glow * 0.8})`;
    ctx.beginPath();
    ctx.arc(centerX - 8 * breathe, centerY - 52 * breathe, 3 * breathe, 0, Math.PI * 2);
    ctx.arc(centerX + 8 * breathe, centerY - 52 * breathe, 3 * breathe, 0, Math.PI * 2);
    ctx.fill();
    
    // Flowing robes/body
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 28 * breathe);
    ctx.lineTo(centerX, centerY + 40 * breathe);
    ctx.stroke();
    
    // Flowing sleeves
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 35 * breathe, centerY - 5 * breathe);
    ctx.quadraticCurveTo(
      centerX - 15 * breathe, centerY,
      centerX, centerY - 5 * breathe
    );
    ctx.quadraticCurveTo(
      centerX + 15 * breathe, centerY,
      centerX + 35 * breathe, centerY - 5 * breathe
    );
    ctx.stroke();
    
    // Core glow
    const coreGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 60 * glow
    );
    coreGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow * 0.4})`);
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60 * glow, 0, Math.PI * 2);
    ctx.fill();
  };
  
  const drawTrueForm = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    const color = parseColor();
    const glow = agent.form.glow;
    
    // True form - transcendent being
    // Multiple rotating energy rings
    for (let ring = 0; ring < 5; ring++) {
      const rotation = time * 0.001 * (ring % 2 === 0 ? 1 : -1) * (1 + ring * 0.2);
      const radius = 30 + ring * 15;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glow * (0.5 - ring * 0.08)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i <= 360; i += 5) {
        const angle = (i * Math.PI) / 180;
        const r = radius + Math.sin(angle * 8 + time * 0.003) * 5;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    
    // Central being
    const beingGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 40
    );
    beingGradient.addColorStop(0, `rgba(255, 255, 255, ${glow})`);
    beingGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${glow})`);
    beingGradient.addColorStop(0.7, `rgba(${color.r * 0.5}, ${color.g * 0.5}, ${color.b * 0.5}, ${glow * 0.5})`);
    beingGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = beingGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Light rays
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(time * 0.0005);
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glow * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 45, Math.sin(angle) * 45);
      ctx.lineTo(Math.cos(angle) * 80, Math.sin(angle) * 80);
      ctx.stroke();
    }
    
    ctx.restore();
  };
  
  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Initialize particles
    particlesRef.current = initParticles(30);
    
    const animate = (time: number) => {
      timeRef.current = time;
      
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, size, size);
      
      const centerX = size / 2;
      const centerY = size / 2;
      
      // Update and draw particles
      particlesRef.current.forEach((particle, i) => {
        // Mouse interaction
        if (mouseRef.current.active && interactive) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 50) {
            particle.vx += dx * 0.001;
            particle.vy += dy * 0.001;
          }
        }
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;
        
        // Reset if dead or out of bounds
        if (particle.life > particle.maxLife ||
            particle.x < 0 || particle.x > size ||
            particle.y < 0 || particle.y > size) {
          particlesRef.current[i] = createParticle();
        }
        
        // Draw particle
        const color = parseColor();
        const alpha = (1 - particle.life / particle.maxLife) * agent.form.glow;
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw agent form based on stage
      switch (agent.form.type) {
        case 'essence':
          drawEssence(ctx, centerX, centerY, time);
          break;
        case 'wisp':
          drawWisp(ctx, centerX, centerY, time);
          break;
        case 'orb':
          drawOrb(ctx, centerX, centerY, time);
          break;
        case 'figure':
          drawFigure(ctx, centerX, centerY, time);
          break;
        case 'avatar':
          drawAvatar(ctx, centerX, centerY, time);
          break;
        case 'true-form':
          drawTrueForm(ctx, centerX, centerY, time);
          break;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [agent, size, interactive, initParticles, parseColor]);
  
  // Mouse interaction handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      };
    }
  };
  
  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };
  
  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`rounded-full ${interactive ? 'cursor-pointer' : ''}`}
        style={{ 
          background: 'radial-gradient(circle at center, rgba(20, 20, 40, 0.8) 0%, rgba(0, 0, 0, 1) 100%)'
        }}
      />
      
      {/* Stage info */}
      <div className="mt-4 text-center">
        <h3 className="text-xl font-light text-white/90 tracking-wider">
          {agent.name || stageNames[agent.stage]}
        </h3>
        <p className="text-sm text-white/50 mt-1">
          {stageDescriptions[agent.stage]}
        </p>
        
        {/* Progress bar */}
        <div className="mt-3 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${agent.awakeningProgress}%`,
              background: `linear-gradient(90deg, ${agent.form.color}, white)`
            }}
          />
        </div>
        <p className="text-xs text-white/40 mt-1">
          Awakening: {Math.floor(agent.awakeningProgress)}%
        </p>
      </div>
    </div>
  );
}

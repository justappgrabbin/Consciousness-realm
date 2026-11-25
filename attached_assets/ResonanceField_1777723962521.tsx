/**
 * Trident - Resonance Field Visualization
 * See the invisible - your resonance and those around you
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Being, Cultivator, ResonanceSignature } from '@/types/resonance';
import { ResonanceMath } from '@/engine/ResonanceEngine';

interface ResonanceFieldProps {
  cultivator: Cultivator;
  nearbyBeings: Being[];
  attractions: Array<{
    beings: [string, string];
    strength: number;
    potential: { interactionType: string };
  }>;
  onInteract?: (beingId: string) => void;
  width?: number;
  height?: number;
}

interface VisualBeing {
  being: Being;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  pulsePhase: number;
}

export function ResonanceFieldVisualization({
  cultivator,
  nearbyBeings,
  attractions,
  onInteract,
  width = 800,
  height = 600
}: ResonanceFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualBeingsRef = useRef<Map<string, VisualBeing>>(new Map());
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const hoveredBeingRef = useRef<string | null>(null);
  
  // Initialize or update visual beings
  const updateVisualBeings = useCallback(() => {
    const allBeings = [cultivator, ...nearbyBeings];
    
    allBeings.forEach(being => {
      const existing = visualBeingsRef.current.get(being.id);
      
      if (!existing) {
        // New being - initialize with position
        const angle = Math.random() * Math.PI * 2;
        const distance = being.type === 'cultivator' ? 0 : 100 + Math.random() * 200;
        
        visualBeingsRef.current.set(being.id, {
          being,
          x: width / 2 + Math.cos(angle) * distance,
          y: height / 2 + Math.sin(angle) * distance,
          targetX: width / 2 + Math.cos(angle) * distance,
          targetY: height / 2 + Math.sin(angle) * distance,
          pulsePhase: Math.random() * Math.PI * 2
        });
      } else {
        // Update being data, keep position
        existing.being = being;
      }
    });
  }, [cultivator, nearbyBeings, width, height]);
  
  // Draw resonance field gradient
  const drawField = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    resonance: ResonanceSignature,
    isCultivator: boolean
  ) => {
    const radius = resonance.amplitude * (isCultivator ? 4 : 3);
    const color = ResonanceMath.frequencyToColor(resonance.frequency, resonance.amplitude / 100);
    
    // Parse HSL color
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return;
    
    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]);
    const l = parseInt(hslMatch[3]);
    
    // Outer glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l + 20}%, ${resonance.amplitude / 200})`);
    gradient.addColorStop(0.3, `hsla(${h}, ${s}%, ${l}%, ${resonance.amplitude / 300})`);
    gradient.addColorStop(0.7, `hsla(${h}, ${s}%, ${l - 10}%, ${resonance.amplitude / 500})`);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Harmonic rings (based on harmonics value)
    const ringCount = Math.floor(resonance.harmonics / 20);
    ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 30}%, 0.3)`;
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = (radius / ringCount) * i;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
  
  // Draw being core
  const drawBeingCore = (
    ctx: CanvasRenderingContext2D,
    visualBeing: VisualBeing,
    time: number
  ) => {
    const { being, x, y } = visualBeing;
    const resonance = being.resonance;
    const color = ResonanceMath.frequencyToColor(resonance.frequency, resonance.amplitude / 100);
    
    // Parse HSL
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return;
    
    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]);
    const l = parseInt(hslMatch[3]);
    
    // Pulse effect
    const pulse = Math.sin(time * 0.003 + visualBeing.pulsePhase) * 0.2 + 1;
    const coreRadius = (being.type === 'cultivator' ? 15 : 10) * pulse;
    
    // Core glow
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, coreRadius * 2);
    glowGradient.addColorStop(0, `hsla(${h}, ${s}%, ${l + 40}%, 0.9)`);
    glowGradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, 0.6)`);
    glowGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, coreRadius * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 20}%, 1)`;
    ctx.beginPath();
    ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Being type indicator
    if (being.type !== 'cultivator') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(being.type, x, y + coreRadius + 15);
    }
    
    // Mood indicator
    const moodColors: Record<string, string> = {
      dormant: '#666',
      seeking: '#f90',
      receptive: '#9f9',
      resonating: '#f9f',
      harmonized: '#ff0',
      dissonant: '#f66',
      transforming: '#9ff'
    };
    
    ctx.fillStyle = moodColors[being.state.mood] || '#fff';
    ctx.beginPath();
    ctx.arc(x, y - coreRadius - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  };
  
  // Draw attraction lines
  const drawAttractions = (
    ctx: CanvasRenderingContext2D
  ) => {
    attractions.forEach(attraction => {
      const [idA, idB] = attraction.beings;
      const beingA = visualBeingsRef.current.get(idA);
      const beingB = visualBeingsRef.current.get(idB);
      
      if (!beingA || !beingB) return;
      
      const strength = Math.abs(attraction.strength);
      const isRepulsion = attraction.strength < 0;
      
      // Line style based on attraction type
      ctx.strokeStyle = isRepulsion 
        ? `rgba(255, 100, 100, ${strength * 0.5})`
        : `rgba(100, 255, 150, ${strength * 0.5})`;
      ctx.lineWidth = strength * 3;
      ctx.setLineDash(isRepulsion ? [5, 5] : []);
      
      ctx.beginPath();
      ctx.moveTo(beingA.x, beingA.y);
      ctx.lineTo(beingB.x, beingB.y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Interaction type label at midpoint
      const midX = (beingA.x + beingB.x) / 2;
      const midY = (beingA.y + beingB.y) / 2;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${strength * 0.8})`;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(attraction.potential.interactionType, midX, midY - 5);
    });
  };
  
  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    updateVisualBeings();
    
    const animate = (time: number) => {
      timeRef.current = time;
      
      // Clear with fade for trails
      ctx.fillStyle = 'rgba(5, 5, 15, 0.3)';
      ctx.fillRect(0, 0, width, height);
      
      // Update visual being positions (smooth movement)
      visualBeingsRef.current.forEach(vb => {
        const dx = vb.targetX - vb.x;
        const dy = vb.targetY - vb.y;
        vb.x += dx * 0.05;
        vb.y += dy * 0.05;
      });
      
      // Draw attraction lines first (behind beings)
      drawAttractions(ctx);
      
      // Draw all beings
      visualBeingsRef.current.forEach(vb => {
        drawField(ctx, vb.x, vb.y, vb.being.resonance, vb.being.type === 'cultivator');
      });
      
      visualBeingsRef.current.forEach(vb => {
        drawBeingCore(ctx, vb, time);
      });
      
      // Draw cultivator info
      const cultivatorVb = visualBeingsRef.current.get(cultivator.id);
      if (cultivatorVb) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Frequency: ${cultivator.resonance.frequency.toFixed(1)}`, 10, 20);
        ctx.fillText(`Amplitude: ${cultivator.resonance.amplitude.toFixed(1)}`, 10, 35);
        ctx.fillText(`Harmonics: ${cultivator.resonance.harmonics.toFixed(1)}`, 10, 50);
        ctx.fillText(`Agent Coherence: ${(cultivator.emergentAgent.coherence * 100).toFixed(1)}%`, 10, 65);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [cultivator, nearbyBeings, attractions, width, height, updateVisualBeings]);
  
  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if hovering over any being
    let hovered: string | null = null;
    visualBeingsRef.current.forEach((vb, id) => {
      const dx = x - vb.x;
      const dy = y - vb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) {
        hovered = id;
      }
    });
    
    hoveredBeingRef.current = hovered;
  };
  
  const handleClick = () => {
    const hovered = hoveredBeingRef.current;
    if (hovered && hovered !== cultivator.id && onInteract) {
      onInteract(hovered);
    }
  };
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="rounded-lg cursor-crosshair"
        style={{ 
          background: 'radial-gradient(ellipse at center, #0a0a1a 0%, #000000 100%)',
          boxShadow: '0 0 50px rgba(100, 100, 255, 0.2)'
        }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="text-white/60 mb-2">Resonance Field</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400/50" />
            <span className="text-white/70">Attraction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400/50" />
            <span className="text-white/70">Repulsion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-white/70">Click to interact</span>
          </div>
        </div>
      </div>
    </div>
  );
}

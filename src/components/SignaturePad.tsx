import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onChange: (dataUrl: string | null) => void;
  value?: string | null;
}

export default function SignaturePad({ label, onChange, value }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext('2d') ?? null;
  }, []);

  const getPos = useCallback((e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0F2942';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  }, [getCtx, getPos]);

  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getCtx, getPos]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSigned(true);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  }, [isDrawing, onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onChange(null);
  }, [getCtx, onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#F7F9FC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSigned(true);
      };
      img.src = value;
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[11px] text-[#8FA3B8] font-medium">{label}</div>
      <div
        className={`relative rounded-lg border-2 transition-all ${
          hasSigned ? 'border-[#1A6B3C] bg-[#EAF5EE]' : 'border-[#D8E4F0] bg-[#F7F9FC]'
        }`}
        style={{ width: '100%', maxWidth: isMobile ? '100%' : '300px' }}
      >
        <canvas
          ref={canvasRef}
          width={300}
          height={140}
          className="block w-full rounded-lg touch-none cursor-crosshair"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[12px] text-[#8FA3B8] italic">Assine aqui</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="flex items-center gap-1.5 text-[12px] text-[#5A6B80] hover:text-[#1A4A7A] transition-colors"
      >
        <Eraser size={13} />
        Limpar assinatura
      </button>
    </div>
  );
}

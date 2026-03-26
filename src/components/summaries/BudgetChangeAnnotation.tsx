import { useState } from 'react';
import { createPortal } from 'react-dom';

interface BudgetChangeAnnotationProps {
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  reason?: string;
}

/**
 * Custom label component for Recharts ReferenceLine.
 * Shows budget change reason text on mouseEnter via a ReactDOM portal rendered into
 * document.body, ensuring it appears above all Recharts overlays.
 *
 * Usage:
 *   <ReferenceLine x={change.month} strokeDasharray="4 2"
 *     label={<BudgetChangeAnnotation reason={change.reason} />} />
 */
export function BudgetChangeAnnotation({ viewBox, reason }: BudgetChangeAnnotationProps) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const cx = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2;
  const cy = viewBox?.y ?? 0;

  function handleMouseEnter(e: React.MouseEvent) {
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  function handleMouseLeave() {
    setMousePos(null);
  }

  return (
    <>
      <g>
        <circle
          cx={cx}
          cy={cy + 8}
          r={6}
          fill="#6366f1"
          opacity={0.8}
          style={{ cursor: 'pointer' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        <text
          x={(viewBox?.x ?? 0) + 4}
          y={(viewBox?.y ?? 0) + 24}
          fontSize={10}
          fill="#6366f1"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          Budget change
        </text>
      </g>
      {mousePos &&
        reason &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: mousePos.x + 10,
              top: mousePos.y - 36,
              background: '#1e1b4b',
              color: '#fff',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 11,
              pointerEvents: 'none',
              zIndex: 9999,
              maxWidth: 220,
              whiteSpace: 'normal',
              lineHeight: 1.4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {reason}
          </div>,
          document.body,
        )}
    </>
  );
}

import React from 'react';

type BracketProps = {
    side: 'left' | 'right';
    height: number;
    thickness?: number;
    color?: string;
};

/**
 * Hand-drawn-feel square bracket for matrix rendering.
 * Uses quadratic Bézier wobble — the signature of the Lab aesthetic.
 */
const Bracket: React.FC<BracketProps> = ({
    side,
    height,
    thickness = 1.5,
    color = 'var(--lab-ink, #231d16)',
}) => {
    const w = 10;
    const path =
        side === 'left'
            ? `M ${w - 1} 2 Q 2 4 2 ${height / 2} Q 2 ${height - 4} ${w} ${height - 1}`
            : `M 1 2 Q ${w - 1} 4 ${w - 1} ${height / 2} Q ${w - 1} ${height - 4} 1 ${height - 1}`;
    return (
        <svg width={w} height={height} style={{ flexShrink: 0 }} aria-hidden>
            <path
                d={path}
                stroke={color}
                strokeWidth={thickness}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default Bracket;

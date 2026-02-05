import React from 'react';

type VirtualizedListProps = {
    itemCount: number;
    estimateHeight: number;
    maxHeight: number;
    className?: string;
    renderItem: (index: number) => React.ReactNode;
};

const useVirtualWindow = (itemCount: number, estimateHeight: number, overscan = 4) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = React.useState(0);
    const [viewportHeight, setViewportHeight] = React.useState(0);

    React.useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const update = () => setViewportHeight(node.clientHeight);
        update();

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(update);
            resizeObserver.observe(node);
        } else {
            window.addEventListener('resize', update);
        }

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            else window.removeEventListener('resize', update);
        };
    }, []);

    const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    };

    const startIndex = Math.max(0, Math.floor(scrollTop / estimateHeight) - overscan);
    const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + viewportHeight) / estimateHeight) + overscan);
    const topSpacer = startIndex * estimateHeight;
    const bottomSpacer = Math.max(0, (itemCount - endIndex - 1) * estimateHeight);

    return { containerRef, onScroll, startIndex, endIndex, topSpacer, bottomSpacer };
};

export const VirtualizedList: React.FC<VirtualizedListProps> = ({ itemCount, estimateHeight, maxHeight, className, renderItem }) => {
    const { containerRef, onScroll, startIndex, endIndex, topSpacer, bottomSpacer } = useVirtualWindow(itemCount, estimateHeight);
    const items: React.ReactNode[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
        items.push(renderItem(i));
    }

    return (
        <div ref={containerRef} onScroll={onScroll} className={className} style={{ maxHeight, overflowY: 'auto' }}>
            <div style={{ height: topSpacer }} />
            {items}
            <div style={{ height: bottomSpacer }} />
        </div>
    );
};

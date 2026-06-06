import { Interaction } from '../../types';

export const ZOOM_LEVELS = [1, 5, 10, 30, 60, 100, 200, 500];

  export const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  export const getMonthName = (date: Date) => {
    return date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  };

  export const buildTimelineInteractions = (interactions: Interaction[], anniversaryDate?: string) => {
    // Normalize existing interactions to ensure timestamps are Date objects
    const combined = interactions.map(i => ({
      ...i,
      timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp)
    }));

    if (anniversaryDate) {
      const start = new Date(anniversaryDate);
      const startYear = start.getFullYear();
      const currentYear = new Date().getFullYear();
      const maxUserYear = combined.length > 0 ? Math.max(...combined.map(i => i.timestamp.getFullYear())) : currentYear;
      
      for (let y = startYear; y <= Math.max(currentYear + 2, maxUserYear + 1); y++) {
        const annivDate = new Date(start);
        annivDate.setFullYear(y);
        combined.push({
          id: "anniv-" + y,
          text: y === startYear ? "The Beginning of Us ❤️" : getOrdinal(y - startYear) + " Anniversary! 💑",
          timestamp: annivDate,
          type: 'system',
        });
      }
    }
    
    return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

  export const calculateTimelineLayout = ({
  allInteractions,
  effectiveZoom,
  containerWidth,
  layoutMode,
  timelineNow,
  windowWidth,
}: {
  allInteractions: Interaction[];
  effectiveZoom: number;
  containerWidth: number;
  layoutMode: 'vertical' | 'wave' | 'gallery';
  timelineNow: number;
  windowWidth: number;
}) => {
    // Handle gallery mode - return empty layout since gallery view is handled separately
    if (layoutMode === 'gallery') {
      return { items: [], height: 0, path: '', nowY: -1, centerX: 0, nowX: -1 };
    }

    if (allInteractions.length === 0) return { items: [], height: 0, path: '', nowY: -1, centerX: 0, nowX: -1 };

    const sorted = [...allInteractions];
    const startDate = sorted[0].timestamp;
    const endDate = sorted[sorted.length - 1].timestamp; // Ensure we cover the full range
    const startTime = startDate.getTime();

    // --- VERTICAL MODE CALCULATION ---
    if (layoutMode === 'vertical') {
        const rowHeight = effectiveZoom === 1 ? 150 : effectiveZoom === 5 ? 250 : effectiveZoom === 10 ? 400 : 800; // Adjusted based on zoom
        const centerX = containerWidth / 2;
        
        // Ensure centerX is used correctly even on mobile
        const itemsWithPos = sorted.map((item, index) => {
             const isRightSide = index % 2 === 0;
             return {
                ...item,
                x: centerX,
                y: 100 + index * rowHeight,
                isRightSide, 
                isFuture: item.timestamp.getTime() > timelineNow,
                rotation: 0
             };
        });
        
        return { 
           items: itemsWithPos, 
           height: itemsWithPos.length * rowHeight + 200, 
           path: `M ${centerX} 0 L ${centerX} ${itemsWithPos.length * rowHeight + 200}`, 
           centerX, 
           nowY: -1 
        };
    }

    // --- WAVE MODE CALCULATION ---
    const pxPerYear = effectiveZoom === 1 ? 150 : effectiveZoom === 5 ? 300 : effectiveZoom === 10 ? 600 : effectiveZoom === 30 ? 1500 : effectiveZoom === 60 ? 3000 : effectiveZoom === 100 ? 6000 : effectiveZoom === 200 ? 12000 : 30000; 
    const pxPerMs = pxPerYear / (365 * 24 * 60 * 60 * 1000);
    
    // Check total height required
    const duration = endDate.getTime() - startTime;
    const totalHeight = Math.max(600, duration * pxPerMs + 200);

    // Curve Parameters
    // Curve Parameters
    const localContainerWidth = containerWidth || Math.min(windowWidth, 1200);
    const centerX = localContainerWidth / 2; 
    const amplitude = windowWidth < 640 ? 80 : 250; 
    const wavelength = 350; 

    // Generate Path Points
    const points = [];
    for (let y = 0; y <= totalHeight; y += 10) {
      const x = centerX + Math.sin(y / wavelength * Math.PI * 2) * amplitude;
      points.push(`${x},${y}`);
    }
    const pathData = `M ${points[0]} L ${points.slice(1).join(' ')}`;

    // Calculate "Now" Position
    let nowY = -1;
    const nowTime = new Date().getTime();
    if (nowTime >= startTime && nowTime <= endDate.getTime()) {
       nowY = 50 + (nowTime - startTime) * pxPerMs;
    }

    // Map Items to Positions
    const itemsWithPos = sorted.map((item, index) => {
      const timeOffset = item.timestamp.getTime() - startTime;
      const y = 50 + timeOffset * pxPerMs; 
      const x = centerX + Math.sin(y / wavelength * Math.PI * 2) * amplitude;
      
      const isFuture = item.timestamp.getTime() > nowTime;

      // Enhanced Staggering for anti-overlap
      let staggerX = 0;
      let sideOffset = 0;
      
      // Force alternating sides if very close
      const isRightSide = index % 2 === 0;

      if (index > 0) {
        const prevY = 50 + (sorted[index-1].timestamp.getTime() - startTime) * pxPerMs;
        if (y - prevY < 120) { // If closer than 120px vertically
           staggerX = (index % 3 - 1) * 30; // -30, 0, 30
           sideOffset = isRightSide ? 40 : -40;
        }
      }

      return {
        ...item,
        x: x + staggerX + sideOffset,
        y,
        isRightSide,
        isFuture,
        rotation: (index % 4 - 2) * 2 // Jitter
      };
    });

    return { items: itemsWithPos, height: totalHeight, path: pathData, centerX, nowY };
};

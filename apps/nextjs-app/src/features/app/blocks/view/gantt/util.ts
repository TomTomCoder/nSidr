// Scale constants: pixels per day for each time scale
export const PIXELS_PER_DAY: Record<string, number> = {
  day: 40,
  week: 12,
  month: 4,
  quarter: 2,
};

export const ROW_HEIGHT = 40; // px per row
export const SIDEBAR_WIDTH = 220; // px

/**
 * Convert a date to a pixel x-offset from the timeline start date.
 */
export function dateToPixel(date: Date, timelineStart: Date, timeScale: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const dayOffset = (date.getTime() - timelineStart.getTime()) / msPerDay;
  return Math.round(dayOffset * (PIXELS_PER_DAY[timeScale] ?? PIXELS_PER_DAY.week));
}

/**
 * Convert a pixel x-offset back to a Date.
 */
export function pixelToDate(px: number, timelineStart: Date, timeScale: string): Date {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = px / (PIXELS_PER_DAY[timeScale] ?? PIXELS_PER_DAY.week);
  return new Date(timelineStart.getTime() + days * msPerDay);
}

/**
 * Compute bar width in pixels for a [startDate, endDate] span.
 */
export function barWidth(startDate: Date, endDate: Date, timeScale: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max(0, (endDate.getTime() - startDate.getTime()) / msPerDay);
  return Math.max(2, Math.round(days * (PIXELS_PER_DAY[timeScale] ?? PIXELS_PER_DAY.week)));
}

/**
 * Compute the SVG path string for a finish-to-start dependency arrow.
 * fromRight: pixel coords of the right edge of the source bar.
 * toLeft: pixel coords of the left edge of the target bar.
 */
export function dependencyPath(
  fromRight: { x: number; y: number },
  toLeft: { x: number; y: number }
): string {
  const midX = (fromRight.x + toLeft.x) / 2;
  return `M ${fromRight.x} ${fromRight.y} C ${midX} ${fromRight.y} ${midX} ${toLeft.y} ${toLeft.x} ${toLeft.y}`;
}

/**
 * Generate an array of Date objects for column headers given a time scale and viewport range.
 */
export function generateTimelineColumns(start: Date, end: Date, timeScale: string): Date[] {
  const cols: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    cols.push(new Date(cur));
    if (timeScale === 'day') cur.setDate(cur.getDate() + 1);
    else if (timeScale === 'week') cur.setDate(cur.getDate() + 7);
    else if (timeScale === 'month') cur.setMonth(cur.getMonth() + 1);
    else cur.setMonth(cur.getMonth() + 3); // quarter
  }
  return cols;
}

/**
 * Format a column header label based on the time scale.
 */
export function formatColumnLabel(date: Date, timeScale: string): string {
  if (timeScale === 'day') {
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  if (timeScale === 'week') {
    const week = getWeekNumber(date);
    return `W${week} ${date.toLocaleDateString('en-US', { month: 'short' })}`;
  }
  if (timeScale === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  // quarter
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

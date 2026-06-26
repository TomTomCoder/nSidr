import * as React from 'react';
import type { SVGProps } from 'react';
const GanttChart = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <rect x="3" y="4" width="8" height="3" rx="1" fill="currentColor" />
    <rect x="7" y="9" width="10" height="3" rx="1" fill="currentColor" />
    <rect x="5" y="14" width="6" height="3" rx="1" fill="currentColor" />
    <rect x="9" y="19" width="8" height="3" rx="1" fill="currentColor" />
  </svg>
);
export default GanttChart;

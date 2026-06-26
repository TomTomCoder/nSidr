import * as React from 'react';
import type { SVGProps } from 'react';

const KiloCode = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <rect width="24" height="24" rx="4" fill="#FF5C00" />
    <path
      d="M7 5v14M7 12l5-7M7 12l6 7M13 8l4 4-4 4"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default KiloCode;

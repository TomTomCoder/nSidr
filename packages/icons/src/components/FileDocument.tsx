import * as React from 'react';
import type { SVGProps } from 'react';
const FileDocument = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="120"
    height="120"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_doc)">
      <path
        d="M96 70L70 96"
        stroke="currentColor"
        strokeWidth="9.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M90.8 41.6L41.6 90.8"
        stroke="currentColor"
        strokeWidth="9.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="4" y="4" width="112" height="112" rx="16" stroke="currentColor" strokeWidth="8" />
    </g>
    <defs>
      <clipPath id="clip0_doc">
        <rect width="120" height="120" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
export default FileDocument;

import React from 'react';

const PROVIDER_LABELS: Record<string, string> = {
  GMAIL: 'Gmail',
  GCALENDAR: 'Google Calendar',
  GDRIVE: 'Google Drive',
  GCHAT: 'Google Chat',
  GMEET: 'Google Meet',
  SLACK: 'Slack',
};

const PROVIDER_COLORS: Record<string, string> = {
  GMAIL: '#EA4335',
  GCALENDAR: '#4285F4',
  GDRIVE: '#0F9D58',
  GCHAT: '#00897B',
  GMEET: '#00BCD4',
  SLACK: '#4A154B',
};

interface ProviderIconProps {
  provider: string;
  size?: number;
}

export function ProviderIcon({ provider, size = 24 }: ProviderIconProps) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  const color = PROVIDER_COLORS[provider] ?? '#888';
  const initial = label[0];
  return (
    <span
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 4,
        backgroundColor: color,
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.5,
      }}
    >
      {initial}
    </span>
  );
}

export { PROVIDER_LABELS };

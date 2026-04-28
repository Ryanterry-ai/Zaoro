'use client';

interface Props {
  settings: {
    enabled: boolean;
    text: string;
    linkText: string;
    linkUrl: string;
    bgColor: string;
    textColor: string;
  };
}

export function AnnouncementBar({ settings }: Props) {
  if (!settings.enabled) return null;
  return (
    <div style={{ backgroundColor: settings.bgColor, color: settings.textColor }} className="py-2.5 text-center text-xs tracking-wider overflow-hidden">
      <div className="flex whitespace-nowrap">
        <div className="animate-marquee flex gap-16 pr-16">
          {[0, 1, 2, 3].map(i => (
            <span key={i}>
              {settings.text}&nbsp;
              <a href={settings.linkUrl} className="underline underline-offset-2 hover:opacity-80">{settings.linkText}</a>
            </span>
          ))}
        </div>
        <div className="animate-marquee flex gap-16 pr-16" aria-hidden="true">
          {[0, 1, 2, 3].map(i => (
            <span key={i}>
              {settings.text}&nbsp;
              <a href={settings.linkUrl} className="underline underline-offset-2 hover:opacity-80">{settings.linkText}</a>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

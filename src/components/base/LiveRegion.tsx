interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  /** Unique key to force re-announcement on change */
  announceKey?: string;
}

export default function LiveRegion({ message, politeness = 'polite', announceKey }: LiveRegionProps) {
  return (
    <div
      key={announceKey}
      className="sr-only"
      aria-live={politeness}
      aria-atomic="true"
      role="status"
    >
      {message}
    </div>
  );
}
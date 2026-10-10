import { useEffect, useRef, useState } from "react";
import InvitationRenderer from "@/pages/app/invitations/[invitationId]/edit/components/InvitationRenderer";
import { parseInvitationDocument } from "@/pages/app/invitations/[invitationId]/edit/documentValidator";
export default function GuestInvitationDesign({
  value,
  assets,
}: {
  value: unknown;
  assets?: Record<string, string>;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const parsed = parseInvitationDocument(value);
  const document = parsed.document;
  if (!document) return null;
  const scale = Math.min(1, width / document.canvas.width);
  return (
    <div
      ref={frame}
      className="w-full mb-8"
      aria-label="Your invitation design"
    >
      <div
        style={{
          width: document.canvas.width * scale,
          height: document.canvas.height * scale,
          margin: "0 auto",
        }}
      >
        <InvitationRenderer
          document={document}
          scale={scale}
          interactive={false}
          assetLookup={new Map(Object.entries(assets || {}))}
        />
      </div>
    </div>
  );
}

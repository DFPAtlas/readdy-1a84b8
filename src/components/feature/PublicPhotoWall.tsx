import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import QrCode from "@/components/feature/QrCode";
import { sharedPhotoUploadUrl } from "@/lib/sharedPhotoLink";
type Wall = {
  title: string | null;
  hashtag: string | null;
  paused: boolean;
  duration: number;
  background: string;
  blur: boolean;
  shuffle: boolean;
  transition: string;
  photos: { id: string; caption: string | null; url: string }[];
  upload_token?: string | null;
};
export default function PublicPhotoWall({
  slug,
}: {
  slug: string | undefined;
}) {
  const [wall, setWall] = useState<Wall | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setWall(null);
    setError("");
    if (!slug) {
      setError("Photo wall unavailable.");
      return;
    }
    async function load() {
      const { data, error } = await supabase.functions.invoke(
        "public-photo-wall",
        { body: { slug } },
      );
      if (cancelled) return;
      if (error || data?.error) {
        setWall(null);
        setError(
          "Photo wall unavailable. Check with the couple that it is enabled.",
        );
      } else {
        setWall(data);
        setError("");
      }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [slug]);
  useEffect(() => {
    if (!wall || wall.paused || !wall.photos.length) return;
    const timer = setInterval(
      () =>
        setIndex((i) =>
          wall.shuffle && wall.photos.length > 1
            ? (i + 1 + Math.floor(Math.random() * (wall.photos.length - 1))) %
              wall.photos.length
            : (i + 1) % wall.photos.length,
        ),
      wall.duration,
    );
    return () => clearInterval(timer);
  }, [wall]);
  const photo = wall?.photos[index % Math.max(1, wall.photos.length)];
  return (
    <main
      style={{ background: wall?.background }}
      className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-5 relative"
    >
      {wall?.blur && photo && (
        <img
          src={photo.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 pointer-events-none"
        />
      )}
      <style>{`@keyframes wall-fade{from{opacity:0}to{opacity:1}} @keyframes wall-slide{from{transform:translateX(5%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div className="absolute top-4 left-5 z-10">
        <h1 className="font-heading text-2xl">{wall?.title}</h1>
        <p>{wall?.hashtag}</p>
      </div>
      <button
        className="absolute top-4 right-5 z-10 bg-black/60 rounded-lg px-3 py-2"
        onClick={() => document.documentElement.requestFullscreen?.()}
      >
        Full screen
      </button>
      {error ? (
        <p role="status">{error}</p>
      ) : !wall ? (
        <p role="status">Loading photo wall…</p>
      ) : !photo ? (
        <p className="relative z-10">
          {wall.upload_token
            ? "Be the first to share a photo — scan the code to upload."
            : "No published photos have been added to the wall yet."}
        </p>
      ) : (
        <figure className="relative z-10 w-full text-center">
          <img
            key={photo.id}
            style={{
              animation:
                wall?.transition === "fade"
                  ? "wall-fade .5s ease"
                  : wall?.transition === "slide"
                    ? "wall-slide .5s ease"
                    : undefined,
            }}
            className="mx-auto max-h-[85vh] object-contain"
            src={photo.url}
            alt={photo.caption || "Wedding photo"}
          />
          {photo.caption && (
            <figcaption className="mt-4">{photo.caption}</figcaption>
          )}
        </figure>
      )}
      {wall?.upload_token && (
        <aside className="absolute bottom-5 right-5 z-20 bg-white text-stone-900 rounded-xl p-3 shadow-2xl flex items-center gap-3 max-w-[18rem]">
          <QrCode
            value={sharedPhotoUploadUrl(wall.upload_token)}
            label="QR code to upload your photos"
            className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 [&>svg]:w-full [&>svg]:h-full"
          />
          <p className="text-sm leading-snug">
            <span className="block font-semibold">Share your photos</span>
            Scan with your phone camera to send them to the couple.
          </p>
        </aside>
      )}
    </main>
  );
}

"use client";

import { ANNOTATION_COLORS, annotationsForPhoto } from "@/lib/services/photo-annotations";
import type { Photo, PhotoAnnotation } from "@/lib/types";
import { Badge } from "./ui/badge";

export function AnnotatedPhoto({
  photo,
  annotations,
  index,
}: {
  photo: Photo;
  annotations: PhotoAnnotation[];
  index: number;
}) {
  const boxes = annotationsForPhoto(annotations, photo.id);
  const caption = [photo.caption, photo.transcription].map((s) => s.trim()).filter(Boolean).join(" · ");

  return (
    <figure className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50" data-testid="annotated-photo">
      <div className="relative aspect-[4/3] bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.dataUrl} alt={caption || `Job photo ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" />
        {boxes.map((ann) => {
          const colors = ANNOTATION_COLORS[ann.severity];
          return (
            <div
              key={ann.id}
              data-testid="photo-annotation-box"
              className="absolute pointer-events-none rounded-sm border-2 shadow-sm"
              style={{
                left: `${ann.box.x * 100}%`,
                top: `${ann.box.y * 100}%`,
                width: `${ann.box.width * 100}%`,
                height: `${ann.box.height * 100}%`,
                borderColor: colors.hex,
                backgroundColor: colors.fill,
              }}
              title={ann.label}
            >
              <span
                className="absolute -top-0 left-0 max-w-[95%] truncate text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 text-white leading-tight"
                style={{ backgroundColor: colors.hex }}
              >
                {ann.label}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Photo {index + 1}</span>
          {boxes.map((ann) => (
            <Badge key={`${ann.id}-badge`} className={ANNOTATION_COLORS[ann.severity].badge}>
              {ann.severity}
            </Badge>
          ))}
        </div>
        {caption ? <p className="text-sm text-slate-700">{caption}</p> : null}
        {boxes.length > 0 ? (
          <ul className="text-xs text-slate-600 space-y-1" data-testid="photo-annotation-legend">
            {boxes.map((ann) => (
              <li key={`${ann.id}-legend`}>
                <span className="font-medium" style={{ color: ANNOTATION_COLORS[ann.severity].hex }}>
                  ■
                </span>{" "}
                {ann.label}
                {ann.sectionHeading ? ` · ${ann.sectionHeading}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Site photo included as supporting evidence.</p>
        )}
      </figcaption>
    </figure>
  );
}

export function AnnotatedPhotoGallery({
  photos,
  annotations,
}: {
  photos: Photo[];
  annotations?: PhotoAnnotation[];
}) {
  if (!photos.length) return null;
  return (
    <div className="space-y-4" data-testid="annotated-photo-gallery">
      <div>
        <h3 className="font-semibold text-slate-900">Photo evidence with highlights</h3>
        <p className="text-sm text-slate-600 mt-1">
          Colored rectangles mark what the report discusses — Urgent (red), Attention (amber), Advisory (blue), Info
          (slate).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo, index) => (
          <AnnotatedPhoto key={photo.id} photo={photo} annotations={annotations ?? []} index={index} />
        ))}
      </div>
    </div>
  );
}

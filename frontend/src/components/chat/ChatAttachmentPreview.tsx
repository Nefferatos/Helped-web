import { useEffect, useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import type { ChatAttachment } from "@/lib/chat";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { clientFetch } from "@/lib/supabaseAuth";

export function ChatAttachmentPreview({ attachment, viewer }: { attachment: ChatAttachment; viewer: "client" | "admin" }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let createdUrl = "";
    const url = viewer === "client" ? attachment.clientUrl : attachment.adminUrl;
    const request = viewer === "client"
      ? clientFetch(url)
      : fetch(url, { headers: { ...getAgencyAdminAuthHeaders() } });
    void request.then(async (response) => {
      if (!response.ok) throw new Error("Could not load this attachment");
      createdUrl = URL.createObjectURL(await response.blob());
      if (active) setObjectUrl(createdUrl);
      else URL.revokeObjectURL(createdUrl);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Could not load this attachment");
    });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachment.adminUrl, attachment.clientUrl, viewer]);

  const isImage = attachment.mimeType.startsWith("image/");
  const isVideo = attachment.mimeType.startsWith("video/");
  const sizeLabel = attachment.size < 1024 * 1024
    ? `${Math.max(1, Math.round(attachment.size / 1024))} KB`
    : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="mt-2 max-w-full overflow-hidden rounded-xl border border-black/10 bg-white/95 text-slate-800">
      {objectUrl && isImage && <a href={objectUrl} target="_blank" rel="noreferrer" aria-label={`Open ${attachment.name}`}><img src={objectUrl} alt={attachment.name} className="max-h-64 max-w-full object-contain" loading="lazy" /></a>}
      {objectUrl && isVideo && <video src={objectUrl} controls preload="metadata" className="max-h-72 max-w-full" aria-label={attachment.name} />}
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        {objectUrl ? <FileText className="h-4 w-4 shrink-0 text-emerald-700" /> : <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
        <span className="min-w-0 flex-1 truncate text-xs font-medium" title={attachment.name}>{error || attachment.name}</span>
        <span className="shrink-0 text-[10px] text-slate-500">{sizeLabel}</span>
        {objectUrl && <a href={objectUrl} download={attachment.name} className="shrink-0 rounded-md p-1 text-emerald-700 hover:bg-emerald-50" aria-label={`Download ${attachment.name}`}><Download className="h-4 w-4" /></a>}
      </div>
    </div>
  );
}

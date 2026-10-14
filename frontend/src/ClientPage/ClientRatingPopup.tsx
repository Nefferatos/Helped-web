import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Star, X } from "lucide-react";
import { getStoredClient } from "@/lib/clientAuth";
import { buildGoogleRateUrl, getGooglePlaceId, getGoogleReviewUrl } from "@/lib/googleMaps";
import { hasSeenRatingPrompt, markRatingPromptSeen } from "@/lib/ratingPrompt";

interface Props {
  /** Listing query used for the Maps fallback when no Google link is set. */
  googleQuery?: string;
  /** How long the client browses before the prompt appears. */
  delayMs?: number;
}

/** Office address already published in the site footer. */
const DEFAULT_QUERY = "3 Jalan Kukoh, #01-115, Singapore 161003";

/**
 * Gentle "rate us on Google" popup for signed-in clients.
 *
 * Deliberately restrained so it stays user-friendly rather than spammy:
 *  - only existing customers are asked (anonymous visitors are never prompted);
 *  - it waits `delayMs` before appearing, so it does not pounce on page load;
 *  - it can be dismissed, and a dismissal is remembered per client;
 *  - it never shows more than once per client on the same browser.
 *
 * It is non-modal (no backdrop) and sits bottom-right, stacked above the AI
 * receptionist bubble, so it never blocks the page. Google cannot accept a rating
 * from us, so the button only hands the client to Google's own review composer.
 */
const ClientRatingPopup = ({ googleQuery = DEFAULT_QUERY, delayMs = 20_000 }: Props) => {
  const clientId = getStoredClient()?.id ?? null;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Existing customers only — never prompt an anonymous visitor to rate us.
    if (clientId == null) return;
    if (hasSeenRatingPrompt(clientId)) return;
    const timer = window.setTimeout(() => setIsVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [clientId, delayMs]);

  // Stop asking once the client has answered — by dismissing or heading to Google.
  const rememberAnswered = () => {
    markRatingPromptSeen(clientId);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const rateUrl = buildGoogleRateUrl({
    query: googleQuery,
    placeId: getGooglePlaceId(),
    reviewUrl: getGoogleReviewUrl(),
  });

  return createPortal(
    <div
      role="dialog"
      aria-label="Rating request"
      style={{
        position: "fixed",
        right: 20,
        bottom: 96,
        zIndex: 60,
        width: "min(360px, calc(100vw - 40px))",
        background: "#fff",
        border: "1px solid #C8E8EF",
        borderRadius: 16,
        boxShadow: "0 20px 50px rgba(11,51,64,0.28)",
        padding: 22,
        animation: "helpedRatingPopupIn 0.35s ease",
      }}
    >
      <style>{`
        @keyframes helpedRatingPopupIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <button
        type="button"
        aria-label="Dismiss rating popup"
        onClick={rememberAnswered}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "1px solid #E0F4F7",
          background: "#F7FBFC",
          color: "#3A7A8A",
          cursor: "pointer",
        }}
      >
        <X size={15} />
      </button>

      <div style={{ display: "flex", gap: 3, marginBottom: 12 }} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={18} fill="#FCD34D" color="#FCD34D" />
        ))}
      </div>

      <p style={{ margin: "0 0 6px", fontWeight: 800, color: "#0B3340", fontSize: 16 }}>
        Enjoying our service?
      </p>
      <p style={{ margin: "0 0 16px", color: "#3A7A8A", fontSize: 13, lineHeight: 1.6 }}>
        If you have a moment, a quick 5-star Google review helps other employers find us.
      </p>

      <a
        href={rateUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={rememberAnswered}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "12px 16px",
          borderRadius: 10,
          background: "linear-gradient(135deg,#FCD34D 0%,#E8B800 100%)",
          color: "#0B3340",
          fontWeight: 800,
          fontSize: 13,
          textDecoration: "none",
          boxShadow: "0 3px 0 #C49A00",
        }}
      >
        <Star size={15} /> Rate us on Google
      </a>

      <button
        type="button"
        onClick={rememberAnswered}
        style={{
          marginTop: 8,
          width: "100%",
          background: "transparent",
          border: 0,
          color: "#7AAABB",
          fontSize: 12,
          cursor: "pointer",
          padding: 6,
        }}
      >
        Maybe later
      </button>
    </div>,
    document.body,
  );
};

export default ClientRatingPopup;

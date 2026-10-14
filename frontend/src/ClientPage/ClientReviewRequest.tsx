import { useState } from "react";
import { Star, X } from "lucide-react";
import { getStoredClient } from "@/lib/clientAuth";
import { buildGoogleMapsEmbedUrl, buildGoogleRateUrl, getGooglePlaceId, getGoogleReviewUrl } from "@/lib/googleMaps";
import { hasSeenReviewRequest, markReviewRequestSeen } from "@/lib/reviewRequest";

interface Props {
  /** Brand name — used only for the Maps fallback when no Google link is configured. */
  agencyName?: string;
  /** Office address — pins the map and labels the Maps fallback. */
  address?: string;
}

/**
 * The office address already published in the site footer.
 *
 * The stored agency profile currently holds only "Singapore", which would drop
 * the map pin in the middle of the country instead of on the office. Once the
 * profile address is filled in, this can be sourced from `/api/company`.
 */
const OFFICE_ADDRESS = "3 Jalan Kukoh, #01-115, Singapore 161003";

/**
 * Google review request for the employer portal. The portal audience is existing
 * customers, which is exactly who a review request is for.
 *
 * Styled with ClientLandingPage's own classes (.section-chip / .btn-amber / .pf)
 * because it renders inside that page's `.client-landing` tree.
 *
 * Google cannot accept a rating from us — the button only hands the customer to
 * Google, where they sign in and choose the stars themselves.
 */
const ClientReviewRequest = ({ agencyName = "AT The Agency", address = OFFICE_ADDRESS }: Props) => {
  const clientId = getStoredClient()?.id ?? null;
  const [isVisible, setIsVisible] = useState(() => !hasSeenReviewRequest(clientId));

  // Only stop asking once the customer has actually answered — by dismissing the
  // request or heading off to Google. Marking it seen on render would hide the
  // section before anyone had a chance to read it, which is exactly what made
  // the request "disappear".
  const rememberAnswered = () => markReviewRequestSeen(clientId);

  const reviewUrl = getGoogleReviewUrl();
  const placeId = getGooglePlaceId();
  const query = address.trim() || agencyName;
  const embedUrl = buildGoogleMapsEmbedUrl(query);
  const rateUrl = buildGoogleRateUrl({ query, placeId, reviewUrl });
  // A short link or Place ID opens the star picker directly; without either we
  // can only send the customer to the Maps listing.
  const opensReviewDirectly = Boolean(reviewUrl || placeId);

  if (!isVisible) return null;

  return (
    <section
      id="google-review"
      aria-labelledby="review-request-heading"
      style={{
        background: "linear-gradient(135deg,#0B3340 0%,#0E4E5E 55%,#176B7E 100%)",
        padding: "72px 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -70,
          right: -70,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(252,211,77,0.18) 0%,transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -90,
          left: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(252,211,77,0.10) 0%,transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Lets the customer stop the request themselves — the honest version of
          "ask once", instead of hiding it before they have read it. */}
      <button
        type="button"
        aria-label="Dismiss review request"
        onClick={() => {
          rememberAnswered();
          setIsVisible(false);
        }}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.85)",
          cursor: "pointer",
        }}
      >
        <X size={16} />
      </button>

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <span
          className="section-chip"
          style={{
            background: "rgba(252,211,77,0.12)",
            color: "#FCD34D",
            border: "1px solid rgba(252,211,77,0.3)",
            marginBottom: 14,
            display: "inline-flex",
          }}
        >
          <Star size={10} /> Reviews
        </span>

        <h2
          id="review-request-heading"
          className="pf"
          style={{
            fontSize: "clamp(1.6rem,3.5vw,2.4rem)",
            color: "#fff",
            margin: "0 0 6px",
            fontStyle: "italic",
          }}
        >
          Enjoyed working with us?
        </h2>
        <span className="amber-rule" style={{ margin: "0 auto 20px" }} />

        <div
          style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 20 }}
          aria-label="5 out of 5 stars"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={22} fill="#FCD34D" color="#FCD34D" />
          ))}
        </div>

        {/* The wording the agency owner asked us to publish. */}
        <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, margin: "0 auto 12px", maxWidth: 560 }}>
          Our valued customers, if you have some time, can you give us a 5-star review on Google?
          It only takes a moment, and it helps other employers find us.
        </p>

        <p className="pf" style={{ color: "#FCD34D", fontStyle: "italic", fontWeight: 700, margin: "0 0 26px" }}>
          Thank You, {agencyName}
        </p>

        <a
          className="btn-amber"
          href={rateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={rememberAnswered}
        >
          <Star size={15} /> Give us a 5-star review
        </a>

      </div>

      {/* Office map — full width, edge to edge, so the pin and street names
          stay readable. */}
      <div style={{ width: "100%", marginTop: 32 }}>
        <iframe
          title="Map showing our office"
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          style={{ display: "block", width: "100%", height: "clamp(320px, 45vw, 480px)", border: 0 }}
        />

        {!opensReviewDirectly ? (
          <p style={{ color: "rgba(255,255,255,0.45)", margin: "16px 24px 0", textAlign: "center" }}>
            Opens the Google Maps listing for {query} — tap &ldquo;Write a review&rdquo;.
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default ClientReviewRequest;

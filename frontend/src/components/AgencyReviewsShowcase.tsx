import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  fetchAgencyOptions,
  fetchAgencyReviews,
  type AgencyRatingSummary,
  type AgencyReview,
} from "@/lib/agencies";

interface Props {
  /** How many recent reviews to show. The full list stays on the agency page. */
  limit?: number;
}

const EMPTY_SUMMARY: AgencyRatingSummary = {
  average: 0,
  count: 0,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
};

/** Whole-star row used in the summary and on each card. */
const Stars = ({ value, size = 15 }: { value: number; size?: number }) => (
  <div style={{ display: "flex", gap: 2 }} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => {
      const filled = star <= Math.round(value);
      return (
        <Star
          key={star}
          size={size}
          fill={filled ? "#FCD34D" : "transparent"}
          color={filled ? "#FCD34D" : "rgba(11,51,64,0.22)"}
        />
      );
    })}
  </div>
);

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffDays = Math.floor((Date.now() - then) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

/**
 * Public, read-only social proof for the landing page and the employer portal.
 *
 * Only existing customers can rate an agency, so this section simply shows what
 * they already said. It renders nothing until a real review exists — an empty
 * "no reviews yet" block would read as a warning sign on a marketing page, and
 * the write form itself lives on the agency page (`AgencyReviews`).
 *
 * Styled with ClientLandingPage's own classes (.section-chip / .pf / .amber-rule
 * / .reveal) because it renders inside that page's `.client-landing` tree.
 */
const AgencyReviewsShowcase = ({ limit = 6 }: Props) => {
  const [summary, setSummary] = useState<AgencyRatingSummary>(EMPTY_SUMMARY);
  const [reviews, setReviews] = useState<AgencyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // The landing page belongs to the main agency (id = 1, flagged isMain).
        const agencies = await fetchAgencyOptions();
        const main = agencies.find((agency) => agency.isMain) ?? agencies[0];
        if (!main) return;
        const data = await fetchAgencyReviews(main.id);
        if (cancelled) return;
        setSummary(data.summary);
        setReviews(data.reviews);
      } catch {
        // Social proof is optional — a failed fetch must never break the page.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to show until at least one employer has rated the agency.
  if (isLoading || reviews.length === 0) return null;

  const visible = reviews.slice(0, limit);
  const average = summary.count > 0 ? summary.average : 0;

  return (
    <section
      id="client-reviews"
      className="reveal"
      aria-labelledby="client-reviews-heading"
      style={{ background: "#F7FBFC", padding: "72px 0" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span
            className="section-chip"
            style={{ background: "#FCD34D", color: "#0B3340", marginBottom: 14, display: "inline-flex" }}
          >
            <Star size={10} /> Reviews
          </span>
          <h2
            id="client-reviews-heading"
            className="pf"
            style={{ fontSize: "clamp(1.6rem,3.5vw,2.6rem)", color: "#0B3340", margin: "0 0 8px", fontStyle: "italic" }}
          >
            What employers say <span style={{ color: "#0E4E5E" }}>about us</span>
          </h2>
          <span className="amber-rule" style={{ margin: "0 auto 16px", display: "block", width: 40 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span className="pf" style={{ fontSize: 30, fontWeight: 900, color: "#0B3340", lineHeight: 1 }}>
              {average.toFixed(1)}
            </span>
            <Stars value={average} size={18} />
            <span style={{ color: "#3A7A8A", fontSize: 13 }}>
              {summary.count} {summary.count === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 20,
          }}
        >
          {visible.map((review) => (
            <figure
              key={review.id}
              style={{
                margin: 0,
                background: "#fff",
                border: "1px solid #C8E8EF",
                borderRadius: 12,
                padding: 22,
                boxShadow: "0 10px 30px rgba(14,78,94,0.06)",
              }}
            >
              <Stars value={review.rating} />
              {review.comment ? (
                <blockquote
                  style={{
                    margin: "14px 0 18px",
                    color: "#3A7A8A",
                    fontSize: 14,
                    lineHeight: 1.75,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {review.comment}
                </blockquote>
              ) : (
                <div style={{ height: 14 }} />
              )}
              <figcaption style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "flex",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#E0F4F7",
                    color: "#0B3340",
                    fontWeight: 700,
                    fontSize: 14,
                    textTransform: "uppercase",
                  }}
                >
                  {review.clientName.trim().charAt(0) || "?"}
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 600, color: "#0B3340", fontSize: 13 }}>
                    {review.clientName}
                  </span>
                  <span style={{ display: "block", color: "#7AAABB", fontSize: 11 }}>
                    {formatRelative(review.updatedAt || review.createdAt)}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AgencyReviewsShowcase;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  deleteAgencyReview,
  fetchAgencyReviews,
  submitAgencyReview,
  type AgencyRatingSummary,
  type AgencyReview,
} from "@/lib/agencies";
import { getStoredClient } from "@/lib/clientAuth";
import { buildGoogleRateUrl, getGooglePlaceId, getGoogleReviewUrl } from "@/lib/googleMaps";

interface Props {
  agencyId: number;
  agencyName: string;
  /**
   * Street address used for the "rate us on Google" deep link when no Google
   * Place ID is configured. Falls back to the agency name.
   */
  googleQuery?: string;
}

type StarKey = "1" | "2" | "3" | "4" | "5";

const EMPTY_SUMMARY: AgencyRatingSummary = {
  average: 0,
  count: 0,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
};

const Stars = ({ value, className = "h-4 w-4" }: { value: number; className?: string }) => (
  <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`${className} ${
          star <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"
        }`}
      />
    ))}
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

const AgencyReviews = ({ agencyId, agencyName, googleQuery }: Props) => {
  const [summary, setSummary] = useState<AgencyRatingSummary>(EMPTY_SUMMARY);
  const [reviews, setReviews] = useState<AgencyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const client = getStoredClient();

  const myReview = useMemo(
    () => (client ? reviews.find((review) => review.clientId === client.id) : undefined),
    [client, reviews],
  );

  // Google cannot accept a rating from us — the best we can do is hand the
  // visitor to Google's own review composer, so this is the funnel's target.
  const googleRateUrl = useMemo(
    () =>
      buildGoogleRateUrl({
        query: googleQuery?.trim() || agencyName,
        placeId: getGooglePlaceId(),
        reviewUrl: getGoogleReviewUrl(),
      }),
    [agencyName, googleQuery],
  );

  // Nudge towards Google only in the moment right after they post. Re-showing
  // it on every later visit is what makes a prompt feel like spam.
  const showGooglePrompt = justSubmitted;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAgencyReviews(agencyId);
        if (cancelled) return;
        setSummary(data.summary);
        setReviews(data.reviews);
      } catch {
        if (!cancelled) toast.error("Failed to load agency reviews");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  const openForm = () => {
    setRating(myReview?.rating ?? 0);
    setComment(myReview?.comment ?? "");
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("Please choose a star rating first");
      return;
    }
    try {
      setIsSaving(true);
      const result = await submitAgencyReview(agencyId, rating, comment.trim());
      setSummary(result.summary);
      setReviews((current) => [
        result.review,
        ...current.filter((review) => review.clientId !== result.review.clientId),
      ]);
      setIsFormOpen(false);
      setJustSubmitted(true);
      toast.success(myReview ? "Your review was updated" : "Thanks for rating this agency!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    try {
      setIsSaving(true);
      const nextSummary = await deleteAgencyReview(agencyId, myReview.id);
      setSummary(nextSummary);
      setReviews((current) => current.filter((review) => review.id !== myReview.id));
      setIsFormOpen(false);
      setJustSubmitted(false);
      toast.success("Your review was removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove review");
    } finally {
      setIsSaving(false);
    }
  };

  const displayAverage = summary.count > 0 ? summary.average : 0;

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader>
        <CardTitle>Ratings &amp; Reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6 pt-0">
        {/* Summary — Google-Maps style average + distribution */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 px-8 py-4">
            <p className="font-display text-4xl font-bold">{displayAverage.toFixed(1)}</p>
            <Stars value={displayAverage} className="h-5 w-5" />
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.count} {summary.count === 1 ? "review" : "reviews"}
            </p>
          </div>

          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[String(star) as StarKey] ?? 0;
              const percent = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-3 text-right text-muted-foreground">{star}</span>
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-yellow-400"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Write a review — star picker + optional comment, one review per client */}
        <div className="rounded-2xl border bg-card/50 p-4">
          {!client ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Worked with {agencyName}?</p>
                <p className="text-xs text-muted-foreground">
                  Log in as an employer to share your rating.
                </p>
              </div>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/employer-login">Log in to review</Link>
              </Button>
            </div>
          ) : isFormOpen ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {myReview ? "Update your rating" : `Rate ${agencyName}`}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      className="rounded-full p-0.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Tell other employers what it was like working with this agency (optional)"
                maxLength={1000}
                rows={4}
              />

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                {myReview ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSaving || rating < 1}
                >
                  {isSaving ? "Saving..." : myReview ? "Update review" : "Post review"}
                </Button>
              </div>
            </div>
          ) : myReview ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Your review</p>
                  <Badge variant="secondary">Your review</Badge>
                </div>
                <Stars value={myReview.rating} />
                {myReview.comment ? (
                  <p className="max-w-prose text-xs text-muted-foreground">{myReview.comment}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={openForm} disabled={isSaving}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={isSaving}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Worked with {agencyName}?</p>
                <p className="text-xs text-muted-foreground">Be the first to rate this agency.</p>
              </div>
              <Button type="button" size="sm" onClick={openForm} disabled={isSaving} className="rounded-full">
                <Star className="h-4 w-4" /> Write a review
              </Button>
            </div>
          )}
        </div>
        {/* Google funnel — a Google review is the only rating Google records, and
            it can only be written by the visitor on Google's own page. */}
        {showGooglePrompt ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-yellow-200 bg-yellow-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {justSubmitted ? "Thanks for your review!" : "Enjoyed working with this agency?"}
              </p>
              <p className="text-xs text-muted-foreground">
                Google reviews help other employers find {agencyName}. Add yours there too — it
                only takes a few taps.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0 rounded-full">
              <a href={googleRateUrl} target="_blank" rel="noopener noreferrer">
                Rate us on Google <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        ) : null}

        {/* Review list — newest first, the signed-in client's own review highlighted */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MessageSquare className="h-4 w-4" /> Client reviews
            </h3>
            {summary.count > 0 ? (
              <span className="text-xs text-muted-foreground">
                {summary.count} {summary.count === 1 ? "review" : "reviews"}
              </span>
            ) : null}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No reviews yet — your rating will be the first.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((review) => {
                const isMine = Boolean(client) && review.clientId === client?.id;
                return (
                  <li
                    key={review.id}
                    className={`rounded-2xl border p-4 ${
                      isMine ? "border-primary/40 bg-primary/5" : "bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-foreground">
                          {review.clientName.trim().charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{review.clientName}</p>
                            {isMine ? <Badge variant="secondary">You</Badge> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatRelative(review.updatedAt || review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Stars value={review.rating} />
                    </div>
                    {review.comment ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgencyReviews;

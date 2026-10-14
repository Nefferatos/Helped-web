import { MapPin, Navigation, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildGoogleDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  buildGoogleRateUrl,
  getGooglePlaceId,
  getGoogleReviewUrl,
} from "@/lib/googleMaps";

interface Props {
  agencyName: string;
  /** Street address shown on the map; falls back to the agency name. */
  address: string;
}

/**
 * Review request + map for the agency page.
 *
 * Google does not let a site submit a rating for a visitor, so the button only
 * hands them over to Google, where they sign in and choose the stars themselves.
 */
const AgencyGoogleRating = ({ agencyName, address }: Props) => {
  const placeId = getGooglePlaceId();
  const reviewUrl = getGoogleReviewUrl();
  const query = address.trim() || agencyName;
  const embedUrl = buildGoogleMapsEmbedUrl(query);
  const rateUrl = buildGoogleRateUrl({ query, placeId, reviewUrl });
  const directionsUrl = buildGoogleDirectionsUrl(query, placeId);
  // A Business Profile short link or a Place ID opens the star picker directly;
  // without either we can only send the visitor to the Maps listing.
  const opensReviewDirectly = Boolean(reviewUrl || placeId);

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Rate us on Google</CardTitle>
        <Badge variant="outline">Google</Badge>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        {/* Review request — the wording the agency owner asked us to publish. */}
        <div className="space-y-2 rounded-2xl bg-muted/30 p-4">
          <p className="text-sm leading-6 text-foreground">
            Our valued customers, if you have some time, can you give us a 5-star review on
            Google? It only takes a moment, and it helps other employers find {agencyName}.
          </p>
          <p className="text-sm font-medium text-foreground">Thank You, {agencyName}</p>
        </div>

        <Button asChild className="w-full rounded-2xl">
          <a href={rateUrl} target="_blank" rel="noopener noreferrer">
            <Star className="h-4 w-4" /> Give us a 5-star review
          </a>
        </Button>

        <div className="overflow-hidden rounded-2xl border">
          <iframe
            title={`Map showing ${agencyName}`}
            src={embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="h-64 w-full border-0"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full rounded-2xl sm:flex-1">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4" /> Get directions
            </a>
          </Button>
        </div>

        {!opensReviewDirectly ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This opens the Google Maps listing for {query} — find the agency and tap
              &ldquo;Write a review&rdquo;.
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default AgencyGoogleRating;

import { Link } from "react-router-dom";
import { MapPin, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientToken } from "@/lib/clientAuth";
import type { AgencySummary } from "@/lib/agencies";

interface Props {
  agency: AgencySummary;
}

const AgencyCard = ({ agency }: Props) => {
  const isLoggedIn = Boolean(getClientToken());

  return (
    <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-4 p-5 pb-4">
        <div className="flex items-start gap-4">
          {agency.logoUrl ? (
            <img src={agency.logoUrl} alt={agency.name} className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-lg font-bold">
              {agency.shortName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="font-display text-xl leading-tight">{agency.name}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {agency.about || `${agency.contactPerson} can help shortlist the right maid quickly.`}
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">License {agency.licenseNo}</Badge>
          <Badge variant="outline">{agency.availableMaidsCount} available now</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{agency.publicMaidsCount} public maid profiles</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{agency.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{agency.rating.toFixed(1)} experience score</span>
          </div>
        </div>

        {agency.previewMaids.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agency Maids</p>
            <div className={`space-y-2 ${!isLoggedIn ? "select-none blur-sm" : ""}`}>
              {agency.previewMaids.map((maid) => (
                <div key={maid.referenceCode} className="rounded-2xl border bg-muted/20 px-3 py-3 text-sm">
                  <p className="font-medium text-foreground">{maid.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {maid.referenceCode} - {maid.nationality || "N/A"} - {maid.type || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {agency.featuredSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {agency.featuredSkills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button asChild className="w-full rounded-2xl">
            <Link to={`/agencies/${agency.id}`}>View Agency</Link>
          </Button>
          {isLoggedIn ? (
            <Button asChild variant="outline" className="w-full rounded-2xl">
              <Link to={`/client/support-chat?type=agency&agencyId=${agency.id}&agencyName=${encodeURIComponent(agency.name)}`}>
                Message Agency
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full rounded-2xl">
              <Link to="/employer-login">Login to Unlock Profiles</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgencyCard;
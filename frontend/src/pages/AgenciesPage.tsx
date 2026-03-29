import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Filter, Search } from "lucide-react";
import AgencyCard from "@/components/AgencyCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import type { AgencySummary } from "@/lib/agencies";
import { fetchAgencies } from "@/lib/agencies";
import "../ClientPage/ClientTheme.css";

const AgenciesPage = () => {
  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("All Locations");
  const [availability, setAvailability] = useState("Any Availability");
  const [rating, setRating] = useState("Any Rating");
  const [skill, setSkill] = useState("Any Skill");

  useEffect(() => {
    const loadAgencies = async () => {
      try {
        setIsLoading(true);
        setAgencies(await fetchAgencies());
      } catch {
        toast.error("Failed to load agencies");
      } finally {
        setIsLoading(false);
      }
    };

    void loadAgencies();
  }, []);

  const locationOptions = useMemo(
    () => ["All Locations", ...Array.from(new Set(agencies.map((agency) => agency.location)))],
    [agencies],
  );

  const skillOptions = useMemo(
    () => ["Any Skill", ...Array.from(new Set(agencies.flatMap((agency) => agency.featuredSkills)))],
    [agencies],
  );

  const filteredAgencies = useMemo(() => {
    const term = keyword.trim().toLowerCase();

    return agencies.filter((agency) => {
      const matchesKeyword =
        !term ||
        [agency.name, agency.contactPerson, agency.contactPhone, agency.about, agency.featuredSkills.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesLocation = location === "All Locations" || agency.location === location;
      const matchesAvailability =
        availability === "Any Availability" ||
        (availability === "Available Now" ? agency.availableMaidsCount > 0 : agency.availableMaidsCount === 0);
      const matchesRating =
        rating === "Any Rating" ||
        (rating === "4.5+" ? agency.rating >= 4.5 : rating === "4.8+" ? agency.rating >= 4.8 : true);
      const matchesSkill = skill === "Any Skill" || agency.featuredSkills.includes(skill);

      return matchesKeyword && matchesLocation && matchesAvailability && matchesRating && matchesSkill;
    });
  }, [agencies, availability, keyword, location, rating, skill]);

  if (isLoading) {
    return (
      <div className="client-page-theme min-h-screen bg-card">
        <div className="container py-16 text-center font-body text-muted-foreground">Loading agencies...</div>
      </div>
    );
  }

  return (
    <div className="client-page-theme min-h-screen">
      <div className="container py-8 md:py-12">
        <div className="mb-8 space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Browse Agencies</h1>
          <p className="max-w-3xl font-body text-base text-muted-foreground md:text-lg">
            Compare agencies, review their available maids, and move into requests or messaging without leaving the main flow.
          </p>
        </div>

        <Card className="mb-6 rounded-3xl border bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="h-5 w-5" />
              Agency Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-3 md:col-span-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search agency, contact, or skill"
                className="h-auto border-none bg-transparent p-0 shadow-none"
              />
            </div>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger>
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any Availability">Any Availability</SelectItem>
                <SelectItem value="Available Now">Available Now</SelectItem>
                <SelectItem value="No Current Availability">No Current Availability</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any Rating">Any Rating</SelectItem>
                <SelectItem value="4.5+">4.5+</SelectItem>
                <SelectItem value="4.8+">4.8+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                {skillOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-sm text-muted-foreground">
            {filteredAgencies.length} {filteredAgencies.length === 1 ? "agency" : "agencies"} matched your filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setKeyword("");
              setLocation("All Locations");
              setAvailability("Any Availability");
              setRating("Any Rating");
              setSkill("Any Skill");
            }}
          >
            Reset Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgencies.length === 0 ? (
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>No agencies found</CardTitle>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <p className="font-body text-muted-foreground">Try broadening your search or resetting the current filters.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAgencies.map((agency) => <AgencyCard key={agency.id} agency={agency} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default AgenciesPage;

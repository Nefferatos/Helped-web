import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgencyCard from "@/components/AgencyCard";
import type { AgencySummary } from "@/lib/agencies";

const baseAgency: AgencySummary = {
  id: 7,
  name: "At The Agency",
  shortName: "ATA",
  licenseNo: "2503114",
  contactPhone: "80730757",
  contactPerson: "Bala",
  contactEmail: "info@theagency.sg",
  website: "",
  location: "Singapore",
  rating: 0,
  reviewCount: 0,
  publicMaidsCount: 3,
  availableMaidsCount: 2,
  previewMaids: [],
  featuredSkills: [],
  logoUrl: "",
  about: "",
  isMain: false,
};

const renderCard = (agency: AgencySummary) =>
  render(
    <MemoryRouter>
      <AgencyCard agency={agency} />
    </MemoryRouter>,
  );

describe("AgencyCard rating", () => {
  afterEach(cleanup);

  // The score used to be fabricated (4.8 / 4.5 for everyone), so every card
  // showed a rating even with zero reviews. It must stay hidden until a real
  // review exists.
  it("hides the rating entirely when the agency has no reviews", () => {
    renderCard({ ...baseAgency, rating: 0, reviewCount: 0 });

    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument();
  });

  it("shows the real average and review count once reviews exist", () => {
    renderCard({ ...baseAgency, rating: 4.6, reviewCount: 5 });

    expect(screen.getByText(/4\.6 rating \(5 reviews\)/)).toBeInTheDocument();
  });

  it("uses the singular for a single review", () => {
    renderCard({ ...baseAgency, rating: 5, reviewCount: 1 });

    expect(screen.getByText(/5\.0 rating \(1 review\)/)).toBeInTheDocument();
  });
});

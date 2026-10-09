import { describe, expect, it } from "vitest";
import { toPublicMaidProfile } from "../../../functions/api/publicMaid";
import { getExperienceBucket, getMaidAge, type MaidProfile } from "@/lib/maids";

describe("public maid profile projection", () => {
  it("preserves only the generated blurred-photo preview URL", () => {
    const previewUrl = "/api/maids/M-123/photo-preview?agencyId=7";
    const profile = toPublicMaidProfile({
      referenceCode: "M-123",
      photoDataUrl: previewUrl,
      photoDataUrls: [previewUrl, "https://storage.example.invalid/original.jpg"],
    });

    expect(profile.photoDataUrl).toBe(previewUrl);
    expect(profile.photoDataUrls).toEqual([previewUrl]);
  });

  it("returns public profile fields and removes sensitive maid details", () => {
    const publicProfile = toPublicMaidProfile({
      agencyId: 7,
      fullName: "Public Name",
      referenceCode: "M-123",
      status: "available",
      type: "Transfer",
      nationality: "Filipino maid",
      dateOfBirth: "1990-04-12",
      homeAddress: "Private home address",
      placeOfBirth: "Private birthplace",
      airportRepatriation: "Private airport",
      height: 160,
      weight: 52,
      religion: "Christian",
      maritalStatus: "Single",
      numberOfChildren: 2,
      educationLevel: "High school",
      languageSkills: { English: "Good", private: { note: "not a string" } },
      employmentHistory: [{ employer: "Private employer", salary: "Private salary" }],
      introduction: {
        publicIntro: "Public introduction",
        passportNo: "Private passport",
        allergies: "Private medical information",
      },
      skillsPreferences: { privateInfo: "Private note", indianMaidCategory: "Category A" },
      agencyContact: {
        companyName: "Agency",
        phone: "+6512345678",
        contactPerson: "Agency contact",
        homeCountryContactNumber: "+63987654321",
      },
      photoDataUrl: "https://storage.example.invalid/original-private-photo.jpg",
      photoDataUrls: ["https://storage.example.invalid/original-private-photo.jpg"],
      videoDataUrl: "private-video-url",
      isPublic: true,
      hasPhoto: true,
      createdAt: "2024-01-01",
      updatedAt: "2025-01-01",
    });

    expect(publicProfile).toMatchObject({
      fullName: "Public Name",
      referenceCode: "M-123",
      nationality: "Filipino maid",
      religion: "Christian",
      maritalStatus: "Single",
      age: expect.any(Number),
      experienceCount: 1,
      introduction: { publicIntro: "Public introduction" },
      agencyContact: { companyName: "Agency", phone: "+6512345678" },
    });
    expect(publicProfile).not.toHaveProperty("dateOfBirth");
    expect(publicProfile).not.toHaveProperty("homeAddress");
    expect(publicProfile).not.toHaveProperty("placeOfBirth");
    expect(publicProfile).not.toHaveProperty("employmentHistory");
    expect(publicProfile).not.toHaveProperty("videoDataUrl");
    expect(publicProfile.photoDataUrl).toBe("");
    expect(publicProfile.photoDataUrls).toEqual([]);
    expect(publicProfile.introduction).not.toHaveProperty("passportNo");
    expect(publicProfile.introduction).not.toHaveProperty("allergies");
    expect(publicProfile.agencyContact).not.toHaveProperty("homeCountryContactNumber");
    expect(publicProfile.languageSkills).toEqual({ English: "Good" });
    expect(JSON.stringify(publicProfile)).not.toContain("Private");
  });

  it("keeps age and experience summaries usable without exposing underlying records", () => {
    const profile = {
      age: 34,
      experienceCount: 4,
      dateOfBirth: "",
      employmentHistory: [],
    } as MaidProfile;

    expect(getMaidAge(profile)).toBe(34);
    expect(getExperienceBucket(profile)).toBe("3-5 Years");
  });
});

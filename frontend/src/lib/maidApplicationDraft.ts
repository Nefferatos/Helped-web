/**
 * Shared draft storage for the public FDW application form (/apply-as-maid).
 *
 * Both the form itself (PublicMaidApplicationPage) and the FDW chat
 * (FdwApplicationChatbot) read/write the SAME localStorage key, so finishing the
 * chat can pre-fill the long form. Keep this key in one place only.
 */
export const MAID_APPLICATION_DRAFT_KEY = "maid-application-draft";

/** Marks a draft that was produced by the chat, so the form can auto-restore it. */
export const MAID_DRAFT_SOURCE_CHAT = "fdw-chat";

const asText = (value: unknown) => String(value ?? "");

const splitList = (value: unknown): string[] =>
  asText(value)
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Writes the FDW chat answers into the same draft the application form uses, so
 * the form can offer/pre-fill them. Only the fields the chat collects are
 * written — the form merges the rest from its own initial state.
 */
export const writeMaidApplicationDraftFromChat = (answers: Record<string, unknown>) => {
  try {
    const languages = splitList(answers.languages);
    const draft = {
      source: MAID_DRAFT_SOURCE_CHAT,
      form: {
        fullName: asText(answers.full_name),
        email: asText(answers.email),
        contactNumber: asText(answers.contact_number),
        nationality: asText(answers.nationality),
        yearsOfExperience: asText(answers.years_of_experience),
        languageSkills: languages.join(", "),
        employmentPreference: asText(answers.employment_preference),
        availableDate: asText(answers.available_date),
        coverNote: asText(answers.note),
      },
      selectedLanguages: languages,
      termsAccepted: false,
      introCompleted: false,
      activeStep: 0,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(MAID_APPLICATION_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
};

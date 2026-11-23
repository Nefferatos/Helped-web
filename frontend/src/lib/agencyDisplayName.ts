/** Convert legacy agency labels to the current public-facing brand. */
export const normalizeAgencyDisplayName = (value?: string | null): string => {
  const name = value?.trim() ?? "";
  return name.replace(/^Main Agency(?=$|\s)/i, "At The Agency");
};

import { MaidProfile } from "@/lib/maids";

export const getPublicMaidUrl = (referenceCode: string) => {
  if (typeof window === "undefined") {
    return `/maids/${encodeURIComponent(referenceCode)}`;
  }

  return `${window.location.origin}/maids/${encodeURIComponent(referenceCode)}`;
};

export const sendMaidToClient = async (maid: MaidProfile) => {
  if (!maid.isPublic) {
    throw new Error("Only public maid profiles can be sent to clients.");
  }

  const publicUrl = getPublicMaidUrl(maid.referenceCode);
  const subject = `Maid Profile: ${maid.fullName} (${maid.referenceCode})`;
  const body = [
    "Hello,",
    "",
    `Here is the maid profile for ${maid.fullName}.`,
    `Reference Code: ${maid.referenceCode}`,
    "",
    publicUrl,
  ].join("\n");

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(publicUrl);
  }

  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

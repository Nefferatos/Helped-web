#!/usr/bin/env node
// Usage: node evaluateApplicant.js [input.json]
// If no file provided, reads JSON from stdin.

const fs = require("fs");

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function computeScore(applicant) {
  // Simple heuristics favoring passability
  const years = Number(applicant.yearsOfExperience ?? 0);
  const yearsScore = clamp((Math.min(years, 10) / 10) * 30, 0, 30);

  const areas = [
    "childcareExperience",
    "newbornCareExperience",
    "elderlyCareExperience",
    "disabledCareExperience",
    "housekeepingExperience",
  ];
  const areaMatches = areas.reduce(
    (s, k) => s + (Number(applicant[k] ?? 0) > 0 ? 1 : 0),
    0,
  );
  const areaScore = clamp((areaMatches / areas.length) * 30, 0, 30);

  const skills = Array.isArray(applicant.cookingSkills)
    ? applicant.cookingSkills
    : [];
  const lang = Array.isArray(applicant.languageSkills)
    ? applicant.languageSkills
    : [];
  const certs = Array.isArray(applicant.certifications)
    ? applicant.certifications
    : [];

  const skillsScore = clamp(
    (Math.min(skills.length, 3) / 3) * 20 +
      (Math.min(lang.length, 2) / 2) * 10 +
      (Math.min(certs.length, 2) / 2) * 10,
    0,
    40,
  );

  // blend years/areas/skills but cap to 100
  const raw = Math.round(
    yearsScore * 0.3 + areaScore * 0.35 + skillsScore * 0.35,
  );
  return clamp(raw, 0, 100);
}

function meetsCriteria(applicant, criteria) {
  const minYears = Number(criteria.minimumYearsExperience ?? 0);
  if (Number(applicant.yearsOfExperience ?? 0) < minYears)
    return {
      ok: false,
      reason: `Years of experience below required ${minYears}`,
    };

  const required = Array.isArray(criteria.requiredSkills)
    ? criteria.requiredSkills
    : [];
  const applicantSkills = new Set([
    ...(Array.isArray(applicant.cookingSkills)
      ? applicant.cookingSkills
      : []
    ).map((s) => String(s).toLowerCase()),
    ...(Array.isArray(applicant.languageSkills)
      ? applicant.languageSkills
      : []
    ).map((s) => String(s).toLowerCase()),
    ...(Array.isArray(applicant.certifications)
      ? applicant.certifications
      : []
    ).map((s) => String(s).toLowerCase()),
  ]);
  for (const r of required) {
    if (!applicantSkills.has(String(r).toLowerCase()))
      return { ok: false, reason: "Missing required skills" };
  }
  return { ok: true };
}

function draftEmail(applicant, pass, nextPhase) {
  const name = (applicant.fullName || "").split(" ")[0] || "Applicant";
  if (pass) {
    const subject = `Congratulations — Next Steps for Your Application`;
    const body = `Hello ${name},\n\nThank you for applying — we’re pleased to let you know you’ve progressed to the next stage of our recruitment process (${nextPhase}). Congratulations.\n\nTo keep things moving, please reply with two dates and times you are available in the next 5 business days so we can schedule a short screening call (about 30 minutes). Please also attach or bring your passport and any certificates you have.\n\nIf you need help, reply to this email or contact our recruitment team.\n\nWarm regards,\nRecruitment Team\nHelped Maids`;
    return { subject, body };
  } else {
    const subject = `Update on your application`;
    const body = `Hello ${name},\n\nThank you for your application. At this time we are moving forward with other candidates whose experience more closely matches this role. We will keep your profile on file and may contact you about suitable roles in future unless your application is clearly disqualifying.\n\nIf you’d like feedback or have further documents to share, reply to this message and we’ll review them.\n\nWarm regards,\nRecruitment Team\nHelped Maids`;
    return { subject, body };
  }
}

function evaluate(applicant, criteria) {
  const score = computeScore(applicant);
  const criteriaCheck = meetsCriteria(applicant, criteria);
  const pass = criteriaCheck.ok && score >= Number(criteria.minScore ?? 50);
  const next_phase = pass
    ? criteria.nextPhaseName || "Screening Interview"
    : "Rejected";

  const reasoning = criteriaCheck.ok
    ? `Applicant scored ${score} against threshold ${criteria.minScore ?? 50}.`
    : `Failed criteria check: ${criteriaCheck.reason}.`;
  const email = draftEmail(
    applicant,
    pass,
    criteria.nextPhaseName || "Screening Interview",
  );

  return {
    pass: Boolean(pass),
    score: Number(score),
    reasoning: (reasoning || "").slice(0, 200),
    next_phase,
    applicant_email_subject: email.subject,
    applicant_email_body: email.body,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  let json = "";
  if (argv[0]) {
    json = fs.readFileSync(argv[0], "utf8");
  } else {
    json = fs.readFileSync(0, "utf8");
  }
  const parsed = JSON.parse(json);
  const applicant = parsed.applicant || parsed;
  const criteria = parsed.criteria || {};
  // default easy-to-pass criteria
  const defaultCriteria = {
    minimumYearsExperience: 1,
    requiredSkills: [],
    minScore: 50,
    nextPhaseName: "Screening Interview",
  };
  const mergedCriteria = Object.assign({}, defaultCriteria, criteria);
  const result = evaluate(applicant, mergedCriteria);
  process.stdout.write(JSON.stringify(result));
}

if (require.main === module)
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });

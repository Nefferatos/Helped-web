const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("../frontend/node_modules/pdf-lib");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/make-fdw-fillable-pdf.js <input.pdf> <output.pdf>");
  process.exit(1);
}

const pageSize = { width: 612, height: 792 };
const black = rgb(0, 0, 0);
const white = rgb(1, 1, 1);

const toY = (top, height) => pageSize.height - top - height;

const addTextField = (form, page, font, name, top, left, width, height = 16, options = {}) => {
  const field = form.createTextField(name);
  if (options.multiline) {
    field.enableMultiline();
  }
  if (options.maxLength) {
    field.setMaxLength(options.maxLength);
  }
  const fieldOptions = {
    x: left,
    y: toY(top, height),
    width,
    height,
    font,
    textColor: black,
    borderColor: white,
    borderWidth: 0,
  };
  field.addToPage(page, fieldOptions);
  return field;
};

const addCheckbox = (form, page, name, top, left, size = 12) => {
  const field = form.createCheckBox(name);
  field.addToPage(page, {
    x: left,
    y: toY(top, size),
    width: size,
    height: size,
    borderColor: black,
    textColor: black,
    backgroundColor: white,
  });
  return field;
};

const addRatingFields = (form, page, prefix, top) => {
  ["1", "2", "3", "4", "5", "na"].forEach((value, index) => {
    addCheckbox(form, page, `${prefix}_rating_${value}`, top, 780 / 2 + index * 23, 11);
  });
};

const addSkillRow = (form, page, prefix, rowTop, options = {}) => {
  if (options.detailLine) {
    addTextField(form, page, options.font, `${prefix}_detail`, rowTop + 38, 135, 115, 14);
  }

  addCheckbox(form, page, `${prefix}_willingness_yes`, rowTop + 12, 430 / 2, 11);
  addCheckbox(form, page, `${prefix}_willingness_no`, rowTop + 32, 430 / 2, 11);

  addCheckbox(form, page, `${prefix}_experience_yes`, rowTop + 12, 548 / 2, 11);
  addCheckbox(form, page, `${prefix}_experience_no`, rowTop + 32, 548 / 2, 11);
  addTextField(form, page, options.font, `${prefix}_experience_years`, rowTop + 50, 548 / 2 - 2, 44, 14);

  addTextField(form, page, options.font, `${prefix}_assessment`, rowTop + 8, 331, 252, options.height ?? 42, {
    multiline: true,
  });
  addRatingFields(form, page, prefix, rowTop + 12);
};

const addEmploymentHistoryRow = (form, page, font, prefix, rowTop) => {
  addTextField(form, page, font, `${prefix}_from`, rowTop + 6, 62, 48, 18);
  addTextField(form, page, font, `${prefix}_to`, rowTop + 6, 117, 48, 18);
  addTextField(form, page, font, `${prefix}_country`, rowTop + 6, 170, 70, 30, { multiline: true });
  addTextField(form, page, font, `${prefix}_employer`, rowTop + 6, 242, 70, 30, { multiline: true });
  addTextField(form, page, font, `${prefix}_duties`, rowTop + 6, 314, 200, 30, { multiline: true });
  addTextField(form, page, font, `${prefix}_remarks`, rowTop + 6, 517, 66, 30, { multiline: true });
};

async function main() {
  const source = fs.readFileSync(inputPath);
  const pdf = await PDFDocument.load(source);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const [page1, page2, page3, page4] = pdf.getPages();

  // Page 1
  addTextField(form, page1, font, "full_name", 126, 140, 285);
  addTextField(form, page1, font, "date_of_birth_day", 151, 206, 34, 19, { maxLength: 2 });
  addTextField(form, page1, font, "date_of_birth_month", 151, 292, 34, 19, { maxLength: 2 });
  addTextField(form, page1, font, "date_of_birth_year", 151, 377, 34, 19, { maxLength: 4 });
  addTextField(form, page1, font, "age", 151, 548, 34, 19, { maxLength: 2 });
  addTextField(form, page1, font, "place_of_birth", 175, 172, 253);
  addTextField(form, page1, font, "height_cm", 199, 230, 34, 19, { maxLength: 3 });
  addTextField(form, page1, font, "weight_kg", 199, 450, 34, 19, { maxLength: 3 });
  addTextField(form, page1, font, "nationality", 223, 183, 242);
  addTextField(form, page1, font, "residential_address_home_country_line_1", 248, 393, 182);
  addTextField(form, page1, font, "residential_address_home_country_line_2", 272, 72, 503);
  addTextField(form, page1, font, "repatriation_port_airport", 296, 441, 135);
  addTextField(form, page1, font, "home_country_contact_number", 320, 367, 208);
  addTextField(form, page1, font, "religion", 345, 129, 224);
  addTextField(form, page1, font, "education_level", 369, 229, 340);
  addTextField(form, page1, font, "number_of_siblings", 393, 226, 88);
  addTextField(form, page1, font, "marital_status", 418, 190, 220);
  addTextField(form, page1, font, "number_of_children", 442, 235, 95);
  addTextField(form, page1, font, "children_ages", 467, 291, 284);
  addTextField(form, page1, font, "allergies", 519, 239, 335);

  [
    "mental_illness",
    "epilepsy",
    "asthma",
    "diabetes",
    "hypertension",
    "tuberculosis",
    "heart_disease",
    "malaria",
    "operations",
  ].forEach((name, index) => {
    const leftRow = index < 5;
    const row = leftRow ? index : index - 5;
    const top = 571 + row * 24;
    const yesLeft = leftRow ? 385 : 890 / 2;
    const noLeft = leftRow ? 528 : 1035 / 2;
    addCheckbox(form, page1, `${name}_yes`, top, yesLeft);
    addCheckbox(form, page1, `${name}_no`, top, noLeft);
  });
  addTextField(form, page1, font, "other_illness", 670, 726 / 2, 185);
  addTextField(form, page1, font, "physical_disabilities", 718, 260, 315);
  addTextField(form, page1, font, "dietary_restrictions", 742, 260, 315);
  addCheckbox(form, page1, "food_pref_no_pork", 766, 328);
  addCheckbox(form, page1, "food_pref_no_beef", 766, 570);
  addCheckbox(form, page1, "food_pref_other", 766, 396);
  addTextField(form, page1, font, "food_pref_other_text", 765, 878 / 2, 135);

  // Page 2
  addTextField(form, page2, font, "rest_day_preference", 133, 327 / 2, 102);
  addTextField(form, page2, font, "other_remarks_a3", 182, 264, 320);

  addCheckbox(form, page2, "eval_based_on_declaration", 400 / 2, 87);
  addCheckbox(form, page2, "eval_interviewed_by_singapore_ea", 451 / 2, 87);
  addCheckbox(form, page2, "eval_sg_telephone", 476 / 2, 116);
  addCheckbox(form, page2, "eval_sg_videoconference", 501 / 2, 116);
  addCheckbox(form, page2, "eval_sg_in_person", 525 / 2, 116);
  addCheckbox(form, page2, "eval_sg_in_person_observation", 550 / 2, 116);

  addSkillRow(form, page2, "sg_infants_children", 352, { font, detailLine: true, height: 55 });
  addSkillRow(form, page2, "sg_elderly", 413, { font, height: 36 });
  addSkillRow(form, page2, "sg_disabled", 462, { font, height: 36 });
  addSkillRow(form, page2, "sg_housework", 511, { font, height: 36 });
  addSkillRow(form, page2, "sg_cooking", 559, { font, detailLine: true, height: 55 });
  addTextField(form, page2, font, "sg_language_specify", 647, 270, 92, 14);
  addSkillRow(form, page2, "sg_languages", 661, { font, height: 35 });
  addTextField(form, page2, font, "sg_other_skills_specify", 745, 270, 92, 14);
  addSkillRow(form, page2, "sg_other_skills", 709, { font, height: 45 });

  // Page 3
  addCheckbox(form, page3, "eval_interviewed_by_overseas_centre", 78, 86);
  addTextField(form, page3, font, "foreign_training_centre_name", 75, 447, 142);
  addTextField(form, page3, font, "third_party_certification_details", 109, 390, 150);
  addCheckbox(form, page3, "eval_overseas_telephone", 126, 116);
  addCheckbox(form, page3, "eval_overseas_videoconference", 150, 116);
  addCheckbox(form, page3, "eval_overseas_in_person", 175, 116);
  addCheckbox(form, page3, "eval_overseas_in_person_observation", 200, 116);

  addSkillRow(form, page3, "overseas_infants_children", 177, { font, detailLine: true, height: 55 });
  addSkillRow(form, page3, "overseas_elderly", 239, { font, height: 36 });
  addSkillRow(form, page3, "overseas_disabled", 287, { font, height: 36 });
  addSkillRow(form, page3, "overseas_housework", 335, { font, height: 36 });
  addSkillRow(form, page3, "overseas_cooking", 383, { font, detailLine: true, height: 55 });
  addTextField(form, page3, font, "overseas_language_specify", 470, 270, 92, 14);
  addSkillRow(form, page3, "overseas_languages", 481, { font, height: 35 });
  addTextField(form, page3, font, "overseas_other_skills_specify", 563, 262, 100, 14);
  addSkillRow(form, page3, "overseas_other_skills", 529, { font, height: 45 });

  addEmploymentHistoryRow(form, page3, font, "employment_history_overseas_1", 657);
  addEmploymentHistoryRow(form, page3, font, "employment_history_overseas_2", 705);

  // Page 4
  addCheckbox(form, page4, "worked_in_singapore_yes", 127, 324);
  addCheckbox(form, page4, "worked_in_singapore_no", 127, 867 / 2);
  addTextField(form, page4, font, "feedback_employer_1", 343, 184, 398, 72, { multiline: true });
  addTextField(form, page4, font, "feedback_employer_2", 446, 184, 398, 72, { multiline: true });

  addCheckbox(form, page4, "interview_not_available", 626, 72);
  addCheckbox(form, page4, "interview_by_phone", 650, 72);
  addCheckbox(form, page4, "interview_by_video_conference", 674, 72);
  addCheckbox(form, page4, "interview_in_person", 698, 72);

  addTextField(form, page4, font, "other_remarks_e", 816 / 2, 72, 503, 48, { multiline: true });
  addTextField(form, page4, font, "fdw_name_signature", 953 / 2, 61, 230);
  addTextField(form, page4, font, "fdw_signature_date", 993 / 2, 71, 120);
  addTextField(form, page4, font, "ea_personnel_name_registration", 953 / 2, 347, 233);
  addTextField(form, page4, font, "ea_signature_date", 993 / 2, 355, 120);
  addTextField(form, page4, font, "employer_name_nric", 1149 / 2, 61, 230);
  addTextField(form, page4, font, "employer_signature_date", 1188 / 2, 71, 120);

  form.updateFieldAppearances(font);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, await pdf.save());
  console.log(`Created fillable PDF: ${outputPath}`);
  console.log(`Total fields: ${form.getFields().length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

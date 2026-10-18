import { jsPDF } from 'jspdf'
import fs from 'node:fs'

const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
const fontDirectory = 'frontend/node_modules/pdfjs-dist/standard_fonts'
for (const [file, style] of [['LiberationSans-Regular.ttf', 'normal'], ['LiberationSans-Bold.ttf', 'bold']]) {
  pdf.addFileToVFS(file, fs.readFileSync(`${fontDirectory}/${file}`).toString('base64'))
  pdf.addFont(file, 'GuideSans', style)
}
const W = pdf.internal.pageSize.getWidth()
const H = pdf.internal.pageSize.getHeight()
const M = 42
const CONTENT = W - M * 2
const C = {
  ink: [15, 23, 42],
  body: [39, 52, 71],
  muted: [71, 85, 105],
  teal: [15, 118, 110],
  tealLight: [240, 253, 250],
  violet: [109, 40, 217],
  violetLight: [245, 243, 255],
  blue: [29, 78, 216],
  blueLight: [239, 246, 255],
  amber: [146, 64, 14],
  amberLight: [255, 251, 235],
  border: [203, 213, 225],
  white: [255, 255, 255],
  green: [21, 128, 61],
}

const setText = (color) => pdf.setTextColor(...color)
const setFill = (color) => pdf.setFillColor(...color)
const setDraw = (color) => pdf.setDrawColor(...color)

function wrapped(text, x, y, width, size = 15, color = C.body, lineHeight = 1.42, style = 'normal') {
  pdf.setFont('GuideSans', style)
  pdf.setFontSize(size)
  setText(color)
  const lines = pdf.splitTextToSize(text, width)
  pdf.text(lines, x, y)
  return y + lines.length * size * lineHeight
}

function card(x, y, w, h, fill = C.white, stroke = C.border) {
  setFill(fill)
  setDraw(stroke)
  pdf.setLineWidth(1)
  pdf.roundedRect(x, y, w, h, 13, 13, 'FD')
}

function heading(text, x, y, size = 19, color = C.ink) {
  pdf.setFont('GuideSans', 'bold')
  pdf.setFontSize(size)
  setText(color)
  pdf.text(text, x, y)
}

function stepBlock(number, title, body, x, y, w, options = {}) {
  const { height = 112, accent = C.teal, fill = C.white, details = [] } = options
  card(x, y, w, height, fill, options.stroke || C.border)
  setFill(accent)
  pdf.circle(x + 27, y + 29, 15, 'F')
  pdf.setFont('GuideSans', 'bold')
  pdf.setFontSize(15)
  setText(C.white)
  pdf.text(String(number), x + 27, y + 34, { align: 'center' })
  heading(title, x + 52, y + 34, 17)
  let nextY = wrapped(body, x + 22, y + 62, w - 44, 14, C.body, 1.4)
  for (const detail of details) nextY = wrapped(detail, x + 22, nextY + 7, w - 44, 13, C.muted, 1.35)
  return y + height
}

function footer(page, total) {
  setDraw(C.border)
  pdf.setLineWidth(0.8)
  pdf.line(M, H - 36, W - M, H - 36)
  pdf.setFont('GuideSans', 'normal')
  pdf.setFontSize(10)
  setText(C.muted)
  pdf.text('Operations Center staff guide  |  Follow current agency procedures', M, H - 20)
  pdf.text(`${page} / ${total}`, W - M, H - 20, { align: 'right' })
}

function topLabel(label, pageTitle, subtitle) {
  pdf.setFont('GuideSans', 'bold')
  pdf.setFontSize(10)
  setText(C.teal)
  pdf.text(label.toUpperCase(), M, 42)
  heading(pageTitle, M, 78, 27)
  wrapped(subtitle, M, 105, CONTENT, 15, C.body, 1.4)
}

function flowDiagram() {
  const y = 155
  const gap = 18
  const boxW = (CONTENT - gap * 2) / 3
  const boxH = 136
  const items = [
    { title: 'Employer needs', body: 'Enter the employer number and save preferences.', fill: C.tealLight, color: C.teal },
    { title: 'Review a helper', body: 'Check suggested profiles and confirm availability.', fill: C.violetLight, color: C.violet },
    { title: 'Track the placement', body: 'After the employer confirms, update the checklist.', fill: C.blueLight, color: C.blue },
  ]
  items.forEach((item, index) => {
    const x = M + index * (boxW + gap)
    card(x, y, boxW, boxH, item.fill, item.color)
    setFill(item.color)
    pdf.circle(x + 25, y + 28, 15, 'F')
    pdf.setFont('GuideSans', 'bold')
    pdf.setFontSize(15)
    setText(C.white)
    pdf.text(String(index + 1), x + 25, y + 33, { align: 'center' })
    heading(item.title, x + 17, y + 69, 15)
    wrapped(item.body, x + 17, y + 94, boxW - 34, 12.5, C.body, 1.35)
    if (index < items.length - 1) {
      const ax = x + boxW + gap / 2
      setDraw(C.muted)
      pdf.setLineWidth(2.5)
      pdf.line(ax - 5, y + boxH / 2, ax + 5, y + boxH / 2)
      pdf.line(ax + 1, y + boxH / 2 - 6, ax + 7, y + boxH / 2)
      pdf.line(ax + 1, y + boxH / 2 + 6, ax + 7, y + boxH / 2)
    }
  })
}

// Page 1: start here and enter a real employer's needs.
topLabel('Easy staff instructions', 'Operations Center', 'A simple guide to matching a helper and following a placement from start to finish.')
flowDiagram()
heading('Before you start', M, 324, 19)
card(M, 339, CONTENT, 88, C.amberLight, [253, 230, 138])
wrapped('Have the employer record or numeric employer ID ready. Use the employer’s stated needs, and check the current agency profile and availability before sharing a suggestion.', M + 18, 365, CONTENT - 36, 14, C.ink, 1.45)

stepBlock(1, 'Check the overview', 'The Overview shows placements and the progress recorded for each milestone. Choose Refresh if you need to reload the latest saved information.', M, 444, CONTENT, { height: 105, accent: C.teal })
stepBlock(2, 'Enter the employer’s needs', 'Open Match helper. Enter the numeric employer ID from the employer record. Load saved needs or enter the preferences, then choose Save employer needs.', M, 560, CONTENT, { height: 128, accent: C.violet, fill: C.violetLight })
wrapped('Tip: Save the employer’s needs before asking for matches. Use clear details such as service type, location, salary limit, experience, language, and availability.', M + 4, 715, CONTENT - 8, 13, C.muted, 1.4)
footer(1, 3)

// Page 2: review, confirm, then record only completed steps.
pdf.addPage()
topLabel('Matching and placement', 'Review first. Confirm before starting.', 'The shortlist helps staff review options. It does not promise that a helper is available or that a placement is confirmed.')
stepBlock(3, 'Review suggested profiles', 'In Match helper, choose Show matching profiles. Read each profile and check availability with your agency before discussing it with the employer.', M, 145, CONTENT, { height: 125, accent: C.violet, fill: C.violetLight })
card(M, 285, CONTENT, 100, C.blueLight, [191, 219, 254])
heading('What the suggestions mean', M + 18, 312, 16, C.blue)
wrapped('The matching flow suggests public profiles marked available. Review the full profile and confirm details yourself. A match score is a guide for staff, not a guarantee.', M + 18, 338, CONTENT - 36, 14, C.ink, 1.4)
stepBlock(4, 'Start a placement after the employer chooses', 'On the chosen profile, select Employer chose this helper. Confirm that the employer has agreed, then choose Yes, start placement steps. This creates the placement record.', M, 405, CONTENT, { height: 145, accent: C.amber, fill: C.amberLight, stroke: [253, 230, 138] })
stepBlock(5, 'Record completed milestones', 'Open Placement steps. Add an optional staff note, then mark Flight, Medical, SIP, or Handover done only after that work is complete. SIP means Settling-In Programme.', M, 564, CONTENT, { height: 145, accent: C.blue, fill: C.blueLight, stroke: [191, 219, 254] })
heading('The overview uses these signals', M, 740, 15)
const legend = [
  ['Not started', [180, 83, 9]], ['In progress', C.blue], ['Completed', C.green], ['Needs attention', [185, 28, 28]],
]
legend.forEach(([label, color], index) => {
  const x = M + index * 128
  setFill(color)
  pdf.circle(x + 6, 761, 5, 'F')
  pdf.setFont('GuideSans', 'normal')
  pdf.setFontSize(11)
  setText(C.body)
  pdf.text(label, x + 17, 765)
})
footer(2, 3)

// Page 3: optional knowledge and file workflows.
pdf.addPage()
topLabel('Optional tools', 'Staff guide and file tools', 'Use these sections when your agency has approved content or has configured the related integrations.')
card(M, 145, CONTENT, 300, C.white, C.border)
heading('Staff guide: add a searchable procedure', M + 18, 174, 18, C.amber)
let y = wrapped('The Staff guide is a knowledge library for agency procedures and FAQs. The receptionist AI can search the content you index here.', M + 18, 202, CONTENT - 36, 14, C.body, 1.4)
const guideSteps = [
  'Open Staff guide and choose Load example to see a sample arrival checklist. This only fills the form; it does not save it.',
  'Review and change the sample so it matches your agency’s actual approved procedure.',
  'Enter a source key, title, category, and content. Choose Index knowledge to save it for search.',
  'Use Search what’s already indexed to check the saved content. Search results may not always find every related passage, so keep instructions clear and specific.',
]
for (let i = 0; i < guideSteps.length; i += 1) {
  setFill(C.amberLight)
  pdf.circle(M + 29, y + 8, 10, 'F')
  pdf.setFont('GuideSans', 'bold')
  pdf.setFontSize(10)
  setText(C.amber)
  pdf.text(String(i + 1), M + 29, y + 11, { align: 'center' })
  y = wrapped(guideSteps[i], M + 48, y + 4, CONTENT - 78, 13, C.body, 1.4) + 12
}

card(M, 463, CONTENT, 180, C.white, C.border)
heading('Files & uploads: send a file to a connected workflow', M + 18, 492, 18, C.blue)
wrapped('Choose Files & uploads. Select a document for Google Drive sync, or choose an audio/video file for transcription. The upload limit is 25 MB. A folder key is optional for Drive.', M + 18, 521, CONTENT - 36, 14, C.body, 1.4)
wrapped('If the page says an integration is not configured, contact your system administrator. The upload button cannot activate a Make.com scenario or configure its credentials.', M + 18, 581, CONTENT - 36, 13, C.amber, 1.4, 'bold')

card(M, 660, CONTENT, 95, C.tealLight, [153, 246, 228])
heading('Remember', M + 18, 689, 16, C.teal)
wrapped('Keep employer and helper information accurate. Follow current agency procedures, and never mark a step complete before it has happened.', M + 18, 716, CONTENT - 36, 14, C.ink, 1.4)
footer(3, 3)

pdf.save('docs/operations-center-staff-guide.pdf')
console.log('Created docs/operations-center-staff-guide.pdf')

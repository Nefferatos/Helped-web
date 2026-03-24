import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUp, Edit, Image, Trash2, Youtube, FileDown, Check } from "lucide-react";

const maidData: Record<string, any> = {
  "FIL-PHK-WIL-9646": {
    name: "Dela Cruz Novelyn", ref: "FIL-PHK-WIL-9646", type: "Transfer maid", nationality: "Filipino maid",
    dob: "29-Nov-1982", placeOfBirth: "Nueva Ecija", height: "150cm", weight: "53Kg",
    religion: "Catholic", marital: "Single", address: "Cuyapo Nueva Ecija",
    airport: "Clark/Manila Airport", education: "College/Degree (>=13 yrs)", availability: "11 April",
    languages: [
      { lang: "English", level: "Good" }, { lang: "Mandarin/Chinese-Dialect", level: "Poor" },
      { lang: "Bahasa Indonesia/Malaysia", level: "Poor" }, { lang: "Hindi", level: "Poor" },
      { lang: "Tamil", level: "Poor" }, { lang: "Malayalam", level: "Poor" },
      { lang: "Telegu", level: "Poor" }, { lang: "Karnataka", level: "Poor" },
    ],
    otherInfo: [
      { q: "Able to handle pork?", a: true }, { q: "Able to eat pork?", a: true },
      { q: "Able to care for dog/cat?", a: true }, { q: "Able to do simple sewing?", a: true },
      { q: "Able to do gardening work?", a: true }, { q: "Willing to wash car?", a: true },
      { q: "Can work on off-days with compensation?", a: true },
    ],
    offDays: "0 days(s)/month",
    employment: [
      { from: "2023", to: "2024", country: "Singapore", employer: "", duties: "", remarks: "" },
      { from: "2024", to: "2026", country: "Singapore", employer: "", duties: "", remarks: "" },
    ],
    agencyName: "At The Agency (formerly Rinzin Agency Pte. Ltd)",
    licenseNo: "25C3114",
    contactPerson: "Bala",
    contactNo: "80730757",
    lastUpdated: "23-03-2026", hits: 1,
    historicalRecord: {
      wpNo: "0 28538065", workerName: "DELA CRUZ NOVELYN DEL ROSARIO",
      dob: "29/11/1982", sex: "FEMALE", fin: "M3271606N",
      passport: "P7094831A", nationality: "FILIPINO",
    },
    resultsFound: 2,
    employers: [
      "Employer 2 14/05/2024 General Household",
      "Employer 1 22/04/2023 14/05/2024 General Household",
    ],
  },
};

// Fallback data for any maid ref not explicitly listed
const getDefaultMaid = (ref: string) => ({
  name: ref.split("-").pop() || "Maid",
  ref,
  type: "Transfer maid", nationality: "Filipino maid",
  dob: "01-Jan-1990", placeOfBirth: "Manila", height: "155cm", weight: "50Kg",
  religion: "Catholic", marital: "Single", address: "Manila",
  airport: "Manila Airport", education: "High School", availability: "Immediately",
  languages: [{ lang: "English", level: "Good" }],
  otherInfo: [], offDays: "4 days(s)/month",
  employment: [],
  agencyName: "The Agency", licenseNo: "N/A", contactPerson: "Admin", contactNo: "N/A",
  lastUpdated: "23-03-2026", hits: 0,
  historicalRecord: null, resultsFound: 0, employers: [],
});

const MaidProfile = () => {
  const { refCode } = useParams();
  const navigate = useNavigate();
  const maid = maidData[refCode || ""] || getDefaultMaid(refCode || "");

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold">Edit/Delete Maid</h2>
      </div>

      <div className="content-card animate-fade-in-up space-y-6">
        {/* Action links */}
        <div className="flex flex-wrap gap-3 text-sm border-b pb-3">
          <button className="text-primary hover:underline flex items-center gap-1"><ArrowUp className="w-3 h-3" /> Bring to Top</button>
          <button className="text-primary hover:underline">View All Maids</button>
          <button className="text-primary hover:underline flex items-center gap-1"><Edit className="w-3 h-3" /> Edit This Maid</button>
          <button className="text-primary hover:underline flex items-center gap-1"><Image className="w-3 h-3" /> Manage Photos</button>
          <button className="text-primary hover:underline flex items-center gap-1"><Youtube className="w-3 h-3" /> YouTube Video</button>
          <button className="text-destructive hover:underline flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
        </div>

        {/* Top section: video + agency info + photos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Video area */}
          <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3 bg-muted/30 min-h-[200px]">
            <p className="text-sm text-muted-foreground">It appears you do not have a video on-line for this maid. You can upload a video file to accompany this maid.</p>
            <button className="text-primary text-sm hover:underline">Click here to upload the video file for this maid.</button>
          </div>

          {/* Agency contact */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">To contact her agency,</p>
            <p className="text-sm font-bold">{maid.agencyName}</p>
            <p className="text-sm">(License No.: {maid.licenseNo}),</p>
            <p className="text-sm">Please call <span className="font-bold">{maid.contactPerson}</span></p>
            <p className="text-sm">at <span className="font-bold text-primary">{maid.contactNo}</span></p>
          </div>

          {/* Photos + PDF */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-3">
              <div className="w-24 h-28 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">Photo 1</div>
              <div className="w-24 h-28 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">Photo 2</div>
            </div>
            <button className="flex items-center gap-2 text-primary text-sm hover:underline">
              <FileDown className="w-4 h-4" /> Download Maid Bio-data in PDF
            </button>
          </div>
        </div>

        {/* Bio details */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-x-6 gap-y-1 text-sm">
          {[
            ["Maid Name", maid.name],
            ["Ref. Code", maid.ref],
            ["Type", maid.type],
            ["Nationality", maid.nationality],
            ["Date of Birth", maid.dob],
            ["Place of Birth", maid.placeOfBirth],
            ["Height/Weight", `${maid.height} / ${maid.weight}`],
            ["Religion", maid.religion],
            ["Marital Status", maid.marital],
            ["Address in Home Country", maid.address],
            ["Airport To Be Repatriated", maid.airport],
            ["Education", maid.education],
            ["Availability", maid.availability],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <p className="font-semibold text-right text-muted-foreground py-1">{label}</p>
              <p className="py-1">{value}</p>
            </div>
          ))}

          {/* Languages */}
          <p className="font-semibold text-right text-muted-foreground py-1">Language Skill</p>
          <div className="py-1">
            {maid.languages.map((l: any, i: number) => (
              <p key={i}>{l.lang} ({l.level})</p>
            ))}
          </div>
        </div>

        {/* Other Information */}
        {maid.otherInfo.length > 0 && (
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Other Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_40px] gap-y-1 text-sm max-w-lg">
              {maid.otherInfo.map((item: any, i: number) => (
                <div key={i} className="contents">
                  <p>{item.q}</p>
                  <p className="text-center">{item.a ? <Check className="w-4 h-4 text-primary inline" /> : "—"}</p>
                </div>
              ))}
            </div>
            <p className="text-sm mt-2">Number of off-days per month: {maid.offDays}</p>
          </div>
        )}

        {/* Employment History */}
        {maid.employment.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Employment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-muted/50">
                    {["From", "To", "Country", "Employer", "Maid Duties", "Remarks"].map((h) => (
                      <th key={h} className="border px-3 py-1.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maid.employment.map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="border px-3 py-1.5">{e.from}</td>
                      <td className="border px-3 py-1.5">{e.to}</td>
                      <td className="border px-3 py-1.5">{e.country}</td>
                      <td className="border px-3 py-1.5">{e.employer}</td>
                      <td className="border px-3 py-1.5">{e.duties}</td>
                      <td className="border px-3 py-1.5">{e.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Public Introduction */}
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-muted-foreground">Public Introduction</h3>
          <p className="text-amber-600 italic text-xs">Maid Introduction in Public is empty, please add to have more employers view this bio-data.</p>
        </div>

        {/* Introduction (login required) */}
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold text-muted-foreground">Introduction</h3>
          <p className="text-xs text-muted-foreground">(Employer login is required to view this Introduction)</p>
        </div>

        {/* Footer info */}
        <div className="border-t pt-4 space-y-1 text-sm">
          <p><span className="font-semibold text-muted-foreground">Last updated On</span> {maid.lastUpdated}</p>
          <p><span className="font-semibold text-muted-foreground">Hits</span> {maid.hits}</p>
        </div>

        {/* Historical Record */}
        {maid.historicalRecord && (
          <div className="space-y-1 text-sm border-t pt-4">
            <h3 className="font-semibold text-muted-foreground mb-2">Historical Record</h3>
            <p>WP No. : {maid.historicalRecord.wpNo}</p>
            <p>Name of Worker : {maid.historicalRecord.workerName}</p>
            <p>DOB of Worker : {maid.historicalRecord.dob}</p>
            <p>Sex : {maid.historicalRecord.sex}</p>
            <p>Worker's FIN : {maid.historicalRecord.fin}</p>
            <p>Passport No. : {maid.historicalRecord.passport}</p>
            <p>Nationality/Citizenship : {maid.historicalRecord.nationality}</p>
            <p className="mt-2 font-semibold">Results Found : {maid.resultsFound}</p>
            {maid.employers.map((e: string, i: number) => (
              <p key={i} className="text-primary">{e}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaidProfile;

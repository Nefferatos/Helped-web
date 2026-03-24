import { useState } from "react";
import { Button } from "@/components/ui/button";

const mockEnquiries = [
  { username: "Rajni", date: "23 March 2026, 12:58", email: "rajnirose305@gmail.com", phone: "+918872486884", message: "M best in cooking.\n\nEmployer Requirement:\nNationality: Indian\nType: Ex-Singapore Maid\nAge: 41 and above\nDuty: Taking care of infant\nLanguage: English" },
  { username: "Devina", date: "23 March 2026, 12:57", email: "devinachew@gmail.com", phone: "81381569", message: "Employer Requirement:\nNationality: Indonesian\nType: Transfer Maid\nAge: 31 to 35" },
  { username: "Shaiful", date: "23 March 2026, 12:00", email: "hirqa@yahoo.com.sg", phone: "98214800", message: "urgently need a helper who is above 1.65m tall. must be strong & hygienic. can take care of elderly & disabled." },
  { username: "Jit", date: "22 March 2026, 3:59", email: "jitchu@yahoo.com", phone: "90275978", message: "Employer Requirement:\nNationality: Indonesian\nAge: 31 to 35\nDuty: Taking care of elderly / bedridden\nLanguage: English" },
  { username: "William Lawton", date: "22 March 2026, 3:59", email: "William.Lawton100@gmail.com", phone: "19107283080", message: "Live in Spain, will have own apartment, cook, clean, market, massage therapist background as well would be amazing.\n\nEmployer Requirement:\nNationality: Filipino\nAge: 41 and above\nDuty: General Housekeeping\nLanguage: English\nOff-day: No Off-day" },
];

const Enquiry = () => {
  const [page] = useState(1);

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold mb-6">Employer Enquiry</h2>
      <div className="content-card animate-fade-in-up space-y-4">
        <div className="space-y-3">
          {mockEnquiries.map((enq, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 space-y-2 hover:border-primary/20 transition-colors"
              style={{ animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards", animationDelay: `${i * 0.06}s`, opacity: 0 }}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold text-sm">{enq.username}</span>
                <span className="text-xs text-muted-foreground">{enq.date}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{enq.email}</span>
                <span>{enq.phone}</span>
              </div>
              <p className="text-sm whitespace-pre-line bg-muted/50 rounded p-3 mt-1">{enq.message}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-1 text-sm pt-2">
          {Array.from({ length: 20 }, (_, i) => (
            <button key={i} className={`w-7 h-7 rounded ${i + 1 === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}</button>
          ))}
          <Button variant="outline" size="sm" className="h-7 text-xs">Next</Button>
        </div>
      </div>
    </div>
  );
};

export default Enquiry;

import AiAgentPanel from "@/components/ai/AiAgentPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bot, CalendarCheck, CheckCircle2, HeartHandshake, Search, Sparkles, UserCheck } from "lucide-react";

export default function ClientAiAgentsPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-3 py-6 sm:px-6">
      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Hiring autopilot
              </Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Portal context ready
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">AI Hiring Assistant</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Compare suitable helpers, understand request progress, and prepare the next step from one focused assistant workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <a href="#hiring-agent-console">
                  <Search className="mr-2 h-4 w-4" />
                  Find Matches
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#hiring-agent-console">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Check Status
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/25 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Match readiness</p>
                <p className="text-xl font-semibold">High</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
                <span>Profile context</span>
                <span>78%</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border bg-background p-3">
                <p className="text-muted-foreground">Shortlist</p>
                <p className="font-semibold">6 maids</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-muted-foreground">Next action</p>
                <p className="font-semibold">Review</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Needs", detail: "Budget, household care, language, cooking.", icon: HeartHandshake },
          { title: "Matching", detail: "Ranked helpers with reasons and tradeoffs.", icon: UserCheck },
          { title: "Follow-up", detail: "Request status, agency replies, next steps.", icon: CalendarCheck },
        ].map(({ title, detail, icon: Icon }) => (
          <div key={title} className="rounded-lg border bg-card p-4 shadow-sm">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      <div id="hiring-agent-console" className="grid gap-5">
        <AiAgentPanel
          title="Maid Recommendation Agent"
          description="Rank suitable maids with matching scores and reasons."
          endpoint="/api/ai/recommend-maid"
          mode="client"
          status="live"
          runCount="8"
          impact="Shortlist"
          confidence={84}
          automationSteps={["Capture household needs", "Score available helpers", "Explain ranking and tradeoffs"]}
          fields={[
            { name: "budget", label: "Budget", type: "number", placeholder: "Monthly budget" },
            { name: "nationalityPreference", label: "Nationality", placeholder: "Filipino, Indonesian..." },
            { name: "languageSkills", label: "Language", placeholder: "English, Mandarin..." },
            { name: "childcareExperience", label: "Childcare", type: "checkbox" },
            { name: "elderlyCareExperience", label: "Elderly care", type: "checkbox" },
            { name: "cookingSkills", label: "Cooking", type: "checkbox" },
          ]}
          quickPrompts={["Recommend the best matches for my household and explain the ranking."]}
        />
        <AiAgentPanel
          title="Employer Support Agent"
          description="Explain your request status, agency responses, contracts, and next steps."
          endpoint="/api/ai/employer-support"
          mode="client"
          status="live"
          runCount="14"
          impact="Next steps"
          confidence={87}
          automationSteps={["Read request status", "Summarize agency updates", "Suggest next action"]}
          quickPrompts={[
            "Explain my current request status and what I should do next.",
            "Summarize recent messages from the agency.",
          ]}
        />
      </div>
    </div>
  );
}

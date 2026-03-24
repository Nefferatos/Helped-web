import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, EyeOff, Trash2 } from "lucide-react";

type ViewMode = "menu" | "public" | "hidden";

const mockMaids = [
  { name: "Dela Cruz Novelyn", ref: "FIL-PHK-WIL-9646", nationality: "Filipino maid", type: "Transfer maid", age: 44, marital: "Single", updated: "23-03-2026", hasPhoto: true },
  { name: "Uli Yatun Bt Wa", ref: "INA-FBK-9648", nationality: "Indonesian maid", type: "New maid", age: 43, marital: "Single", updated: "23-03-2026", hasPhoto: false },
  { name: "Umi Hidayah", ref: "INA-FBK-9645", nationality: "Indonesian maid", type: "New maid", age: 43, marital: "Married", updated: "23-03-2026", hasPhoto: false },
  { name: "Sabita Rai", ref: "IND-SKK-LAL-9649", nationality: "Indian maid", type: "Transfer maid", age: 31, marital: "Married", updated: "23-03-2026", hasPhoto: true },
  { name: "Lizalyn Dosdos", ref: "FIL-GIN-9638", nationality: "Filipino maid", type: "Ex Middle East", age: 36, marital: "Single", updated: "23-03-2026", hasPhoto: true },
  { name: "H Melody", ref: "IND-MP-CHING-9644", nationality: "Indian maid", type: "Ex Singapore", age: 30, marital: "Single", updated: "23-03-2026", hasPhoto: true },
  { name: "Pema Yangjee Sh.", ref: "IND-DAR-SAM-9647", nationality: "Indian maid", type: "Ex Singapore", age: 27, marital: "Single", updated: "23-03-2026", hasPhoto: true },
  { name: "Anna Marie Lade.", ref: "FIL-GIN-9637", nationality: "Filipino maid", type: "Ex Middle East", age: 39, marital: "Single", updated: "22-03-2026", hasPhoto: true },
];

const EditMaids = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("menu");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });
  };

  if (view === "menu") {
    return (
      <div className="page-container">
        <h2 className="text-xl font-bold mb-6">Edit/Delete Maid</h2>
        <div className="content-card animate-fade-in-up space-y-6">
          <div className="flex gap-2">
            <Input placeholder="Maid name or Code" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outline"><Search className="w-4 h-4 mr-2" /> Search</Button>
          </div>
          <hr />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setView("public")} className="flex flex-col items-center gap-2 p-6 border rounded-lg hover:border-primary/30 hover:bg-secondary/50 transition-all active:scale-[0.98]">
              <Eye className="w-8 h-8 text-primary" />
              <span className="font-semibold text-primary">Maids In Public</span>
              <span className="text-xs text-muted-foreground">Click to edit/delete maids in public</span>
            </button>
            <button onClick={() => setView("hidden")} className="flex flex-col items-center gap-2 p-6 border rounded-lg hover:border-primary/30 hover:bg-secondary/50 transition-all active:scale-[0.98]">
              <EyeOff className="w-8 h-8 text-muted-foreground" />
              <span className="font-semibold">Maids Hidden</span>
              <span className="text-xs text-muted-foreground">Click to edit/delete hidden maids</span>
            </button>
          </div>
          <p className="text-xs text-accent text-center">Please note: maids without photos will not be displayed in public. After adding photos, you can make them searchable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView("menu")} className="text-sm text-primary hover:underline">← Back</button>
        <h2 className="text-xl font-bold">{view === "public" ? "Maids in Public" : "Maids Hidden"}</h2>
      </div>

      <div className="content-card animate-fade-in-up space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Maid name or Code" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline"><Search className="w-4 h-4 mr-2" /> Search</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {mockMaids.map((maid, i) => (
            <div
              key={maid.ref}
              className="border rounded-lg p-3 flex flex-col items-center text-center gap-2 hover:border-primary/30 hover:shadow-md transition-all"
              style={{ animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards", animationDelay: `${i * 0.04}s`, opacity: 0 }}
            >
              <div
                className="w-24 h-28 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground border cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                onClick={() => navigate(`/maid/${encodeURIComponent(maid.ref)}`)}
              >
                {maid.hasPhoto ? "Photo" : "No Photo"}
              </div>
              <p className="font-semibold text-xs leading-tight cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/maid/${encodeURIComponent(maid.ref)}`)}>{maid.name}</p>
              <p className="text-[10px] text-muted-foreground">{maid.ref}</p>
              <div className="flex flex-wrap justify-center gap-1">
                <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{maid.nationality}</span>
                <span className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">{maid.type}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{maid.marital}({maid.age})</p>
              <p className="text-[10px] text-muted-foreground">Upd: {maid.updated}</p>
              <div className="flex flex-col gap-1 w-full border-t pt-2 mt-auto">
                <label className="flex items-center justify-center gap-1 text-[10px]">
                  <input type="checkbox" checked={selected.has(maid.ref)} onChange={() => toggle(maid.ref)} className="accent-primary" />
                  Select
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <Button variant="destructive" size="sm" disabled={selected.size === 0}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
          </Button>
          <Button variant="outline" size="sm" disabled={selected.size === 0}>
            <EyeOff className="w-4 h-4 mr-1" /> Hide Selected
          </Button>
        </div>

        <div className="flex justify-center gap-1 text-sm">
          {Array.from({ length: 9 }, (_, i) => (
            <button key={i} className={`w-7 h-7 rounded ${i === 0 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}</button>
          ))}
          <button className="px-2 h-7 rounded border text-xs">Next</button>
        </div>
      </div>
    </div>
  );
};

export default EditMaids;
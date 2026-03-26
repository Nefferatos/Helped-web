import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const SearchBar = () => {
  return (
    <section id="search" className="bg-muted py-8">
      <div className="container">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">Find Your Ideal Match</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Nationality</label>
            <select className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground">
              <option>All Nationalities</option>
              <option>Filipino</option>
              <option>Indonesian</option>
              <option>Myanmar</option>
            </select>
          </div>
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Experience</label>
            <select className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground">
              <option>Any Experience</option>
              <option>1-2 Years</option>
              <option>3-5 Years</option>
              <option>5+ Years</option>
            </select>
          </div>
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Age Group</label>
            <select className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-body text-sm text-foreground">
              <option>Any Age</option>
              <option>23-30</option>
              <option>30-40</option>
              <option>40+</option>
            </select>
          </div>
          <Button className="font-body gap-2">
            <Search className="w-4 h-4" /> Search Maids
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SearchBar;

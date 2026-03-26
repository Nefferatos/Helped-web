import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileText, Search, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import type { MaidProfile } from "@/lib/maids";

interface ContractFileRecord {
  id: string;
  maidReferenceCode: string;
  maidName: string;
  fileName: string;
  fileType: string;
  fileDataUrl: string;
  fileSize: number;
  uploadedAt: string;
}

interface MaidContractRow {
  maid: MaidProfile;
  contract: ContractFileRecord | null;
}

const STORAGE_KEY = "employment_contract_files";
const PAGE_SIZE = 10;

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeLabel = (fileType: string, fileName: string) => {
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("word") || fileName.endsWith(".doc") || fileName.endsWith(".docx")) return "Word";
  if (fileType.includes("image")) return "Image";
  if (fileType.includes("text")) return "Text";
  return "File";
};

const downloadContractFile = (record: ContractFileRecord) => {
  const link = document.createElement("a");
  link.href = record.fileDataUrl;
  link.download = record.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const EmploymentContracts = () => {
  const [maids, setMaids] = useState<MaidProfile[]>([]);
  const [contractFiles, setContractFiles] = useState<ContractFileRecord[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoadingMaids, setIsLoadingMaids] = useState(true);
  const [uploadingRef, setUploadingRef] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractFileRecord | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as ContractFileRecord[];
      setContractFiles(Array.isArray(parsed) ? parsed : []);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      toast.error("Saved contract files were invalid and have been reset.");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contractFiles));
  }, [contractFiles]);

  useEffect(() => {
    const loadMaids = async () => {
      try {
        setIsLoadingMaids(true);
        const response = await fetch("/api/maids");
        const data = (await response.json().catch(() => ({}))) as { maids?: MaidProfile[]; error?: string };
        if (!response.ok || !data.maids) {
          throw new Error(data.error || "Failed to load maids");
        }
        setMaids(data.maids);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maids");
      } finally {
        setIsLoadingMaids(false);
      }
    };

    void loadMaids();
  }, []);

  const maidRows = useMemo<MaidContractRow[]>(() => {
    return maids.map((maid) => ({
      maid,
      contract: contractFiles.find((record) => record.maidReferenceCode === maid.referenceCode) ?? null,
    }));
  }, [contractFiles, maids]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return maidRows;

    return maidRows.filter(({ maid, contract }) =>
      [
        maid.fullName,
        maid.referenceCode,
        maid.nationality,
        maid.type,
        contract?.fileName || "",
        contract ? "has contract" : "no contract",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [maidRows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const handleUpload = async (maid: MaidProfile, file?: File) => {
    if (!file) return;

    try {
      setUploadingRef(maid.referenceCode);
      const reader = new FileReader();
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read contract file"));
        reader.readAsDataURL(file);
      });

      const nextRecord: ContractFileRecord = {
        id: `${maid.referenceCode}-${Date.now()}`,
        maidReferenceCode: maid.referenceCode,
        maidName: maid.fullName,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileDataUrl,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      };

      setContractFiles((prev) => [
        ...prev.filter((record) => record.maidReferenceCode !== maid.referenceCode),
        nextRecord,
      ]);
      toast.success(`Contract uploaded for ${maid.fullName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload contract");
    } finally {
      setUploadingRef(null);
      const input = fileInputRefs.current[maid.referenceCode];
      if (input) input.value = "";
    }
  };

  const handleView = (record: ContractFileRecord) => {
    const opened = window.open(record.fileDataUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      toast.error("Unable to open file preview");
    }
  };

  const handleDelete = (record: ContractFileRecord) => {
    if (!window.confirm(`Remove contract "${record.fileName}" for ${record.maidName}?`)) return;

    setContractFiles((prev) => prev.filter((item) => item.id !== record.id));
    if (selectedContract?.id === record.id) {
      setSelectedContract(null);
    }
    toast.success("Contract removed");
  };

  const maidsWithContracts = maidRows.filter((row) => row.contract).length;
  const maidsWithoutContracts = maidRows.length - maidsWithContracts;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-10 lg:px-8">
      <section className="content-card space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employment Contracts</h1>
            <p className="text-sm text-muted-foreground">
              Upload contract files for each maid. Contracts can be viewed and downloaded, but not edited here.
            </p>
          </div>
        </div>

        <div className="flex min-w-[280px] items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search maid, reference code, nationality, type, or contract file"
            className="h-auto border-none bg-transparent p-0 shadow-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Loaded Maids</p>
            <p className="mt-1 text-2xl font-bold">{isLoadingMaids ? "..." : maids.length}</p>
          </div>
          <div className="rounded-lg border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">With Contract</p>
            <p className="mt-1 text-2xl font-bold">{maidsWithContracts}</p>
          </div>
          <div className="rounded-lg border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Without Contract</p>
            <p className="mt-1 text-2xl font-bold">{maidsWithoutContracts}</p>
          </div>
          <div className="rounded-lg border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Filtered Results</p>
            <p className="mt-1 text-2xl font-bold">{filteredRows.length}</p>
          </div>
        </div>
      </section>

      {selectedContract ? (
        <Card>
          <CardHeader>
            <CardTitle>Selected Contract Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{selectedContract.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedContract.maidName} ({selectedContract.maidReferenceCode}) • {getFileTypeLabel(selectedContract.fileType, selectedContract.fileName)} • {formatFileSize(selectedContract.fileSize)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleView(selectedContract)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button variant="outline" onClick={() => downloadContractFile(selectedContract)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {selectedContract.fileType.includes("pdf") ? (
              <iframe
                src={selectedContract.fileDataUrl}
                title={selectedContract.fileName}
                className="h-[560px] w-full rounded-lg border"
              />
            ) : selectedContract.fileType.includes("image") ? (
              <div className="overflow-hidden rounded-lg border">
                <img src={selectedContract.fileDataUrl} alt={selectedContract.fileName} className="max-h-[560px] w-full object-contain" />
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                In-browser preview is limited for this file type. Use View or Download to open the document.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Contract Files by Maid</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingMaids ? (
            <div className="p-10 text-center text-muted-foreground">Loading maids...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No maid records found</h3>
              <p className="text-muted-foreground">Try adjusting your search to see uploaded contracts or missing-contract entries.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref Code</TableHead>
                      <TableHead>Maid</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contract Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-[240px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map(({ maid, contract }) => (
                      <TableRow key={maid.referenceCode}>
                        <TableCell className="font-medium">{maid.referenceCode}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{maid.fullName}</p>
                            <p className="text-xs text-muted-foreground">{maid.nationality || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{maid.type || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={contract ? "default" : "outline"}>
                            {contract ? "Uploaded" : "No Contract"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contract ? (
                            <div>
                              <p className="font-medium">{contract.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {getFileTypeLabel(contract.fileType, contract.fileName)} • {formatFileSize(contract.fileSize)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Upload required</span>
                          )}
                        </TableCell>
                        <TableCell>{contract ? new Date(contract.uploadedAt).toLocaleString() : "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              ref={(element) => {
                                fileInputRefs.current[maid.referenceCode] = element;
                              }}
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.webp,.xls,.xlsx"
                              onChange={(event) => void handleUpload(maid, event.target.files?.[0])}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRefs.current[maid.referenceCode]?.click()}
                              disabled={uploadingRef === maid.referenceCode}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {contract ? "Replace" : "Upload"}
                            </Button>

                            {contract ? (
                              <>
                                <Button variant="outline" size="sm" onClick={() => setSelectedContract(contract)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => downloadContractFile(contract)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(contract)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredRows.length > PAGE_SIZE ? (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmploymentContracts;

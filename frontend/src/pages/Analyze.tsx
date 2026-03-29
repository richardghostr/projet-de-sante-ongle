import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  X,
  Camera,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  TrendingUp,
  UserPlus,
  Calendar,
  ArrowRight,
  Stethoscope,
  FileText,
  Share2,
} from "lucide-react";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type AnalysisResult = {
  diagnostic?: string;
  conseils?: Array<{ texte_conseil?: string } | string>;
  result?: {
    pathologie?: string;
    score_confiance?: number;
    niveau_risque?: string;
  };
};

const Analyze = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "results">(
    "upload",
  );
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showTreatmentDialog, setShowTreatmentDialog] = useState(false);
  const [treatmentName, setTreatmentName] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [isCreatingTreatment, setIsCreatingTreatment] = useState(false);
  // 1. Define the interface at the top of your file
  interface UploadResponse {
    analysis_id?: string;
    id?: string;
    uuid?: string;
    data?: {
      analysis_id?: string;
      id?: string;
      uuid?: string;
      data?: {
        analysis_id?: string;
      };
    };
  }

  // 2. Use it in your useState
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null,
  );

  const handleFile = useCallback(
    (f: File) => {
      if (!ALLOWED.includes(f.type)) {
        toast({
          title: "Format non supporté",
          variant: "destructive",
        });
        return;
      }

      if (f.size > MAX_SIZE) {
        toast({
          title: "Fichier trop volumineux (max 10MB)",
          variant: "destructive",
        });
        return;
      }

      setFile(f);

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPreview(reader.result);
        }
      };

      reader.readAsDataURL(f);
    },
    [toast],
  );

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStep("upload");
    setProgress(0);
    setResult(null);
  };

  const startAnalysis = async () => {
    if (!file) return;

    setStep("analyzing");
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 12, 90));
    }, 300);

    try {
      const uploadRes = await api.uploadImage(file);
      setUploadResponse(uploadRes);

      const analysisId =
        uploadRes?.analysis_id ||
        uploadRes?.data?.analysis_id ||
        uploadRes?.data?.data?.analysis_id ||
        uploadRes?.id ||
        uploadRes?.data?.id ||
        uploadRes?.uuid ||
        uploadRes?.data?.uuid ||
        null;

      if (!analysisId) {
        clearInterval(progressInterval);

        toast({
          title: "Erreur",
          description: "Impossible de récupérer l'identifiant d'analyse.",
          variant: "destructive",
        });

        setStep("upload");
        return;
      }

      const analysisRes = await api.analyzeImage(analysisId);

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setResult(analysisRes.data || analysisRes);
        setStep("results");
      }, 500);
    } catch (err: unknown) {
      clearInterval(progressInterval);

      const message =
        err instanceof Error ? err.message : "Une erreur inconnue est survenue";

      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });

      setStep("upload");
    }
  };

  const riskColor = (risk: string) => {
    const map: Record<string, string> = {
      sain: "text-emerald-600 bg-emerald-50",
      bas: "text-blue-600 bg-blue-50",
      modere: "text-amber-600 bg-amber-50",
      eleve: "text-orange-600 bg-orange-50",
      critique: "text-red-600 bg-red-50",
    };

    return map[risk] || "text-muted-foreground bg-muted";
  };

  const handleStartTreatment = async () => {
    if (!treatmentName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez donner un nom a votre suivi de traitement.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTreatment(true);

    try {
      const analysisId =
        uploadResponse?.analysis_id ||
        uploadResponse?.data?.analysis_id ||
        uploadResponse?.data?.data?.analysis_id ||
        uploadResponse?.id ||
        uploadResponse?.data?.id ||
        null;

      const response = await api.createTreatment({
        name: treatmentName,
        analysis_id: analysisId,
        condition: result?.result?.pathologie || result?.diagnostic || "Non specifie",
        notes: treatmentNotes,
      });

      toast({
        title: "Suivi cree",
        description: "Votre suivi de traitement a ete cree avec succes.",
      });

      setShowTreatmentDialog(false);
      navigate(`/treatments/${response.data?.id || response.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la creation du suivi";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingTreatment(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />

      <main className="container flex-1 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-3xl font-bold">Nouvelle analyse</h1>
          <p className="mb-8 text-muted-foreground">
            Uploadez une photo de votre ongle pour obtenir un diagnostic IA
          </p>

          {step === "upload" && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                {!preview ? (
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add(
                        "border-primary",
                        "bg-accent",
                      );
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove(
                        "border-primary",
                        "bg-accent",
                      );
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove(
                        "border-primary",
                        "bg-accent",
                      );

                      const droppedFile = e.dataTransfer.files[0];
                      if (droppedFile) handleFile(droppedFile);
                    }}
                    className="flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-colors hover:border-primary hover:bg-accent/50"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Upload className="h-8 w-8" />
                    </div>

                    <div className="text-center">
                      <p className="font-medium">
                        Glissez-déposez votre image ici
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ou cliquez pour sélectionner (JPG, PNG, WebP — max 10MB)
                      </p>
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      aria-label="Uploader une image d'ongle" // Add this
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleFile(selectedFile);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full object-cover"
                        style={{ maxHeight: 400 }}
                      />

                      <button
                        onClick={reset}
                        className="absolute right-3 top-3 rounded-full bg-background/80 p-2 backdrop-blur-sm hover:bg-background"
                        aria-label="Supprimer l'image" // Add this
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{file?.name}</span>
                      <span>
                        {file
                          ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                          : ""}
                      </span>
                    </div>

                    <Button
                      onClick={startAnalysis}
                      className="w-full gap-2 rounded-xl"
                      size="lg"
                    >
                      <Camera className="h-4 w-4" />
                      Lancer l'analyse
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "analyzing" && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center gap-6 p-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Activity className="h-8 w-8 animate-pulse" />
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold">Analyse en cours...</h3>
                  <p className="text-sm text-muted-foreground">
                    Notre IA examine votre image
                  </p>
                </div>

                <div className="w-full max-w-xs">
                  <Progress value={progress} className="h-2" />
                  <p className="mt-2 text-center text-sm font-medium tabular-nums">
                    {Math.round(progress)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "results" && result && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Résultats de l'analyse</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {preview && (
                  <div className="overflow-hidden rounded-2xl border">
                    <img
                      src={preview}
                      alt="Analysed"
                      className="w-full object-cover"
                      style={{ maxHeight: 300 }}
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border p-4 text-center">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Diagnostic
                    </p>
                    <p className="text-sm font-semibold">
                      {result.result?.pathologie || result.diagnostic || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4 text-center">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Confiance
                    </p>
                    <p className="text-sm font-semibold">
                      {Math.round((result.result?.score_confiance || 0) * 100)}%
                    </p>
                  </div>

                  <div className="rounded-xl border p-4 text-center">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Severite
                    </p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${riskColor(
                        result.result?.niveau_risque || "",
                      )}`}
                    >
                      {result.result?.niveau_risque || "—"}
                    </span>
                  </div>
                </div>

                {/* Post-Diagnosis Next Steps */}
                <Separator className="my-6" />
                
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    Prochaines etapes
                  </h3>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Start Treatment Tracking */}
                    <Card 
                      className="cursor-pointer border-2 border-transparent transition-all hover:border-primary hover:shadow-md"
                      onClick={() => {
                        setTreatmentName(result.result?.pathologie || result.diagnostic || "Mon traitement");
                        setShowTreatmentDialog(true);
                      }}
                    >
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Suivre mon traitement</h4>
                          <p className="text-sm text-muted-foreground">
                            Demarrez un suivi photo et journal pour observer l evolution
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* View History */}
                    <Card 
                      className="cursor-pointer border-2 border-transparent transition-all hover:border-primary hover:shadow-md"
                      onClick={() => navigate("/history")}
                    >
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Voir mon historique</h4>
                          <p className="text-sm text-muted-foreground">
                            Consultez toutes vos analyses precedentes
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Consult a Professional */}
                    <Card 
                      className="cursor-pointer border-2 border-transparent transition-all hover:border-amber-500 hover:shadow-md"
                      onClick={() => navigate("/profile")}
                    >
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Consulter un professionnel</h4>
                          <p className="text-sm text-muted-foreground">
                            Partagez vos resultats avec un dermatologue
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* New Analysis */}
                    <Card 
                      className="cursor-pointer border-2 border-transparent transition-all hover:border-emerald-500 hover:shadow-md"
                      onClick={reset}
                    >
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                          <Camera className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Nouvelle analyse</h4>
                          <p className="text-sm text-muted-foreground">
                            Analyser une autre image d ongle
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Risk Level Warning */}
                  {(result.result?.niveau_risque === "eleve" || result.result?.niveau_risque === "critique") && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="flex items-start gap-4 p-4">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                        <div>
                          <h4 className="font-medium text-red-800">Consultation recommandee</h4>
                          <p className="text-sm text-red-700">
                            Compte tenu du niveau de risque detecte, nous vous recommandons fortement de consulter un professionnel de sante dans les plus brefs delais.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Treatment Creation Dialog */}
          <Dialog open={showTreatmentDialog} onOpenChange={setShowTreatmentDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Demarrer un suivi de traitement</DialogTitle>
                <DialogDescription>
                  Creez un suivi pour observer l evolution de votre ongle au fil du temps avec des photos et un journal de traitement.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="treatment-name">Nom du suivi</Label>
                  <Input
                    id="treatment-name"
                    placeholder="Ex: Traitement mycose pouce droit"
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="treatment-notes">Notes (optionnel)</Label>
                  <Textarea
                    id="treatment-notes"
                    placeholder="Ajoutez des notes sur votre condition ou le traitement prevu..."
                    value={treatmentNotes}
                    onChange={(e) => setTreatmentNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {result && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Condition detectee:</span>{" "}
                      {result.result?.pathologie || result.diagnostic || "Non specifie"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Niveau de risque:</span>{" "}
                      {result.result?.niveau_risque || "Non evalue"}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowTreatmentDialog(false)}
                  disabled={isCreatingTreatment}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleStartTreatment}
                  disabled={isCreatingTreatment || !treatmentName.trim()}
                >
                  {isCreatingTreatment ? (
                    <>
                      <Activity className="mr-2 h-4 w-4 animate-spin" />
                      Creation...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Creer le suivi
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Analyze;

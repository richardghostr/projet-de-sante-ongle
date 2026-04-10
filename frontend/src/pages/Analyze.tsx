import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { AnalysisResult, UploadResponse } from '@/types';
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

const MAX_SIZE = 5 * 1024 * 1024; // 5MB max as per spec
const ALLOWED = ["image/jpeg", "image/png"]; // Accept only jpg/jpeg and png

// using shared `AnalysisResult` from `src/types`

const Analyze = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "results">(
    "upload",
  );
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Local simplified analysis result for immediate display
  const [analysisResult, setAnalysisResult] = useState<{
    diagnostic?: string;
    confidence?: number; // 0..1
    severity?: string;
  } | null>(null);
  const [showTreatmentDialog, setShowTreatmentDialog] = useState(false);
  const [treatmentName, setTreatmentName] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [isCreatingTreatment, setIsCreatingTreatment] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      // Normalize mime type for jpeg variations
      const mime = f.type || '';
      if (!ALLOWED.includes(mime)) {
        toast({
          title: "Format non supporté",
          variant: "destructive",
        });
        return;
      }

      if (f.size > MAX_SIZE) {
        toast({
          title: "Fichier trop volumineux (max 5MB)",
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
    setAnalysisResult(null);
    setUploadResponse(null);
  };

  // Attach stream to video element when camera modal opens
  useEffect(() => {
    if (cameraOpen && videoRef.current && stream) {
      const v = videoRef.current;
      if (v.srcObject !== stream) v.srcObject = stream;
      v.muted = true;
      v.playsInline = true;
      // ensure attribute present for some browsers
      v.setAttribute('autoplay', '');
      v.setAttribute('muted', '');
      try { v.play().catch(() => {}); } catch {}
      // start preview loop drawing video -> canvas
      const startPreview = () => {
        const canvas = canvasRef.current;
        if (!canvas || !v) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const draw = () => {
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            const width = v.videoWidth;
            const height = v.videoHeight;
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
              canvas.width = Math.floor(width * dpr);
              canvas.height = Math.floor(height * dpr);
              canvas.style.width = `${width}px`;
              canvas.style.height = `${height}px`;
              ctx.scale(dpr, dpr);
            }
            try { ctx.drawImage(v, 0, 0, width, height); } catch (e) {}
          }
          rafRef.current = requestAnimationFrame(draw);
        };
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
      };
      startPreview();
    }
    return () => {
      // cleanup when modal closes
      if (!cameraOpen && stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cameraOpen, stream]);

  const captureFromVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    // ensure we have valid video dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // wait for metadata or playing event
      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('playing', onLoaded);
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('playing', onLoaded);
        // fallback timeout
        setTimeout(() => {
          try { video.removeEventListener('loadedmetadata', onLoaded); video.removeEventListener('playing', onLoaded); } catch {}
          resolve();
        }, 500);
      });
    }

    // small delay to ensure a fresh frame is available
    await new Promise((r) => setTimeout(r, 120));

    // Diagnostic logs to inspect video/stream state before capture
    try {
      if (import.meta.env.DEV) {
        console.debug('captureFromVideo: videoState', {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          currentTime: video.currentTime,
          paused: video.paused,
        });
        if (stream) {
          console.debug('captureFromVideo: stream tracks', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })));
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('captureFromVideo: diagnostic logging failed', e);
    }

    // Prefer ImageCapture API when available (more reliable photo capture)
    try {
      const track = stream?.getVideoTracks()[0];
      if (track && (window as any).ImageCapture) {
        try {
          const ImageCaptureCtor = (window as any).ImageCapture;
          const ic = new ImageCaptureCtor(track);
          const photoBlob = await ic.takePhoto();
          if (photoBlob) {
            const f = new File([photoBlob], `capture_${Date.now()}.${(photoBlob.type || 'image/jpeg').split('/')[1] || 'jpg'}`, { type: photoBlob.type || 'image/jpeg' });
            handleFile(f);
            setCameraOpen(false);
            if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
            return;
          }
        } catch (imgErr) {
          if (import.meta.env.DEV) console.debug('ImageCapture failed, falling back to canvas', imgErr);
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('ImageCapture check failed', e);
    }

    // If we have an existing preview canvas (rendering the live frames), use it for capture
    const previewCanvas = canvasRef.current;
    if (previewCanvas) {
      const blob: Blob | null = await new Promise((resolve) => previewCanvas.toBlob(resolve as BlobCallback, 'image/jpeg', 0.92));
      if (blob) {
        const f = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFile(f);
        setCameraOpen(false);
        if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        return;
      }
    }

    // Fallback: draw from video into an offscreen canvas
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    // scale for device pixel ratio to improve quality
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    // draw current frame
    try {
      ctx.drawImage(video, 0, 0, width, height);
    } catch (err) {
      // drawing can fail if video not ready
      console.error('captureFromVideo drawImage failed', err);
      return;
    }

    // convert to blob
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve as BlobCallback, 'image/jpeg', 0.92));
    if (!blob) return;

    // create File object to reuse existing upload flow
    const f = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
    // pass through validation and preview
    handleFile(f);

    // close modal and stop stream
    setCameraOpen(false);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;

    setStep("analyzing");
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 12, 90));
    }, 300);

    analyzeMutation.mutate(file, {
      onSuccess(data) {
        clearInterval(progressInterval);
        setProgress(100);
        // normalize response shape
          const payload = data?.data ?? data;
          // keep original result for legacy usage
          setResult(payload?.result || payload);
          setUploadResponse({
            analysis_id: payload?.analysis_id || payload?.id,
            uuid: payload?.uuid,
            data: payload,
          });

          // Normalize analysis fields for immediate display (robust to multiple shapes)
          const raw = payload?.result ?? payload ?? {};
          let diagnostic = raw.pathologie || raw.diagnostic || payload?.pathologie || null;
          let confidence: number | undefined = undefined;
          if (raw.score_confiance !== undefined) confidence = Number(raw.score_confiance);
          else if (raw.score !== undefined) confidence = Number(raw.score);
          else if (payload?.score_confiance !== undefined) confidence = Number(payload.score_confiance);
          // Confidence may be expressed 0..1 or 0..100
          if (confidence !== undefined && confidence > 1) confidence = confidence / 100;
          const severity = raw.niveau_risque || raw.niveau || raw.severity || payload?.niveau_risque || null;

          setAnalysisResult({ diagnostic: diagnostic ?? undefined, confidence: confidence ?? undefined, severity: severity ?? undefined });
        setTimeout(() => {
          setStep("results");
        }, 500);
      },
      onError(err: any) {
        clearInterval(progressInterval);
        const message = err?.message || 'Une erreur inconnue est survenue';
        toast({ title: 'Erreur', description: message, variant: 'destructive' });
        setStep('upload');
      }
    });
  };

  const analyzeMutation = useMutation({
    mutationFn: (file: File) => api.analyzeComplete(file),
  });

  const createTreatmentMutation = useMutation({
    mutationFn: (data: any) => api.createTreatment(data),
  });

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

  // Display helpers prefer immediate analysisResult when available
  const displayDiagnostic = analysisResult?.diagnostic ?? (result?.result?.pathologie || (result as any)?.diagnostic);
  const displayConfidence = (analysisResult?.confidence ?? (result?.result?.score_confiance || 0)) as number;
  const displaySeverity = analysisResult?.severity ?? (result?.result?.niveau_risque || "");

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

      const analysisUuid =
        uploadResponse?.uuid ||
        uploadResponse?.data?.uuid ||
        (result && typeof result === 'object' && 'uuid' in result ? (result as { uuid: string }).uuid : null) ||
        (result &&
        typeof result === 'object' &&
        'analysis' in result &&
        (result as { analysis: unknown }).analysis &&
        typeof (result as { analysis: unknown }).analysis === 'object' &&
        'uuid' in ((result as { analysis: unknown }).analysis as object)
          ? ((result as { analysis: { uuid: string } }).analysis.uuid)
          : null);

      const response = await api.createTreatment({
        titre: treatmentName,
        description: treatmentNotes,
        analysis_uuid: analysisUuid,
        doigt_concerne: "index", // Valeur par défaut
        main_pied: "main_droite", // Valeur par défaut
        frequence_suivi: "weekly", // Valeur par défaut
      });

      toast({
        title: "Suivi cree",
        description: "Votre suivi de traitement a ete cree avec succes.",
      });

      setShowTreatmentDialog(false);
      navigate(`/treatments/${response.data?.uuid || response.uuid}`);
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
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />

      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 text-2xl font-bold md:text-3xl">Nouvelle analyse</h1>
          <p className="mb-6 text-sm text-muted-foreground md:mb-8 md:text-base">
            Uploadez une photo de votre ongle pour obtenir un diagnostic IA
          </p>

          {step === "upload" && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                {!preview ? (
                  <div
                    onClick={(e) => {
                      // only trigger file picker when clicking the dropzone itself
                      if (e.currentTarget === e.target) {
                        inputRef.current?.click();
                      }
                    }}
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
                    className="flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-6 md:p-10 transition-colors hover:border-primary hover:bg-accent/50"
                  >
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary md:h-16 md:w-16">
                          <Upload className="h-6 w-6 md:h-8 md:w-8" />
                        </div>

                        <div className="text-center">
                          <p className="font-medium">Glissez-déposez votre image ici</p>
                          <p className="text-sm text-muted-foreground">ou sélectionnez / prenez une photo (JPG, PNG — max 5MB)</p>
                        </div>

                        <div className="flex w-full flex-col gap-3 mt-4">
                          <Button
                            className="h-12 w-full gap-2 rounded-xl text-base"
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Try opening native getUserMedia (desktop browsers / webcams)
                              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                                try {
                                  const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
                                  // if succeeded, open modal with stream
                                  setStream(s);
                                  setCameraOpen(true);
                                  return;
                                } catch (err) {
                                  // try a more permissive constraint (some devices don't support exact)
                                  try {
                                    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                                    setStream(s);
                                    setCameraOpen(true);
                                    return;
                                  } catch (_err) {
                                    // fallback to file input (mobile or no webcam)
                                    cameraInputRef.current?.click();
                                    return;
                                  }
                                }
                              } else {
                                // no mediaDevices: fallback to file input (mobile will open camera)
                                cameraInputRef.current?.click();
                              }
                            }}
                          >
                            <Camera className="h-5 w-5" /> Prendre une photo
                          </Button>
                          <Button
                            variant="outline"
                            className="h-12 w-full gap-2 rounded-xl text-base"
                            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                          >
                            <Upload className="h-5 w-5" /> Importer depuis la galerie
                          </Button>
                        </div>

                        <p className="mt-2 text-center text-xs text-muted-foreground md:text-sm">Prenez une photo nette, bien éclairée, centrée sur l'ongle.</p>
                      </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      aria-label="Uploader une image d'ongle"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleFile(selectedFile);
                      }}
                    />

                    {/* Camera input: uses capture to hint camera on mobile */}
                    <input
                      ref={(el) => (cameraInputRef.current = el)}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      aria-label="Prendre une photo d'ongle"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleFile(selectedFile);
                      }}
                    />
                    {/* Webcam modal for desktop */}
                    <Dialog open={cameraOpen} onOpenChange={(open) => {
                      setCameraOpen(open);
                      if (!open && stream) {
                        stream.getTracks().forEach((t) => t.stop());
                        setStream(null);
                      }
                    }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Prendre une photo</DialogTitle>
                          <DialogDescription>
                            Utilisez votre webcam pour capturer l'image. Assurez-vous que l'ongle est net et bien eclairé.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center gap-4">
                          <video ref={videoRef} className="hidden" playsInline autoPlay muted />
                          <canvas ref={canvasRef} className="w-full max-w-lg rounded-md bg-black" />

                          <div className="flex gap-2">
                            <Button onClick={captureFromVideo} className="gap-2">
                              <Camera className="h-4 w-4" /> Capturer
                            </Button>
                            <Button variant="outline" onClick={() => { setCameraOpen(false); if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); } }}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full object-cover max-h-[280px] md:max-h-[400px]"
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
                      className="h-14 w-full gap-2 rounded-xl text-base"
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
              <CardContent className="flex flex-col items-center gap-6 p-8 md:p-12">
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border p-4 text-center">
                    <p className="mb-1 text-xs text-muted-foreground">Diagnostic</p>
                    <p className="text-sm font-semibold">{displayDiagnostic || "—"}</p>
                  </div>

                  <div className="rounded-xl border p-4 text-center">
                    <p className="mb-1 text-xs text-muted-foreground">Confiance</p>
                    <p className="text-sm font-semibold">{Math.round((displayConfidence || 0) * 100)}%</p>
                  </div>

                  <div className="rounded-xl border p-4 text-center">
                    <p className="mb-1 text-xs text-muted-foreground">Severite</p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${riskColor(displaySeverity || "")}`}>
                      {displaySeverity || "—"}
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
                        className="cursor-pointer border-2 border-transparent transition-all hover:border-primary hover:shadow-md min-h-[80px]"
                      onClick={async () => {
                        const title = displayDiagnostic || result.result?.pathologie || result.diagnostic || "Mon traitement";
                        try {
                          const resp = await createTreatmentMutation.mutateAsync({
                            titre: title,
                            description: '',
                            analysis_uuid: uploadResponse?.uuid || (result && (result as any).uuid) || undefined,
                            doigt_concerne: 'index',
                            main_pied: 'main_droite',
                            frequence_suivi: 'weekly'
                          });
                          const newUuid = resp?.data?.uuid || resp?.uuid;
                          navigate(`/treatments/${newUuid}`);
                        } catch (e: any) {
                          toast({ title: 'Erreur', description: e?.message || 'Impossible de creer le suivi', variant: 'destructive' });
                        }
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
                      className="cursor-pointer border-2 border-transparent transition-all hover:border-primary hover:shadow-md min-h-[80px]"
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
                      className="cursor-pointer border-2 border-transparent transition-all hover:border-amber-500 hover:shadow-md min-h-[80px]"
                      onClick={() => navigate(`/consult/${uploadResponse?.uuid || uploadResponse?.analysis_id || (result && (result as any).uuid) || ''}`)}
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
                      className="cursor-pointer border-2 border-transparent transition-all hover:border-emerald-500 hover:shadow-md min-h-[80px]"
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
                  {(displaySeverity === "eleve" || displaySeverity === "critique") && (
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
                    className="h-12 text-base"
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
                    className="text-base"
                  />
                </div>

                {(result || analysisResult) && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Condition detectee:</span>{" "}
                      {displayDiagnostic || 'Non specifie'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Niveau de risque:</span>{" "}
                      {displaySeverity || 'Non evalue'}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTreatmentDialog(false)}
                  disabled={isCreatingTreatment}
                  className="h-11 flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleStartTreatment}
                  disabled={isCreatingTreatment || !treatmentName.trim()}
                  className="h-11 flex-1"
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

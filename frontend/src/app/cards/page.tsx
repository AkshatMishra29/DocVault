"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import {
  getCards,
  createCard,
  scanCardText,
  promoteCard,
  deleteCard,
  cardPrompt,
  BASE_URL,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import {
  CreditCard,
  Camera,
  Upload,
  ArrowUpRight,
  Trash2,
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  X,
  Bot,
  Layers,
  FileText,
  ScanText,
  Edit3,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface CardItem {
  id: string;
  caption: string;
  created_at: string;
  image_url?: string;
  text_content?: string;
  category?: string;
}

interface PromptReference {
  type: "card" | "document";
  id: string;
  caption?: string;
  filename?: string;
  category?: string;
  image_url?: string;
}

// Convert base64 dataURI to a File object for multipart form upload
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export default function CardsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [cardCategory, setCardCategory] = useState("General");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isScanningText, setIsScanningText] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Capture mode: "camera" | "upload" | "manual"
  const [captureMode, setCaptureMode] = useState<"camera" | "upload" | "manual">("camera");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Prompt Extraction
  const [promptText, setPromptText] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [referencedItems, setReferencedItems] = useState<PromptReference[]>([]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    loadCards();
  }, [router]);

  async function loadCards() {
    setLoading(true);
    try {
      const data = (await getCards()) as CardItem[];
      setCards(data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }

  // Live Camera Snapshot
  const captureSnapshot = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Camera snapshot failed. Please try again.");
      return;
    }
    const file = dataURLtoFile(imageSrc, `card_snapshot_${Date.now()}.jpg`);
    setSelectedFile(file);
    setPreviewUrl(imageSrc);
    toast.success("Snapshot captured! You can now scan text or save.");
  }, []);

  // Live Camera OCR Text Scan
  async function handleScanSnapshotText() {
    let fileToScan = selectedFile;
    if (!fileToScan && webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        fileToScan = dataURLtoFile(imageSrc, `card_snapshot_${Date.now()}.jpg`);
        setSelectedFile(fileToScan);
        setPreviewUrl(imageSrc);
      }
    }

    if (!fileToScan) {
      toast.error("Take a snapshot or pick an image first to scan text");
      return;
    }

    setIsScanningText(true);
    const fd = new FormData();
    fd.append("file", fileToScan);

    try {
      const res = await scanCardText(fd);
      if (res.text && res.text.trim()) {
        setTextContent(res.text.trim());
        toast.success(`Scanned ${res.char_count} characters with Gemini Vision!`);
      } else {
        toast("No readable text found in image", { icon: "ℹ️" });
      }
    } catch {
      toast.error("OCR scan failed");
    } finally {
      setIsScanningText(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleRetake() {
    setSelectedFile(null);
    setPreviewUrl(null);
  }

  function handleCopyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Text copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleQuickCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile && !textContent.trim() && !caption.trim()) {
      toast.error("Please provide an image, snapshot, or enter card text");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    if (caption.trim()) {
      formData.append("caption", caption.trim());
    }
    if (textContent.trim()) {
      formData.append("text_content", textContent.trim());
    }
    formData.append("category", cardCategory);

    try {
      const created = (await createCard(formData)) as CardItem;
      setCards((prev) => [created, ...prev]);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setTextContent("");
      toast.success("Quick Doc Card saved & indexed!");
    } catch {
      toast.error("Failed to save card");
    } finally {
      setUploading(false);
    }
  }

  async function handlePromote(id: string) {
    setActionId(id);
    try {
      await promoteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Card promoted into permanent Sovereign Vault with OCR!");
    } catch {
      toast.error("Failed to promote card");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this quick card snapshot?")) return;
    setActionId(id);
    try {
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Card snapshot removed");
    } catch {
      toast.error("Failed to delete card");
    } finally {
      setActionId(null);
    }
  }

  // Natural Language Prompt Extraction
  async function handlePromptSubmit(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const query = (customQuery || promptText).trim();
    if (!query) return;

    setPromptLoading(true);
    setAiAnswer(null);
    setReferencedItems([]);

    try {
      const res = (await cardPrompt(query)) as {
        answer: string;
        referenced_items?: PromptReference[];
      };
      setAiAnswer(res.answer);
      setReferencedItems(res.referenced_items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      setAiAnswer(`Error: ${msg}`);
    } finally {
      setPromptLoading(false);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-16 space-y-6">
      <PageHeader
        title="Quick Info Cards"
        subtitle="Snapshot visiting cards, tokens, IDs or receipts using your camera — extract with AI prompts"
        breadcrumbs={[
          { label: "Vault", href: "/vault" },
          { label: "Cards" },
        ]}
      />

      {/* AI Prompt Extraction Bar */}
      <div className="mac-card p-5 border border-primary-500/20 bg-gradient-to-r from-primary-500/5 via-teal-500/5 to-transparent">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Ask AI / Extract From Cards
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Search details, contact info, or validity from your saved cards using natural language
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => handlePromptSubmit(e)} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. 'What cards do I have?' or 'Extract details from my gym card'..."
              className="mac-input !pl-9 text-xs w-full"
            />
          </div>
          <button
            type="submit"
            disabled={promptLoading || !promptText.trim()}
            className="btn-primary !px-5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {promptLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Bot className="w-3.5 h-3.5" />
                <span>Extract</span>
              </>
            )}
          </button>
        </form>

        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Quick prompts:</span>
          {[
            "What cards are in my stash?",
            "Find doctor or health cards",
            "Show membership cards",
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setPromptText(chip);
                handlePromptSubmit(undefined, chip);
              }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-primary-500 hover:border-primary-500/30 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* AI Answer Display */}
        <AnimatePresence>
          {(aiAnswer || promptLoading) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">AI Assistant Response</span>
                </div>
                {aiAnswer && (
                  <button
                    onClick={() => setAiAnswer(null)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {promptLoading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] py-2">
                  <div className="w-3.5 h-3.5 border-2 border-primary-500/40 border-t-primary-500 rounded-full animate-spin" />
                  <span>Searching card captions and vector index...</span>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                  {aiAnswer}
                </p>
              )}

              {referencedItems.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
                    Matched Items:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {referencedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
                      >
                        <div className="w-7 h-7 rounded bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--text-primary)] truncate">
                            {item.caption || item.filename || "Card"}
                          </p>
                          <span className="text-[10px] text-[var(--text-tertiary)] uppercase">
                            {item.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Ingestion Form with Live Camera */}
        <div className="lg:col-span-5">
          <div className="mac-card p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary-500" />
                <span>Camera Capture</span>
              </h3>

              {/* Mode Toggle: Camera vs Upload vs Manual Text */}
              <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-[11px]">
                <button
                  type="button"
                  onClick={() => { setCaptureMode("camera"); handleRetake(); }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    captureMode === "camera"
                      ? "bg-primary-500 text-white shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => { setCaptureMode("upload"); handleRetake(); }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    captureMode === "upload"
                      ? "bg-primary-500 text-white shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => { setCaptureMode("manual"); handleRetake(); }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    captureMode === "manual"
                      ? "bg-primary-500 text-white shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Manual Text</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleQuickCapture} className="space-y-4">
              {/* Viewfinder / Capture Box */}
              {captureMode === "manual" ? (
                /* Manual Text Entry Mode */
                <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-semibold">
                    <span className="flex items-center gap-1.5 text-primary-500">
                      <FileText className="w-3.5 h-3.5" />
                      Simple Text Card Note
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      Instant Searchable
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Type or paste any information directly (addresses, policy numbers, emergency contacts, registration details).
                  </p>
                </div>
              ) : previewUrl ? (
                /* Snapshot Preview */
                <div className="space-y-2">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-primary-500/40 bg-black">
                    <img
                      src={previewUrl}
                      alt="Captured Card"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Captured
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleScanSnapshotText}
                      disabled={isScanningText}
                      className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary-500/20 bg-primary-500/10 cursor-pointer disabled:opacity-50"
                    >
                      {isScanningText ? (
                        <div className="w-3 h-3 border-2 border-primary-500/40 border-t-primary-500 rounded-full animate-spin" />
                      ) : (
                        <ScanText className="w-3.5 h-3.5" />
                      )}
                      <span>{isScanningText ? "Scanning Text…" : "Scan Text from Image"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                </div>
              ) : captureMode === "camera" ? (
                /* Live Webcam Viewfinder */
                <div className="space-y-3">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-[var(--border-subtle)] flex items-center justify-center">
                    {cameraError ? (
                      <div className="p-4 text-center">
                        <Camera className="w-8 h-8 text-rose-400 mx-auto mb-2 opacity-80" />
                        <p className="text-xs text-rose-400 font-semibold">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCameraError(null);
                            setCaptureMode("upload");
                          }}
                          className="mt-2 text-[11px] underline text-primary-400"
                        >
                          Switch to file upload instead
                        </button>
                      </div>
                    ) : (
                      <>
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          videoConstraints={{
                            facingMode: facingMode,
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                          }}
                          onUserMedia={() => {
                            setCameraReady(true);
                            setCameraError(null);
                          }}
                          onUserMediaError={(err) => {
                            const errorMsg = typeof err === "string" ? err : err.message;
                            setCameraError(`Camera access: ${errorMsg || "Permission denied or unavailable"}`);
                          }}
                          className="w-full h-full object-cover"
                        />

                        {/* Viewfinder Overlay Frame */}
                        <div className="absolute inset-3 border-2 border-white/30 border-dashed rounded-xl pointer-events-none flex items-center justify-center">
                          <span className="text-[10px] text-white/70 font-semibold bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                            Align Card or Document
                          </span>
                        </div>

                        {/* Switch Front/Rear Camera Button */}
                        <button
                          type="button"
                          onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                          title="Switch Camera (Front/Back)"
                        >
                          <FlipHorizontal className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Buttons: Snap Photo & Snap + Scan Text */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      disabled={!cameraReady && !cameraError}
                      className="py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5 text-primary-500" />
                      <span>Snap Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleScanSnapshotText}
                      disabled={!cameraReady && !cameraError || isScanningText}
                      className="py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-primary-600/20 disabled:opacity-50"
                    >
                      {isScanningText ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ScanText className="w-3.5 h-3.5" />
                      )}
                      <span>{isScanningText ? "Scanning…" : "Scan Text Live"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* File Picker Mode */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-subtle)] hover:border-primary-500/40 hover:bg-[var(--bg-secondary)] rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Click to select card image
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    PNG, JPG, WEBP accepted
                  </span>
                </div>
              )}

              {/* Title / Label Input */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Card Title / Label
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Health ID, Dr. Sharma Contact, Gym Membership..."
                  className="mac-input text-xs"
                />
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Category
                </label>
                <select
                  value={cardCategory}
                  onChange={(e) => setCardCategory(e.target.value)}
                  className="mac-input text-xs cursor-pointer"
                >
                  <option value="General">General</option>
                  <option value="Identity">Identity</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Property">Property</option>
                  <option value="Education">Education</option>
                  <option value="Medical">Medical</option>
                </select>
              </div>

              {/* Text Information / Scanned Text (Simple Text Storage) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary-500" />
                    <span>Card Text Information</span>
                  </label>
                  {textContent && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {textContent.length} chars
                    </span>
                  )}
                </div>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={4}
                  placeholder="Fill manually or click 'Scan Text' to extract from camera snapshot..."
                  className="mac-input text-xs font-mono leading-relaxed resize-y custom-scrollbar"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={uploading || (!selectedFile && !textContent.trim() && !caption.trim())}
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary-600/20 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Save Quick Doc Card</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Card Stash Grid */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-500" />
              <span>Saved Cards ({cards.length})</span>
            </h3>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Instant access • 1-click promotion
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="mac-card p-4 animate-pulse">
                  <div className="w-full aspect-video bg-[var(--border-subtle)] rounded-xl mb-3" />
                  <div className="w-32 h-3.5 bg-[var(--border-subtle)] rounded" />
                </div>
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="mac-card p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 mb-3">
                <CreditCard className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Stash is empty
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs mt-1">
                Point your camera above to snapshot visiting cards, ID badges, or receipts into quick stash.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.map((c) => {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                const baseImg = c.image_url
                  ? c.image_url.startsWith("http")
                    ? c.image_url
                    : `${BASE_URL}${c.image_url}`
                  : null;
                const imgSource = baseImg && token ? `${baseImg}${baseImg.includes("?") ? "&" : "?"}token=${token}` : baseImg;

                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mac-card overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative aspect-video bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                      {imgSource ? (
                        <img
                          src={imgSource}
                          alt={c.caption || "Card snapshot"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-primary-500/10 via-teal-500/5 to-transparent">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-500 text-[10px] font-bold uppercase">
                              {c.category || "Text Card"}
                            </span>
                            <FileText className="w-4 h-4 text-primary-500/60" />
                          </div>
                          <p className="text-[11px] font-mono text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                            {c.text_content || "No text content"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">
                            {c.caption || "Quick Snapshot"}
                          </h4>
                          {c.text_content && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(c.id, c.text_content || "")}
                              className="text-[var(--text-tertiary)] hover:text-primary-500 p-0.5 transition-colors cursor-pointer"
                              title="Copy text"
                            >
                              {copiedId === c.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {c.created_at?.slice(0, 10)}
                          </span>
                          {c.category && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] font-medium">
                              {c.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display text content preview below image if card has both image and text */}
                      {imgSource && c.text_content && (
                        <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                          <p className="text-[11px] font-mono text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {c.text_content}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                        <button
                          onClick={() => handlePromote(c.id)}
                          disabled={actionId === c.id}
                          className="btn-primary flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Promote to Vault</span>
                        </button>

                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={actionId === c.id}
                          className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

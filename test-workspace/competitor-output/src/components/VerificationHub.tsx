import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, ShieldAlert, Sparkles, RefreshCw, Smartphone, KeyRound, ExternalLink } from "lucide-react";

interface VerificationHubProps {
  onBackToStore?: () => void;
}

export default function VerificationHub({ onBackToStore }: VerificationHubProps) {
  const [selectedBrand, setSelectedBrand] = useState("on");
  const [scratched, setScratched] = useState(false);
  const [revealedCode, setRevealedCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<"idle" | "verifying" | "success" | "fail">("idle");
  const [verificationDetails, setVerificationDetails] = useState<any>(null);

  const brandDetails: { [key: string]: any } = {
    on: {
      name: "Optimum Nutrition",
      importer: "Glanbia Performance Nutrition / Bright Commodities",
      placeholderCode: "ON-9428-GB",
      instruction: "Look for the Glanbia importer sticker with a scratch layer. Scratch it to reveal a 6-digit PIN.",
      smsFormat: "SMS 'ON <PIN>' to 57575",
    },
    muscleblaze: {
      name: "MuscleBlaze",
      importer: "Manufactured directly by Bright Lifecare Pvt Ltd",
      placeholderCode: "MB-8319-BL",
      instruction: "Find the 3D Hologram sticker with scratch field on the tub seal. Enter the unique 13-digit code.",
      smsFormat: "SMS 'MB <CODE>' to 55454",
    },
    kapiva: {
      name: "Kapiva",
      importer: "Adret Retail Pvt Ltd (Kapiva)",
      placeholderCode: "KAP-GOLD-21",
      instruction: "Locate the NABL Lab QR Code on the neck tag or near the batch number. Scratch to reveal the batch authenticity ID.",
      smsFormat: "Verify directly online at report.kapiva.in",
    },
    asitis: {
      name: "Asitis Nutrition",
      importer: "Medisys Biotech Pvt Ltd",
      placeholderCode: "AS-38192-M",
      instruction: "Scratch the logo on the front pouch center to reveal the unique QR and verification PIN.",
      smsFormat: "Scan via AS-IT-IS App",
    }
  };

  const handleSelectBrand = (brandKey: string) => {
    setSelectedBrand(brandKey);
    setScratched(false);
    setInputCode("");
    setVerificationResult("idle");
    setVerificationDetails(null);
  };

  const handleScratch = () => {
    if (!scratched) {
      setScratched(true);
      const code = brandDetails[selectedBrand]?.placeholderCode || "GEN-4829-OK";
      setRevealedCode(code);
      setInputCode(code); // Pre-fill for instant satisfaction, but allow user editing
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setVerificationResult("verifying");

    setTimeout(() => {
      const match = inputCode.trim().toUpperCase();
      const currentBrand = brandDetails[selectedBrand];

      if (match.length >= 5) {
        setVerificationResult("success");
        setVerificationDetails({
          brand: currentBrand.name,
          code: match,
          importer: currentBrand.importer,
          batchNo: `BAT-${Math.floor(Math.random() * 90000) + 10000}-IND`,
          mfgDate: "March 2026",
          expiryDate: "Feb 2028",
          labStatus: "100% Passed (Heavy metals, Salmonella, E. Coli and active protein content verified by NABL certified lab).",
          originalImporterSticker: "Bright Performance Nutrition (Official Representative Seal Active)"
        });
      } else {
        setVerificationResult("fail");
      }
    }, 1500);
  };

  return (
    <div id="verification-hub" className="max-w-4xl mx-auto px-4 py-8">
      {/* Intro Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-800 rounded-full border border-amber-500/20 text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck size={14} className="text-amber-600" />
          <span>Indian Consumer Protection</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-display font-bold text-neutral-900 tracking-tight leading-tight">
          Authenticity Scratch & Verify Hub
        </h1>
        <p className="text-sm text-neutral-500 mt-2">
          Up to 30% of dietary supplements in the Indian market are estimated to be counterfeit. Verify your purchased product batch directly with official importers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Brand Selector and Instructions (Cols 5) */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs">
            <h3 className="font-display font-bold text-neutral-800 text-sm uppercase tracking-wider mb-3">
              1. Select Brand to Verify
            </h3>
            <div className="space-y-2">
              {Object.keys(brandDetails).map((key) => (
                <button
                  key={key}
                  onClick={() => handleSelectBrand(key)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedBrand === key
                      ? "bg-amber-600/5 border-amber-600 text-neutral-900 font-semibold"
                      : "bg-white border-neutral-100 hover:bg-neutral-50 text-neutral-600"
                  }`}
                >
                  <span className="text-sm font-medium">{brandDetails[key].name}</span>
                  <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-md font-semibold">
                    {key === "on" || key === "asitis" ? "Scratch Label" : "3D QR"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Visual scratch Instructions card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-3">
            <h3 className="font-display font-bold text-neutral-800 text-sm uppercase tracking-wider">
              Verification Protocol
            </h3>
            <div className="space-y-3 text-xs text-neutral-600">
              <p className="leading-relaxed">
                <strong className="text-neutral-800 font-semibold">Where is my code?</strong><br />
                {brandDetails[selectedBrand]?.instruction}
              </p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="font-bold text-neutral-800 text-[10px] block uppercase tracking-wider mb-1">
                  Alternative Offline SMS Check:
                </span>
                <span className="text-amber-800 font-mono font-medium block">
                  {brandDetails[selectedBrand]?.smsFormat}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scratch Panel & Results (Cols 7) */}
        <div className="md:col-span-7 space-y-6">
          {/* Virtual Scratch Card Card */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display font-bold text-neutral-800 text-base leading-tight">
                  Simulated Scratch Card
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Try scratching the sticker below to reveal the test pin
                </p>
              </div>
              <Sparkles className="text-amber-500 animate-pulse" size={20} />
            </div>

            {/* The Scratch Container Area */}
            <div className="h-32 bg-neutral-100 border-2 border-dashed border-neutral-200 rounded-2xl flex items-center justify-center relative overflow-hidden select-none">
              <AnimatePresence mode="wait">
                {!scratched ? (
                  <motion.div
                    key="scratch-layer"
                    onClick={handleScratch}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="absolute inset-2 bg-gradient-to-br from-neutral-400 to-neutral-600 rounded-xl flex flex-col items-center justify-center text-white cursor-pointer shadow-md select-none z-10"
                  >
                    <KeyRound size={28} className="text-neutral-200 mb-1" />
                    <span className="text-xs font-bold uppercase tracking-widest font-display">
                      Scratch Here to Reveal
                    </span>
                    <span className="text-[9px] text-neutral-300 font-medium">
                      (Click / Tap)
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reveal-layer"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center space-y-1.5"
                  >
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      Authenticity Pin Revealed
                    </span>
                    <span className="text-2xl font-mono font-bold tracking-widest text-amber-600 bg-amber-50 px-4 py-1.5 rounded-xl border border-amber-200">
                      {revealedCode}
                    </span>
                    <button
                      onClick={() => setScratched(false)}
                      className="text-[10px] text-neutral-500 hover:text-neutral-800 font-semibold flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <RefreshCw size={10} /> Reset Sticker
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Submission Form */}
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Enter Scratch PIN / Batch Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Enter unique scratch code"
                    className="flex-grow px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={verificationResult === "verifying"}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-300 text-white font-medium text-xs px-6 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm uppercase tracking-wider font-display"
                  >
                    {verificationResult === "verifying" ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Results Verification Output Panel */}
          <AnimatePresence mode="wait">
            {verificationResult === "success" && verificationDetails && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-emerald-900 text-base">
                      100% Authentic Product Verified!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      The code <strong className="font-mono">{verificationDetails.code}</strong> is authentic and active in the importer databank.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-emerald-200/50 text-xs">
                  <div>
                    <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">
                      Product Brand
                    </span>
                    <span className="font-semibold text-neutral-800">{verificationDetails.brand}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">
                      Licensed Importer
                    </span>
                    <span className="font-semibold text-neutral-800">{verificationDetails.importer}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">
                      Batch Registered
                    </span>
                    <span className="font-semibold text-neutral-800 font-mono">{verificationDetails.batchNo}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">
                      Expiry Date
                    </span>
                    <span className="font-semibold text-neutral-800">{verificationDetails.expiryDate}</span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">
                      NABL Laboratory Analysis Status
                    </span>
                    <span className="font-semibold text-emerald-800">{verificationDetails.labStatus}</span>
                  </div>
                </div>

                <div className="p-3 bg-white/60 rounded-xl text-[11px] text-emerald-800 leading-relaxed border border-emerald-100 flex items-start gap-1.5">
                  <Smartphone size={14} className="shrink-0 mt-0.5" />
                  <span>
                    A verification SMS has also been logged. This batch is authorized for trade within India. Do not accept if seal is broken.
                  </span>
                </div>
              </motion.div>
            )}

            {verificationResult === "fail" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-sm space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                    <ShieldAlert size={28} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-rose-900 text-base">
                      Verification Failed!
                    </h3>
                    <p className="text-xs text-rose-700">
                      The code entered is invalid or has already been used multiple times.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  If you bought this product from our store, please crosscheck spelling. For outside products, this indicates a high risk of a counterfeit duplicate or parallel black-market import with invalid custom duties.
                </p>
                <div className="pt-2">
                  <a
                    href="mailto:authenticity@nutriindia.com"
                    className="inline-flex items-center gap-1 text-xs text-rose-700 font-bold hover:underline"
                  >
                    Report counterfeit product batch <ExternalLink size={12} />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {onBackToStore && (
        <div className="text-center mt-12">
          <button
            onClick={onBackToStore}
            className="border border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:border-neutral-900 px-6 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer uppercase tracking-wider"
          >
            ← Return to Store Catalogue
          </button>
        </div>
      )}
    </div>
  );
}

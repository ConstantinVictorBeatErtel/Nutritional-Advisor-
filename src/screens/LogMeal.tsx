import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Image as ImageIcon, Flashlight, Mic, Bolt, CheckCircle, LoaderCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeMealPhoto, type VisionAnalysisResult } from '../lib/vision';
import type { LoggedMeal } from '../lib/meal-log';

interface LogMealProps {
  onComplete: () => void;
  onMealLogged: (meal: LoggedMeal) => void;
}

const PREVIEW_PLACEHOLDER = 'https://picsum.photos/seed/meal/800/600';

function clampPercent(value: number | undefined, maxValue: number) {
  if (!Number.isFinite(value) || maxValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(((value ?? 0) / maxValue) * 100)));
}

function formatMacro(value?: number) {
  return Number.isFinite(value) ? `${value!.toFixed(1)}g` : '--';
}

function buildLoggedMeal(analysis: VisionAnalysisResult, ingredientsText: string, portionText: string): LoggedMeal {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    title: analysis.meal_name || 'Logged meal',
    mealType: analysis.meal_type || 'Meal',
    createdAt: new Date().toISOString(),
    ingredientsText,
    portionText,
    calories: analysis.calories || 0,
    protein_g: analysis.protein_g || 0,
    carbs_g: analysis.carbs_g || 0,
    fat_g: analysis.fat_g || 0,
    confidence: analysis.confidence || 0.5,
  };
}

export default function LogMeal({ onComplete, onMealLogged }: LogMealProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(PREVIEW_PLACEHOLDER);
  const [ingredientsText, setIngredientsText] = useState('');
  const [portionText, setPortionText] = useState('');
  const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFlashEnabled, setIsFlashEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setSelectedImage(file);
    setPreviewUrl(objectUrl);
    setAnalysis(null);
    setErrorMessage(null);
    event.target.value = '';
  };

  const handleGenerateInterpretation = async () => {
    if (!selectedImage) {
      setErrorMessage('Select or capture a meal photo before running the model.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      const result = await analyzeMealPhoto({
        image: selectedImage,
        ingredientsText,
        portionText,
      });
      setAnalysis(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown model error.';
      setErrorMessage(`Meal analysis failed. Details: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmMeal = () => {
    if (!analysis) {
      return;
    }

    onMealLogged(buildLoggedMeal(analysis, ingredientsText, portionText));
    onComplete();
  };

  const predictedPortionLabel = analysis?.predicted_portion_g != null
    ? `${analysis.predicted_portion_g.toFixed(1)} g estimated portion`
    : 'Portion estimate unavailable';
  const scanningLabel = isAnalyzing
    ? 'Model Scanning...'
    : selectedImage
      ? 'Ready to Analyze'
      : 'Awaiting Photo';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-12 max-w-6xl mx-auto w-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-8">
          <div className="relative group">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-zinc-900 mb-4 leading-none">
              Capture the
              <br />
              <span className="text-primary italic">Moment.</span>
            </h2>

            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-zinc-100 shadow-2xl relative border-4 border-white">
              <img
                src={previewUrl}
                alt={selectedImage ? selectedImage.name : 'Meal preview'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelection} />
              <input
                ref={captureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelection}
              />

              <div className="absolute inset-0 border-[20px] border-black/5 flex flex-col justify-between p-8">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 border-t-2 border-l-2 border-white/80 rounded-tl-2xl" />
                  <div className="w-12 h-12 border-t-2 border-r-2 border-white/80 rounded-tr-2xl" />
                </div>

                <div className="flex justify-center">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-black/20 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 border border-white/20"
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]',
                        isAnalyzing ? 'bg-red-500' : 'bg-emerald-400',
                      )}
                    />
                    <span className="text-white text-xs font-bold tracking-widest uppercase">{scanningLabel}</span>
                  </motion.div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-12 h-12 border-b-2 border-l-2 border-white/80 rounded-bl-2xl" />
                  <div className="w-12 h-12 border-b-2 border-r-2 border-white/80 rounded-br-2xl" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 mt-10">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-14 h-14 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-zinc-50 transition-colors shadow-sm active:scale-90 border border-zinc-100"
                aria-label="Upload meal image"
              >
                <ImageIcon className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => captureInputRef.current?.click()}
                className="w-20 h-20 rounded-full editorial-gradient p-1 shadow-xl shadow-emerald-900/20 active:scale-95 transition-transform"
                aria-label="Take meal photo"
              >
                <div className="w-full h-full rounded-full border-4 border-white/40 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white fill-white/20" />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsFlashEnabled((value) => !value)}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-sm active:scale-90 border',
                  isFlashEnabled ? 'bg-primary text-white border-primary' : 'bg-white text-zinc-900 border-zinc-100 hover:bg-zinc-50',
                )}
                aria-pressed={isFlashEnabled}
                aria-label="Toggle flash indicator"
              >
                <Flashlight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-100">
            <div className="grid gap-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Ingredients</label>
                <div className="relative">
                  <textarea
                    value={ingredientsText}
                    onChange={(event) => setIngredientsText(event.target.value)}
                    className="w-full bg-white border-none rounded-2xl p-6 text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-none transition-all shadow-sm"
                    placeholder="Rice, salmon, avocado, cucumber..."
                  />
                  <div className="absolute bottom-4 right-4 text-primary p-2 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer">
                    <Mic className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Portion / Serving</label>
                <textarea
                  value={portionText}
                  onChange={(event) => setPortionText(event.target.value)}
                  className="w-full bg-white border-none rounded-2xl p-6 text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-primary/20 min-h-[96px] resize-none transition-all shadow-sm"
                  placeholder="1 bowl, 240g, 2 slices..."
                />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="flex items-start gap-3 rounded-[1.5rem] border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <textarea readOnly value={errorMessage} className="min-h-0 w-full resize-none bg-transparent p-0 text-sm leading-relaxed outline-none" />
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGenerateInterpretation}
            disabled={!selectedImage || isAnalyzing}
            className={cn(
              'w-full editorial-gradient text-white py-6 rounded-[2rem] font-headline font-bold text-xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3',
              !selectedImage || isAnalyzing ? 'cursor-not-allowed opacity-70' : 'hover:opacity-90 active:scale-[0.98]',
            )}
          >
            {isAnalyzing ? (
              <>
                Analyzing Meal
                <LoaderCircle className="w-6 h-6 animate-spin" />
              </>
            ) : (
              <>
                Generate Interpretation
                <Bolt className="w-6 h-6 fill-white" />
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-emerald-900/5 border border-zinc-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Bolt className="w-6 h-6 fill-orange-600/10" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-2xl text-zinc-900">AI Interpretation</h3>
                <p className="text-sm text-zinc-400 font-medium">{predictedPortionLabel}</p>
              </div>
            </div>

            <div className="mb-6 rounded-3xl border border-zinc-100 bg-zinc-50 px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Meal Name</p>
              <p className="mt-2 text-xl font-bold text-zinc-900">{analysis?.meal_name || 'Waiting for analysis'}</p>
              <p className="mt-1 text-sm text-zinc-500">{analysis?.meal_type || 'Meal type pending'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="col-span-2 bg-emerald-50 rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-emerald-100">
                <span className="text-6xl font-extrabold text-primary tracking-tighter">
                  {Number.isFinite(analysis?.calories) ? Math.round(analysis!.calories!).toString() : '--'}
                </span>
                <span className="text-xs font-bold text-primary/60 uppercase tracking-widest mt-2">Total Calories</span>
              </div>

              {[
                {
                  label: 'Protein',
                  val: formatMacro(analysis?.protein_g),
                  color: 'text-secondary',
                  bg: 'bg-blue-50',
                  bar: 'bg-secondary',
                  w: `${clampPercent(analysis?.protein_g, 45)}%`,
                },
                {
                  label: 'Carbs',
                  val: formatMacro(analysis?.carbs_g),
                  color: 'text-orange-600',
                  bg: 'bg-orange-50',
                  bar: 'bg-orange-500',
                  w: `${clampPercent(analysis?.carbs_g, 100)}%`,
                },
                {
                  label: 'Fats',
                  val: formatMacro(analysis?.fat_g),
                  color: 'text-zinc-600',
                  bg: 'bg-zinc-50',
                  bar: 'bg-zinc-400',
                  w: `${clampPercent(analysis?.fat_g, 40)}%`,
                },
              ].map((macro) => (
                <div key={macro.label} className={cn('rounded-2xl p-5 flex flex-col', macro.bg)}>
                  <span className={cn('font-bold text-xl', macro.color)}>{macro.val}</span>
                  <span className={cn('text-xs font-medium opacity-60', macro.color)}>{macro.label}</span>
                  <div className="w-full bg-black/5 h-1.5 rounded-full mt-4">
                    <motion.div initial={{ width: 0 }} animate={{ width: macro.w }} className={cn('h-full rounded-full', macro.bar)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-zinc-50 border border-zinc-100 px-5 py-4 text-sm text-zinc-600 mb-8">
              {analysis?.prompt_text || 'Add a photo and optional ingredients so the model has enough context to estimate nutrition.'}
            </div>

            <button
              type="button"
              onClick={handleConfirmMeal}
              disabled={!analysis}
              className={cn(
                'w-full editorial-gradient text-white py-6 rounded-[2rem] font-headline font-bold text-xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3',
                analysis ? 'hover:opacity-90 active:scale-[0.98]' : 'cursor-not-allowed opacity-70',
              )}
            >
              Confirm and Log Meal
              <CheckCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

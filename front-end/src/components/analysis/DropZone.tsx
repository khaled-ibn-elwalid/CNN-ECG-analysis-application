import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { FileUp, FileCheck, AlertCircle, X, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface FileState {
  dat: File | null;
  hea: File | null;
}

interface DropZoneProps {
  onSubmit: (datFile: File, heaFile: File) => void;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const getStem = (filename: string): string =>
  filename.substring(0, filename.lastIndexOf('.'));

// ─── Component ────────────────────────────────────────────
export default function DropZone({ onSubmit, isLoading = false }: DropZoneProps) {
  const [files, setFiles] = useState<FileState>({ dat: null, hea: null });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Core Validation & Processing ────────────────────────
  const processFiles = (incoming: File[]) => {
    setError(null);

    // Reject non .dat / .hea files
    const hasInvalid = incoming.some(
      f => !f.name.endsWith('.dat') && !f.name.endsWith('.hea')
    );
    if (hasInvalid) {
      setError('Invalid format. Please upload strictly .dat and .hea files.');
      return;
    }

    const incomingDat = incoming.find(f => f.name.endsWith('.dat'));
    const incomingHea = incoming.find(f => f.name.endsWith('.hea'));

    // Merge with existing state so dropping one file keeps the other
    const targetDat = incomingDat ?? files.dat;
    const targetHea = incomingHea ?? files.hea;

    // Stem validation — only when both are present
    if (targetDat && targetHea) {
      if (getStem(targetDat.name) !== getStem(targetHea.name)) {
        setError(
          `File names must match (e.g. 100.dat and 100.hea). Got "${targetDat.name}" and "${targetHea.name}".`
        );
        return;
      }
    }

    setFiles({ dat: targetDat, hea: targetHea });
  };

  // ── Drag Handlers ────────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Flicker fix: only reset if cursor truly left the dropzone
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // ── Input Handler ────────────────────────────────────────
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(Array.from(e.target.files));
    }
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Remove ───────────────────────────────────────────────
  const removeFile = (type: 'dat' | 'hea') => {
    setFiles(prev => ({ ...prev, [type]: null }));
    setError(null);
  };

  const clearAll = () => {
    setFiles({ dat: null, hea: null });
    setError(null);
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = () => {
    
    if (files.dat && files.hea) onSubmit(files.dat, files.hea);
  };

  // ── Derived States ───────────────────────────────────────
  const isComplete = !!(files.dat && files.hea && !error);
  const hasAnyFile = !!(files.dat || files.hea);

  // ── Dynamic Container Style ──────────────────────────────
  const containerStyle = error
    ? 'border-red-400 bg-red-50/30'
    : isDragging
    ? 'border-blue-600 bg-blue-50/50 border-solid'
    : isComplete
    ? 'border-blue-400 bg-blue-50/10'
    : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/20';

  return (
    <div className="mx-auto w-full max-w-2xl">

      {/* Hidden file input */}
      <input
        type="file"
        multiple
        accept=".dat,.hea"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-10
          text-center transition-all duration-200 ease-in-out
          ${containerStyle}
        `}
      >
        <div className="flex flex-col items-center justify-center space-y-4">

          {/* Dynamic icon */}
          {error ? (
            <AlertCircle className="h-12 w-12 text-red-500" />
          ) : isComplete ? (
            <FileCheck className="h-12 w-12 text-blue-600" />
          ) : (
            <FileUp className={`h-12 w-12 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
          )}

          {/* Dynamic text */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isDragging ? 'Drop files to begin' : 'Upload ECG Record'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {error ? (
                <span className="font-medium text-red-500">{error}</span>
              ) : (
                'Drag and drop your .dat and .hea files here, or click to browse'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* File rows — outside drop area to avoid click-through on X button */}
      {hasAnyFile && (
        <div className="mt-4 space-y-3">
          <FileRow
            file={files.dat}
            missingText="Waiting for matching .dat file..."
            onRemove={() => removeFile('dat')}
          />
          <FileRow
            file={files.hea}
            missingText="Waiting for matching .hea file..."
            onRemove={() => removeFile('hea')}
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Accepted: <span className="font-mono">.dat</span> and{' '}
          <span className="font-mono">.hea</span> pairs only
        </p>
        <div className="flex items-center gap-3">
          {hasAnyFile && !isLoading && (
            <button
              onClick={clearAll}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear
            </button>
          )}
         <button
  type="button"
  disabled={!isComplete || isLoading}
  onClick={(e) => {
    e.stopPropagation();
    handleSubmit();
  }}
  className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white
    shadow-sm transition-colors hover:bg-blue-700
    disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
>
  {isLoading ? 'Analysing...' : 'Run Analysis'}
</button>
        </div>
      </div>
    </div>
  );
}

// ─── FileRow Subcomponent ─────────────────────────────────
function FileRow({
  file,
  missingText,
  onRemove,
}: {
  file: File | null;
  missingText: string;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 ${
        file
          ? 'border-gray-200 bg-white'
          : 'border-dashed border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-3">
        {file ? (
          <FileCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
        ) : (
          <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
        )}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              file ? 'text-slate-900' : 'text-slate-500 italic'
            }`}
          >
            {file ? file.name : missingText}
          </span>
          {file && (
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          )}
        </div>
      </div>

      {file && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
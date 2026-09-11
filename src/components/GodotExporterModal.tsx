import React, { useState } from 'react';
import { X, Code2, Copy, Check, FileCode, FolderTree, Download, Loader2, Sparkles, FolderArchive } from 'lucide-react';
import JSZip from 'jszip';
import { GODOT_PROJECT_FILES, GodotFile } from '../godot/godotFiles';

interface GodotExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GodotExporterModal: React.FC<GodotExporterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<GodotFile>(GODOT_PROJECT_FILES[2]); // SumoFruit.gd by default
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipComplete, setZipComplete] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const f of GODOT_PROJECT_FILES) {
        zip.file(f.path, f.content);
      }
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sumo_fruits_godot_project.zip';
      link.click();
      URL.revokeObjectURL(url);
      setZipComplete(true);
      setTimeout(() => setZipComplete(false), 3000);
    } catch (err) {
      console.error('Failed to generate ZIP bundle:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div
      id="godot-exporter-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="godot-exporter-modal"
        className="relative w-full max-w-5xl h-[88vh] bg-[#14120E] border border-[#3E342B] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#EDE2D4]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3E342B] bg-[#1F1914]">
          <div className="flex items-center gap-2.5">
            <Code2 className="text-[#3498DB]" size={24} />
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Godot 4 Engine Source Code & Architecture
                <span className="text-xs font-bold px-2 py-0.5 bg-[#2B4C7E] text-white rounded-full">
                  GDScript 2.0
                </span>
              </h2>
              <p className="text-xs text-[#A89886]">
                Ready-to-import Godot 4.3 project archive with physics, scenes, and shaders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="godot-download-zip-btn"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow transition-all active:scale-95 cursor-pointer ${
                zipComplete
                  ? 'bg-[#27AE60] text-white'
                  : 'bg-[#E67E22] hover:bg-[#F39C12] text-white'
              }`}
            >
              {isZipping ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Packaging .ZIP...</span>
                </>
              ) : zipComplete ? (
                <>
                  <Check size={14} />
                  <span>Downloaded ZIP!</span>
                </>
              ) : (
                <>
                  <FolderArchive size={14} />
                  <span>Download .zip Project</span>
                </>
              )}
            </button>
            <button
              id="godot-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A89886] hover:text-white hover:bg-[#3E342B] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body: Sidebar File Explorer + Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#3E342B] bg-[#181410] p-3 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#A89886] px-2 py-1 mb-1">
              <span className="flex items-center gap-1.5">
                <FolderTree size={14} />
                <span>Project Files</span>
              </span>
              <span className="text-[10px] bg-[#2C241C] text-[#C9B9A6] px-1.5 py-0.5 rounded">
                {GODOT_PROJECT_FILES.length} files
              </span>
            </div>

            <div className="space-y-1">
              {GODOT_PROJECT_FILES.map((file) => {
                const isSelected = selectedFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2B4C7E] text-white font-bold shadow-sm'
                        : 'text-[#C9B9A6] hover:bg-[#251F19] hover:text-white'
                    }`}
                  >
                    <FileCode size={14} className={isSelected ? 'text-white' : 'text-[#3498DB]'} />
                    <span className="truncate">{file.path}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0E0C09]">
            {/* File Path & Copy Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1A1612] border-b border-[#2C241C]">
              <div>
                <span className="text-xs font-mono text-[#3498DB] font-bold">
                  res://{selectedFile.path}
                </span>
                <p className="text-[11px] text-[#A89886] mt-0.5">
                  {selectedFile.description}
                </p>
              </div>

              <button
                id="godot-copy-code-btn"
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-[#251F19] hover:bg-[#342A22] text-[#EDE2D4] border border-[#3E342B] px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow"
              >
                {copied ? <Check size={14} className="text-[#2ECC71]" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-[#EDE2D4] leading-relaxed select-text bg-[#0E0C09]">
              <pre className="whitespace-pre">{selectedFile.content}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#3E342B] bg-[#1F1914] text-xs text-[#A89886] flex flex-col sm:flex-row justify-between items-center gap-1">
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#F1C40F]" />
            Target Engine: Godot 4.3+ Stable (Extract ZIP & Import project.godot)
          </span>
          <span className="text-[#3498DB] font-bold">120 Hz Physics Substepping Ready</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Song } from '../types/dizi';
import { X, Printer, Download, Copy, Check, FileCode, Sparkles } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  song
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Format Jianpu text score
  const generateJianpuText = () => {
    let text = `【${song.titleZh} (${song.titleEn})】\n`;
    text += `1 = ${song.musicalKey.replace('1 = ', '')}  ${song.timeSignature}  ♩=${song.bpm}\n`;
    text += `曲谱来源: JOE Dizi Studio (笛子专版)\n\n`;

    let line = '';
    song.notes.forEach((n, i) => {
      const dot = n.octaveDot > 0 ? '^' : n.octaveDot < 0 ? '.' : '';
      line += `${n.jianpu}${dot}${n.isDotted ? '·' : ''} `;
      if ((i + 1) % 4 === 0) {
        line += '| ';
      }
      if ((i + 1) % 16 === 0) {
        text += line + '\n';
        line = '';
      }
    });
    if (line) text += line + '||\n';
    return text;
  };

  const handleCopyJianpu = () => {
    navigator.clipboard.writeText(generateJianpuText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(song, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${song.titleEn.toLowerCase().replace(/\s+/g, '_')}_dizi_score.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#111D20] border border-[#1A2E33] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1A2E33]">
          <div>
            <h3 className="text-base font-serif font-bold text-[#F3F5F4]">
              Export Dizi Sheet Music (导出笛谱)
            </h3>
            <p className="text-xs text-[#94A3A7] mt-0.5">
              {song.titleEn} · {song.titleZh}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3A7] hover:text-[#F3F5F4] hover:bg-[#16272C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handlePrint}
              className="p-4 rounded-xl bg-[#0E171A] border border-[#1A2E33] hover:border-[#36B39B] flex flex-col items-center text-center transition-all group"
            >
              <Printer className="w-6 h-6 text-[#B4F45A] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-[#F3F5F4]">Print / PDF</span>
              <span className="text-[10px] text-[#94A3A7] mt-0.5">Printable Xuan Paper</span>
            </button>

            <button
              onClick={handleCopyJianpu}
              className="p-4 rounded-xl bg-[#0E171A] border border-[#1A2E33] hover:border-[#36B39B] flex flex-col items-center text-center transition-all group"
            >
              {copied ? (
                <Check className="w-6 h-6 text-[#36B39B] mb-2" />
              ) : (
                <Copy className="w-6 h-6 text-[#36B39B] mb-2 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs font-semibold text-[#F3F5F4]">
                {copied ? 'Copied!' : 'Copy Text'}
              </span>
              <span className="text-[10px] text-[#94A3A7] mt-0.5">Jianpu (简谱文本)</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="p-4 rounded-xl bg-[#0E171A] border border-[#1A2E33] hover:border-[#36B39B] flex flex-col items-center text-center transition-all group"
            >
              <FileCode className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-[#F3F5F4]">Download JSON</span>
              <span className="text-[10px] text-[#94A3A7] mt-0.5">Full Studio Score</span>
            </button>
          </div>

          {/* Preview Text Box */}
          <div className="mt-4">
            <div className="text-[11px] font-mono text-[#94A3A7] mb-1.5 flex items-center justify-between">
              <span>Text Jianpu Preview (简谱文本预览):</span>
            </div>
            <textarea
              readOnly
              rows={6}
              value={generateJianpuText()}
              className="w-full bg-[#0E171A] border border-[#1A2E33] rounded-lg p-3 text-xs font-mono text-[#B4C4C0] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E171A] border-t border-[#1A2E33] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#16272C] text-xs font-medium text-[#F3F5F4] hover:bg-[#1F3D3D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

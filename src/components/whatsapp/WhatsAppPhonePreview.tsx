import React, { useState } from 'react';
import { SchoolSettings, Student, WhatsAppTargetItem } from '../../types';
import {
  Smartphone,
  Send,
  Copy,
  CheckCheck,
  Users,
  User,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Smile,
  Paperclip,
  Camera,
  Mic,
  Lock,
  Sparkles,
  Wifi,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface WhatsAppPhonePreviewProps {
  messageText: string;
  previewMode: 'group' | 'personal';
  onPreviewModeChange: (mode: 'group' | 'personal') => void;
  students: Student[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  schoolSettings: SchoolSettings;
  targetList: WhatsAppTargetItem[];
  onSendTestMessage?: (target: string, targetName: string, type: 'group' | 'personal') => Promise<{ success: boolean; message: string }>;
  isSendingTest?: boolean;
}

/**
 * Parses basic WhatsApp formatting (*bold*, _italic_, ~strike~, ```code```)
 */
function renderWhatsAppFormattedText(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // Monospace blocks
    let formattedParts: React.ReactNode[] = [];
    
    // Parse formatting tokens
    // Replace *bold*, _italic_, ~strike~
    const tokens = line.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```)/g);

    formattedParts = tokens.map((token, tokIdx) => {
      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return (
          <strong key={tokIdx} className="font-bold text-slate-950">
            {token.slice(1, -1)}
          </strong>
        );
      }
      if (token.startsWith('_') && token.endsWith('_') && token.length > 2) {
        return (
          <em key={tokIdx} className="italic text-slate-800">
            {token.slice(1, -1)}
          </em>
        );
      }
      if (token.startsWith('~') && token.endsWith('~') && token.length > 2) {
        return (
          <span key={tokIdx} className="line-through text-slate-500">
            {token.slice(1, -1)}
          </span>
        );
      }
      if (token.startsWith('```') && token.endsWith('```') && token.length > 6) {
        return (
          <code key={tokIdx} className="font-mono text-[11px] bg-emerald-100/60 px-1 py-0.5 rounded text-emerald-900">
            {token.slice(3, -3)}
          </code>
        );
      }
      return token;
    });

    return (
      <React.Fragment key={lineIdx}>
        {formattedParts}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export const WhatsAppPhonePreview: React.FC<WhatsAppPhonePreviewProps> = ({
  messageText,
  previewMode,
  onPreviewModeChange,
  students,
  selectedStudentId,
  onSelectStudentId,
  schoolSettings,
  targetList,
  onSendTestMessage,
  isSendingTest = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [customTestTarget, setCustomTestTarget] = useState<string>(() => {
    return targetList[0]?.target || schoolSettings.whatsappTestTarget || '';
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSendTest = async () => {
    if (!onSendTestMessage) return;
    const targetTrimmed = customTestTarget.trim();
    if (!targetTrimmed) {
      setTestResult({ success: false, message: 'Harap tentukan nomor / ID tujuan uji coba.' });
      return;
    }

    const matchedTarget = targetList.find((t) => t.target === targetTrimmed);
    const targetName = matchedTarget?.name || (previewMode === 'group' ? 'Uji Coba Group' : `Uji Coba (${selectedStudent?.name || 'Siswa'})`);
    const targetType = matchedTarget?.type || previewMode;

    const res = await onSendTestMessage(targetTrimmed, targetName, targetType);
    setTestResult(res);
    setTimeout(() => {
      setTestResult(null);
    }, 6000);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls for Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Pratinjau Layar WhatsApp Orang Tua
            </h4>
            <p className="text-[11px] text-slate-500">
              Simulasi tampilan pesan di smartphone penerima secara langsung
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onPreviewModeChange('group')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              previewMode === 'group'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group WA Kelas</span>
          </button>
          <button
            type="button"
            onClick={() => onPreviewModeChange('personal')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              previewMode === 'personal'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal Wali Murid</span>
          </button>
        </div>
      </div>

      {/* Student Selector if Personal Mode */}
      {previewMode === 'personal' && students.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold text-emerald-900">
              Pilih Sampel Siswa untuk Pratinjau:
            </span>
          </div>
          <select
            value={selectedStudentId}
            onChange={(e) => onSelectStudentId(e.target.value)}
            className="bg-white border border-emerald-300 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.gender}) {s.phone ? `• WA: ${s.phone}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Phone Mockup Wrapper */}
      <div className="flex justify-center py-2">
        <div className="w-full max-w-[375px] bg-[#111827] rounded-[2.8rem] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-950/20">
          {/* Inner Phone Bezel */}
          <div className="bg-[#efeae2] rounded-[2.3rem] overflow-hidden flex flex-col h-[580px] shadow-inner relative select-none">
            
            {/* Phone Top Notch & Status Bar */}
            <div className="bg-[#075E54] text-white px-5 pt-3 pb-1 flex items-center justify-between text-[11px] font-semibold shrink-0">
              <span>08:30</span>
              {/* Dynamic Island / Camera hole */}
              <div className="w-16 h-3.5 bg-black/40 rounded-full mx-auto backdrop-blur-xs flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-black/80 mr-1.5"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60"></div>
              </div>
              <div className="flex items-center gap-1.5 text-white/90">
                <Wifi className="w-3 h-3" />
                <span className="text-[10px] font-mono">4G</span>
                <span className="text-[10px]">98%</span>
              </div>
            </div>

            {/* WhatsApp App Header */}
            <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2 min-w-0">
                <button type="button" className="text-white hover:opacity-80 p-0.5">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {/* Contact Avatar */}
                <div className="w-8 h-8 rounded-full bg-emerald-700 border border-white/40 flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs">
                  {previewMode === 'group' ? (
                    <Users className="w-4 h-4 text-emerald-100" />
                  ) : (
                    (selectedStudent?.name?.slice(0, 1) || 'W').toUpperCase()
                  )}
                </div>
                {/* Title & Subtitle */}
                <div className="min-w-0">
                  <h5 className="font-bold text-xs leading-tight truncate">
                    {previewMode === 'group'
                      ? `Wali Murid ${schoolSettings.className || 'X TJKT 3'}`
                      : `${selectedStudent?.name || 'Ahmad Fauzi'} (Wali Murid)`}
                  </h5>
                  <p className="text-[9.5px] text-emerald-200/90 leading-none truncate">
                    {previewMode === 'group'
                      ? `${schoolSettings.schoolName || 'SMKS Nusantara 1'}, Anda, +62...`
                      : 'online'}
                  </p>
                </div>
              </div>

              {/* Call & Menu Icons */}
              <div className="flex items-center gap-3 text-white/90 shrink-0">
                <Video className="w-3.5 h-3.5" />
                <Phone className="w-3.5 h-3.5" />
                <MoreVertical className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Chat Area Scrollable */}
            <div 
              className="flex-1 overflow-y-auto p-3 space-y-2.5 flex flex-col justify-start"
              style={{
                backgroundImage: `radial-gradient(#cbd5e1 0.75px, transparent 0.75px), radial-gradient(#cbd5e1 0.75px, #efeae2 0.75px)`,
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 15px 15px',
              }}
            >
              {/* Date Chip */}
              <div className="flex justify-center">
                <span className="bg-white/85 backdrop-blur-xs text-slate-600 text-[10px] font-bold px-3 py-0.5 rounded-md shadow-2xs border border-slate-200/60 uppercase tracking-wider">
                  HARI INI
                </span>
              </div>

              {/* End-to-End Encryption Notice */}
              <div className="bg-[#FFEECD]/90 border border-[#E2D2AB]/60 text-[#54656F] text-[9.5px] p-2 rounded-lg text-center shadow-2xs leading-relaxed flex items-center justify-center gap-1.5 mx-2">
                <Lock className="w-3 h-3 text-[#E2A100] shrink-0" />
                <span>Pesan ke chat ini diamankan dengan enkripsi end-to-end.</span>
              </div>

              {/* The WhatsApp Chat Bubble */}
              <div className="flex justify-end mt-1">
                <div className="relative max-w-[92%] bg-[#D9FDD3] text-slate-900 rounded-2xl rounded-tr-xs p-3 shadow-xs border border-emerald-200/50">
                  {/* WhatsApp Bubble Tail */}
                  <div 
                    className="absolute -top-[1px] -right-[6px] w-0 h-0 border-t-[8px] border-t-[#D9FDD3] border-r-[8px] border-r-transparent"
                  />
                  
                  {/* Message Content */}
                  <div className="text-[11.5px] leading-relaxed break-words select-text">
                    {renderWhatsAppFormattedText(messageText)}
                  </div>

                  {/* Bubble Footer: Timestamp & Blue Double Tick */}
                  <div className="flex items-center justify-end gap-1 mt-1.5 text-[9.5px] text-slate-500 font-medium select-none">
                    <span>08:32</span>
                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fake WhatsApp Bottom Input Bar */}
            <div className="bg-[#F0F2F5] px-2 py-2 flex items-center gap-2 border-t border-slate-200/80 shrink-0">
              <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-2xs border border-slate-200">
                <Smile className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-400 font-normal flex-1">
                  Ketik pesan...
                </span>
                <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                <Camera className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center text-white shadow-xs shrink-0">
                <Mic className="w-4 h-4" />
              </div>
            </div>

            {/* Home Indicator Bar */}
            <div className="bg-[#F0F2F5] pb-2 flex justify-center shrink-0">
              <div className="w-28 h-1 bg-slate-400/80 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar below Mockup */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Teks Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Teks Lengkap</span>
              </>
            )}
          </button>

          {/* Direct Test Send */}
          {onSendTestMessage && (
            <div className="flex items-center gap-2 flex-1 sm:justify-end">
              <input
                type="text"
                placeholder="Nomor WA / ID Group Uji Coba..."
                value={customTestTarget}
                onChange={(e) => setCustomTestTarget(e.target.value)}
                className="w-full sm:w-56 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isSendingTest ? (
                  <Radio className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSendingTest ? 'Mengirim...' : 'Uji Coba Kirim API'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Feedback test send result */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <span>{testResult.message}</span>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-[11px] underline ml-2"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

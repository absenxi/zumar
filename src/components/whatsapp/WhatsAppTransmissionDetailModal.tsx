import React, { useState } from 'react';
import { WhatsAppTransmissionLog } from '../../types';
import { saveWhatsAppLogToCloud } from '../../lib/supabase';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  CheckCheck,
  Send,
  Calendar,
  Phone,
  Users,
  User,
  Radio,
  Clock,
  FileText,
  Smartphone,
  Check,
  ExternalLink,
  Code2,
  Database,
  Cloud,
} from 'lucide-react';

interface WhatsAppTransmissionDetailModalProps {
  log: WhatsAppTransmissionLog | null;
  onClose: () => void;
  onResend?: (log: WhatsAppTransmissionLog) => Promise<void>;
  isResending?: boolean;
}

/**
 * Parses basic WhatsApp formatting (*bold*, _italic_, ~strike~)
 */
function renderWhatsAppFormattedText(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const tokens = line.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);
    const formattedParts = tokens.map((token, tokIdx) => {
      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return (
          <strong key={tokIdx} className="font-bold text-slate-900">
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

export const WhatsAppTransmissionDetailModal: React.FC<WhatsAppTransmissionDetailModalProps> = ({
  log,
  onClose,
  onResend,
  isResending = false,
}) => {
  const [modalTab, setModalTab] = useState<'preview' | 'technical'>('preview');
  const [copied, setCopied] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string | null>(null);

  if (!log) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(log.message || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSaveToDatabase = async () => {
    setIsSavingDb(true);
    setDbStatusMsg(null);
    try {
      const ok = await saveWhatsAppLogToCloud(log);
      if (ok) {
        setDbStatusMsg('Tersimpan di Cloud Supabase!');
      } else {
        setDbStatusMsg('Gagal menyimpan ke Supabase.');
      }
    } catch {
      setDbStatusMsg('Kesalahan koneksi database.');
    } finally {
      setIsSavingDb(false);
      setTimeout(() => setDbStatusMsg(null), 4000);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
              <FileText className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">Detail Transmisi Pesan</h3>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    log.status === 'success'
                      ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                      : 'bg-rose-500/30 text-rose-200 border-rose-400/40'
                  }`}
                >
                  {log.status === 'success' ? 'BERHASIL' : 'GAGAL'}
                </span>
              </div>
              <p className="text-xs text-teal-100 font-mono">ID: {log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtab Toggle */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/80 px-4 py-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setModalTab('preview')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              modalTab === 'preview'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tampilan Layar WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('technical')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              modalTab === 'technical'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Detail Audit & Respons API</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {modalTab === 'preview' ? (
            /* ============================================================ */
            /* Tab 1: Realistic WhatsApp Phone Bubble View                  */
            /* ============================================================ */
            <div className="space-y-4">
              {/* WhatsApp Chat Simulation Frame */}
              <div className="border border-slate-300 rounded-3xl overflow-hidden shadow-md bg-[#efeae2]">
                {/* Simulated WhatsApp Header */}
                <div className="bg-[#005c4b] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center font-black text-white text-xs border border-emerald-600 shadow-xs">
                      {log.targetType === 'group' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 leading-tight">
                        <span>{log.targetName}</span>
                        {log.targetType === 'group' && (
                          <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.2 rounded font-normal text-emerald-200">
                            Grup
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-200/90 font-mono">
                        {log.target}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-200 font-mono block">
                      {log.timestamp}
                    </span>
                    <span className="text-[9.5px] bg-emerald-800/80 px-2 py-0.5 rounded-full text-white font-bold">
                      {log.sentBy}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Chat Body */}
                <div className="p-4 sm:p-5 space-y-3 min-h-[260px] flex flex-col justify-end">
                  {/* Security / System Notice */}
                  <div className="text-center my-1">
                    <span className="inline-block bg-[#ffeecd] text-[#54656f] text-[10.5px] px-3 py-1 rounded-lg shadow-2xs font-sans">
                      🔒 Pesan ini ditransmisikan melalui Gateway Resmi Absensi Sekolah
                    </span>
                  </div>

                  {/* Outgoing Message Bubble (Right-aligned green WhatsApp balloon) */}
                  <div className="flex justify-end">
                    <div className="relative max-w-[92%] sm:max-w-[85%] bg-[#d9fdd3] text-slate-900 p-3 sm:p-3.5 rounded-2xl rounded-tr-xs shadow-xs text-xs sm:text-[12.5px] leading-relaxed font-sans">
                      {/* Message Content */}
                      <div className="whitespace-pre-wrap select-text font-sans">
                        {renderWhatsAppFormattedText(log.message)}
                      </div>

                      {/* Bubble Meta (Timestamp + Double Check) */}
                      <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-[#667781] font-mono">
                        <span>
                          {log.timestamp ? log.timestamp.split(',').pop()?.trim() || log.timestamp : '-'}
                        </span>
                        {log.status === 'success' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status summary below phone preview */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">Status Pengiriman:</span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-full text-[11px] ${
                      log.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {log.status === 'success' ? 'Terkirim ke WhatsApp' : 'Gagal Terkirim'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Teks Pesan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* Tab 2: Technical Metadata and API Logs                      */
            /* ============================================================ */
            <div className="space-y-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Waktu Transmisi
                  </span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    {log.timestamp}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Tujuan / Penerima
                  </span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
                    {log.targetType === 'group' ? (
                      <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    )}
                    {log.targetName}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Nomor / ID Target WA
                  </span>
                  <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {log.target}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Pemicu Pengiriman
                  </span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Radio className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {log.sentBy || 'Otomatis'}
                  </span>
                </div>

                {/* API Status response */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-200/80">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Respon Gateway API Fonnte
                  </span>
                  <p
                    className={`mt-1 font-mono text-[11px] p-2.5 rounded-lg border ${
                      log.status === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}
                  >
                    {log.responseMessage || 'Tidak ada rincian tambahan dari gateway.'}
                  </p>
                </div>
              </div>

              {/* Raw Message Text Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Teks Pesan Mentah:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Pesan</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto border border-slate-800 select-all">
                  {log.message}
                </div>
              </div>

              {/* Database Storage Information Card */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-emerald-950 block">Status Database Supabase</span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      Tabel: public.whatsapp_logs (id: {log.id})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dbStatusMsg ? (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                      {dbStatusMsg}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveToDatabase}
                      disabled={isSavingDb}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Database className={`w-3 h-3 ${isSavingDb ? 'animate-spin' : ''}`} />
                      <span>{isSavingDb ? 'Menyimpan...' : 'Simpan ke Database'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* JSON Metadata if available */}
              {log.meta && Object.keys(log.meta).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Metadata Audit Log:
                  </span>
                  <pre className="bg-slate-100 text-slate-800 p-3 rounded-xl font-mono text-[11px] border border-slate-200 overflow-x-auto">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSavingDb}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Simpan atau perbarui catatan ini ke database Cloud Supabase"
            >
              <Database className={`w-3.5 h-3.5 text-emerald-600 ${isSavingDb ? 'animate-spin' : ''}`} />
              <span>{isSavingDb ? 'Menyimpan...' : 'Simpan ke Database'}</span>
            </button>
          </div>

          {onResend && (
            <button
              type="button"
              onClick={() => onResend(log)}
              disabled={isResending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isResending ? (
                <Radio className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isResending ? 'Mengirim Ulang...' : 'Kirim Ulang Pesan Ini'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  RotateCcw,
  AlertOctagon,
  X,
  HelpCircle,
  Database,
  UserX,
} from 'lucide-react';

export type ConfirmationVariant = 'danger' | 'warning' | 'info';
export type ConfirmationIcon = 'trash' | 'reset' | 'alert' | 'user-x' | 'database' | 'help';

export interface ConfirmationConfig {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: ConfirmationIcon;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: ConfirmationIcon;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  icon = 'alert',
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
          headerBg: 'bg-gradient-to-r from-rose-900 via-red-800 to-rose-950',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20 active:scale-95 ring-2 ring-rose-300/60',
          borderAccent: 'border-rose-400',
          badgeText: 'Tindakan Berbahaya',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
          headerBg: 'bg-gradient-to-r from-amber-900 via-orange-800 to-amber-950',
          confirmBtn:
            'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20 active:scale-95 ring-2 ring-amber-300/60',
          borderAccent: 'border-amber-400',
          badgeText: 'Perhatian & Konfirmasi',
          badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-100 text-blue-600 border-blue-200',
          headerBg: 'bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-950',
          confirmBtn:
            'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20 active:scale-95 ring-2 ring-blue-300/60',
          borderAccent: 'border-blue-400',
          badgeText: 'Konfirmasi Tindakan',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
        };
    }
  };

  const renderIcon = () => {
    switch (icon) {
      case 'trash':
        return <Trash2 className="w-7 h-7" />;
      case 'reset':
        return <RotateCcw className="w-7 h-7" />;
      case 'user-x':
        return <UserX className="w-7 h-7" />;
      case 'database':
        return <Database className="w-7 h-7" />;
      case 'help':
        return <HelpCircle className="w-7 h-7" />;
      case 'alert':
      default:
        return <AlertTriangle className="w-7 h-7" />;
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl border-4 ${styles.borderAccent} w-full max-w-md overflow-hidden my-auto transform transition-all animate-in zoom-in-95 duration-200 flex flex-col`}
      >
        {/* Header with Dark Contrast & Category Badge */}
        <div className={`${styles.headerBg} p-4 sm:p-5 text-white flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <AlertOctagon className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border mb-0.5 ${styles.badgeBg}`}
              >
                {styles.badgeText}
              </span>
              <h3
                id="confirmation-modal-title"
                className="font-black text-sm sm:text-base tracking-tight text-white"
              >
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body with Large Visual Icon & Descriptive Prompt */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border shadow-inner shrink-0 ${styles.iconBg}`}
            >
              {renderIcon()}
            </div>
            <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed font-medium">
              {typeof message === 'string' ? (
                <p className="font-medium text-slate-800 text-xs sm:text-sm">{message}</p>
              ) : (
                message
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-600 flex items-center gap-2">
            <span className="font-black text-slate-800 uppercase tracking-wide">Catatan:</span>
            <span>Pastikan Anda telah memeriksa kembali sebelum melanjutkan.</span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 sm:py-4 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-300 transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            autoFocus
            className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${styles.confirmBtn}`}
          >
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

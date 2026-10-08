import React, { useState, useRef, useEffect } from 'react';
import { SchoolSettings } from '../../types';
import {
  DEFAULT_GROUP_WHATSAPP_TEMPLATE,
  DEFAULT_PERSONAL_WHATSAPP_TEMPLATE,
  GROUP_TEMPLATE_TAGS,
  PERSONAL_TEMPLATE_TAGS,
} from '../../utils/whatsappService';
import {
  FileCode,
  Save,
  RotateCcw,
  Sparkles,
  Users,
  User,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Info,
  Check,
  Tag,
} from 'lucide-react';

interface WhatsAppTemplateEditorProps {
  schoolSettings: SchoolSettings;
  onSaveTemplates: (groupTemplate: string, personalTemplate: string) => void;
  activeTab: 'group' | 'personal';
  onActiveTabChange: (tab: 'group' | 'personal') => void;
}

export const WhatsAppTemplateEditor: React.FC<WhatsAppTemplateEditorProps> = ({
  schoolSettings,
  onSaveTemplates,
  activeTab,
  onActiveTabChange,
}) => {
  const [groupTemplate, setGroupTemplate] = useState<string>(
    schoolSettings.whatsappGroupMessageTemplate || DEFAULT_GROUP_WHATSAPP_TEMPLATE
  );
  const [personalTemplate, setPersonalTemplate] = useState<string>(
    schoolSettings.whatsappPersonalMessageTemplate || DEFAULT_PERSONAL_WHATSAPP_TEMPLATE
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const groupTextareaRef = useRef<HTMLTextAreaElement>(null);
  const personalTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if prop changes externally
  useEffect(() => {
    if (schoolSettings.whatsappGroupMessageTemplate) {
      setGroupTemplate(schoolSettings.whatsappGroupMessageTemplate);
    }
    if (schoolSettings.whatsappPersonalMessageTemplate) {
      setPersonalTemplate(schoolSettings.whatsappPersonalMessageTemplate);
    }
  }, [schoolSettings.whatsappGroupMessageTemplate, schoolSettings.whatsappPersonalMessageTemplate]);

  const currentTemplate = activeTab === 'group' ? groupTemplate : personalTemplate;
  const currentTags = activeTab === 'group' ? GROUP_TEMPLATE_TAGS : PERSONAL_TEMPLATE_TAGS;
  const activeRef = activeTab === 'group' ? groupTextareaRef : personalTextareaRef;

  const handleInsertTag = (tag: string) => {
    const textarea = activeRef.current;
    if (!textarea) {
      if (activeTab === 'group') {
        setGroupTemplate((prev) => prev + ' ' + tag);
      } else {
        setPersonalTemplate((prev) => prev + ' ' + tag);
      }
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + tag + after;

    if (activeTab === 'group') {
      setGroupTemplate(newText);
    } else {
      setPersonalTemplate(newText);
    }

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleWrapFormat = (prefix: string, suffix: string) => {
    const textarea = activeRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || 'teks';
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + prefix + selected + suffix + after;

    if (activeTab === 'group') {
      setGroupTemplate(newText);
    } else {
      setPersonalTemplate(newText);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleResetDefault = () => {
    if (activeTab === 'group') {
      setGroupTemplate(DEFAULT_GROUP_WHATSAPP_TEMPLATE);
    } else {
      setPersonalTemplate(DEFAULT_PERSONAL_WHATSAPP_TEMPLATE);
    }
  };

  const handleSave = () => {
    onSaveTemplates(groupTemplate, personalTemplate);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
              Template Pesan WhatsApp Dinamis
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Sesuaikan kata-kata, tata letak, dan variabel dinamis otomatis
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onActiveTabChange('group')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'group'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Template Group WA</span>
          </button>
          <button
            type="button"
            onClick={() => onActiveTabChange('personal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Template Personal Ortu</span>
          </button>
        </div>
      </div>

      {/* Formatting & Insert Tag Toolbar */}
      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* WhatsApp Text Formatting Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              Format WA:
            </span>
            <button
              type="button"
              onClick={() => handleWrapFormat('*', '*')}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Tebal (*bold*)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleWrapFormat('_', '_')}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Miring (_italic_)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleWrapFormat('~', '~')}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Coret (~strikethrough~)"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleWrapFormat('```', '```')}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Monospace (```code```)"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-200"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ke Standar</span>
          </button>
        </div>

        {/* Dynamic Variable Chips */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-2">
            <Tag className="w-3.5 h-3.5 text-teal-600" />
            <span>Klik tag untuk menyisipkan variabel dinamis ke pesan:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {currentTags.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => handleInsertTag(t.tag)}
                className="group inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs"
                title={`${t.label}: ${t.desc}`}
              >
                <span className="text-teal-700 group-hover:text-teal-800">{t.tag}</span>
                <span className="text-[10px] font-sans text-slate-400 font-medium">
                  ({t.label})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Konten Template Pesan ({activeTab === 'group' ? 'Laporan Group WA' : 'Notifikasi Personal'}):</span>
          <span className="text-[11px] font-mono text-slate-400">
            {currentTemplate.length} karakter • {currentTemplate.split('\n').length} baris
          </span>
        </div>

        {activeTab === 'group' ? (
          <textarea
            ref={groupTextareaRef}
            rows={14}
            value={groupTemplate}
            onChange={(e) => setGroupTemplate(e.target.value)}
            className="w-full font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-teal-500 focus:bg-white leading-relaxed resize-y transition-all"
            placeholder="Ketik susunan template pesan rekapitulasi group WhatsApp..."
          />
        ) : (
          <textarea
            ref={personalTextareaRef}
            rows={14}
            value={personalTemplate}
            onChange={(e) => setPersonalTemplate(e.target.value)}
            className="w-full font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3.5 focus:ring-2 focus:ring-teal-500 focus:bg-white leading-relaxed resize-y transition-all"
            placeholder="Ketik susunan template pesan notifikasi personal ke orang tua..."
          />
        )}
      </div>

      {/* Save Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Info className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Perubahan langsung tercermin pada layar pratinjau di samping</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Template Tersimpan!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Template</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

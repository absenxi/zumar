import React, { useState, useEffect, useMemo } from 'react';
import { SchoolSettings, WhatsAppTargetItem, Student, AttendanceStatus } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  Save,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Users,
  User,
  Copy,
  CheckCheck,
  Sparkles,
  KeyRound,
  ShieldCheck,
  X,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  Smartphone,
  Radio,
  FileCode,
} from 'lucide-react';
import { WhatsAppPhonePreview } from './whatsapp/WhatsAppPhonePreview';
import { WhatsAppTemplateEditor } from './whatsapp/WhatsAppTemplateEditor';
import {
  DEFAULT_GROUP_WHATSAPP_TEMPLATE,
  DEFAULT_PERSONAL_WHATSAPP_TEMPLATE,
  generateAutoWhatsAppMessage,
  generatePersonalWhatsAppMessage,
  sendWhatsAppViaGateway,
} from '../utils/whatsappService';

interface WhatsAppGatewaySettingsProps {
  schoolSettings: SchoolSettings;
  onSaveSettings: (settings: SchoolSettings) => void;
  students?: Student[];
  attendanceData?: Record<string, Record<number, AttendanceStatus>>;
  selectedDay?: number;
  selectedMonthIndex?: number;
  selectedYear?: number;
  className?: string;
}

export const WhatsAppGatewaySettings: React.FC<WhatsAppGatewaySettingsProps> = ({
  schoolSettings,
  onSaveSettings,
  students,
  attendanceData,
  selectedDay,
  selectedMonthIndex,
  selectedYear,
  className = '',
}) => {
  // API Token State
  const [apiToken, setApiToken] = useState<string>(
    schoolSettings.whatsappApiToken || ''
  );
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);

  // Saved Target List State
  const [targetList, setTargetList] = useState<WhatsAppTargetItem[]>(() => {
    if (schoolSettings.whatsappTargetList && schoolSettings.whatsappTargetList.length > 0) {
      return schoolSettings.whatsappTargetList;
    }
    if (schoolSettings.whatsappTestTarget) {
      return [
        {
          id: 'target_default_init',
          name: 'Target Utama Sekolah',
          target: schoolSettings.whatsappTestTarget,
          type: schoolSettings.whatsappTestTargetType || 'group',
          isDefault: true,
        },
      ];
    }
    return [];
  });

  // Automation State
  const [autoSendOnComplete, setAutoSendOnComplete] = useState<boolean>(
    schoolSettings.autoSendWhatsAppOnComplete === true
  );
  const [autoSendTargetId, setAutoSendTargetId] = useState<string>(
    schoolSettings.autoSendWhatsAppTargetId || ''
  );
  const [autoSendTargetIds, setAutoSendTargetIds] = useState<string[]>(() => {
    if (Array.isArray(schoolSettings.autoSendWhatsAppTargetIds) && schoolSettings.autoSendWhatsAppTargetIds.length > 0) {
      return schoolSettings.autoSendWhatsAppTargetIds;
    }
    if (schoolSettings.autoSendWhatsAppTargetId) {
      return [schoolSettings.autoSendWhatsAppTargetId];
    }
    return [];
  });
  const [lastAutoSentDate, setLastAutoSentDate] = useState<string>(
    schoolSettings.lastAutoSentDate || ''
  );

  // Add Target Form State
  const [isAddingTarget, setIsAddingTarget] = useState<boolean>(false);
  const [newTargetName, setNewTargetName] = useState<string>('');
  const [newTargetNumber, setNewTargetNumber] = useState<string>('');
  const [newTargetType, setNewTargetType] = useState<'group' | 'personal'>('group');
  const [newTargetIsDefault, setNewTargetIsDefault] = useState<boolean>(false);
  const [targetActionFeedback, setTargetActionFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion confirmation state (tracks ID of item currently pending confirmation)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sub-Tab Navigation inside Gateway: 'koneksi' | 'template'
  const [activeGatewayTab, setActiveGatewayTab] = useState<'koneksi' | 'template'>('koneksi');

  // Dynamic Template & Preview State
  const [templateTab, setTemplateTab] = useState<'group' | 'personal'>('group');
  const [groupTemplateText, setGroupTemplateText] = useState<string>(
    schoolSettings.whatsappGroupMessageTemplate || DEFAULT_GROUP_WHATSAPP_TEMPLATE
  );
  const [personalTemplateText, setPersonalTemplateText] = useState<string>(
    schoolSettings.whatsappPersonalMessageTemplate || DEFAULT_PERSONAL_WHATSAPP_TEMPLATE
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => students?.[0]?.id || ''
  );
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // Synchronize template state when schoolSettings prop changes
  useEffect(() => {
    if (schoolSettings.whatsappGroupMessageTemplate) {
      setGroupTemplateText(schoolSettings.whatsappGroupMessageTemplate);
    }
    if (schoolSettings.whatsappPersonalMessageTemplate) {
      setPersonalTemplateText(schoolSettings.whatsappPersonalMessageTemplate);
    }
  }, [schoolSettings.whatsappGroupMessageTemplate, schoolSettings.whatsappPersonalMessageTemplate]);

  // Compute live preview message for WhatsApp phone mockup
  const livePreviewMessage = useMemo(() => {
    const curDay = selectedDay || new Date().getDate();
    const curMonth = selectedMonthIndex !== undefined ? selectedMonthIndex : new Date().getMonth();
    const curYear = selectedYear || new Date().getFullYear();

    if (templateTab === 'group') {
      const tempSettings = {
        ...schoolSettings,
        whatsappGroupMessageTemplate: groupTemplateText,
      };
      return generateAutoWhatsAppMessage(
        tempSettings,
        students || [],
        attendanceData || {},
        curDay,
        curMonth,
        curYear
      );
    } else {
      const targetStudent = (students || []).find((s) => s.id === selectedStudentId) || (students || [])[0];
      const studentDays = attendanceData && targetStudent ? attendanceData[targetStudent.id] : undefined;
      const status = studentDays ? studentDays[curDay] : 'H';
      const tempSettings = {
        ...schoolSettings,
        whatsappPersonalMessageTemplate: personalTemplateText,
      };
      if (!targetStudent) {
        return 'Belum ada data siswa untuk disimulasikan.';
      }
      return generatePersonalWhatsAppMessage(
        tempSettings,
        targetStudent,
        status || 'H',
        curDay,
        curMonth,
        curYear
      );
    }
  }, [
    templateTab,
    groupTemplateText,
    personalTemplateText,
    selectedStudentId,
    schoolSettings,
    students,
    attendanceData,
    selectedDay,
    selectedMonthIndex,
    selectedYear,
  ]);

  // Save Dynamic Templates Handler
  const handleSaveTemplates = (newGroup: string, newPersonal: string) => {
    setGroupTemplateText(newGroup);
    setPersonalTemplateText(newPersonal);
    const updated: SchoolSettings = {
      ...schoolSettings,
      whatsappApiToken: apiToken.trim(),
      whatsappTargetList: targetList,
      whatsappGroupMessageTemplate: newGroup,
      whatsappPersonalMessageTemplate: newPersonal,
    };
    onSaveSettings(updated);
    setTargetActionFeedback('Template pesan WhatsApp dinamis berhasil disimpan!');
    setTimeout(() => setTargetActionFeedback(null), 3500);
  };

  // Direct Test Send from Phone Preview
  const handleSendTestFromPreview = async (
    target: string,
    targetName: string,
    type: 'group' | 'personal'
  ) => {
    if (!apiToken?.trim()) {
      return {
        success: false,
        message: 'API Token belum diisi. Harap masukkan token Fonnte pada tab Koneksi API terlebih dahulu.',
      };
    }
    setIsSendingTest(true);
    const res = await sendWhatsAppViaGateway({
      token: apiToken.trim(),
      endpointUrl: schoolSettings.whatsappEndpointUrl,
      target,
      message: livePreviewMessage,
      auditMeta: {
        targetName,
        targetType: type,
        sentBy: 'Uji Coba Kirim (Pratinjau Layar)',
        meta: {
          templateMode: templateTab,
          studentId: selectedStudentId,
        },
      },
    });
    setIsSendingTest(false);
    return res;
  };

  // Synchronize state when schoolSettings prop changes
  useEffect(() => {
    setApiToken(schoolSettings.whatsappApiToken || '');
    setAutoSendOnComplete(schoolSettings.autoSendWhatsAppOnComplete === true);
    setAutoSendTargetId(schoolSettings.autoSendWhatsAppTargetId || '');
    if (Array.isArray(schoolSettings.autoSendWhatsAppTargetIds) && schoolSettings.autoSendWhatsAppTargetIds.length > 0) {
      setAutoSendTargetIds(schoolSettings.autoSendWhatsAppTargetIds);
    } else if (schoolSettings.autoSendWhatsAppTargetId) {
      setAutoSendTargetIds([schoolSettings.autoSendWhatsAppTargetId]);
    } else {
      setAutoSendTargetIds([]);
    }
    setLastAutoSentDate(schoolSettings.lastAutoSentDate || '');

    if (schoolSettings.whatsappTargetList && schoolSettings.whatsappTargetList.length > 0) {
      setTargetList(schoolSettings.whatsappTargetList);
    } else if (schoolSettings.whatsappTestTarget) {
      setTargetList([
        {
          id: 'target_default_init',
          name: 'Target Utama Sekolah',
          target: schoolSettings.whatsappTestTarget,
          type: schoolSettings.whatsappTestTargetType || 'group',
          isDefault: true,
        },
      ]);
    }
  }, [schoolSettings]);

  // Save Settings handler
  const handleSaveSettings = (
    customTargets?: WhatsAppTargetItem[],
    customToken?: string,
    customAutoSettings?: {
      autoSendOnComplete?: boolean;
      autoSendTargetId?: string;
      autoSendTargetIds?: string[];
      lastAutoSentDate?: string;
    }
  ) => {
    const listToSave = customTargets !== undefined ? customTargets : targetList;
    const tokenToSave = customToken !== undefined ? customToken : apiToken;
    const autoOn = customAutoSettings?.autoSendOnComplete !== undefined ? customAutoSettings.autoSendOnComplete : autoSendOnComplete;
    const autoTargetIds = customAutoSettings?.autoSendTargetIds !== undefined ? customAutoSettings.autoSendTargetIds : autoSendTargetIds;
    const autoTarget = customAutoSettings?.autoSendTargetId !== undefined
      ? customAutoSettings.autoSendTargetId
      : (autoTargetIds[0] || autoSendTargetId);
    const lastDate = customAutoSettings?.lastAutoSentDate !== undefined ? customAutoSettings.lastAutoSentDate : lastAutoSentDate;

    // Find default target
    const defaultTarget = listToSave.find((t) => t.isDefault) || listToSave[0];

    const updated: SchoolSettings = {
      ...schoolSettings,
      whatsappGatewayProvider: 'fonnte',
      whatsappApiToken: tokenToSave.trim(),
      whatsappEndpointUrl: schoolSettings.whatsappEndpointUrl || 'https://api.fonnte.com/send',
      whatsappTestTarget: defaultTarget?.target || '',
      whatsappTestTargetType: defaultTarget?.type || 'group',
      whatsappTargetList: listToSave,
      autoSendWhatsAppOnComplete: autoOn,
      autoSendWhatsAppTargetId: autoTarget,
      autoSendWhatsAppTargetIds: autoTargetIds,
      lastAutoSentDate: lastDate,
    };

    onSaveSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // List of group targets
  const groupTargets = useMemo(() => {
    return targetList.filter((t) => t.type === 'group' || !t.type);
  }, [targetList]);

  // Toggle automation and save instantly
  const handleToggleAutoSend = (newVal: boolean) => {
    setAutoSendOnComplete(newVal);
    handleSaveSettings(undefined, undefined, { autoSendOnComplete: newVal });
  };

  // Toggle selection of a single target (select one or more)
  const handleToggleTargetSelection = (targetId: string) => {
    let nextIds: string[];
    if (autoSendTargetIds.includes(targetId)) {
      nextIds = autoSendTargetIds.filter((id) => id !== targetId);
    } else {
      nextIds = [...autoSendTargetIds, targetId];
    }
    setAutoSendTargetIds(nextIds);
    setAutoSendTargetId(nextIds[0] || '');
    handleSaveSettings(undefined, undefined, {
      autoSendTargetIds: nextIds,
      autoSendTargetId: nextIds[0] || '',
    });
  };

  // Select all targets
  const handleSelectAllTargets = () => {
    const allIds = targetList.map((t) => t.id);
    setAutoSendTargetIds(allIds);
    setAutoSendTargetId(allIds[0] || '');
    handleSaveSettings(undefined, undefined, {
      autoSendTargetIds: allIds,
      autoSendTargetId: allIds[0] || '',
    });
  };

  // Deselect all targets
  const handleDeselectAllTargets = () => {
    setAutoSendTargetIds([]);
    setAutoSendTargetId('');
    handleSaveSettings(undefined, undefined, {
      autoSendTargetIds: [],
      autoSendTargetId: '',
    });
  };

  // Reset last sent date so it can trigger again today
  const handleResetLastSent = () => {
    setLastAutoSentDate('');
    handleSaveSettings(undefined, undefined, { lastAutoSentDate: '' });
  };

  // Add new Target Number / ID Group handler
  const handleAddTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanNum = newTargetNumber.trim();
    const cleanName =
      newTargetName.trim() || (newTargetType === 'group' ? 'Group WhatsApp' : 'Nomor Wali Murid');

    if (!cleanNum) {
      setFormError('Nomor WhatsApp atau ID Group wajib diisi.');
      return;
    }

    const newItem: WhatsAppTargetItem = {
      id: `target_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      target: cleanNum,
      type: newTargetType,
      isDefault: newTargetIsDefault || targetList.length === 0,
    };

    let updatedList = [...targetList];
    if (newItem.isDefault) {
      // Unset previous defaults
      updatedList = updatedList.map((item) => ({ ...item, isDefault: false }));
    }
    updatedList.push(newItem);

    setTargetList(updatedList);
    handleSaveSettings(updatedList);

    // Reset form
    setNewTargetName('');
    setNewTargetNumber('');
    setNewTargetType('group');
    setNewTargetIsDefault(false);
    setIsAddingTarget(false);

    setTargetActionFeedback(`Target "${cleanName}" berhasil ditambahkan & disimpan!`);
    setTimeout(() => setTargetActionFeedback(null), 3500);
  };

  // Delete a Target item (fully reliable inline confirmation, no blocked window.confirm)
  const executeDeleteTarget = (id: string, name: string) => {
    const deletedItem = targetList.find((item) => item.id === id);
    const updatedList = targetList.filter((item) => item.id !== id);

    // If the deleted target was the default target, assign a new default if items remain
    if (deletedItem?.isDefault && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }

    setTargetList(updatedList);
    setDeleteConfirmId(null);

    // Also remove from autoSendTargetIds if deleted
    const nextTargetIds = autoSendTargetIds.filter((tid) => tid !== id);
    setAutoSendTargetIds(nextTargetIds);
    setAutoSendTargetId(nextTargetIds[0] || '');

    handleSaveSettings(updatedList, undefined, {
      autoSendTargetIds: nextTargetIds,
      autoSendTargetId: nextTargetIds[0] || '',
    });

    setTargetActionFeedback(`Target "${name}" telah berhasil dihapus.`);
    setTimeout(() => setTargetActionFeedback(null), 3000);
  };

  // Make Target Default
  const handleMakeTargetDefault = (id: string) => {
    const targetItem = targetList.find((t) => t.id === id);
    if (!targetItem) return;

    const updatedList = targetList.map((item) => ({
      ...item,
      isDefault: item.id === id,
    }));

    setTargetList(updatedList);
    handleSaveSettings(updatedList);
    setTargetActionFeedback(`"${targetItem.name}" dijadikan Target Utama Default.`);
    setTimeout(() => setTargetActionFeedback(null), 3000);
  };

  // Copy API Token to clipboard
  const handleCopyToken = () => {
    if (!apiToken) return;
    navigator.clipboard.writeText(apiToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2500);
  };

  // Masked Token helper
  const getMaskedToken = (tok: string) => {
    if (!tok) return '';
    if (tok.length <= 8) return '••••••••';
    return `${tok.slice(0, 4)}••••••••••••${tok.slice(-4)}`;
  };

  const currentDefaultTarget = targetList.find((t) => t.isDefault) || targetList[0];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Feedback Alert Toast */}
      {targetActionFeedback && (
        <div className="bg-teal-50 border border-teal-200 text-teal-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{targetActionFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setTargetActionFeedback(null)}
            className="text-teal-700 hover:text-teal-900 font-bold ml-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2-Pill Gateway WhatsApp Sub-Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch gap-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveGatewayTab('koneksi')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeGatewayTab === 'koneksi'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Koneksi API & Target Group</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activeGatewayTab === 'koneksi'
                ? 'bg-teal-800 text-teal-100'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {targetList.length} Target
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGatewayTab('template')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeGatewayTab === 'template'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Template Pesan & Layar WhatsApp</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activeGatewayTab === 'template'
                ? 'bg-teal-800 text-teal-100'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            Dinamis & Pratinjau
          </span>
        </button>
      </div>

      {/* Tab 1: Koneksi API & Target Group */}
      {activeGatewayTab === 'koneksi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
        {/* ========================================================= */}
        {/* Column 1: API Token Fonnte yang Tersimpan (5 Kolom)       */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                  API Token Fonnte
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Kunci otorisasi pengiriman WhatsApp
                </p>
              </div>
            </div>
            {isSaved && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan</span>
              </span>
            )}
          </div>

          {/* Status Box: API Token Tersimpan */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Status Token Tersimpan
              </span>
              {apiToken ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Aktif & Tersimpan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Belum Diisi
                </span>
              )}
            </div>

            {apiToken ? (
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Nilai Token:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs transition-all cursor-pointer"
                      title={showToken ? 'Sembunyikan Token' : 'Tampilkan Token'}
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="p-1 rounded-md text-slate-500 hover:text-teal-700 hover:bg-slate-100 text-xs transition-all cursor-pointer"
                      title="Salin Token ke Clipboard"
                    >
                      {tokenCopied ? (
                        <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-md break-all select-all">
                  {showToken ? apiToken : getMaskedToken(apiToken)}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200">
                Belum ada API Token tersimpan. Masukkan token Fonnte Anda pada kolom di bawah lalu klik Simpan.
              </p>
            )}

            {/* Target Utama Terpilih Ringkasan */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500">Target Utama Aktif:</span>
              <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-md flex items-center justify-between">
                <span>{currentDefaultTarget?.target || 'Belum dipilih'}</span>
                {currentDefaultTarget && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-sm">
                    {currentDefaultTarget.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Input / Update Token */}
          <div className="space-y-2 pt-1">
            <label className="block font-semibold text-xs text-slate-700">
              Ubah / Masukkan API Token Fonnte
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Masukkan API Token Fonnte Anda..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Token dapat diperoleh dari dashboard akun Fonnte Anda (menu Device / API).
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveSettings(targetList, apiToken)}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan API Token</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Column 2: Daftar & Tambah Nomor Tujuan / ID Group (7 Kol) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                  Nomor Tujuan / ID Group WhatsApp
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {targetList.length} tujuan tersimpan di sistem
                </p>
              </div>
            </div>

            {!isAddingTarget && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingTarget(true);
                  setFormError(null);
                }}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Nomor / Group</span>
              </button>
            )}
          </div>

          {/* Form Tambah Target Baru (Inline Form) */}
          {isAddingTarget && (
            <form
              onSubmit={handleAddTargetSubmit}
              className="bg-teal-50/70 border-2 border-teal-300 rounded-xl p-4 space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Tambah Nomor Tujuan / ID Group Baru
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTarget(false);
                    setFormError(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg"
                  title="Tutup Form"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Label / Nama Tujuan
                  </label>
                  <input
                    type="text"
                    required
                    value={newTargetName}
                    onChange={(e) => setNewTargetName(e.target.value)}
                    placeholder="Contoh: Group Wali Murid X TJKT 3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / ID Group
                  </label>
                  <input
                    type="text"
                    required
                    value={newTargetNumber}
                    onChange={(e) => setNewTargetNumber(e.target.value)}
                    placeholder="Contoh: 6281234567801 atau ID@g.us"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-bold text-slate-700">Tipe:</label>
                  <select
                    value={newTargetType}
                    onChange={(e) => setNewTargetType(e.target.value as 'group' | 'personal')}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="group">Group WhatsApp</option>
                    <option value="personal">Nomor Personal</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newTargetIsDefault}
                      onChange={(e) => setNewTargetIsDefault(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Jadikan Target Utama</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTarget(false);
                      setFormError(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Simpan Target
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* List Target yang Tersimpan */}
          <div className="space-y-2.5">
            {targetList.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <p className="text-xs text-slate-600 font-medium">
                  Belum ada Nomor Tujuan atau ID Group yang tersimpan.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Klik tombol <strong>+ Tambah Nomor / Group</strong> di atas untuk menyimpan group kelas atau nomor wali murid.
                </p>
              </div>
            ) : (
              targetList.map((item) => {
                const isConfirmingDelete = deleteConfirmId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      item.isDefault
                        ? 'bg-teal-50/50 border-teal-300 ring-1 ring-teal-200'
                        : isConfirmingDelete
                        ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-800">
                          {item.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                            item.type === 'group'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.type === 'group' ? (
                            <Users className="w-2.5 h-2.5" />
                          ) : (
                            <User className="w-2.5 h-2.5" />
                          )}
                          {item.type === 'group' ? 'Group WA' : 'Personal'}
                        </span>
                        {item.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                            Target Utama Default
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-slate-600 truncate">
                        {item.target}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {!item.isDefault && !isConfirmingDelete && (
                        <button
                          type="button"
                          onClick={() => handleMakeTargetDefault(item.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                          title="Jadikan sebagai target utama default pengiriman"
                        >
                          Jadikan Utama
                        </button>
                      )}

                      {/* Tombol Hapus dengan Konfirmasi Responsif Langsung (Bebas dari Masalah Iframe) */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-xl shadow-xs animate-in fade-in">
                          <span className="text-[11px] font-black text-rose-900">Hapus?</span>
                          <button
                            type="button"
                            onClick={() => executeDeleteTarget(item.id, item.name)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs transition-all"
                            title="Konfirmasi hapus target ini"
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold cursor-pointer border border-slate-300 transition-all"
                            title="Batalkan penghapusan"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-200"
                          title={`Hapus "${item.name}"`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 2: PILIH GROUP WHATSAPP TUJUAN PENGIRIMAN OTOMATIS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
          {/* Pilihan Target Group Tujuan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-800" />
                PILIH GROUP WHATSAPP TUJUAN PENGIRIMAN OTOMATIS
              </label>
              <span className="text-[11px] text-rose-600 font-extrabold tracking-wider uppercase">
                *WAJIB
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[12px] text-slate-500">
                Pilih satu atau lebih nomor / ID Group WhatsApp yang terdaftar sebagai tujuan pengiriman.
              </p>
              {targetList.length > 0 && (
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllTargets}
                    className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllTargets}
                    className="font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>
              )}
            </div>
          </div>

          {targetList.length === 0 ? (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 space-y-1 mt-2">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                Belum ada nomor atau ID Group WhatsApp terdaftar
              </div>
              <p>
                Silakan tambahkan nomor atau ID Group WhatsApp pada panel <strong>"Nomor Tujuan / ID Group WhatsApp"</strong> di atas terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {targetList.map((t) => {
                  const isSelected = autoSendTargetIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTargetSelection(t.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/30 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 truncate">
                              {t.name}
                            </span>
                            {t.isDefault && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono truncate">
                            <span>{t.target}</span>
                            <span className="text-[10px] text-slate-400 font-sans font-semibold">
                              ({t.type === 'group' ? 'Group' : 'Personal'})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md shrink-0">
                          Dipilih
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Pemilihan Count */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-500 font-medium">
                  {autoSendTargetIds.length > 0 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {autoSendTargetIds.length} tujuan dipilih untuk pengiriman otomatis
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Belum ada yang dipilih (sistem akan otomatis mengirim ke Target Default)
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400">
                  Total terdaftar: {targetList.length}
                </span>
              </div>
            </div>
          )}

          {/* Informasi Status Terakhir & Tombol Fitur Nonaktif/Aktif */}
          <div className="p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs space-y-2.5 mt-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="font-extrabold text-slate-800 flex items-center gap-2 text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-slate-700 shrink-0" />
              Status Pengiriman Terakhir:
            </span>
            {lastAutoSentDate ? (
              <span className="font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-md text-xs">
                Terkirim: {lastAutoSentDate}
              </span>
            ) : (
              <span className="font-bold text-slate-500 italic bg-slate-200/60 border border-slate-300 px-3 py-1 rounded-md text-xs">
                Belum ada pengiriman otomatis hari ini
              </span>
            )}
          </div>

          <p className="text-slate-500 text-xs leading-relaxed">
            Sistem dilengkapi pelindung ganda agar pesan tidak terkirim berulang kali pada hari yang sama meskipun absensi diubah kembali.
          </p>

          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <div>
              {lastAutoSentDate ? (
                <button
                  type="button"
                  onClick={handleResetLastSent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer"
                  title="Reset catatan terkirim agar dapat mengirim otomatis lagi hari ini"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Status Hari Ini</span>
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => handleToggleAutoSend(!autoSendOnComplete)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer border shadow-xs ml-auto ${
                autoSendOnComplete
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 ring-2 ring-emerald-300/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              {autoSendOnComplete ? (
                <>
                  <ToggleRight className="w-4 h-4 text-yellow-300" />
                  <span>FITUR DIAKTIFKAN</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-slate-500" />
                  <span>FITUR NONAKTIF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
        </div>
      </div>
      )}

      {/* Tab 2: Template Pesan Dinamis & Layar HP Orang Tua */}
      {activeGatewayTab === 'template' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          <div className="lg:col-span-7">
            <WhatsAppTemplateEditor
              schoolSettings={schoolSettings}
              onSaveTemplates={handleSaveTemplates}
              activeTab={templateTab}
              onActiveTabChange={setTemplateTab}
            />
          </div>
          <div className="lg:col-span-5">
            <WhatsAppPhonePreview
              messageText={livePreviewMessage}
              previewMode={templateTab}
              onPreviewModeChange={setTemplateTab}
              students={students || []}
              selectedStudentId={selectedStudentId}
              onSelectStudentId={setSelectedStudentId}
              schoolSettings={schoolSettings}
              targetList={targetList}
              onSendTestMessage={handleSendTestFromPreview}
              isSendingTest={isSendingTest}
            />
          </div>
        </div>
      )}
    </div>
  );
};

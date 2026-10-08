import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Plus,
  UserPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Image as ImageIcon,
  Play,
  Pause,
  Upload,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';

const PRESET_BANNER_TEMPLATES = [
  {
    name: 'NGO Bicycle Hand Over Program',
    category: 'Transportation Aid',
    bannerUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=1200',
    description: 'Providing bicycles to rural area students to ensure zero absenteeism due to transport difficulties.',
    eligibilityCriteria: 'Students residing > 3 km from school with household transport need.',
  },
  {
    name: 'Free Midday Meals & Nutrition Scheme',
    category: 'Nutrition Support',
    bannerUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=1200',
    description: 'Daily wholesome midday meals and nutritional supplements provided to all primary & secondary students.',
    eligibilityCriteria: 'All enrolled Grade 1 - 11 students eligible for daily meals.',
  },
  {
    name: 'Uniforms & School Supplies Assistance',
    category: 'Material Support',
    bannerUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200',
    description: 'Annual distribution of free school uniform material, footwear, and textbook/stationery vouchers.',
    eligibilityCriteria: 'Government assistance eligible households and low-income families.',
  },
  {
    name: 'Digital Inclusion & IT Laptop Grant',
    category: 'Technology Grant',
    bannerUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1200',
    description: 'Refurbished laptops and internet connectivity SIM cards for O/L students for computer literacy.',
    eligibilityCriteria: 'Grade 10 & 11 students with high academic standing.',
  },
  {
    name: 'Presidential Merit Scholarship Fund',
    category: 'Financial Grant',
    bannerUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200',
    description: 'Monthly cash stipends to top academic performers to support higher secondary education fees.',
    eligibilityCriteria: 'Top 5 rankers in term examinations requiring financial aid.',
  },
];

const emptyProgramForm = {
  name: '',
  description: '',
  eligibilityCriteria: '',
  academicYear: 2026,
  budgetAllocated: 100000,
  bannerUrl: PRESET_BANNER_TEMPLATES[0].bannerUrl,
};

export const WelfareModule: React.FC = () => {
  const {
    welfarePrograms,
    welfareEnrolments,
    students,
    addWelfareProgram,
    deleteWelfareProgram,
    enrolWelfareStudent,
    disburseWelfareItem,
    activeRole,
  } = useData();

  const isStaffOrAdmin = ['principal', 'vice_principal', 'admin', 'staff'].includes(activeRole);

  // Filter out archived programs for the active Carousel banner view
  const activePrograms = welfarePrograms.filter((p) => !p.isArchived);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [showEnrolModal, setShowEnrolModal] = useState(false);
  const [enrolStudentId, setEnrolStudentId] = useState(students[0]?.id || '');

  // Keep currentIndex bounded
  useEffect(() => {
    if (activePrograms.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= activePrograms.length) {
      setCurrentIndex(Math.max(0, activePrograms.length - 1));
    }
  }, [activePrograms.length, currentIndex]);

  // Auto-play Carousel Timer
  useEffect(() => {
    if (!isPlaying || activePrograms.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePrograms.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying, activePrograms.length]);

  const currentProgram = activePrograms[currentIndex] || activePrograms[0];
  const selectedProgramId = currentProgram?.id || '';

  const programEnrolments = welfareEnrolments.filter((e) => e.programId === selectedProgramId);
  const enrolledStudentIds = new Set(programEnrolments.map((e) => e.studentId));
  const availableStudentsForEnrolment = students.filter((s) => !enrolledStudentIds.has(s.id));

  const handlePrevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? activePrograms.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activePrograms.length);
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    addWelfareProgram({
      ...programForm,
      bannerUrl: programForm.bannerUrl || PRESET_BANNER_TEMPLATES[0].bannerUrl,
    });
    setProgramForm(emptyProgramForm);
    setShowProgramModal(false);
  };

  const handleRemoveProgram = (progId: string, progName: string) => {
    if (
      window.confirm(
        `Remove program banner "${progName}" from active carousel?\n\nℹ️ Reports Protection: All historical student enrolments, disbursal timestamps, and audit records for this welfare program will remain 100% saved intact in Welfare Reports!`
      )
    ) {
      deleteWelfareProgram(progId);
    }
  };

  const handleEnrolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProgramId && enrolStudentId) {
      enrolWelfareStudent(selectedProgramId, enrolStudentId);
      setShowEnrolModal(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_BANNER_TEMPLATES[0]) => {
    setProgramForm((prev) => ({
      ...prev,
      name: preset.name,
      description: preset.description,
      eligibilityCriteria: preset.eligibilityCriteria,
      bannerUrl: preset.bannerUrl,
    }));
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please select a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProgramForm((prev) => ({
            ...prev,
            bannerUrl: reader.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Welfare Administration & Benefits</Badge>}
        title="Student Welfare Programs & Disbursement"
        description="Manage active student welfare programs, template banners, and benefit disbursals."
        actions={
          isStaffOrAdmin ? (
            <Button onClick={() => setShowProgramModal(true)}>
              <Plus className="w-4 h-4" /> Create program banner
            </Button>
          ) : undefined
        }
      />

      {/* FULL-LENGTH CAROUSEL BANNER HERO CARD */}
      <div className="w-full relative group rounded-2xl overflow-hidden shadow-xl border border-border bg-slate-900 transition-all duration-300">
        {activePrograms.length > 0 && currentProgram ? (
          <div
            className="relative min-h-[340px] sm:min-h-[380px] lg:min-h-[420px] flex flex-col justify-center items-center p-6 sm:p-8 lg:p-10 text-white bg-cover bg-center text-center transition-all duration-700 ease-in-out"
            style={{
              backgroundImage: `url(${
                currentProgram.bannerUrl || PRESET_BANNER_TEMPLATES[0].bannerUrl
              })`,
            }}
            onMouseEnter={() => setIsPlaying(false)}
            onMouseLeave={() => setIsPlaying(true)}
          >
            {/* Rich Dark Gradient Backdrop Overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/40" />

            {/* Top Right Controls & Slide Indicators */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-2">
              {isStaffOrAdmin && (
                <>
                  <button
                    onClick={() => {
                      setEnrolStudentId(availableStudentsForEnrolment[0]?.id || '');
                      setShowEnrolModal(true);
                    }}
                    disabled={availableStudentsForEnrolment.length === 0}
                    className="p-2.5 rounded-full bg-brand/80 hover:bg-brand border border-brand/50 text-white backdrop-blur-md transition-all transform hover:scale-105 disabled:opacity-50 shadow-md"
                    title="Enrol student into this welfare program"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveProgram(currentProgram.id, currentProgram.name)}
                    className="p-2.5 rounded-full bg-red-500/20 hover:bg-red-600 border border-red-500/40 text-white backdrop-blur-md transition-all transform hover:scale-105"
                    title="Remove banner program from active carousel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              {activePrograms.length > 1 && (
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-full bg-slate-950/60 backdrop-blur-md hover:bg-white/20 border border-white/10 text-white transition-colors"
                  title={isPlaying ? 'Pause Auto-slide' : 'Play Auto-slide'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Slide Navigation Arrow Buttons */}
            {activePrograms.length > 1 && (
              <>
                <button
                  onClick={handlePrevSlide}
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-950/50 backdrop-blur-md hover:bg-white/30 border border-white/20 text-white transition-all transform hover:scale-110 shadow-lg opacity-80 group-hover:opacity-100"
                  title="Previous program slide"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextSlide}
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-950/50 backdrop-blur-md hover:bg-white/30 border border-white/20 text-white transition-all transform hover:scale-110 shadow-lg opacity-80 group-hover:opacity-100"
                  title="Next program slide"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Main Content Area in Slide (Centered) */}
            <div className="relative z-10 space-y-4 max-w-3xl text-center mx-auto animate-fade-in flex flex-col items-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-tight text-white leading-tight drop-shadow-md text-center">
                {currentProgram.name}
              </h2>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed drop-shadow line-clamp-3 text-center max-w-2xl mx-auto">
                {currentProgram.description}
              </p>

              {/* Budget Display (Full number without label or L suffix) */}
              <div className="pt-2 flex items-center justify-center">
                <span className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-emerald-400 tracking-wider drop-shadow-lg">
                  LKR {currentProgram.budgetAllocated.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Bottom Indicator Dots */}
            {activePrograms.length > 1 && (
              <div className="relative z-10 flex items-center justify-center gap-2 mt-6">
                {activePrograms.map((prog, idx) => (
                  <button
                    key={prog.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentIndex ? 'w-8 bg-brand' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Slide to ${prog.name}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-white bg-slate-900 flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-full bg-slate-800 border border-slate-700 text-brand">
              <HeartHandshake className="w-10 h-10" />
            </div>
            <h3 className="font-display text-xl font-bold text-white">No Active Program Banners</h3>
            <p className="text-sm text-slate-300 max-w-md">
              Create and upload custom welfare program banner templates to slide in the hero carousel. All student enrolment reports remain 100% saved in Welfare Reports.
            </p>
            {isStaffOrAdmin && (
              <Button onClick={() => setShowProgramModal(true)} className="bg-brand text-white">
                <Plus className="w-4 h-4" /> Create first program banner
              </Button>
            )}
          </div>
        )}
      </div>

      {/* DISBURSEMENT ROSTER & ENROLMENT TABLE */}
      {currentProgram && (
        <Card padded={false}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ink">Disbursement Roster:</span>
              <Badge tone="brand">{currentProgram.name}</Badge>
            </div>

            {isStaffOrAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  setEnrolStudentId(availableStudentsForEnrolment[0]?.id || '');
                  setShowEnrolModal(true);
                }}
                disabled={availableStudentsForEnrolment.length === 0}
              >
                <UserPlus className="w-3.5 h-3.5" /> Enrol student
              </Button>
            )}
          </div>

          {programEnrolments.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No students enrolled in this program yet"
              description="Enrol students into this program to start tracking benefit disbursements."
              compact
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Enrolment ID</TH>
                  <TH>Beneficiary Student</TH>
                  <TH>Student ID</TH>
                  <TH>Status</TH>
                  <TH>Disbursed At</TH>
                  <TH className="text-right">Action</TH>
                </tr>
              </THead>
              <TBody>
                {programEnrolments.map((enr) => {
                  const student = students.find((s) => s.id === enr.studentId);
                  return (
                    <TR key={enr.id}>
                      <TD className="font-mono-data text-xs">{enr.id}</TD>
                      <TD className="font-semibold text-ink">
                        {student ? `${student.firstName} ${student.lastName}` : enr.studentId}
                      </TD>
                      <TD className="font-mono-data text-xs text-ink-muted">
                        {student?.studentNo || 'N/A'}
                      </TD>
                      <TD>
                        <Badge tone={enr.status === 'disbursed' ? 'success' : 'warning'}>
                          {enr.status}
                        </Badge>
                      </TD>
                      <TD className="font-mono-data text-xs text-ink-muted">
                        {enr.disbursedAt
                          ? new Date(enr.disbursedAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Pending'}
                      </TD>
                      <TD className="text-right">
                        {enr.status !== 'disbursed' ? (
                          <Button size="sm" onClick={() => disburseWelfareItem(enr.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm disbursement
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed
                          </span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {/* CREATE PROGRAM BANNER TEMPLATE MODAL */}
      <Modal
        open={showProgramModal}
        onClose={() => setShowProgramModal(false)}
        title="Create Welfare Program & Banner Template"
        eyebrow="Carousel Banner Template"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowProgramModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="program-form">
              Create & Publish Banner
            </Button>
          </>
        }
      >
        <form id="program-form" onSubmit={handleCreateProgram} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink uppercase tracking-wide">
              Quick Select Preset Template Banners:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
              {PRESET_BANNER_TEMPLATES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 text-left border border-border hover:border-brand rounded-xl bg-surface-muted hover:bg-brand-tint/30 transition-colors flex items-center gap-3"
                >
                  <img
                    src={preset.bannerUrl}
                    alt={preset.name}
                    className="w-12 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-ink truncate">{preset.name}</div>
                    <div className="text-[11px] text-ink-faint truncate">{preset.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <FormField label="Program Title" required>
            <Input
              type="text"
              value={programForm.name}
              onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              placeholder="e.g. NGO Bicycle Hand Over Program"
              required
            />
          </FormField>

          <FormField label="Banner Image (Select Local File or Image URL)" required>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                type="text"
                value={
                  programForm.bannerUrl.startsWith('data:')
                    ? '[Local Image File Selected]'
                    : programForm.bannerUrl
                }
                onChange={(e) => setProgramForm({ ...programForm, bannerUrl: e.target.value })}
                placeholder="https://images.unsplash.com/... or choose local file"
                required
              />
              <label className="shrink-0 cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white hover:bg-brand-dark rounded-xl text-xs font-semibold shadow-sm transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload Local File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </FormField>

          {programForm.bannerUrl && (
            <div className="rounded-xl overflow-hidden border border-border aspect-[16/6] bg-slate-900 relative">
              <img
                src={programForm.bannerUrl}
                alt="Banner Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 flex flex-col justify-end">
                <span className="text-xs text-white font-bold">{programForm.name || 'Banner Template Ratio Preview'}</span>
              </div>
            </div>
          )}

          <FormField label="Program Description" required>
            <Textarea
              rows={2}
              value={programForm.description}
              onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
              placeholder="Describe program goals and benefit details..."
              required
            />
          </FormField>

          <FormField label="Eligibility Criteria" required>
            <Input
              type="text"
              value={programForm.eligibilityCriteria}
              onChange={(e) => setProgramForm({ ...programForm, eligibilityCriteria: e.target.value })}
              placeholder="e.g. Rural area residence, low income..."
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Academic Year" required>
              <Select
                value={programForm.academicYear}
                onChange={(e) =>
                  setProgramForm({ ...programForm, academicYear: Number(e.target.value) })
                }
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Budget Allocated (LKR)" required>
              <Input
                type="number"
                min={0}
                step={10000}
                value={programForm.budgetAllocated}
                onChange={(e) =>
                  setProgramForm({
                    ...programForm,
                    budgetAllocated: Math.max(0, Number(e.target.value)),
                  })
                }
                required
              />
            </FormField>
          </div>

          <div className="p-3 bg-brand-tint/50 border border-brand/20 rounded-xl text-xs text-ink-muted flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <span>
              <strong>Welfare Reports Audit Safety:</strong> Removing or deleting a welfare program banner from the active carousel will never alter or erase historical student enrolments or financial disbursement audit reports.
            </span>
          </div>
        </form>
      </Modal>

      {/* ENROL STUDENT MODAL */}
      <Modal
        open={showEnrolModal}
        onClose={() => setShowEnrolModal(false)}
        title={`Enrol Student into ${currentProgram?.name || 'Program'}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEnrolModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="enrol-form">
              Enrol Student
            </Button>
          </>
        }
      >
        <form id="enrol-form" onSubmit={handleEnrolSubmit} className="space-y-3.5">
          <FormField label="Select Beneficiary Student" required>
            <Select value={enrolStudentId} onChange={(e) => setEnrolStudentId(e.target.value)}>
              {availableStudentsForEnrolment.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.studentNo})
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

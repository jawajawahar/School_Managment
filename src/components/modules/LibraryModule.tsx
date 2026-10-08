import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  Coins,
  UserCheck,
  RotateCcw,
  BookMarked,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { LibraryItem, LibraryTransaction } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Badge, BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input, Select } from '../ui/FormField';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';
import { Tabs } from '../ui/Tabs';

const emptyBookForm = {
  isbn: '',
  title: '',
  author: '',
  category: '',
  copiesTotal: 1,
  shelfLocation: '',
};

export const LibraryModule: React.FC = () => {
  const {
    libraryItems,
    libraryTransactions,
    students,
    teachers,
    staff,
    issueLibraryBook,
    returnLibraryBook,
    addLibraryItem,
    updateLibraryItem,
    deleteLibraryItem,
    activeRole,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'catalogue' | 'circulation'>('catalogue');
  const isLibrarianOrAdmin = ['principal', 'vice_principal', 'admin', 'librarian'].includes(activeRole);

  // Issue Book Modal State
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [borrowerType, setBorrowerType] = useState<'student' | 'staff'>('student');
  const [borrowerId, setBorrowerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState(14);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [dailyFineRate, setDailyFineRate] = useState(50);
  const [issueRemarks, setIssueRemarks] = useState('');

  // Add / Edit Book Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState(emptyBookForm);

  // Return Book Modal State
  const [returningTx, setReturningTx] = useState<LibraryTransaction | null>(null);
  const [fineAmountCollected, setFineAmountCollected] = useState(0);
  const [returnRemarks, setReturnRemarks] = useState('');

  // Sync default borrowerId when borrowerType changes
  useEffect(() => {
    if (borrowerType === 'student') {
      if (students.length > 0 && !students.some((s) => s.id === borrowerId)) {
        setBorrowerId(students[0].id);
      }
    } else {
      const allStaff = [...(staff || []), ...(teachers || [])];
      if (allStaff.length > 0 && !allStaff.some((st: any) => (st.id || st.userId) === borrowerId)) {
        setBorrowerId(allStaff[0].userId || allStaff[0].id);
      }
    }
  }, [borrowerType, students, staff, teachers, borrowerId]);

  // Recalculate Due Date when Issue Date or Duration Days change
  const handleIssueDateChange = (newIssueDate: string) => {
    setIssueDate(newIssueDate);
    if (newIssueDate) {
      const d = new Date(newIssueDate);
      d.setDate(d.getDate() + Number(durationDays || 14));
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  const handleDurationChange = (days: number) => {
    setDurationDays(days);
    if (issueDate) {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + Number(days || 14));
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);
    if (issueDate && newDueDate) {
      const start = new Date(issueDate).getTime();
      const end = new Date(newDueDate).getTime();
      const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      setDurationDays(diffDays);
    }
  };

  // Helper for dynamic overdue days and fine calculation
  const getOverdueInfo = (tx: LibraryTransaction) => {
    const rate = tx.dailyFineRate || 50;
    const dueTime = new Date(tx.dueDate).getTime();

    // Use actual return date if returned, else current date
    const checkDate = tx.status === 'returned' && tx.returnDate ? new Date(tx.returnDate) : new Date();
    const checkTime = checkDate.getTime();

    // Strip time offset differences by floor to calendar days
    const daysLate = Math.max(0, Math.floor((checkTime - dueTime) / (1000 * 60 * 60 * 24)));
    const calculatedFine = daysLate * rate;
    const isOverdue = daysLate > 0;

    return {
      daysLate,
      calculatedFine,
      dailyFineRate: rate,
      isOverdue,
    };
  };

  const filteredItems = libraryItems.filter(
    (i) =>
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.isbn.includes(searchTerm)
  );

  const totalIssued = libraryTransactions.filter((t) => t.status !== 'returned').length;
  const overdueTransactions = libraryTransactions.filter((t) => {
    if (t.status === 'returned') return false;
    const info = getOverdueInfo(t);
    return info.isOverdue;
  });
  const totalOverdueCount = overdueTransactions.length;

  const handleOpenIssueModal = (item: LibraryItem) => {
    setSelectedBookId(item.id);
    setBorrowerType('student');
    setBorrowerId(students[0]?.id || '');
    const todayStr = new Date().toISOString().split('T')[0];
    setIssueDate(todayStr);
    setDurationDays(14);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().split('T')[0]);
    setDailyFineRate(50);
    setIssueRemarks('');
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBookId && borrowerId) {
      let borrowerName = '';
      if (borrowerType === 'student') {
        const s = students.find((st) => st.id === borrowerId);
        if (s) borrowerName = `${s.firstName} ${s.lastName} (${s.studentNo})`;
      } else {
        const st: any = [...(staff || []), ...(teachers || [])].find((u: any) => u.id === borrowerId || u.userId === borrowerId);
        if (st) borrowerName = `${st.fullName || st.name || 'Staff Member'} (${st.roleDescription || st.department || 'Staff'})`;
      }

      issueLibraryBook(
        selectedBookId,
        borrowerId,
        borrowerType,
        issueDate,
        dueDate,
        dailyFineRate,
        borrowerName,
        issueRemarks
      );
      setSelectedBookId(null);
    }
  };

  const handleOpenReturnModal = (tx: LibraryTransaction) => {
    const info = getOverdueInfo(tx);
    setReturningTx(tx);
    setFineAmountCollected(info.calculatedFine);
    setReturnRemarks('');
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returningTx) {
      returnLibraryBook(returningTx.id, fineAmountCollected, returnRemarks);
      setReturningTx(null);
    }
  };

  const openAddBookModal = () => {
    setEditingBookId(null);
    setBookForm(emptyBookForm);
    setShowBookModal(true);
  };

  const openEditBookModal = (item: LibraryItem) => {
    setEditingBookId(item.id);
    setBookForm({
      isbn: item.isbn,
      title: item.title,
      author: item.author,
      category: item.category,
      copiesTotal: item.copiesTotal,
      shelfLocation: item.shelfLocation,
    });
    setShowBookModal(true);
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBookId) {
      const existing = libraryItems.find((i) => i.id === editingBookId);
      if (!existing) return;
      const copiesIssued = existing.copiesTotal - existing.copiesAvailable;
      updateLibraryItem({
        ...existing,
        ...bookForm,
        copiesAvailable: Math.max(0, bookForm.copiesTotal - copiesIssued),
      });
    } else {
      addLibraryItem({ ...bookForm, copiesAvailable: bookForm.copiesTotal });
    }
    setShowBookModal(false);
  };

  const handleDeleteBook = (item: LibraryItem) => {
    if (item.copiesAvailable < item.copiesTotal) {
      alert(`Can't remove "${item.title}" — one or more copies are currently on loan.`);
      return;
    }
    if (window.confirm(`Remove "${item.title}" from the catalogue?`)) {
      deleteLibraryItem(item.id);
    }
  };

  const selectedBookToIssue = libraryItems.find((i) => i.id === selectedBookId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Library Operations & Circulation</Badge>}
        title="Catalogue, Loan Issuance & Overdue Fines"
        description="Track catalogue inventory, customize loan dates, and compute daily overdue fines automatically."
        actions={
          <>
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { id: 'catalogue', label: 'Catalogue', icon: BookOpen, count: libraryItems.length },
                { id: 'circulation', label: 'Loans & Overdues', icon: AlertCircle, count: libraryTransactions.length },
              ]}
            />
            {isLibrarianOrAdmin && activeTab === 'catalogue' && (
              <Button onClick={openAddBookModal}>
                <Plus className="w-4 h-4" /> Add Book
              </Button>
            )}
          </>
        }
      />

      {/* Catalogue View */}
      {activeTab === 'catalogue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Titles Catalogued</div>
                <div className="text-2xl font-semibold text-ink font-mono-data mt-1">
                  {libraryItems.length}
                </div>
              </div>
              <BookOpen className="w-6 h-6 text-brand" />
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Currently Issued</div>
                <div className="text-2xl font-semibold text-ink font-mono-data mt-1">{totalIssued}</div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-warning" />
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Overdue Loans</div>
                <div className="text-2xl font-semibold text-danger font-mono-data mt-1">
                  {totalOverdueCount}
                </div>
              </div>
              <AlertCircle className="w-6 h-6 text-danger" />
            </Card>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink focus:outline-none focus:border-brand"
            />
          </div>

          <Card padded={false}>
            {libraryItems.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No books catalogued yet"
                description="Add your first book to start tracking the library's collection."
                action={
                  isLibrarianOrAdmin ? (
                    <Button onClick={openAddBookModal}>
                      <Plus className="w-4 h-4" /> Add First Book
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>ISBN</TH>
                    <TH>Title</TH>
                    <TH>Author</TH>
                    <TH>Category</TH>
                    <TH className="text-center">Available Copies</TH>
                    <TH>Shelf</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {filteredItems.map((item) => (
                    <TR key={item.id}>
                      <TD className="font-mono-data text-xs">{item.isbn}</TD>
                      <TD className="font-semibold text-ink">{item.title}</TD>
                      <TD className="text-ink-muted">{item.author}</TD>
                      <TD>
                        <Badge tone="neutral">{item.category}</Badge>
                      </TD>
                      <TD className="text-center font-mono-data">
                        <span
                          className={
                            item.copiesAvailable > 0
                              ? 'text-success font-semibold'
                              : 'text-danger font-semibold'
                          }
                        >
                          {item.copiesAvailable} / {item.copiesTotal}
                        </span>
                      </TD>
                      <TD className="text-ink-muted font-mono-data text-xs">{item.shelfLocation}</TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            disabled={item.copiesAvailable <= 0}
                            onClick={() => handleOpenIssueModal(item)}
                            title="Issue book loan with custom dates & overdue fine rules"
                          >
                            <BookMarked className="w-3.5 h-3.5" /> Issue Loan
                          </Button>
                          {isLibrarianOrAdmin && (
                            <>
                              <button
                                onClick={() => openEditBookModal(item)}
                                className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
                                title="Edit book"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBook(item)}
                                className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-tint rounded-lg transition-colors"
                                title="Remove book"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Circulation & Overdue Fines Ledger */}
      {activeTab === 'circulation' && (
        <div className="space-y-4">
          <Card padded={false}>
            {libraryTransactions.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="No circulation activity yet"
                description="Issued and returned books will appear here."
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Ref ID</TH>
                    <TH>Book Title</TH>
                    <TH>Borrower</TH>
                    <TH>Issue Date</TH>
                    <TH>Due Date</TH>
                    <TH>Overdue & Fine Calculation</TH>
                    <TH className="text-right">Action</TH>
                  </tr>
                </THead>
                <TBody>
                  {libraryTransactions.map((tx) => {
                    const item = libraryItems.find((i) => i.id === tx.itemId);
                    const studentBorrower = students.find((s) => s.id === tx.borrowerId);
                    const staffBorrower: any = [...(staff || []), ...(teachers || [])].find(
                      (st: any) => st.id === tx.borrowerId || st.userId === tx.borrowerId
                    );

                    let borrowerLabel = tx.borrowerName || '';
                    if (!borrowerLabel) {
                      if (studentBorrower) {
                        borrowerLabel = `${studentBorrower.firstName} ${studentBorrower.lastName} (${studentBorrower.studentNo})`;
                      } else if (staffBorrower) {
                        borrowerLabel = `${staffBorrower.fullName || staffBorrower.name || 'Staff'} (${staffBorrower.department || 'Staff'})`;
                      } else {
                        borrowerLabel = tx.borrowerId;
                      }
                    }

                    const info = getOverdueInfo(tx);
                    const isReturned = tx.status === 'returned';

                    return (
                      <TR key={tx.id}>
                        <TD className="font-mono-data text-xs text-ink-muted">{tx.id}</TD>
                        <TD className="font-semibold text-ink">{item?.title || 'Book Title'}</TD>
                        <TD className="text-ink">
                          <div className="font-medium text-xs">{borrowerLabel}</div>
                          <span className="text-[11px] text-ink-muted capitalize">
                            Type: {tx.borrowerType}
                          </span>
                        </TD>
                        <TD className="font-mono-data text-xs text-ink-muted">{tx.issueDate}</TD>
                        <TD
                          className={`font-mono-data text-xs font-semibold ${
                            info.isOverdue && !isReturned ? 'text-danger' : 'text-ink'
                          }`}
                        >
                          {tx.dueDate}
                        </TD>
                        <TD>
                          {isReturned ? (
                            <div className="space-y-0.5">
                              <Badge tone="success">
                                <CheckCircle2 className="w-3 h-3" /> Returned
                              </Badge>
                              {(tx.fineAmount || 0) > 0 && (
                                <div className="text-[11px] font-mono-data text-emerald-700 font-semibold">
                                  Fine Collected: LKR {tx.fineAmount}
                                </div>
                              )}
                            </div>
                          ) : info.isOverdue ? (
                            <div className="space-y-1">
                              <Badge tone="danger">
                                <AlertCircle className="w-3 h-3" /> Overdue: {info.daysLate} Day
                                {info.daysLate > 1 ? 's' : ''}
                              </Badge>
                              <div className="text-xs font-mono-data font-bold text-danger">
                                Fine: LKR {info.calculatedFine}{' '}
                                <span className="text-[10px] font-normal text-ink-muted">
                                  ({info.daysLate}d × LKR {info.dailyFineRate}/day)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <Badge tone="warning">
                              <Clock className="w-3 h-3" /> Active Loan (On Time)
                            </Badge>
                          )}
                        </TD>
                        <TD className="text-right">
                          {!isReturned ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReturnModal(tx)}
                              title="Process book return and collect overdue fine"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Return & Collect
                            </Button>
                          ) : (
                            <span className="text-xs text-ink-faint">Completed</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ISSUE BOOK LOAN MODAL */}
      <Modal
        open={Boolean(selectedBookId)}
        onClose={() => setSelectedBookId(null)}
        title="Issue Book Loan & Overdue Fine Rules"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedBookId(null)}>
              Cancel
            </Button>
            <Button type="submit" form="issue-book-form">
              Confirm Book Loan
            </Button>
          </>
        }
      >
        {selectedBookToIssue && (
          <form id="issue-book-form" onSubmit={handleIssueSubmit} className="space-y-4">
            {/* Selected Book Banner */}
            <div className="bg-surface-muted p-4 rounded-xl border border-surface-border flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Book To Issue</div>
                <div className="text-base font-bold text-ink mt-0.5">{selectedBookToIssue.title}</div>
                <div className="text-xs text-ink-muted mt-1 flex items-center gap-2">
                  <span>Author: {selectedBookToIssue.author}</span>
                  <span>| Shelf: {selectedBookToIssue.shelfLocation}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-muted uppercase font-semibold">Available Copies</div>
                <div className="text-lg font-mono-data font-bold text-success mt-0.5">
                  {selectedBookToIssue.copiesAvailable} / {selectedBookToIssue.copiesTotal}
                </div>
              </div>
            </div>

            {/* Borrower Type Selection */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-ink-muted">Borrower Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBorrowerType('student')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    borrowerType === 'student'
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-surface text-ink border-surface-border hover:bg-surface-muted'
                  }`}
                >
                  Student Borrower
                </button>
                <button
                  type="button"
                  onClick={() => setBorrowerType('staff')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    borrowerType === 'staff'
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-surface text-ink border-surface-border hover:bg-surface-muted'
                  }`}
                >
                  Staff / Teacher Borrower
                </button>
              </div>
            </div>

            {/* Borrower Selection */}
            <FormField label="Borrower Name" required hint="Select account borrowing the book">
              <Select value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)}>
                {borrowerType === 'student'
                  ? students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} (Student No: {s.studentNo})
                      </option>
                    ))
                  : [...(staff || []), ...(teachers || [])].map((st: any) => {
                      const id = st.userId || st.id;
                      const name = st.fullName || st.name || 'Staff Member';
                      const desc = st.roleDescription || st.department || st.subjectSpecialization || 'Staff';
                      return (
                        <option key={id} value={id}>
                          {name} ({desc})
                        </option>
                      );
                    })}
              </Select>
            </FormField>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField label="Issue Date" required>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Loan Period (Days)" required hint="Changing days recalculates Due Date">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={durationDays}
                  onChange={(e) => handleDurationChange(Math.max(1, Number(e.target.value)))}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField label="Expected Return Date (Due Date)" required hint="Recalculates duration automatically">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Daily Overdue Fine Rate (LKR)" required hint="Fixed fine added per day late">
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={dailyFineRate}
                  onChange={(e) => setDailyFineRate(Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
            </div>

            {/* Fine Formula Preview Card */}
            <div className="bg-brand-tint/50 p-3.5 rounded-xl border border-brand/20 space-y-1 text-xs">
              <div className="font-semibold text-brand flex items-center gap-1.5">
                <Coins className="w-4 h-4" /> Automatic Daily Overdue Fine Calculation Rule
              </div>
              <p className="text-ink-muted">
                If the borrower returns after <strong className="text-ink">{dueDate}</strong>, each extra day adds{' '}
                <strong className="text-brand">LKR {dailyFineRate}</strong> automatically:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono-data text-[11px]">
                <span className="bg-white/80 px-2 py-0.5 rounded border border-brand/20 text-ink">
                  Day 1 Late: <strong>LKR {dailyFineRate * 1}</strong>
                </span>
                <span className="bg-white/80 px-2 py-0.5 rounded border border-brand/20 text-ink">
                  Day 2 Late: <strong>LKR {dailyFineRate * 2}</strong>
                </span>
                <span className="bg-white/80 px-2 py-0.5 rounded border border-brand/20 text-ink">
                  Day 3 Late: <strong>LKR {dailyFineRate * 3}</strong>
                </span>
                <span className="text-ink-muted">... (N Days × LKR {dailyFineRate})</span>
              </div>
            </div>

            <FormField label="Remarks / Loan Notes" hint="Optional notes for librarian">
              <Input
                type="text"
                value={issueRemarks}
                onChange={(e) => setIssueRemarks(e.target.value)}
                placeholder="e.g. Special permission granted for term project"
              />
            </FormField>
          </form>
        )}
      </Modal>

      {/* PROCESS RETURN & COLLECT FINE MODAL */}
      <Modal
        open={Boolean(returningTx)}
        onClose={() => setReturningTx(null)}
        title="Process Book Return & Collect Fine"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturningTx(null)}>
              Cancel
            </Button>
            <Button type="submit" form="return-book-form">
              Confirm Book Return
            </Button>
          </>
        }
      >
        {returningTx && (() => {
          const info = getOverdueInfo(returningTx);
          const book = libraryItems.find((i) => i.id === returningTx.itemId);

          return (
            <form id="return-book-form" onSubmit={handleReturnSubmit} className="space-y-4">
              <div className="bg-surface-muted p-4 rounded-xl border border-surface-border">
                <div className="text-xs text-ink-muted uppercase font-semibold">Borrower & Loan Details</div>
                <div className="font-semibold text-ink text-sm mt-0.5">
                  Book: {book?.title || 'Library Book'}
                </div>
                <div className="text-xs text-ink-muted mt-1 flex flex-wrap gap-3">
                  <span>Borrower: <strong className="text-ink">{returningTx.borrowerName || returningTx.borrowerId}</strong></span>
                  <span>Issued: <strong className="text-ink">{returningTx.issueDate}</strong></span>
                  <span>Due: <strong className="text-ink">{returningTx.dueDate}</strong></span>
                </div>
              </div>

              {/* Overdue Calculation Inspection Box */}
              <div className={`p-4 rounded-xl border ${info.isOverdue ? 'bg-danger-tint/40 border-danger/30' : 'bg-success-tint/40 border-success/30'}`}>
                <div className="flex items-start gap-3">
                  {info.isOverdue ? (
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className={`font-semibold text-sm ${info.isOverdue ? 'text-danger' : 'text-success'}`}>
                      {info.isOverdue ? `🚨 Loan is ${info.daysLate} Day${info.daysLate > 1 ? 's' : ''} Overdue!` : '✅ Book Returned On Time'}
                    </div>
                    {info.isOverdue ? (
                      <p className="text-xs text-ink-muted">
                        Automatic Calculation: <strong className="text-ink">{info.daysLate} Days Late</strong> × <strong className="text-ink">LKR {info.dailyFineRate}/day</strong> = <strong className="text-danger text-sm font-mono-data font-bold">LKR {info.calculatedFine}</strong>
                      </p>
                    ) : (
                      <p className="text-xs text-ink-muted">
                        No overdue fine incurred for this loan.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fine Collection Input & Quick Buttons */}
              <div className="space-y-2">
                <FormField label="Fine Amount Collected (LKR)" required hint="Adjust or collect full calculated fine">
                  <Input
                    type="number"
                    min="0"
                    value={fineAmountCollected}
                    onChange={(e) => setFineAmountCollected(Math.max(0, Number(e.target.value)))}
                    required
                  />
                </FormField>

                {info.isOverdue && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFineAmountCollected(info.calculatedFine)}
                      className="px-2.5 py-1 text-xs bg-surface border border-surface-border rounded-lg text-ink font-medium hover:bg-surface-muted transition-colors"
                    >
                      Collect Full Fine (LKR {info.calculatedFine})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFineAmountCollected(0)}
                      className="px-2.5 py-1 text-xs bg-surface border border-surface-border rounded-lg text-ink-muted hover:text-danger hover:border-danger/30 transition-colors"
                    >
                      Waive Fine (LKR 0)
                    </button>
                  </div>
                )}
              </div>

              <FormField label="Return Remarks / Notes">
                <Input
                  type="text"
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="e.g. Returned in good condition, fine collected at counter"
                />
              </FormField>
            </form>
          );
        })()}
      </Modal>

      {/* ADD / EDIT BOOK MODAL */}
      <Modal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        title={editingBookId ? 'Edit Book Information' : 'Add Book to Catalogue'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBookModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="book-form">
              {editingBookId ? 'Save Changes' : 'Add Book'}
            </Button>
          </>
        }
      >
        <form id="book-form" onSubmit={handleBookSubmit} className="space-y-4">
          <FormField label="ISBN Number" required>
            <Input
              type="text"
              value={bookForm.isbn}
              onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
              placeholder="e.g. 978-955-1234-56-7"
              required
            />
          </FormField>
          <FormField label="Book Title" required>
            <Input
              type="text"
              value={bookForm.title}
              onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
              placeholder="e.g. Advanced Physics for Grade 10"
              required
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField label="Author" required>
              <Input
                type="text"
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                placeholder="e.g. Dr. K. Wickramasinghe"
                required
              />
            </FormField>
            <FormField label="Category" required>
              <Input
                type="text"
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                placeholder="e.g. Science, Mathematics, Fiction"
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField
              label="Total Copies"
              required
              hint={editingBookId ? 'Copies currently on loan stay issued.' : undefined}
            >
              <Input
                type="number"
                min={1}
                value={bookForm.copiesTotal}
                onChange={(e) =>
                  setBookForm({ ...bookForm, copiesTotal: Math.max(1, Number(e.target.value)) })
                }
                required
              />
            </FormField>
            <FormField label="Shelf Location" required>
              <Input
                type="text"
                value={bookForm.shelfLocation}
                onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                placeholder="e.g. Shelf A-12, Science Section"
                required
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
};

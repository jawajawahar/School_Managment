import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  FileText,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  X,
  Building2,
  UserCheck,
  Calendar,
  Layers,
  History,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { InventoryItem, InventoryTransaction } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { FormField, Input, Select } from '../ui/FormField';
import { EmptyState } from '../ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../ui/Table';

const emptyItemForm = {
  name: '',
  category: 'Asset' as InventoryItem['category'],
  quantity: 1,
  unit: 'units',
  reorderLevel: 5,
  location: '',
  condition: 'Good' as InventoryItem['condition'],
};

export const InventoryModule: React.FC = () => {
  const {
    inventoryItems,
    inventoryTransactions = [],
    issueInventoryItem,
    returnInventoryItem,
    deleteInventoryTransaction,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    activeRole,
    currentUser,
    schoolProfile,
  } = useData();

  const isStaffOrAdmin = ['principal', 'vice_principal', 'admin', 'staff', 'lab_assistant'].includes(activeRole);

  const [activeTab, setActiveTab] = useState<'stock' | 'handovers'>('stock');

  // Search & Filters
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('all');

  const [handoverSearch, setHandoverSearch] = useState('');
  const [handoverStatusFilter, setHandoverStatusFilter] = useState<string>('all');
  const [handoverCategoryFilter, setHandoverCategoryFilter] = useState<string>('all');

  // Dispatch / Handover Modal State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [issueQty, setIssueQty] = useState(1);
  const [issuedTo, setIssuedTo] = useState('Grade 9 Science Dept');
  const [recipientCategory, setRecipientCategory] = useState('Department');
  const [handoverRemarks, setHandoverRemarks] = useState('');
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);

  // Add / Edit Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  // Return Modal State
  const [returningTx, setReturningTx] = useState<InventoryTransaction | null>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnCondition, setReturnCondition] = useState<InventoryItem['condition']>('Good');
  const [returnRemarks, setReturnRemarks] = useState('');

  // Print Handover Slip Modal State
  const [slipTx, setSlipTx] = useState<InventoryTransaction | null>(null);

  const lowStockCount = inventoryItems.filter((i) => i.quantity <= i.reorderLevel).length;

  // Filtered Stock Items
  const filteredStockItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      item.location.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesCategory = stockCategoryFilter === 'all' || item.category === stockCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Dispatched / Issue Handovers list
  const issueTransactions = inventoryTransactions.filter(
    (t) => t.type === 'issue' || (t.issuedTo && t.issuedTo.trim().length > 0)
  );

  const filteredHandovers = issueTransactions.filter((tx) => {
    const item = inventoryItems.find((i) => i.id === tx.itemId);
    const itemName = tx.itemName || item?.name || '';
    const matchesSearch =
      itemName.toLowerCase().includes(handoverSearch.toLowerCase()) ||
      (tx.issuedTo || '').toLowerCase().includes(handoverSearch.toLowerCase()) ||
      (tx.issuedBy || '').toLowerCase().includes(handoverSearch.toLowerCase()) ||
      (tx.remarks || '').toLowerCase().includes(handoverSearch.toLowerCase());

    const isReturned = tx.status === 'returned';
    const matchesStatus =
      handoverStatusFilter === 'all' ||
      (handoverStatusFilter === 'dispatched' && !isReturned) ||
      (handoverStatusFilter === 'returned' && isReturned);

    const category = tx.category || item?.category || 'Asset';
    const matchesCategory = handoverCategoryFilter === 'all' || category === handoverCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Metrics calculation
  const totalIssueCount = issueTransactions.length;
  const totalUnitsDispatched = issueTransactions.reduce((acc, t) => acc + (t.quantity || 0), 0);
  const activeDispatchedCount = issueTransactions.filter((t) => t.status !== 'returned').length;
  const returnedCount = issueTransactions.filter((t) => t.status === 'returned').length;

  // Handlers
  const handleOpenDispatch = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setIssueQty(1);
    setIssuedTo('');
    setRecipientCategory('Department');
    setHandoverRemarks('');
    setHandoverDate(new Date().toISOString().split('T')[0]);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemId) {
      issueInventoryItem(
        selectedItemId,
        issueQty,
        issuedTo,
        handoverRemarks,
        recipientCategory,
        handoverDate
      );
      setSelectedItemId(null);
    }
  };

  const handleOpenReturnModal = (tx: InventoryTransaction) => {
    setReturningTx(tx);
    setReturnQty(tx.quantity || 1);
    setReturnCondition('Good');
    setReturnRemarks('');
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returningTx) {
      returnInventoryItem(returningTx.id, returnQty, returnRemarks, returnCondition);
      setReturningTx(null);
    }
  };

  const openAddItemModal = () => {
    setEditingItemId(null);
    setItemForm(emptyItemForm);
    setShowItemModal(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      location: item.location,
      condition: item.condition,
    });
    setShowItemModal(true);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItemId) {
      updateInventoryItem({ id: editingItemId, ...itemForm });
    } else {
      addInventoryItem(itemForm);
    }
    setShowItemModal(false);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (window.confirm(`Remove "${item.name}" from the inventory ledger?`)) {
      deleteInventoryItem(item.id);
    }
  };

  const handleDeleteHandover = (tx: InventoryTransaction) => {
    if (window.confirm(`Delete this asset handover record?`)) {
      deleteInventoryTransaction(tx.id);
    }
  };

  const selectedItemToDispatch = inventoryItems.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Asset & Consumable Inventory</Badge>}
        title="Stock Ledger & Asset Handover Management"
        description="Track school property stock, reorder levels, and asset handover dispatch records."
        actions={
          isStaffOrAdmin ? (
            <div className="flex items-center gap-2">
              <Button onClick={openAddItemModal}>
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-surface-border pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
              activeTab === 'stock'
                ? 'border-brand text-brand bg-brand-tint/30 font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted'
            }`}
          >
            <Package className="w-4 h-4" />
            Stock Ledger ({inventoryItems.length})
          </button>
          <button
            onClick={() => setActiveTab('handovers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
              activeTab === 'handovers'
                ? 'border-brand text-brand bg-brand-tint/30 font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted'
            }`}
          >
            <History className="w-4 h-4" />
            Asset Handover Records ({issueTransactions.length})
            {activeDispatchedCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-brand text-white">
                {activeDispatchedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: STOCK LEDGER */}
      {activeTab === 'stock' && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Items Tracked</div>
                <div className="text-2xl font-semibold text-ink font-mono-data mt-1">
                  {inventoryItems.length}
                </div>
              </div>
              <Package className="w-6 h-6 text-brand" />
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Below Reorder Level</div>
                <div className="text-2xl font-semibold text-ink font-mono-data mt-1">
                  {lowStockCount}
                </div>
              </div>
              <AlertTriangle className="w-6 h-6 text-warning" />
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Active Dispatched Assets</div>
                <div className="text-2xl font-semibold text-ink font-mono-data mt-1">
                  {activeDispatchedCount}
                </div>
              </div>
              <ArrowUpRight className="w-6 h-6 text-brand" />
            </Card>
          </div>

          {/* Search & Filter bar for Stock */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-muted p-3 rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search stock items or store location..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface border border-surface-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-ink-muted font-medium">Category:</span>
              <select
                value={stockCategoryFilter}
                onChange={(e) => setStockCategoryFilter(e.target.value)}
                className="text-sm bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="all">All Categories</option>
                <option value="Asset">Asset</option>
                <option value="Consumable">Consumable</option>
                <option value="Lab Equipment">Lab Equipment</option>
              </select>
            </div>
          </div>

          {/* Inventory Table */}
          <Card padded={false}>
            {filteredStockItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No inventory items match criteria"
                description="Add an item to start tracking stock, or adjust your search filters."
                action={
                  isStaffOrAdmin ? (
                    <Button onClick={openAddItemModal}>
                      <Plus className="w-4 h-4" /> Add First Item
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Item</TH>
                    <TH>Category</TH>
                    <TH className="text-center">In Stock</TH>
                    <TH>Store Location</TH>
                    <TH>Condition</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {filteredStockItems.map((item) => {
                    const isLowStock = item.quantity <= item.reorderLevel;
                    return (
                      <TR key={item.id}>
                        <TD className="font-semibold text-ink">{item.name}</TD>
                        <TD>
                          <Badge tone="neutral">{item.category}</Badge>
                        </TD>
                        <TD className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`font-mono-data font-semibold ${
                                isLowStock ? 'text-warning' : 'text-ink'
                              }`}
                            >
                              {item.quantity} {item.unit}
                            </span>
                            {isLowStock && (
                              <Badge tone="warning">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </Badge>
                            )}
                          </div>
                        </TD>
                        <TD className="text-ink-muted">{item.location}</TD>
                        <TD className="text-ink-muted">{item.condition}</TD>
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={item.quantity <= 0}
                              onClick={() => handleOpenDispatch(item)}
                              title="Hand over / dispatch item from stock"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" /> Dispatch / Handover
                            </Button>
                            {isStaffOrAdmin && (
                              <>
                                <button
                                  onClick={() => openEditItemModal(item)}
                                  className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
                                  title="Edit item"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-tint rounded-lg transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* TAB 2: ASSET HANDOVER RECORDS */}
      {activeTab === 'handovers' && (
        <div className="space-y-5">
          {/* Summary Cards for Asset Handovers */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Total Asset Handovers</div>
                <div className="text-2xl font-semibold text-ink font-mono-data mt-1">{totalIssueCount}</div>
              </div>
              <History className="w-6 h-6 text-brand" />
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Total Quantity Handed Over</div>
                <div className="text-2xl font-semibold text-ink font-mono-data mt-1">{totalUnitsDispatched} units</div>
              </div>
              <Layers className="w-6 h-6 text-brand" />
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Active Dispatched</div>
                <div className="text-2xl font-semibold text-amber-600 font-mono-data mt-1">{activeDispatchedCount}</div>
              </div>
              <Clock className="w-6 h-6 text-amber-600" />
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted uppercase font-semibold">Returned to Stock</div>
                <div className="text-2xl font-semibold text-emerald-600 font-mono-data mt-1">{returnedCount}</div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </Card>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-muted p-3 rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search recipient, item, issuer, or remarks..."
                value={handoverSearch}
                onChange={(e) => setHandoverSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface border border-surface-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-ink-muted font-medium">Status:</span>
              <select
                value={handoverStatusFilter}
                onChange={(e) => setHandoverStatusFilter(e.target.value)}
                className="text-sm bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="all">All Statuses</option>
                <option value="dispatched">Dispatched / Active</option>
                <option value="returned">Returned to Stock</option>
              </select>

              <span className="text-xs text-ink-muted font-medium ml-2">Category:</span>
              <select
                value={handoverCategoryFilter}
                onChange={(e) => setHandoverCategoryFilter(e.target.value)}
                className="text-sm bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="all">All Categories</option>
                <option value="Asset">Asset</option>
                <option value="Consumable">Consumable</option>
                <option value="Lab Equipment">Lab Equipment</option>
              </select>
            </div>
          </div>

          {/* Handover Log Table */}
          <Card padded={false}>
            {filteredHandovers.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No asset handover records found"
                description="When assets or items are handed over / dispatched from stock, the full audit log will appear here."
                action={
                  <Button onClick={() => setActiveTab('stock')}>
                    <ArrowUpRight className="w-4 h-4" /> Go to Stock & Dispatch Item
                  </Button>
                }
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Date & Ref</TH>
                    <TH>Item & Category</TH>
                    <TH className="text-center">Quantity</TH>
                    <TH>Handed Over To</TH>
                    <TH>Issued By</TH>
                    <TH>Purpose / Remarks</TH>
                    <TH className="text-center">Status</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {filteredHandovers.map((tx) => {
                    const item = inventoryItems.find((i) => i.id === tx.itemId);
                    const itemName = tx.itemName || item?.name || 'Inventory Item';
                    const itemCat = tx.category || item?.category || 'Asset';
                    const isReturned = tx.status === 'returned';

                    return (
                      <TR key={tx.id}>
                        <TD className="text-xs text-ink font-mono-data">
                          <div className="font-semibold text-ink">{tx.date}</div>
                          <div className="text-ink-muted text-[11px] font-mono">{tx.id}</div>
                        </TD>
                        <TD>
                          <div className="font-semibold text-ink">{itemName}</div>
                          <Badge tone="neutral" className="mt-0.5 text-[11px]">
                            {itemCat}
                          </Badge>
                        </TD>
                        <TD className="text-center font-mono-data font-semibold text-ink">
                          {tx.quantity} {item?.unit || 'units'}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-1.5 font-medium text-ink">
                            <Building2 className="w-3.5 h-3.5 text-brand" />
                            {tx.issuedTo || 'Unspecified'}
                          </div>
                          {tx.recipientCategory && (
                            <span className="text-[11px] text-ink-muted block mt-0.5">
                              ({tx.recipientCategory})
                            </span>
                          )}
                        </TD>
                        <TD className="text-ink-muted text-xs">
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-ink-muted" />
                            {tx.issuedBy || 'Storekeeper'}
                          </div>
                        </TD>
                        <TD className="text-xs text-ink-muted max-w-xs truncate" title={tx.remarks || ''}>
                          {tx.remarks || '-'}
                        </TD>
                        <TD className="text-center">
                          {isReturned ? (
                            <Badge tone="success">
                              <CheckCircle2 className="w-3 h-3" /> Returned
                            </Badge>
                          ) : (
                            <Badge tone="warning">
                              <Clock className="w-3 h-3" /> Dispatched
                            </Badge>
                          )}
                        </TD>
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isReturned && isStaffOrAdmin && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenReturnModal(tx)}
                                title="Record asset return back to inventory stock"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Return
                              </Button>
                            )}

                            <button
                              onClick={() => setSlipTx(tx)}
                              className="p-1.5 text-brand hover:bg-brand-tint rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                              title="Generate Printable Asset Handover Voucher"
                            >
                              <Printer className="w-3.5 h-3.5" /> Slip
                            </button>

                            {isStaffOrAdmin && (
                              <button
                                onClick={() => handleDeleteHandover(tx)}
                                className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger-tint rounded-lg transition-colors"
                                title="Remove record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* DISPATCH / HANDOVER MODAL */}
      <Modal
        open={Boolean(selectedItemId)}
        onClose={() => setSelectedItemId(null)}
        title="Hand Over / Dispatch Asset from Stock"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedItemId(null)}>
              Cancel
            </Button>
            <Button type="submit" form="dispatch-form">
              Confirm Handover & Dispatch
            </Button>
          </>
        }
      >
        {selectedItemToDispatch && (
          <form id="dispatch-form" onSubmit={handleIssueSubmit} className="space-y-4">
            {/* Summary Item Banner */}
            <div className="bg-surface-muted p-4 rounded-xl border border-surface-border flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Selected Stock Item</div>
                <div className="text-base font-bold text-ink mt-0.5">{selectedItemToDispatch.name}</div>
                <div className="text-xs text-ink-muted mt-1 flex items-center gap-2">
                  <Badge tone="neutral">{selectedItemToDispatch.category}</Badge>
                  <span>Store: {selectedItemToDispatch.location}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-muted uppercase font-semibold">Available Stock</div>
                <div className="text-xl font-mono-data font-bold text-brand mt-0.5">
                  {selectedItemToDispatch.quantity} {selectedItemToDispatch.unit}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField label="Quantity to Hand Over" required>
                <Input
                  type="number"
                  min="1"
                  max={selectedItemToDispatch.quantity}
                  value={issueQty}
                  onChange={(e) =>
                    setIssueQty(Math.min(selectedItemToDispatch.quantity, Math.max(1, Number(e.target.value))))
                  }
                  required
                />
              </FormField>

              <FormField label="Handover Date" required>
                <Input
                  type="date"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <FormField label="Handed Over To (Department / Person / Room)" required hint="Target recipient for the item">
              <Input
                type="text"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                placeholder="e.g. Grade 9 Science Dept / Mr. Sunil Perera / IT Lab Room 4"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField label="Recipient Category">
                <Select value={recipientCategory} onChange={(e) => setRecipientCategory(e.target.value)}>
                  <option value="Department">Department</option>
                  <option value="Teacher / Staff">Teacher / Staff</option>
                  <option value="Classroom / Hall">Classroom / Hall</option>
                  <option value="Student">Student</option>
                  <option value="Science / Computer Lab">Science / Computer Lab</option>
                  <option value="Event / Ceremony">Event / Ceremony</option>
                </Select>
              </FormField>

              <FormField label="Issued By (Storekeeper)">
                <Input
                  type="text"
                  value={currentUser?.fullName || 'Storekeeper'}
                  disabled
                  className="bg-surface-muted cursor-not-allowed opacity-90"
                />
              </FormField>
            </div>

            <FormField label="Purpose / Handover Remarks" hint="Optional audit tracking remarks">
              <textarea
                value={handoverRemarks}
                onChange={(e) => setHandoverRemarks(e.target.value)}
                rows={2.5}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-surface-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand resize-none"
                placeholder="e.g. Issued for G.C.E. Science practical assessment examination"
              />
            </FormField>
          </form>
        )}
      </Modal>

      {/* RETURN ASSET TO STOCK MODAL */}
      <Modal
        open={Boolean(returningTx)}
        onClose={() => setReturningTx(null)}
        title="Return Dispatched Asset to Stock"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturningTx(null)}>
              Cancel
            </Button>
            <Button type="submit" form="return-form">
              Confirm Return to Stock
            </Button>
          </>
        }
      >
        {returningTx && (
          <form id="return-form" onSubmit={handleReturnSubmit} className="space-y-4">
            <div className="bg-surface-muted p-4 rounded-xl border border-surface-border">
              <div className="text-xs text-ink-muted uppercase font-semibold">Handover Reference</div>
              <div className="font-semibold text-ink text-sm mt-0.5">
                Item: {returningTx.itemName || 'Inventory Item'}
              </div>
              <div className="text-xs text-ink-muted mt-1">
                Handed Over To: <span className="font-medium text-ink">{returningTx.issuedTo}</span> | Dispatched Qty:{' '}
                <span className="font-medium text-ink">{returningTx.quantity} units</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField label="Quantity Returned" required>
                <Input
                  type="number"
                  min="1"
                  max={returningTx.quantity}
                  value={returnQty}
                  onChange={(e) =>
                    setReturnQty(Math.min(returningTx.quantity, Math.max(1, Number(e.target.value))))
                  }
                  required
                />
              </FormField>

              <FormField label="Condition upon Return" required>
                <Select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as InventoryItem['condition'])}
                >
                  <option value="Good">Good (Ready for reissue)</option>
                  <option value="Fair">Fair (Slight wear)</option>
                  <option value="Needs Repair">Needs Repair / Maintenance</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Return Inspection Remarks">
              <Input
                type="text"
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                placeholder="e.g. Returned clean after lab session finished"
              />
            </FormField>
          </form>
        )}
      </Modal>

      {/* ADD / EDIT STOCK ITEM MODAL */}
      <Modal
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItemId ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowItemModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="item-form">
              {editingItemId ? 'Save Changes' : 'Add Item'}
            </Button>
          </>
        }
      >
        <form id="item-form" onSubmit={handleItemSubmit} className="space-y-4">
          <FormField label="Item Name" required>
            <Input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="e.g. Wooden Student Desk / Projector HD"
              required
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField label="Category">
              <Select
                value={itemForm.category}
                onChange={(e) =>
                  setItemForm({ ...itemForm, category: e.target.value as InventoryItem['category'] })
                }
              >
                <option value="Asset">Asset</option>
                <option value="Consumable">Consumable</option>
                <option value="Lab Equipment">Lab Equipment</option>
              </Select>
            </FormField>
            <FormField label="Condition">
              <Select
                value={itemForm.condition}
                onChange={(e) =>
                  setItemForm({ ...itemForm, condition: e.target.value as InventoryItem['condition'] })
                }
              >
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <FormField label="Quantity" required>
              <Input
                type="number"
                min={0}
                value={itemForm.quantity}
                onChange={(e) =>
                  setItemForm({ ...itemForm, quantity: Math.max(0, Number(e.target.value)) })
                }
                required
              />
            </FormField>
            <FormField label="Unit" required>
              <Input
                type="text"
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="units, boxes, litres"
                required
              />
            </FormField>
            <FormField label="Reorder At" required hint="Low stock alert limit">
              <Input
                type="number"
                min={0}
                value={itemForm.reorderLevel}
                onChange={(e) =>
                  setItemForm({ ...itemForm, reorderLevel: Math.max(0, Number(e.target.value)) })
                }
                required
              />
            </FormField>
          </div>
          <FormField label="Location / Store Room" required>
            <Input
              type="text"
              value={itemForm.location}
              onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
              placeholder="e.g. Main Store Room, Science Lab 1"
              required
            />
          </FormField>
        </form>
      </Modal>

      {/* PRINTABLE HANDOVER SLIP VOUCHER OVERLAY MODAL */}
      {slipTx && (
        <Modal
          open={Boolean(slipTx)}
          onClose={() => setSlipTx(null)}
          title="Official Asset Handover Voucher"
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSlipTx(null)}>
                Close
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print Voucher
              </Button>
            </>
          }
        >
          <div className="p-6 bg-white border border-gray-200 rounded-xl space-y-6 text-gray-800 font-sans print:p-0 print:border-none">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold uppercase tracking-wide text-gray-900">
                {schoolProfile?.schoolName || 'Government School Management System'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Official Property Stock & Asset Handover Receipt Voucher
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-mono font-semibold text-gray-700">
                Voucher Ref: {slipTx.id}
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div>
                  <span className="text-gray-500 font-medium">Handover Date:</span>{' '}
                  <span className="font-semibold text-gray-900">{slipTx.date}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Handed Over To:</span>{' '}
                  <span className="font-semibold text-gray-900">{slipTx.issuedTo}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Recipient Category:</span>{' '}
                  <span className="font-semibold text-gray-900">{slipTx.recipientCategory || 'Department'}</span>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div>
                  <span className="text-gray-500 font-medium">Issued By (Storekeeper):</span>{' '}
                  <span className="font-semibold text-gray-900">{slipTx.issuedBy || 'Main Store'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Current Status:</span>{' '}
                  <span
                    className={`font-semibold capitalize ${
                      slipTx.status === 'returned' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {slipTx.status || 'Dispatched'}
                  </span>
                </div>
                {slipTx.returnDate && (
                  <div>
                    <span className="text-gray-500 font-medium">Returned On:</span>{' '}
                    <span className="font-semibold text-emerald-700">{slipTx.returnDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Handed Over Item Details Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700 uppercase font-semibold">
                  <tr>
                    <th className="p-2.5 border-b">Item Description</th>
                    <th className="p-2.5 border-b">Category</th>
                    <th className="p-2.5 border-b text-center">Handover Qty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 font-bold text-gray-900">
                      {slipTx.itemName || 'Inventory Item'}
                    </td>
                    <td className="p-2.5 text-gray-600">{slipTx.category || 'Asset'}</td>
                    <td className="p-2.5 text-center font-bold text-gray-900 font-mono">
                      {slipTx.quantity} units
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks */}
            {slipTx.remarks && (
              <div className="text-xs bg-gray-50 p-3 rounded border text-gray-700">
                <span className="font-semibold text-gray-900">Purpose / Handover Remarks:</span> {slipTx.remarks}
              </div>
            )}

            {/* Signatures */}
            <div className="pt-8 border-t grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-b border-gray-400 mb-1 h-8"></div>
                <div className="font-medium text-gray-700">Issued By (Storekeeper Signature)</div>
                <div className="text-[10px] text-gray-400">{slipTx.issuedBy || 'Main Storekeeper'}</div>
              </div>
              <div>
                <div className="border-b border-gray-400 mb-1 h-8"></div>
                <div className="font-medium text-gray-700">Received By (Recipient Signature)</div>
                <div className="text-[10px] text-gray-400">{slipTx.issuedTo}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

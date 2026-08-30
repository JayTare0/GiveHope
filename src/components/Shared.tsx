import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X, ChevronDown, ChevronUp } from 'lucide-react';

// --- STAT CARD ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  accent?: boolean;
}

export function StatCard({ title, value, icon, description, accent = false }: StatCardProps) {
  return (
    <div 
      className={`rounded-xl p-6 border-4 border-chalkboard transition-all duration-300 ${
        accent 
          ? 'bg-chalkboard text-paper shadow-[4px_4px_0px_#E8B342] rotate-1' 
          : 'bg-white text-chalkboard shadow-[4px_4px_0px_rgba(46,74,61,0.2)] -rotate-1'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-extrabold uppercase tracking-widest ${accent ? 'text-paper/85' : 'text-chalkboard/70'}`}>{title}</span>
        <div className={`p-2 rounded-lg border-2 border-chalkboard ${accent ? 'bg-pencil text-chalkboard shadow-[2px_2px_0px_#000]' : 'bg-paper text-chalkboard shadow-[2px_2px_0px_#2E4A3D]'}`}>
          {icon}
        </div>
      </div>
      <div className="font-mono text-3xl font-black tracking-tight mb-1">{value}</div>
      {description && (
        <p className={`text-xs font-medium ${accent ? 'text-paper/75' : 'text-slate-500'}`}>{description}</p>
      )}
    </div>
  );
}


// --- STATUS BADGE ---
interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  let styles = 'bg-slate-100 text-slate-800 border-slate-400';
  let label = status;

  if (normalized === 'approved' || normalized === 'delivered' || normalized === 'active') {
    styles = 'bg-emerald-100 text-emerald-950 border-emerald-500';
    label = normalized === 'active' ? 'Active' : normalized === 'approved' ? 'Approved' : 'Delivered';
  } else if (normalized === 'pending' || normalized === 'ready_for_pickup' || normalized === 'pledged' || normalized === 'claimed') {
    styles = 'bg-amber-100 text-amber-950 border-amber-500';
    if (normalized === 'ready_for_pickup') label = 'Ready for Pickup';
    else if (normalized === 'pledged') label = 'Pledged';
    else if (normalized === 'claimed') label = 'Claimed';
    else if (normalized === 'pending') label = 'Pending Approval';
  } else if (normalized === 'suspended' || normalized === 'rejected') {
    styles = 'bg-rose-100 text-rose-950 border-rose-500';
    label = normalized === 'suspended' ? 'Suspended' : 'Rejected';
  } else if (normalized === 'collected') {
    styles = 'bg-blue-100 text-blue-950 border-blue-500';
    label = 'Collected';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-black font-mono border-2 border-chalkboard ${styles} shadow-[2px_2px_0px_#2E4A3D]`}>
      {label}
    </span>
  );
}


// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-chalkboard/40 backdrop-blur-xs"
          />
          
          {/* Content Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg bg-paper rounded-xl shadow-[8px_8px_0px_#E8B342] overflow-hidden border-4 border-chalkboard z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-4 border-chalkboard bg-pencil text-chalkboard">
              <h3 className="font-display font-black text-xl italic">{title}</h3>
              <button 
                onClick={onClose}
                className="p-1 border-2 border-chalkboard rounded-lg bg-white text-chalkboard hover:bg-paper transition shadow-[2px_2px_0px_#2E4A3D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="px-6 py-6 max-h-[75vh] overflow-y-auto bg-white text-chalkboard">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


// --- DATA TABLE ---
interface Column<T> {
  header: string;
  key: keyof T | string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({ 
  columns, 
  data, 
  searchPlaceholder = 'Search...', 
  searchKey,
  emptyMessage = 'No records found.'
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search filter
  const filteredData = data.filter(item => {
    if (!searchKey || !searchTerm) return true;
    const value = item[searchKey];
    if (value === undefined || value === null) return false;
    return String(value).toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;
    
    let valA = a[sortKey];
    let valB = b[sortKey];

    // Handle undefined or null
    if (valA === undefined || valA === null) return sortOrder === 'asc' ? 1 : -1;
    if (valB === undefined || valB === null) return sortOrder === 'asc' ? -1 : 1;

    if (typeof valA === 'string') {
      return sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }

    return sortOrder === 'asc' 
      ? (valA > valB ? 1 : -1) 
      : (valA < valB ? 1 : -1);
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white rounded-xl border-4 border-chalkboard overflow-hidden shadow-[6px_6px_0px_rgba(46,74,61,0.15)]">
      {/* Search Bar */}
      {searchKey && (
        <div className="p-4 border-b-2 border-chalkboard bg-paper/55">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full max-w-xs px-4 py-2 border-2 border-chalkboard rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-chalkboard transition"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-chalkboard">
          <thead>
            <tr className="bg-chalkboard text-paper font-black text-xs uppercase tracking-wider border-b-2 border-chalkboard">
              {columns.map((col, index) => (
                <th 
                  key={index} 
                  onClick={() => col.sortable && handleSort(col.key as string)}
                  className={`px-6 py-3.5 select-none ${col.sortable ? 'cursor-pointer hover:bg-[#3d5f4f]' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-pencil" /> : <ChevronDown className="w-4 h-4 text-pencil" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-chalkboard/10">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rIndex) => (
                <tr key={rIndex} className="hover:bg-paper/30 transition duration-150">
                  {columns.map((col, cIndex) => (
                    <td key={cIndex} className="px-6 py-4 font-medium">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t-2 border-chalkboard bg-paper/20">
          <span className="text-xs font-bold text-chalkboard">
            Page <span className="font-black font-mono">{currentPage}</span> of <span className="font-black font-mono">{totalPages}</span> ({filteredData.length} records)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border-2 border-chalkboard rounded-lg text-xs font-bold bg-white text-chalkboard hover:bg-paper disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shadow-[1px_1px_0px_#2E4A3D]"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border-2 border-chalkboard rounded-lg text-xs font-bold bg-white text-chalkboard hover:bg-paper disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shadow-[1px_1px_0px_#2E4A3D]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// --- TOAST NOTIFICATION ---
export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-[4px_4px_0px_#2E4A3D] border-3 border-chalkboard bg-white`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1 text-sm text-slate-700 font-medium">
              {toast.text}
            </div>
            
            <button 
              onClick={() => onRemove(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, CheckCircle, XCircle, Clock, Plus, FileText, UploadCloud, Camera, DollarSign, Loader2, Trash2 } from 'lucide-react';

export default function EmployeeDashboard() {
  const { api, user, addToast } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [filterView, setFilterView] = useState('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([]); // OCR Auto-filled items

  // OCR Upload State
  const [showOCR, setShowOCR] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchStats();
  }, []);

  // Sync amount dynamically if items change
  useEffect(() => {
    if (items.length > 0 && !selectedExpense) {
      const total = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity || 1)), 0);
      setAmount(total.toFixed(2));
    }
  }, [items, selectedExpense]);

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data.data || []);
    } catch { addToast('Failed to load expenses', 'error'); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data.data);
    } catch {}
  };

  const handleCreateNew = () => {
    setSelectedExpense(null);
    setTitle(''); setAmount(''); setCurrency('USD');
    setCategoryId(''); setDescription(''); setItems([]);
    setOcrResult(null); setPreviewUrl(null); setShowOCR(false);
  };

  const handleRowClick = (exp) => {
    setSelectedExpense(exp);
    setTitle(exp.title || '');
    setAmount(exp.amount?.toString() || '');
    setCurrency(exp.currency || 'USD');
    setCategoryId(exp.category_id?.toString() || '');
    setDescription(exp.description || '');
    setItems([]);
    setOcrResult(null); setPreviewUrl(null); setShowOCR(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) { addToast('Title and amount are required', 'error'); return; }
    
    // Auto-generate description from items if empty
    let finalDesc = description;
    if (!finalDesc && items.length > 0) {
      finalDesc = items.map(i => `${i.quantity}x ${i.name} @ $${i.price}`).join(', ');
    }

    setSubmitLoading(true);
    try {
      await api.post('/expenses', { 
        title, 
        description: finalDesc, 
        amount: parseFloat(amount), 
        currency, 
        categoryId: categoryId ? parseInt(categoryId) : null,
        items,
        receiptUrl: previewUrl ? ocrResult?.fileUrl : null
      });
      addToast('Expense submitted successfully!', 'success');
      handleCreateNew();
      fetchExpenses();
      fetchStats();
    } catch (err) { addToast(err.response?.data?.message || 'Failed to submit', 'error'); }
    finally { setSubmitLoading(false); }
  };

  // OCR handlers
  const handleFileSelect = (file) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    processOCR(file);
  };

  const processOCR = async (file) => {
    setOcrLoading(true);
    setOcrResult(null);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      // Use the new extract endpoint strictly for pure UI rendering
      const res = await api.post('/ocr/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        const ocr = res.data.data;
        setOcrResult(ocr);
        
        // Auto-fill form fields
        if (ocr.merchant) setTitle(`Receipt - ${ocr.merchant}`);
        if (ocr.total) setAmount(ocr.total.toString());
        if (ocr.currency) setCurrency(ocr.currency);
        if (ocr.items?.length > 0) {
          // pre-fill editable items State
          setItems(ocr.items.map(i => ({ name: i.name, quantity: i.quantity || 1, price: i.price || 0 })));
        }
        addToast('Receipt scanned successfully!', 'success');
      }
    } catch (err) { addToast('OCR processing failed', 'error'); }
    finally { setOcrLoading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { name: '', quantity: 1, price: 0 }]);

  const getStatusBadge = (status) => {
    const s = {
      PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      REJECTED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };
    return s[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  };

  const filteredExpenses = expenses.filter(e => filterView === 'ALL' || e.status === filterView);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Expenses" count={stats.total.count} amount={stats.total.amount} icon={<DollarSign className="w-5 h-5" />} color="indigo" onClick={() => setFilterView('ALL')} active={filterView === 'ALL'} />
          <StatCard label="Pending" count={stats.pending.count} amount={stats.pending.amount} icon={<Clock className="w-5 h-5" />} color="amber" onClick={() => setFilterView(filterView === 'PENDING' ? 'ALL' : 'PENDING')} active={filterView === 'PENDING'} />
          <StatCard label="Approved" count={stats.approved.count} amount={stats.approved.amount} icon={<CheckCircle className="w-5 h-5" />} color="emerald" onClick={() => setFilterView(filterView === 'APPROVED' ? 'ALL' : 'APPROVED')} active={filterView === 'APPROVED'} />
          <StatCard label="Rejected" count={stats.rejected.count} amount={stats.rejected.amount} icon={<XCircle className="w-5 h-5" />} color="rose" onClick={() => setFilterView(filterView === 'REJECTED' ? 'ALL' : 'REJECTED')} active={filterView === 'REJECTED'} />
        </div>
      )}

      <div className="flex h-[calc(100vh-260px)] overflow-hidden gap-6">
        {/* Left: Expense List */}
        <div className="flex-[7] flex flex-col space-y-4 overflow-hidden">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">My Expenses</h2>
            <div className="flex gap-2">
              <button onClick={() => { handleCreateNew(); setShowOCR(true); }}
                className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-lg text-sm flex items-center transition-all">
                <Camera className="w-4 h-4 mr-2" /> Scan Receipt
              </button>
              <button onClick={handleCreateNew}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm flex items-center shadow-lg shadow-indigo-600/20 transition-all">
                <Plus className="w-4 h-4 mr-2" /> New Expense
              </button>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-xl overflow-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/60 border-b border-slate-700/60 text-slate-400 sticky top-0">
                <tr>
                  <th className="p-4 font-medium">Title</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium text-center">Admin Flag</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} onClick={() => handleRowClick(exp)}
                    className={`cursor-pointer transition-all ${selectedExpense?.id === exp.id ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'hover:bg-slate-700/20'}`}>
                    <td className="p-4 text-slate-200 font-medium">
                      <div className="flex items-center gap-2">
                        {exp.receipt_url && <Camera className="w-3.5 h-3.5 text-emerald-400" />}
                        {exp.title}
                      </div>
                    </td>
                    <td className="p-4"><span className="bg-slate-700/40 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded text-slate-300">{exp.category_name || '—'}</span></td>
                    <td className="p-4 text-center">
                      {exp.overridden_by_admin && <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">Overridden</span>}
                    </td>
                    <td className="p-4 text-right font-semibold text-emerald-400">{exp.currency} {parseFloat(exp.amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(exp.status)}`}>
                        {exp.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {exp.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                        {exp.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr><td colSpan="5" className="p-16 text-center text-slate-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No expenses yet</p>
                    <p className="text-xs mt-1">Submit your first expense or scan a receipt</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Form Panel */}
        <div className="flex-[3] bg-slate-800/80 rounded-xl border border-slate-700/60 overflow-y-auto shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-700/60 bg-slate-900/40 sticky top-0 z-10 flex justify-between items-center">
            <h2 className="font-bold text-lg">{selectedExpense ? 'Expense Details' : showOCR ? 'Scan Receipt' : 'New Expense'}</h2>
            {selectedExpense && <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(selectedExpense.status)}`}>{selectedExpense.status}</span>}
          </div>

          <div className="p-5 space-y-4 flex-1">
            {/* OCR Upload Zone */}
            {(showOCR && !selectedExpense) && (
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-500/50 hover:bg-slate-700/30'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0])} />
                
                {ocrLoading ? (
                  <div className="py-4">
                    <Loader2 className="w-10 h-10 mx-auto text-indigo-400 animate-spin mb-3" />
                    <p className="text-indigo-300 font-medium">Processing receipt...</p>
                    <p className="text-slate-500 text-xs mt-1">Extracting line items and merchant data...</p>
                  </div>
                ) : previewUrl ? (
                  <div>
                    <img src={previewUrl} alt="Receipt" className="max-h-32 mx-auto rounded-lg mb-3 shadow-lg" />
                    <p className="text-emerald-400 text-sm font-medium">✓ Data Extracted successfully</p>
                  </div>
                ) : (
                  <div className="py-2">
                    <UploadCloud className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-300 font-medium">Drop receipt here or click to upload</p>
                    <p className="text-slate-500 text-xs mt-1">JPG, PNG, WEBP up to 10MB</p>
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <FormField label="Title *" value={title} onChange={setTitle} disabled={!!selectedExpense} placeholder="E.g., Client Lunch" />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select disabled={!!selectedExpense} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Currency</label>
                <select disabled={!!selectedExpense} className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="INR">INR</option>
                </select>
              </div>
            </div>

            {/* Auto-fill Editable Itemized List */}
            {(!selectedExpense && (showOCR || items.length > 0)) && (
              <div className="space-y-2 border border-slate-700/60 p-3 rounded-lg bg-slate-800/30">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1" /> Itemized Breakdown
                  </label>
                  <button type="button" onClick={addItem} className="text-indigo-400 text-xs flex items-center hover:text-indigo-300">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </button>
                </div>
                
                {items.length === 0 && <p className="text-xs text-slate-500 italic">No items extracted.</p>}
                
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input type="text" value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="Item" className="flex-[2] bg-slate-900/80 border border-slate-700/60 rounded py-1.5 px-2 text-xs text-slate-200" />
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} placeholder="Qty" className="w-16 bg-slate-900/80 border border-slate-700/60 rounded py-1.5 px-2 text-xs text-slate-200" />
                    <input type="number" step="0.01" value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} placeholder="Price" className="flex-1 bg-slate-900/80 border border-slate-700/60 rounded py-1.5 px-2 text-xs text-slate-200" />
                    <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}

            <FormField label="Grand Total Amount *" type="number" value={amount} onChange={setAmount} disabled={!!selectedExpense} placeholder="0.00" />
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
              <textarea rows="3" disabled={!!selectedExpense} placeholder="Details or notes..."
                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 resize-none"
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            {/* Receipt preview for existing expenses */}
            {selectedExpense?.receipt_url && (
              <div className="border border-slate-700/60 rounded-lg overflow-hidden">
                <img src={`http://localhost:5000${selectedExpense.receipt_url}`} alt="Receipt" className="w-full max-h-48 object-contain bg-slate-900" />
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          {!selectedExpense && (
            <div className="p-4 border-t border-slate-700/60 bg-slate-800 sticky bottom-0 z-10">
              <button onClick={handleSubmit} disabled={submitLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center shadow-lg shadow-indigo-600/20 disabled:opacity-50 text-sm">
                {submitLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {submitLoading ? 'Submitting...' : 'Submit Expense & Workflow'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable components
function StatCard({ label, count, amount, icon, color, onClick, active }) {
  const colors = {
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', activeBorder: 'border-indigo-500', text: 'text-indigo-400', glow: 'shadow-indigo-500/10' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', activeBorder: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/10' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', activeBorder: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', activeBorder: 'border-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/10' },
  };
  const c = colors[color];
  return (
    <div onClick={onClick}
      className={`${c.bg} border ${active ? c.activeBorder + ' shadow-xl ' + c.glow : c.border} rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-all`}>
      <div className={`flex items-center gap-2 ${c.text} mb-2`}>{icon}<span className="text-xs font-medium uppercase tracking-wider">{label}</span></div>
      <div className="text-2xl font-bold text-white">${amount?.toFixed(2)}</div>
      <div className="text-xs text-slate-500 mt-1">{count} expense{count !== 1 ? 's' : ''}</div>
    </div>
  );
}

function FormField({ label, value, onChange, disabled, placeholder, type = 'text' }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input type={type} step={type === 'number' ? '0.01' : undefined} placeholder={placeholder} disabled={disabled}
        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 transition-colors"
        value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

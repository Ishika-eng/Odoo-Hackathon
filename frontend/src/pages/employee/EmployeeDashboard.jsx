import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, UploadCloud, FileText, CheckCircle, XCircle, Clock, Plus, Save } from 'lucide-react';

export default function EmployeeDashboard() {
  const { api, user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  // Dashboard Filters
  const [filterView, setFilterView] = useState('ALL'); // ALL, DRAFT, PENDING, APPROVED 

  // Form State
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('TRAVEL');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses/mock');
      setExpenses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNew = () => {
    setSelectedExpense(null);
    setAmount('');
    setCurrency('USD');
    setCategory('TRAVEL');
    setDescription('');
    setDate('');
    setRemarks('');
  };

  const handleRowClick = (exp) => {
    setSelectedExpense(exp);
    setAmount(exp.amount.toString());
    setCurrency(exp.currency);
    setCategory(exp.category);
    setDescription(exp.description);
    setDate(exp.expense_date);
    setRemarks(exp.remarks || '');
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    alert("Expense saved as Draft locally/backend");
    // Pseudo-code implementation:
    // await api.post('/expenses/draft', { ... });
    fetchExpenses();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description || !date) return alert("Please fill required fields");
    try {
      alert("Expense Submitted for Manager Approval!");
      // Pseudo-code implementation:
      // await api.post('/expenses', { amount, ... }); 
      fetchExpenses();
      handleCreateNew();
    } catch (err) {
      alert("Failed to submit expense");
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'APPROVED': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'REJECTED': return <XCircle className="w-5 h-5 text-rose-400" />;
      case 'DRAFT': return <div className="w-3 h-3 rounded-full bg-rose-500 mr-2" />;
      default: return <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />; // Pending/Submitted
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'PENDING': return 'Submitted / Waiting Approval';
      default: return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  const filteredExpenses = expenses.filter(exp => filterView === 'ALL' || exp.status === filterView);

  // Summaries calculation
  const totalToSubmit = expenses.filter(e => e.status === 'DRAFT').reduce((acc, curr) => acc + curr.amount, 0);
  const totalWaiting = expenses.filter(e => e.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
  const totalApproved = expenses.filter(e => e.status === 'APPROVED').reduce((acc, curr) => acc + curr.amount, 0);

  const isFormReadOnly = selectedExpense && selectedExpense.status !== 'DRAFT';

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden gap-6">
      {/* Left Panel: Dashboard (70%) */}
      <div className="flex-[7] flex flex-col space-y-6 overflow-y-auto pr-2 pb-6">
        
        {/* Top Summaries */}
        <div className="grid grid-cols-3 gap-4">
          <div 
            onClick={() => setFilterView(filterView === 'DRAFT' ? 'ALL' : 'DRAFT')}
            className={`bg-slate-800 border p-5 rounded-xl cursor-pointer transition-colors ${filterView === 'DRAFT' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-slate-700 hover:border-slate-500'}`}
          >
            <div className="flex items-center text-slate-400 mb-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 mr-2"></div> To Submit (Drafts)
            </div>
            <div className="text-2xl font-bold flex items-baseline">
              <span className="text-slate-500 text-sm mr-1">₹</span> {totalToSubmit.toFixed(2)}
            </div>
          </div>

          <div 
            onClick={() => setFilterView(filterView === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`bg-slate-800 border p-5 rounded-xl cursor-pointer transition-colors ${filterView === 'PENDING' ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-700 hover:border-slate-500'}`}
          >
            <div className="flex items-center text-slate-400 mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div> Waiting Approval
            </div>
            <div className="text-2xl font-bold flex items-baseline">
              <span className="text-slate-500 text-sm mr-1">₹</span> {totalWaiting.toFixed(2)}
            </div>
          </div>

          <div 
            onClick={() => setFilterView(filterView === 'APPROVED' ? 'ALL' : 'APPROVED')}
            className={`bg-slate-800 border p-5 rounded-xl cursor-pointer transition-colors ${filterView === 'APPROVED' ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-slate-700 hover:border-slate-500'}`}
          >
            <div className="flex items-center text-slate-400 mb-2">
              <CheckCircle className="w-4 h-4 text-indigo-400 mr-2" /> Approved
            </div>
            <div className="text-2xl font-bold flex items-baseline">
              <span className="text-slate-500 text-sm mr-1">₹</span> {totalApproved.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button className="bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm flex items-center transition-colors">
              <UploadCloud className="w-4 h-4 mr-2" /> Upload Receipt
            </button>
            <button 
              onClick={handleCreateNew}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm flex items-center shadow-lg shadow-indigo-600/20 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> New Expense
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex-1">
          <table className="w-full text-left col-span-12 text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-400">
              <tr>
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Paid by</th>
                <th className="p-4 font-medium">Remarks</th>
                <th className="p-4 font-medium text-right">Amount</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredExpenses.map((exp, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => handleRowClick(exp)}
                  className={`cursor-pointer transition-colors ${selectedExpense?.id === exp.id ? 'bg-indigo-500/10' : 'hover:bg-slate-700/20'}`}
                >
                  <td className="p-4 text-slate-200">{exp.user?.name || user?.name}</td>
                  <td className="p-4 text-slate-200 font-medium truncate max-w-[150px]">{exp.description}</td>
                  <td className="p-4 text-slate-400 whitespace-nowrap">{exp.expense_date}</td>
                  <td className="p-4"><span className="bg-slate-700/50 px-2 py-1 text-[10px] uppercase tracking-wider rounded text-slate-300 font-medium">{exp.category}</span></td>
                  <td className="p-4 text-slate-400">{exp.paid_by || user?.name}</td>
                  <td className="p-4 text-slate-400 truncate max-w-[100px]">{exp.remarks}</td>
                  <td className="p-4 text-right font-medium text-emerald-400 whitespace-nowrap">{exp.currency} {exp.amount.toFixed(2)}</td>
                  <td className="p-4 flex items-center whitespace-nowrap">
                    {getStatusIcon(exp.status)}
                    <span className={`font-medium text-xs ${exp.status === 'PENDING' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {getStatusLabel(exp.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-500 font-medium">No expenses match this view</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Panel: Form / Details (30%) */}
      <div className="flex-[3] bg-slate-800 rounded-xl border border-slate-700 overflow-y-auto shadow-xl flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-slate-900/30 sticky top-0 z-10 flex justify-between items-center">
          <h2 className="font-bold text-lg">
            {isFormReadOnly ? 'Expense Details' : 'New Expense Entry'}
          </h2>
          {isFormReadOnly && selectedExpense?.status !== 'APPROVED' && selectedExpense?.status !== 'REJECTED' && (
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/30 flex items-center">
              <Clock className="w-3 h-3 mr-1" /> Pending Approval
            </span>
          )}
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* Attach Receipt Button Mock */}
          {!isFormReadOnly && (
            <button className="w-full border-2 border-dashed border-slate-600 rounded-lg py-4 text-slate-400 hover:bg-slate-700/50 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center">
              <UploadCloud className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium">Attach Receipt (OCR)</span>
            </button>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
            <input 
              type="text" 
              placeholder="E.g., Client Lunch"
              disabled={isFormReadOnly}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:bg-slate-900/50"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
              <select 
                disabled={isFormReadOnly}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                value={category} onChange={(e) => setCategory(e.target.value)}
              >
                <option value="TRAVEL">Travel</option>
                <option value="MEALS">Meals</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="TRAINING">Training</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
              <input 
                type="date"
                disabled={isFormReadOnly}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                value={date} onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid By</label>
            <input 
              type="text" 
              disabled={true} // Usually always self
              value={user?.name || "Employee"}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Amount</label>
            <div className="flex space-x-2">
              <select 
                disabled={isFormReadOnly}
                className="bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-24 disabled:opacity-70"
                value={currency} onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
              <input 
                type="number" step="0.01" placeholder="0.00"
                disabled={isFormReadOnly}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-slate-200 font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:text-emerald-400 disabled:font-bold"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remarks</label>
            <textarea 
              rows="3"
              disabled={isFormReadOnly}
              placeholder="Additional details..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
              value={remarks} onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Read Only Audit Trail */}
          {isFormReadOnly && (
            <div className="mt-8 pt-6 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                <FileText className="w-4 h-4 mr-2" /> Audit Trail
              </h3>
              
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-1.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent pl-6">
                
                {/* Submitted step */}
                <div className="relative">
                  <div className="absolute left-[-24px] w-3 h-3 bg-indigo-500 rounded-full mt-1.5 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                  <div className="text-sm font-medium text-slate-200">{selectedExpense.user?.name || user?.name}</div>
                  <div className="text-xs text-slate-500 mt-1">Submitted as {selectedExpense.status} | {selectedExpense.expense_date}</div>
                </div>

                {/* Approval Logic display based on status */}
                {selectedExpense.status === 'APPROVED' && (
                  <div className="relative">
                    <div className="absolute left-[-24px] w-3 h-3 bg-emerald-500 rounded-full mt-1.5 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <div className="text-sm font-medium text-slate-200">Management</div>
                    <div className="text-xs text-emerald-400/80 mt-1">Approved Final Sequence</div>
                  </div>
                )}
                {selectedExpense.status === 'REJECTED' && (
                  <div className="relative">
                    <div className="absolute left-[-24px] w-3 h-3 bg-rose-500 rounded-full mt-1.5 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                    <div className="text-sm font-medium text-slate-200">Management</div>
                    <div className="text-xs text-rose-400/80 mt-1">Rejected by reviewer</div>
                  </div>
                )}
                {selectedExpense.status === 'PENDING' && (
                  <div className="relative">
                    <div className="absolute left-[-24px] w-3 h-3 border-2 border-emerald-500 bg-slate-900 rounded-full mt-1.5"></div>
                    <div className="text-sm font-medium text-slate-400 animate-pulse">Awaiting Next Approver</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions sticky */}
        <div className="p-4 border-t border-slate-700 bg-slate-800 sticky bottom-0 z-10">
          {!isFormReadOnly && (
            <div className="flex space-x-3">
              <button 
                onClick={handleSaveDraft}
                className="flex-[2] border border-slate-600 hover:bg-slate-700/50 text-slate-300 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center text-sm"
              >
                <Save className="w-4 h-4 mr-2" /> Save Draft
              </button>
              <button 
                onClick={handleSubmit}
                className="flex-[3] bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-indigo-600/20 text-sm"
              >
                <Send className="w-4 h-4 mr-2" /> Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, FileText, Clock, Loader2, DollarSign, Calendar } from 'lucide-react';

export default function ManagerDashboard() {
  const { api, addToast } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, statsRes] = await Promise.all([
        api.get('/approvals/pending'),
        api.get('/dashboard/stats')
      ]);
      setPending(pendingRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (err) {
      addToast('Failed to fetch manager data', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!modalData) return;
    setActionLoading(true);
    try {
      await api.post(`/approvals/${modalData.expense_id}`, { action, comment });
      addToast(`Expense ${action.toLowerCase()} successfully`, 'success');
      setModalData(null);
      setComment('');
      fetchData(); // Refresh list and stats
    } catch (err) {
      addToast(err.response?.data?.message || 'Error processing action', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">Approval Queue</h1>
          <p className="text-slate-400 mt-1">Review and manage pending expenses</p>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Pending Review" count={pending.length} icon={<Clock className="w-5 h-5" />} color="amber" />
          <StatCard label="Total Approved" count={stats.approved.count} amount={stats.approved.amount} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
          <StatCard label="Total Rejected" count={stats.rejected.count} amount={stats.rejected.amount} icon={<XCircle className="w-5 h-5" />} color="rose" />
          <StatCard label="Team Expenses" count={stats.total.count} amount={stats.total.amount} icon={<DollarSign className="w-5 h-5" />} color="indigo" />
        </div>
      )}

      {pending.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-16 text-center text-slate-400 flex flex-col items-center shadow-lg">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">All Caught Up!</h2>
          <p className="text-slate-400 max-w-md mx-auto">There are no pending expenses requiring your approval right now. Enjoy your day!</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((approval) => (
            <div 
              key={approval.id} 
              className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all flex flex-col items-start cursor-pointer group" 
              onClick={() => setModalData(approval)}
            >
              <div className="flex justify-between w-full mb-3">
                <span className="bg-slate-700/50 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {approval.category_name || 'EXPENSE'}
                </span>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Step {approval.step_order}
                </span>
              </div>
              
              <div className="text-2xl font-bold text-white mb-1">
                <span className="text-emerald-400 mr-1">{approval.currency || 'USD'}</span>
                {parseFloat(approval.amount || 0).toFixed(2)}
              </div>
              <div className="text-slate-300 font-medium mb-1 truncate w-full" title={approval.title}>{approval.title}</div>
              
              <div className="w-full mt-auto pt-4 border-t border-slate-700/50 mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-400">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 mr-2">
                    {approval.first_name?.charAt(0)}{approval.last_name?.charAt(0)}
                  </div>
                  <span className="truncate max-w-[120px]">{approval.first_name} {approval.last_name}</span>
                </div>
                <div className="text-slate-500 text-xs flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(approval.submitted_at || approval.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Action Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-xl font-bold text-slate-100 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-400" /> Review Expense
              </h2>
              <button onClick={() => setModalData(null)} className="text-slate-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg font-bold border border-indigo-500/30">
                    {modalData.first_name?.charAt(0)}{modalData.last_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200">{modalData.first_name} {modalData.last_name}</h3>
                    <p className="text-xs text-slate-400">{modalData.submitter_email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">
                    {modalData.currency || 'USD'} {parseFloat(modalData.amount || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{modalData.category_name || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Title</h4>
                  <p className="text-slate-200 bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">{modalData.title}</p>
                </div>
                
                {modalData.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</h4>
                    <p className="text-slate-300 bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 whitespace-pre-wrap">{modalData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Submitted Date</h4>
                    <p className="text-slate-300">{new Date(modalData.submitted_at || modalData.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Step</h4>
                    <p className="text-slate-300 flex items-center">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold mr-2">
                        {modalData.step_order}
                      </span>
                      {modalData.step_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Reviewer Comments</label>
                <textarea 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all placeholder:text-slate-600"
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add optional notes explaining your decision..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-800/50 flex gap-4">
              <button 
                onClick={() => handleAction('REJECTED')}
                disabled={actionLoading}
                className="flex-1 bg-slate-800 border-2 border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 text-rose-400 font-bold py-3 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <XCircle className="w-5 h-5 mr-2" />}
                Reject
              </button>
              <button 
                onClick={() => handleAction('APPROVED')}
                disabled={actionLoading}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                Approve Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, count, amount, icon, color }) {
  const colors = {
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
  };
  const c = colors[color];
  return (
    <div className={`bg-slate-800/50 border ${c.border} rounded-xl p-5 hover:bg-slate-800 transition-colors`}>
      <div className={`flex items-center gap-2 ${c.text} mb-3`}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        {amount !== undefined && (
          <div className="text-2xl font-black text-white">${amount?.toFixed(2)}</div>
        )}
        <div className={`text-sm font-medium ${amount === undefined ? 'text-2xl text-white' : 'text-slate-500 mb-1'}`}>
          {count} {count === 1 ? 'item' : 'items'}
        </div>
      </div>
    </div>
  );
}

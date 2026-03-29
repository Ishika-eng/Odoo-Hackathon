import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, FileText, Clock } from 'lucide-react';

export default function ManagerDashboard() {
  const { api } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/approvals/pending');
      setPending(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!modalData) return;
    try {
      await api.post(`/approvals/${modalData.expense.id}/action`, { action, comment });
      setModalData(null);
      setComment('');
      fetchPending();
    } catch (err) {
      alert("Error processing action");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Manager Approval Queue</h1>
        <p className="text-slate-400">Expenses awaiting your review context.</p>
      </header>

      {pending.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center text-slate-400">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500/50" />
          <h2 className="text-xl font-medium text-slate-300">All caught up!</h2>
          <p>You have no pending approvals.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pending.map((approval) => {
            const exp = approval.expense;
            return (
              <div key={approval.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl hover:border-slate-500 transition-colors flex flex-col items-start cursor-pointer group" onClick={() => setModalData(approval)}>
                <div className="flex justify-between w-full mb-4">
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-full">{exp.category}</span>
                  <span className="text-slate-500 text-sm flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Step {approval.step_order}
                  </span>
                </div>
                
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {exp.currency} {exp.amount.toFixed(2)}
                </div>
                <div className="text-slate-300 font-medium mb-4">{exp.description}</div>
                
                <div className="w-full mt-auto pt-4 border-t border-slate-700 text-sm text-slate-400 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Submitted by {exp.user?.name || 'Employee...'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Review Expense</h2>
            
            <div className="bg-slate-900 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Amount</div>
                  <div className="text-lg font-bold text-emerald-400">{modalData.expense.currency} {modalData.expense.amount.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Category</div>
                  <div className="text-slate-200">{modalData.expense.category}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500">Description</div>
                  <div className="text-slate-200">{modalData.expense.description}</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2">Manager Comments</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                rows="3"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional explanation for decision..."
              />
            </div>

            <div className="flex space-x-4">
              <button 
                onClick={() => handleAction('REJECTED')}
                className="flex-1 bg-rose-600/20 text-rose-400 border border-rose-600/50 hover:bg-rose-600 hover:text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <XCircle className="w-5 h-5 mr-2" /> Reject
              </button>
              <button 
                onClick={() => handleAction('APPROVED')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle className="w-5 h-5 mr-2" /> Approve
              </button>
            </div>
            
            <button 
              onClick={() => setModalData(null)}
              className="w-full mt-4 text-slate-400 hover:text-slate-200 text-sm py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

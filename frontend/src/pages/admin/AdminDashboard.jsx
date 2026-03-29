import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Users, ShieldAlert, Plus, Trash2, CheckCircle, UserPlus, Loader2, Workflow, Activity, ClipboardList } from 'lucide-react';

export default function AdminDashboard() {
  const { api, addToast } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [workflows, setWorkflows] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Expense override modal state
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [overrideAction, setOverrideAction] = useState(null);
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Create user form
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, wfRes, auditRes, expRes] = await Promise.all([
        api.get('/users'),
        api.get('/approvals/workflows'),
        api.get('/audit'),
        api.get('/expenses')
      ]);
      setUsers(usersRes.data.data || []);
      setWorkflows(wfRes.data.data || []);
      setAudit(auditRes.data.data || []);
      setExpenses(expRes.data.data || []);
    } catch (err) {
      addToast('Failed to load admin data', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/auth/create-user', newUser);
      addToast('User created successfully!', 'success');
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' });
      const usersRes = await api.get('/users');
      setUsers(usersRes.data.data || []);
      setActiveTab('users');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOverride = async (expenseId, action) => {
    setOverrideLoading(true);
    setOverrideAction(action);
    try {
      await api.put(`/approvals/${expenseId}/override`, { action });
      addToast(`Expense successfully overridden to ${action}`, 'success');
      setSelectedExpense(null);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to override expense', 'error');
    } finally {
      setOverrideLoading(false);
      setOverrideAction(null);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      MANAGER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      EMPLOYEE: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return styles[role] || styles.EMPLOYEE;
  };

  const getActionBadge = (action) => {
    const styles = {
      CREATE_USER: 'bg-indigo-500/20 text-indigo-400',
      CREATE_EXPENSE: 'bg-emerald-500/20 text-emerald-400',
      APPROVE: 'bg-emerald-500/20 text-emerald-400',
      REJECT: 'bg-rose-500/20 text-rose-400',
    };
    return styles[action] || 'bg-slate-500/20 text-slate-400';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">Admin Control Center</h1>
          <p className="text-slate-400 mt-1">Manage users, rules, and monitor system activity</p>
        </div>
        <div className="flex bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg p-1">
           {['users', 'workflows', 'audit', 'expenses'].map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-4 py-2 font-medium rounded-lg text-sm flex items-center transition-all ${
                 activeTab === tab 
                 ? 'bg-indigo-600 text-white shadow-indigo-600/30 shadow-lg' 
                 : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
               }`}
             >
               {tab === 'users' && <Users className="w-4 h-4 mr-2" />}
               {tab === 'workflows' && <Workflow className="w-4 h-4 mr-2" />}
               {tab === 'audit' && <ClipboardList className="w-4 h-4 mr-2" />}
               {tab === 'expenses' && <Activity className="w-4 h-4 mr-2" />}
               <span className="capitalize">{tab}</span>
             </button>
           ))}
        </div>
      </header>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-220px)]">
            <div className="p-4 border-b border-slate-700/50 bg-slate-900/30 flex justify-between items-center sticky top-0">
              <h2 className="font-bold flex items-center text-slate-200">
                <Users className="w-5 h-5 mr-2 text-indigo-400" />
                Directory ({users.length})
              </h2>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/60 border-b border-slate-700/60 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-4 font-medium uppercase tracking-wider text-xs">Name</th>
                    <th className="p-4 font-medium uppercase tracking-wider text-xs">Role</th>
                    <th className="p-4 font-medium uppercase tracking-wider text-xs text-center">Status</th>
                    <th className="p-4 font-medium uppercase tracking-wider text-xs text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-700/20 transition-colors cursor-default">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-600">
                            {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-200">{u.first_name} {u.last_name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${u.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 text-xs text-right font-medium">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="4" className="p-16 text-center text-slate-500">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700/60 shadow-xl h-fit sticky top-6">
            <h2 className="text-lg font-bold flex items-center mb-6 text-slate-200">
              <UserPlus className="w-5 h-5 mr-2 text-emerald-400" /> Provision New User
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" value={newUser.firstName} onChange={v => setNewUser({...newUser, firstName: v})} required />
                <FormField label="Last Name" value={newUser.lastName} onChange={v => setNewUser({...newUser, lastName: v})} required />
              </div>
              <FormField label="Email Address" type="email" value={newUser.email} onChange={v => setNewUser({...newUser, email: v})} required />
              <FormField label="Password" type="password" value={newUser.password} onChange={v => setNewUser({...newUser, password: v})} required />
              
              <div className="space-y-1.5 pt-2">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">System Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['EMPLOYEE', 'MANAGER', 'ADMIN'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewUser({...newUser, role})}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        newUser.role === role ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/50 mt-6">
                <button 
                  type="submit"
                  disabled={createLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex justify-center items-center"
                >
                  {createLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {createLoading ? 'Provisioning...' : 'Add to Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700/50 shadow-xl max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Settings className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Approval Pipeline</h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              The sequential steps every submitted expense must clear before final payout.
            </p>
          </div>
          
          <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            {workflows.map((step, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-900 text-slate-500 font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-colors group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-400">
                  {step.step_order}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700 bg-slate-800 shadow-md transition-transform group-hover:-translate-y-1 group-hover:shadow-lg">
                  <div className="flex flex-col gap-1">
                    <span className={`w-fit px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getRoleBadge(step.approver_role)}`}>
                      {step.approver_role} ROLE
                    </span>
                    <h3 className="font-bold text-slate-200 text-lg">{step.step_name}</h3>
                    <p className="text-sm text-slate-400">Expense routed to active {step.approver_role.toLowerCase()}s for review.</p>
                  </div>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center text-slate-500 py-8 relative z-10 bg-slate-900/80 rounded-xl border border-slate-700/50 backdrop-blur-sm p-6 mx-10">
                <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-40 text-rose-400" />
                <p className="font-medium">No workflows configured.</p>
                <p className="text-xs mt-1">Check system setup or database initialization.</p>
              </div>
            )}
            
            {workflows.length > 0 && (
               <div className="relative flex items-center justify-center pt-8 z-10">
                 <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                   <CheckCircle className="w-4 h-4 mr-2" />
                   Fully Approved
                 </div>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden h-[calc(100vh-160px)] flex flex-col">
          <div className="p-4 border-b border-slate-700/50 bg-slate-900/30 flex justify-between items-center sticky top-0">
            <h2 className="font-bold flex items-center text-slate-200">
              <ClipboardList className="w-5 h-5 mr-2 text-indigo-400" />
              System Audit Trail ({audit.length})
            </h2>
            <div className="text-xs text-slate-400">Showing last 100 entries</div>
          </div>
          
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/60 border-b border-slate-700/60 text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs">Timestamp</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs">Action</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs">Actor</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs">Entity</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {audit.map(log => (
                  <tr key={log.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 text-slate-400 text-xs font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">
                      {(log.first_name && log.last_name) ? `${log.first_name} ${log.last_name}` : `System ID: ${log.user_id || 'System'}`}
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                    </td>
                    <td className="p-4 text-slate-500 text-xs max-w-md truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan="5" className="p-16 text-center text-slate-500">No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Tab (Admin Override) */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden h-[calc(100vh-160px)] flex flex-col">
          <div className="p-4 border-b border-slate-700/50 bg-slate-900/30 flex justify-between items-center sticky top-0">
            <h2 className="font-bold flex items-center text-slate-200">
              <Activity className="w-5 h-5 mr-2 text-indigo-400" />
              Company Expenses ({expenses.length})
            </h2>
            <div className="text-xs text-slate-400">Click row for admin override</div>
          </div>
          
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/60 border-b border-slate-700/60 text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs">Title</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs">Submitter</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs text-right">Amount</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs text-center">Admin Flag</th>
                  <th className="p-4 font-medium uppercase tracking-wider text-xs text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {expenses.map(exp => (
                  <tr key={exp.id} 
                    onClick={() => setSelectedExpense(exp)}
                    className="hover:bg-slate-700/20 transition-colors cursor-pointer group">
                    <td className="p-4 text-slate-200 font-medium group-hover:text-indigo-400 transition-colors">
                      {exp.title}
                    </td>
                    <td className="p-4 text-slate-300">
                      {exp.first_name} {exp.last_name}
                    </td>
                    <td className="p-4 text-right font-medium text-emerald-400">
                      {exp.currency} {parseFloat(exp.amount || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      {exp.overridden_by_admin ? (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">Overridden</span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border 
                        ${exp.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 
                          exp.status === 'REJECTED' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 
                          'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                 <tr><td colSpan="5" className="p-16 text-center text-slate-500">No expenses found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Override Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-lg font-bold text-slate-100 flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-rose-400" /> Admin Override Action
              </h2>
              <button onClick={() => setSelectedExpense(null)} className="text-slate-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-400 mb-1">Expense Title</p>
                <p className="text-lg font-bold text-slate-200 mb-4">{selectedExpense.title}</p>
                
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/30">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Current Status</p>
                    <p className={`font-bold mt-1 ${selectedExpense.status === 'APPROVED' ? 'text-emerald-400' : selectedExpense.status === 'REJECTED' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {selectedExpense.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Amount</p>
                    <p className="font-black text-white mt-1">{selectedExpense.currency} {parseFloat(selectedExpense.amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-300 font-medium">As an administrator, you can override the current workflow status.</p>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleOverride(selectedExpense.id, 'APPROVED')}
                    disabled={overrideLoading || selectedExpense.status === 'APPROVED'}
                    className="flex flex-col items-center justify-center gap-2 bg-emerald-600/10 border-2 border-emerald-500/30 hover:bg-emerald-600 hover:border-emerald-500 text-emerald-400 hover:text-white p-4 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-emerald-600/10 disabled:hover:border-emerald-500/30 disabled:hover:text-emerald-400"
                  >
                    {overrideAction === 'APPROVED' ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                    <span className="font-bold">Force Approve</span>
                  </button>
                  
                  <button 
                    onClick={() => handleOverride(selectedExpense.id, 'REJECTED')}
                    disabled={overrideLoading || selectedExpense.status === 'REJECTED'}
                    className="flex flex-col items-center justify-center gap-2 bg-rose-600/10 border-2 border-rose-500/30 hover:bg-rose-600 hover:border-rose-500 text-rose-400 hover:text-white p-4 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-rose-600/10 disabled:hover:border-rose-500/30 disabled:hover:text-rose-400"
                  >
                    {overrideAction === 'REJECTED' ? <Loader2 className="w-6 h-6 animate-spin" /> : <XCircle className="w-6 h-6" />}
                    <span className="font-bold">Force Reject</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, required, type = 'text' }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input 
        type={type} required={required}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
        value={value} onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

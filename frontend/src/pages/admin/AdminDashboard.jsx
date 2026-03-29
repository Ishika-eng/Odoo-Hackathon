import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Users, ShieldAlert, Plus, Trash2, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('workflows');
  const [workflows, setWorkflows] = useState([]);
  const [rule, setRule] = useState({ rule_type: 'PERCENTAGE', percentage: 100 });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Users for Role selection
  const availableRoles = ['MANAGER', 'DIRECTOR', 'FINANCE', 'CFO'];

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const [wfRes, ruleRes] = await Promise.all([
        api.get('/approvals/workflows'),
        api.get('/approvals/rules')
      ]);
      setWorkflows(wfRes.data || []);
      if (ruleRes.data) setRule(ruleRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addWorkflowStep = () => {
    setWorkflows([...workflows, { step_order: workflows.length + 1, role: 'MANAGER', is_mandatory: true, is_manager_approver: false }]);
  };

  const removeWorkflowStep = (index) => {
    const newWf = workflows.filter((_, i) => i !== index).map((w, i) => ({ ...w, step_order: i + 1 }));
    setWorkflows(newWf);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await api.post('/approvals/workflows', { steps: workflows });
      await api.post('/approvals/rules', rule);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Error saving config");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Configuration Dashboard</h1>
          <p className="text-slate-400">Configure company-wide approval policies</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-medium flex items-center transition-all disabled:opacity-50"
        >
          {saved ? <CheckCircle className="w-5 h-5 mr-2" /> : <Settings className="w-5 h-5 mr-2" />}
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </header>

      <div className="flex space-x-4 border-b border-slate-700 pb-2">
        <button 
          className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'workflows' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('workflows')}
        >
          Approval Workflows (Sequential)
        </button>
        <button 
          className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'rules' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('rules')}
        >
          Rule Engine (Conditional)
        </button>
      </div>

      {activeTab === 'workflows' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl space-y-4">
          <h2 className="text-xl font-bold flex items-center mb-6">
            <Users className="w-6 h-6 mr-2 text-indigo-400" /> Defining Sequential Steps
          </h2>
          
          <div className="space-y-3">
            {workflows.map((step, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
                <span className="font-bold text-slate-400">Step {step.step_order}</span>
                
                <select 
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200"
                  value={step.role}
                  onChange={(e) => {
                    const newWf = [...workflows];
                    newWf[idx].role = e.target.value;
                    setWorkflows(newWf);
                  }}
                >
                  {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <label className="flex items-center space-x-2 text-sm text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={step.is_mandatory}
                    onChange={(e) => {
                      const newWf = [...workflows];
                      newWf[idx].is_mandatory = e.target.checked;
                      setWorkflows(newWf);
                    }}
                    className="rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span>Mandatory</span>
                </label>

                {idx === 0 && (
                  <label className="flex items-center space-x-2 text-sm text-amber-400 ml-4">
                    <input 
                      type="checkbox" 
                      checked={step.is_manager_approver}
                      onChange={(e) => {
                        const newWf = [...workflows];
                        newWf[idx].is_manager_approver = e.target.checked;
                        setWorkflows(newWf);
                      }}
                      className="rounded bg-slate-800 border-amber-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                    />
                    <span>IS MANAGER APPROVER (Employee's direct manager acts first)</span>
                  </label>
                )}

                <button 
                  onClick={() => removeWorkflowStep(idx)}
                  className="ml-auto text-rose-400 hover:text-rose-300 p-2 rounded hover:bg-rose-400/10"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={addWorkflowStep}
            className="mt-4 flex items-center text-indigo-400 hover:text-indigo-300 font-medium p-2 rounded hover:bg-indigo-400/10 transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" /> Add Step
          </button>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl space-y-6">
          <h2 className="text-xl font-bold flex items-center">
            <ShieldAlert className="w-6 h-6 mr-2 text-emerald-400" /> Conditional Approval Rules
          </h2>
          <p className="text-slate-400 text-sm">These rules execute after every approval action. If they pass, the expense is auto-approved mid-flow.</p>
          
          <div className="space-y-6 mt-6">
            <div className="flex flex-col space-y-2">
              <label className="text-slate-300 font-medium">Rule Engine Mode</label>
              <select 
                className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white max-w-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={rule.rule_type}
                onChange={(e) => setRule({ ...rule, rule_type: e.target.value })}
              >
                <option value="PERCENTAGE">Percentage Based (e.g. 60% approvals met)</option>
                <option value="SPECIFIC">Specific Approver (e.g. CFO override)</option>
                <option value="HYBRID">Hybrid (Combination of both)</option>
              </select>
            </div>

            {(rule.rule_type === 'PERCENTAGE' || rule.rule_type === 'HYBRID') && (
              <div className="flex flex-col space-y-2 p-4 bg-slate-900 rounded-lg border border-slate-700 max-w-md">
                <label className="text-slate-300 font-medium">Percentage Threshold (%)</label>
                <input 
                  type="number" 
                  min="1" max="100"
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                  value={rule.percentage || 100}
                  onChange={(e) => setRule({ ...rule, percentage: parseFloat(e.target.value) })}
                />
              </div>
            )}

            {(rule.rule_type === 'SPECIFIC' || rule.rule_type === 'HYBRID') && (
              <div className="flex flex-col space-y-2 p-4 bg-slate-900 rounded-lg border border-slate-700 max-w-md">
                <label className="text-slate-300 font-medium">Specific Approver User ID (e.g. CFO)</label>
                <input 
                  type="text" 
                  placeholder="UUID of the approver"
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                  value={rule.specific_approver_id || ''}
                  onChange={(e) => setRule({ ...rule, specific_approver_id: e.target.value })}
                />
              </div>
            )}

            {rule.rule_type === 'HYBRID' && (
              <div className="flex flex-col space-y-2 p-4 bg-slate-900 rounded-lg border border-indigo-900 max-w-md bg-indigo-900/10">
                <label className="text-indigo-300 font-medium">Hybrid Logic</label>
                <select 
                  className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                  value={rule.hybrid_logic || 'OR'}
                  onChange={(e) => setRule({ ...rule, hybrid_logic: e.target.value })}
                >
                  <option value="OR">OR (Approve if Percentage OR Specific is met)</option>
                  <option value="AND">AND (Approve only if BOTH are met)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

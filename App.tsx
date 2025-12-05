import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Plus, Trash2, Info } from 'lucide-react';
import { FileData, AccountRow, BalanceRow, ManualEntry, StatementData } from './types';
import { generateStatementData } from './utils/processor';
import Statement from './components/Statement';

const App: React.FC = () => {
  const [accountsFile, setAccountsFile] = useState<FileData | null>(null);
  const [balanceFile, setBalanceFile] = useState<FileData | null>(null);
  const [accountsData, setAccountsData] = useState<AccountRow[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceRow[]>([]);
  
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualForm, setManualForm] = useState({
    type: 'receipt',
    category: '',
    details: '',
    cash: '',
    bank: ''
  });

  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'accounts' | 'balance') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

      if (type === 'accounts') {
        setAccountsFile({ name: file.name, data: jsonData });
        setAccountsData(jsonData as AccountRow[]);
        
        // Extract years
        const years = new Set<string>();
        (jsonData as any[]).forEach(row => {
          const y = row['Year'] || row['year'] || row['YEAR'];
          if (y) years.add(String(y).trim());
        });
        setAvailableYears(Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)));
      } else {
        setBalanceFile({ name: file.name, data: jsonData });
        setBalanceData(jsonData as BalanceRow[]);
      }
      showMessage(`Loaded ${file.name} successfully`, 'success');
    } catch (err) {
      showMessage(`Error loading file: ${err}`, 'error');
    }
  };

  const handleAddManualEntry = () => {
    if (!manualForm.details && !manualForm.category) {
      showMessage('Please provide details or category', 'error');
      return;
    }
    
    const newEntry: ManualEntry = {
      id: Date.now(),
      type: manualForm.type as 'receipt' | 'expenditure',
      category: manualForm.category,
      details: manualForm.details || manualForm.category || 'Manual Entry',
      cash: parseFloat(manualForm.cash) || 0,
      bank: parseFloat(manualForm.bank) || 0
    };

    setManualEntries([...manualEntries, newEntry]);
    setManualForm({ type: 'receipt', category: '', details: '', cash: '', bank: '' });
    showMessage('Manual entry added', 'success');
  };

  const handleGenerate = () => {
    if (!accountsData.length || !balanceData.length) {
      showMessage('Please load both CSV files first', 'error');
      return;
    }
    if (!selectedYear || !selectedMonth) {
      showMessage('Please select year and month', 'error');
      return;
    }

    try {
      const data = generateStatementData(
        accountsData,
        balanceData,
        selectedYear,
        selectedMonth,
        manualEntries
      );
      setStatementData(data);
      showMessage('Statement generated successfully', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Error generating statement. Check console for details.', 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl print:p-0 print:py-0 print:max-w-none print:w-full">
      <header className="mb-8 text-center bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-8 rounded-xl shadow-lg no-print">
        <h1 className="text-3xl font-bold mb-2">MGG Monthly Receipts & Expenditure Statement</h1>
      </header>

      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100 no-print">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Upload size={20} /> Import Data
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Accounts CSV</label>
            <div className="relative">
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={(e) => handleFileUpload(e, 'accounts')}
                  className="block w-full text-sm text-slate-700
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-900
                    hover:file:bg-indigo-100 cursor-pointer border border-gray-300 rounded-lg p-2"
                />
            </div>
            {accountsFile && <div className="mt-1 text-xs text-green-800 font-medium flex items-center"><FileText size={12} className="mr-1"/> {accountsFile.name} loaded</div>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Balance CSV</label>
            <div className="relative">
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={(e) => handleFileUpload(e, 'balance')}
                  className="block w-full text-sm text-slate-700
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-50 file:text-purple-900
                    hover:file:bg-purple-100 cursor-pointer border border-gray-300 rounded-lg p-2"
                />
            </div>
            {balanceFile && <div className="mt-1 text-xs text-green-800 font-medium flex items-center"><FileText size={12} className="mr-1"/> {balanceFile.name} loaded</div>}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Period</h2>
            <div className="flex gap-4 flex-wrap items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Year</label>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="border border-gray-300 rounded-md p-2 min-w-[150px] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                    >
                        <option value="">-- Select --</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Month</label>
                    <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-md p-2 min-w-[150px] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                    >
                        <option value="">-- Select --</option>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                            <option key={i+1} value={i+1}>{m}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={handleGenerate}
                    className="bg-indigo-700 text-white px-6 py-2 rounded-md hover:bg-indigo-800 transition font-medium shadow-sm ml-auto"
                >
                    Generate Statement
                </button>
            </div>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100 no-print">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Plus size={20} /> Add Manual Entry (Optional)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
            <div className="md:col-span-1">
                <select 
                    value={manualForm.type}
                    onChange={(e) => setManualForm({...manualForm, type: e.target.value})}
                    className="w-full border p-2 rounded text-sm text-slate-900"
                >
                    <option value="receipt">Receipt</option>
                    <option value="expenditure">Expenditure</option>
                </select>
            </div>
            <div className="md:col-span-2">
                <input 
                    placeholder="Details / Category"
                    value={manualForm.details}
                    onChange={(e) => setManualForm({...manualForm, details: e.target.value})}
                    className="w-full border p-2 rounded text-sm text-slate-900 placeholder:text-slate-400"
                />
            </div>
            <div className="md:col-span-1">
                <input 
                    type="number" 
                    placeholder="Cash Amount"
                    value={manualForm.cash}
                    onChange={(e) => setManualForm({...manualForm, cash: e.target.value})}
                    className="w-full border p-2 rounded text-sm text-slate-900 placeholder:text-slate-400"
                />
            </div>
            <div className="md:col-span-1">
                <input 
                    type="number" 
                    placeholder="Bank Amount"
                    value={manualForm.bank}
                    onChange={(e) => setManualForm({...manualForm, bank: e.target.value})}
                    className="w-full border p-2 rounded text-sm text-slate-900 placeholder:text-slate-400"
                />
            </div>
            <div className="md:col-span-1">
                <button 
                    onClick={handleAddManualEntry}
                    className="w-full bg-slate-700 text-white p-2 rounded text-sm hover:bg-slate-800"
                >
                    Add
                </button>
            </div>
        </div>

        {manualEntries.length > 0 && (
            <div className="mt-4 bg-gray-50 p-3 rounded text-sm">
                <h3 className="font-bold text-slate-900 mb-2">Added Entries:</h3>
                <div className="space-y-1">
                    {manualEntries.map(entry => (
                        <div key={entry.id} className="flex justify-between items-center border-b border-gray-200 pb-1">
                            <span className="text-slate-900">
                                <span className={`uppercase text-xs font-bold mr-2 ${entry.type === 'receipt' ? 'text-green-700' : 'text-red-700'}`}>
                                    {entry.type}
                                </span>
                                {entry.details}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="text-slate-700 font-medium">Cash: {entry.cash} | Bank: {entry.bank}</span>
                                <button onClick={() => setManualEntries(manualEntries.filter(e => e.id !== entry.id))} className="text-red-600 hover:text-red-800">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white ${message.type === 'success' ? 'bg-green-700' : 'bg-red-700'} transition-opacity duration-500 no-print`}>
            {message.text}
        </div>
      )}

      {/* Statement Display */}
      <Statement data={statementData} />
    </div>
  );
};

export default App;
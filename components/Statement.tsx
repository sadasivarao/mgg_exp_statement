import React from 'react';
import { StatementData } from '../types';
import { formatCurrency } from '../utils/formatting';
import { Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface Props {
  data: StatementData | null;
}

const Statement: React.FC<Props> = ({ data }) => {
  if (!data) return null;

  const { receipts, expenditures, totals, period } = data;

  const handleExportPDF = async () => {
    const element = document.getElementById('statement-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better clarity
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight) * 0.95; // 95% to leave margin
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Statement_${period.month}_${period.year}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
      const wb = XLSX.utils.book_new();
      
      // Construct data array
      const wsData: any[][] = [
          ['MGG Expenditure Statement for', `${period.month} ${period.year}`],
          [],
          // UPDATED: Labels changed from Opening to Previous Month Closing
          [`${period.prevMonthName} - Closing balance of cash`, totals.openingCash],
          [`${period.prevMonthName} - Closing balance in bank`, totals.openingBank],
          [],
          ['RECEIPT DETAILS'],
          ['Receipt Details', 'Receipts (Cash)', 'Receipts (Bank)'],
          // Opening balance rows inside table logic
          [`${period.prevMonthName} - Closing balance of cash`, totals.openingCash, ''],
          [`${period.prevMonthName} - Closing balance in bank`, '', totals.openingBank],
          ...receipts.filter(r => r.cash > 0 || r.bank > 0).map(r => [r.details, r.cash || '', r.bank || '']),
          ['Total Receipts:', totals.receiptsCash, totals.receiptsBank],
          [],
          ['EXPENDITURE DETAILS'],
          ['Expenditure Details', 'Expenditure (Cash)', 'Expenditure (Bank)'],
          ...expenditures.filter(e => e.cash > 0 || e.bank > 0).map(e => [e.details, e.cash || '', e.bank || '']),
          // Closing balance rows
          ['Cash in hand', totals.closingCash, ''],
          ['Cash at Bank', '', totals.closingBank],
          ['Total Expenditure:', totals.expenditureCash, totals.expenditureBank],
          [],
          ['Cash in hand:', totals.closingCash],
          ['Cash at Bank:', totals.closingBank],
          [],
          ['Total', 'Cash', 'Bank', 'Cash', 'Bank'],
          ['', 'Receipts', 'Receipts', 'Expenditure', 'Expenditure'],
          ['', totals.receiptsCash, totals.receiptsBank, totals.expenditureCash, totals.expenditureBank]
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Column widths
      ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Statement');
      XLSX.writeFile(wb, `Statement_${period.month}_${period.year}.xlsx`);
  };

  // Helper class for numeric cells to ensure they are dark black
  const numericClass = "text-right font-bold text-black border border-gray-300 p-2 font-mono";
  // Updated textClass to text-slate-900 (darkest slate) for maximum readability
  const textClass = "text-left border border-gray-300 p-2 text-slate-900";
  const headerClass = "bg-slate-700 text-white font-semibold p-2 border border-slate-600 text-center";

  return (
    <div className="mt-8 print:mt-0 print:w-full">
        <div className="flex gap-4 justify-end mb-4 no-print">
            <button type="button" onClick={handleExportPDF} className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 transition shadow">
                <Download size={18} /> Export PDF
            </button>
            <button type="button" onClick={handleExportExcel} className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition shadow">
                <Download size={18} /> Export Excel
            </button>
            <button type="button" onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 transition shadow">
                <Printer size={18} /> Print
            </button>
        </div>

        <div id="statement-content" className="bg-white p-8 shadow-lg max-w-5xl mx-auto border border-gray-200 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0 print:m-0">
            <h2 className="text-2xl font-bold text-center mb-6 text-slate-900">
                MGG Expenditure Statement for <span className="text-indigo-900">{period.month} {period.year}</span>
            </h2>

            {/* Top Summary Block */}
            <div className="bg-gray-50 p-4 rounded mb-6 border border-gray-200 print:bg-transparent print:border-gray-300">
                <div className="flex justify-between mb-2">
                    <span className="font-bold text-slate-900">{period.prevMonthName} - Closing balance of cash:</span>
                    <span className="font-bold text-black">{formatCurrency(totals.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold text-slate-900">{period.prevMonthName} - Closing balance in bank:</span>
                    <span className="font-bold text-black">{formatCurrency(totals.openingBank)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
                {/* Receipts Table */}
                <div>
                    <h3 className="text-xl font-bold mb-3 text-slate-900 border-b-2 border-slate-300 pb-1">Receipt Details</h3>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className={`${headerClass} text-left`}>Details</th>
                                <th className={headerClass}>Cash</th>
                                <th className={headerClass}>Bank</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Opening Balances as first rows - UPDATED LABELS */}
                            {totals.openingCash > 0 && (
                                <tr>
                                    <td className={textClass}>{period.prevMonthName} - Closing balance of cash</td>
                                    <td className={numericClass}>{formatCurrency(totals.openingCash)}</td>
                                    <td className={numericClass}></td>
                                </tr>
                            )}
                            {totals.openingBank > 0 && (
                                <tr>
                                    <td className={textClass}>{period.prevMonthName} - Closing balance in bank</td>
                                    <td className={numericClass}></td>
                                    <td className={numericClass}>{formatCurrency(totals.openingBank)}</td>
                                </tr>
                            )}
                            {receipts.filter(r => r.cash > 0 || r.bank > 0).map((item, idx) => (
                                <tr key={idx} className="even:bg-gray-50 print:even:bg-transparent">
                                    <td className={textClass}>{item.details}</td>
                                    <td className={numericClass}>{item.cash > 0 ? formatCurrency(item.cash) : ''}</td>
                                    <td className={numericClass}>{item.bank > 0 ? formatCurrency(item.bank) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-200 print:bg-slate-100">
                                <td className="p-2 font-bold text-slate-900 border border-slate-300">Total Receipts:</td>
                                <td className={numericClass}>{formatCurrency(totals.receiptsCash)}</td>
                                <td className={numericClass}>{formatCurrency(totals.receiptsBank)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Expenditure Table */}
                <div>
                    <h3 className="text-xl font-bold mb-3 text-slate-900 border-b-2 border-slate-300 pb-1">Expenditure Details</h3>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className={`${headerClass} text-left`}>Details</th>
                                <th className={headerClass}>Cash</th>
                                <th className={headerClass}>Bank</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenditures.filter(e => e.cash > 0 || e.bank > 0).map((item, idx) => (
                                <tr key={idx} className="even:bg-gray-50 print:even:bg-transparent">
                                    <td className={textClass}>{item.details}</td>
                                    <td className={numericClass}>{item.cash > 0 ? formatCurrency(item.cash) : ''}</td>
                                    <td className={numericClass}>{item.bank > 0 ? formatCurrency(item.bank) : ''}</td>
                                </tr>
                            ))}
                             {/* Closing Balances as last rows */}
                             {totals.closingCash > 0 && (
                                <tr>
                                    <td className={textClass}>Cash in hand</td>
                                    <td className={numericClass}>{formatCurrency(totals.closingCash)}</td>
                                    <td className={numericClass}></td>
                                </tr>
                            )}
                            {totals.closingBank > 0 && (
                                <tr>
                                    <td className={textClass}>Cash at Bank</td>
                                    <td className={numericClass}></td>
                                    <td className={numericClass}>{formatCurrency(totals.closingBank)}</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-200 print:bg-slate-100">
                                <td className="p-2 font-bold text-slate-900 border border-slate-300">Total Expenditure:</td>
                                <td className={numericClass}>{formatCurrency(totals.expenditureCash)}</td>
                                <td className={numericClass}>{formatCurrency(totals.expenditureBank)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="mt-8 border-t-2 border-gray-300 pt-4 print:break-inside-avoid">
                <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded print:bg-transparent print:border print:border-gray-200">
                    <div>
                        <div className="text-slate-900 font-bold">Cash in hand: <span className="text-black font-bold ml-2">{formatCurrency(totals.closingCash)}</span></div>
                        <div className="text-slate-900 font-bold">Cash at Bank: <span className="text-black font-bold ml-2">{formatCurrency(totals.closingBank)}</span></div>
                    </div>
                </div>

                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr>
                            <th className="bg-slate-900 text-white p-2 border border-slate-700">Total Summary</th>
                            <th className="bg-slate-900 text-white p-2 border border-slate-700 text-right">Cash</th>
                            <th className="bg-slate-900 text-white p-2 border border-slate-700 text-right">Bank</th>
                            <th className="bg-slate-900 text-white p-2 border border-slate-700 text-right">Cash</th>
                            <th className="bg-slate-900 text-white p-2 border border-slate-700 text-right">Bank</th>
                        </tr>
                        <tr>
                            <th className="p-2 border border-gray-300"></th>
                            <th className="p-2 border border-gray-300 bg-green-50 text-right text-slate-900 font-bold print:bg-gray-50">Receipts</th>
                            <th className="p-2 border border-gray-300 bg-green-50 text-right text-slate-900 font-bold print:bg-gray-50">Receipts</th>
                            <th className="p-2 border border-gray-300 bg-red-50 text-right text-slate-900 font-bold print:bg-gray-50">Expenditure</th>
                            <th className="p-2 border border-gray-300 bg-red-50 text-right text-slate-900 font-bold print:bg-gray-50">Expenditure</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 border border-gray-300 font-bold text-slate-900">Grand Total</td>
                            <td className={numericClass}>{formatCurrency(totals.receiptsCash)}</td>
                            <td className={numericClass}>{formatCurrency(totals.receiptsBank)}</td>
                            <td className={numericClass}>{formatCurrency(totals.expenditureCash)}</td>
                            <td className={numericClass}>{formatCurrency(totals.expenditureBank)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Statement;
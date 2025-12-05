// Format currency to Indian standard or simple 2 decimal places
export const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Add spaces to text (camelCase to Title Case, etc.) - Ported from original script
export const addSpacesToText = (text: string): string => {
    if (!text) return '';
    let result = String(text);
    
    // Replace underscores with spaces
    result = result.replace(/_/g, ' ');
    
    // CamelCase handling
    result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Numbers and letters
    result = result.replace(/(\d+[a-z]*)([A-Za-z])/g, '$1 $2');
    result = result.replace(/([A-Za-z])(\d)/g, '$1 $2');
    
    // Hyphens
    result = result.replace(/([a-z])([A-Z])-([A-Z])/g, '$1 $2 - $3');
    result = result.replace(/([a-z])([A-Z])-([a-z])/g, '$1 $2 - $3');
    
    // Common words separation
    const commonWords = ['Cash', 'Bank', 'Watchman', 'Garbage', 'Purchase', 'Procurement', 'Repair', 'Electricity', 'Parking', 'Lifting', 'Tank', 'Security', 'Advance', 'Remittance', 'Collection', 'Payment', 'Charges', 'Salary', 'Maintenance', 'Floor', 'Electrical', 'Plumbing', 'House', 'Stationery', 'Generator', 'Bleaching', 'Motor', 'Starter', 'Panel', 'Broom', 'Mop', 'Distilled', 'Water', 'Garden', 'Cutter', 'Battery', 'Operated', 'Cover', 'Powder', 'Sticker', 'Printing', 'Wheel', 'Guest', 'Pass', 'Waste', 'Front', 'Apt', 'Paid', 'GHMC'];
    
    commonWords.forEach(word => {
        const regex = new RegExp(`(${word})([a-z])`, 'gi');
        result = result.replace(regex, '$1 $2');
    });
    
    result = result.replace(/(by)(\d)/gi, '$1 $2');
    result = result.replace(/(for)([A-Z])/gi, '$1 $2');
    result = result.replace(/\s+/g, ' ');
    
    return result.trim();
};

export const monthNames: { [key: string]: string } = {
    '1': 'January', '2': 'February', '3': 'March', '4': 'April',
    '5': 'May', '6': 'June', '7': 'July', '8': 'August',
    '9': 'September', '10': 'October', '11': 'November', '12': 'December'
};

export const getPreviousMonthName = (month: string): string => {
    const monthNum = parseInt(month);
    if (isNaN(monthNum)) return '';
    
    let prevMonthNum = monthNum - 1;
    if (prevMonthNum === 0) prevMonthNum = 12;
    
    const monthNamesArray = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNamesArray[prevMonthNum] || '';
};
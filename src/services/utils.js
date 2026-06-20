export function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const format = localStorage.getItem('vaahan_date_format') || 'DD-MM-YYYY';
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  return `${day}-${month}-${year}`; // DD-MM-YYYY
}

export function formatDistance(val) {
  const unit = localStorage.getItem('vaahan_distance_unit') || 'km';
  const num = Number(val);
  if (isNaN(num)) return '0 ' + unit;
  
  if (unit === 'mi') {
    const miVal = Math.round(num / 1.60934);
    return `${miVal.toLocaleString()} mi`;
  }
  return `${num.toLocaleString()} km`;
}

export function getDistanceUnit() {
  return localStorage.getItem('vaahan_distance_unit') || 'km';
}

export function getDateFormat() {
  return localStorage.getItem('vaahan_date_format') || 'DD-MM-YYYY';
}

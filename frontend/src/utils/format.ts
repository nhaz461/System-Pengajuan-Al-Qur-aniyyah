/**
 * Format angka menjadi format Rupiah Indonesia
 * @param amount - angka yang akan diformat
 * @param includeSymbol - apakah menyertakan simbol Rp (default: true)
 */
export const formatRupiah = (amount: number | null | undefined, includeSymbol = true): string => {
  if (amount === null || amount === undefined) return includeSymbol ? 'Rp0' : '0';
  
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return includeSymbol ? `Rp${formatted}` : formatted;
};

/**
 * Parse string rupiah menjadi angka
 * Contoh: "Rp75.000" -> 75000
 */
export const parseRupiah = (value: string): number => {
  const cleaned = value.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

/**
 * Format tanggal ke format Indonesia
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format tanggal dan waktu ke format Indonesia
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Hitung persentase
 */
export const calcPercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Class name utility
 */
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Truncate text
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get error message dari axios error
 */
export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'Terjadi kesalahan. Silakan coba lagi.';
};

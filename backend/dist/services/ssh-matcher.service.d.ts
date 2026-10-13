export interface SshMatchResult {
    matchedItem: any | null;
    matchScore: number;
    matchType: 'EXACT' | 'FUZZY' | 'NONE';
    status: 'SESUAI_SSH' | 'MELEBIHI_SSH' | 'PERLU_CEK' | 'TIDAK_DITEMUKAN_DI_SSH';
    sshPrice: number | null;
}
export interface SshCandidateMatch {
    item: any;
    score: number;
    status: 'SESUAI_SSH' | 'MELEBIHI_SSH' | 'PERLU_CEK';
}
/**
 * Normalisasi string teks untuk perbandingan (lowercase, buang tanda baca, spasi tunggal)
 */
export declare function normalizeUraian(str: string): string;
/**
 * Menghitung Sørensen–Dice coefficient antara 2 string
 */
export declare function calculateDiceSimilarity(str1: string, str2: string): number;
/**
 * Menghitung skor kemiripan semantik dan leksikal gabungan
 * antara item pengajuan unit dan item Master SSH (0.0 s/d 1.0)
 */
export declare function calculateCompositeSimilarity(proposalUraian: string, sshUraian: string, proposalKategori?: string, sshKategori?: string): number;
/**
 * Mencari kecocokan terbaik (Best Match) antara item pengajuan dan database Master SSH 2026
 */
export declare function findBestSshMatch(itemUraian: string, itemKategori: string, priceToCheck: number, sshMasterItems: any[]): SshMatchResult;
/**
 * Mencari daftar kandidat item Master SSH yang paling mirip (Top Candidates)
 * Digunakan untuk modal/dropdown pemilihan manual reviewer ketika kata pada pengajuan berbeda
 */
export declare function findTopSshMatches(itemUraian: string, itemKategori: string, priceToCheck: number, sshMasterItems: any[], limit?: number): SshCandidateMatch[];
/**
 * Sinkronisasi seluruh item pengajuan dengan database Master SSH aktif
 */
export declare function syncSubmissionWithSsh(submissionId: number): Promise<void>;
//# sourceMappingURL=ssh-matcher.service.d.ts.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUraian = normalizeUraian;
exports.calculateDiceSimilarity = calculateDiceSimilarity;
exports.calculateCompositeSimilarity = calculateCompositeSimilarity;
exports.findBestSshMatch = findBestSshMatch;
exports.findTopSshMatches = findTopSshMatches;
exports.syncSubmissionWithSsh = syncSubmissionWithSsh;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Normalisasi string teks untuk perbandingan (lowercase, buang tanda baca, spasi tunggal)
 */
function normalizeUraian(str) {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Stopwords umum pada uraian anggaran yayasan / kepanitiaan
 */
const STOP_WORDS = new Set([
    'dan', 'atau', 'untuk', 'pada', 'di', 'ke', 'dari', 'yang', 'dengan', 'per',
    'oleh', 'tahun', 'ta', 'thn', 'kegiatan', 'acara', 'panitia', 'unit', 'santri',
    'siswa', 'guru', 'ustadz', 'ustadzah', 'pengurus', 'dalam', 'rangka', 'keperluan',
    'kebutuhan', 'operasional', 'biaya', 'pengadaan', 'pembelian', 'belanja', 'item',
    'merk', 'tipe', 'type', 'seri', 'warna'
]);
/**
 * Kamus Sinonim & Ekspansi Kata Belanja Operasional (Indonesian Domain-Specific)
 */
const SYNONYM_MAP = {
    // ATK & Cetak
    kertas: ['hvs', 'paper', 'folio', 'f4', 'a4', 'kuarto', 'sidu', 'paperone'],
    hvs: ['kertas', 'folio', 'f4', 'a4'],
    cetak: ['print', 'printing', 'percetakan', 'sablon'],
    fotokopi: ['fotocopy', 'fotocopi', 'photocopy', 'copy', 'fc', 'ganda', 'penggandaan'],
    spidol: ['boardmarker', 'marker', 'snowman', 'whiteboard'],
    boardmarker: ['spidol', 'marker', 'snowman', 'whiteboard'],
    pulpen: ['bolpoint', 'bolpen', 'ballpoint', 'pen', 'pena', 'boxer', 'faster'],
    steples: ['staples', 'stapler', 'hecter', 'cekrekan'],
    map: ['stopmap', 'snellhecter', 'snelhecter', 'folder', 'plastik'],
    tinta: ['ribbon', 'catridge', 'cartridge', 'refill', 'epson', 'canon'],
    // Konsumsi & Makanan/Minuman
    air: ['mineral', 'aqua', 'club', 'leminerale', 'minerale', 'cleo', 'gelas', 'botol', 'galon'],
    aqua: ['air', 'mineral', 'club', 'leminerale', 'gelas', 'botol', 'galon'],
    snack: ['kue', 'kudapan', 'roti', 'snackbox', 'makanan'],
    nasi: ['lunch', 'nasikotak', 'catering', 'katering', 'makan', 'prasmanan'],
    kotak: ['box', 'dos', 'dus', 'karton'],
    dus: ['box', 'karton', 'kardus', 'dos', 'kotak'],
    buah: ['porsi', 'potong', 'jeruk', 'pisang'],
    // Transportasi & Perjalanan Dinas
    bus: ['bis', 'bigbus', 'mediumbus', 'pariwisata', 'penumpang'],
    elf: ['minibus', 'hiace', 'travel', 'armada'],
    sewa: ['rental', 'sewa', 'carter', 'charter'],
    bbm: ['bensin', 'pertalite', 'pertamax', 'solar', 'dex', 'bahanbakar'],
    bensin: ['bbm', 'pertalite', 'pertamax'],
    pertalite: ['bbm', 'bensin'],
    pertamax: ['bbm', 'bensin'],
    tol: ['toll', 'etoll', 'e-toll', 'kartutol'],
    // Honorarium & Jasa
    honor: ['honorarium', 'insentif', 'bisyarah', 'uangsaku', 'jasa'],
    honorarium: ['honor', 'insentif', 'bisyarah', 'uangsaku', 'jasa'],
    narasumber: ['narsum', 'pemateri', 'penceramah', 'kyai', 'ustadz', 'narasumber'],
    juri: ['dewanjuri', 'penilai', 'wasit'],
    penguji: ['examiner', 'penguji', 'tasmik', 'tahfidz'],
    desain: ['design', 'designer', 'grafis', 'layout'],
    dokumentasi: ['foto', 'video', 'shooting', 'fotografer', 'videografer'],
    // Kebersihan & RT
    sapu: ['ijuk', 'lidi', 'pembersih'],
    pel: ['ngepel', 'mop', 'kainpel'],
    pembersih: ['wipol', 'sos', 'superpel', 'porstex', 'vixal', 'karbol', 'sunlight', 'mama'],
    sampah: ['trashbag', 'plastiksampah', 'kantongsampah'],
    // Sarpras & Perlengkapan
    spanduk: ['banner', 'backdrop', 'baliho', 'standing'],
    banner: ['spanduk', 'backdrop', 'baliho'],
    plakat: ['cinderamata', 'vandel', 'kenangkenangan'],
    lampu: ['led', 'bohlam', 'philips', 'watt'],
    kabel: ['terminal', 'stopkontak', 'colokan', 'roll']
};
/**
 * Hasilkan bigram untuk Sørensen-Dice coefficient pada tingkat karakter
 */
function getBigrams(str) {
    const s = str.replace(/\s+/g, '');
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
        bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
}
/**
 * Menghitung Sørensen–Dice coefficient antara 2 string
 */
function calculateDiceSimilarity(str1, str2) {
    const s1 = normalizeUraian(str1);
    const s2 = normalizeUraian(str2);
    if (!s1 || !s2)
        return 0;
    if (s1 === s2)
        return 1.0;
    if (s1.length < 2 || s2.length < 2)
        return 0;
    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    if (b1.size === 0 || b2.size === 0)
        return 0;
    let intersection = 0;
    for (const b of b1) {
        if (b2.has(b))
            intersection++;
    }
    return (2 * intersection) / (b1.size + b2.size);
}
/**
 * Filter dan ekstrak token kata yang bersih dari stopwords
 */
function extractMeaningfulTokens(str) {
    const norm = normalizeUraian(str);
    return norm
        .split(' ')
        .map((w) => w.trim())
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}
/**
 * Periksa apakah token t1 sinonim atau beririsan dengan token t2
 */
function areTokensRelated(t1, t2) {
    if (t1 === t2)
        return true;
    if (t1.includes(t2) || t2.includes(t1)) {
        if (Math.min(t1.length, t2.length) >= 3)
            return true;
    }
    // Cek kamus sinonim
    const syn1 = SYNONYM_MAP[t1];
    if (syn1 && syn1.includes(t2))
        return true;
    const syn2 = SYNONYM_MAP[t2];
    if (syn2 && syn2.includes(t1))
        return true;
    // Cek kemiripan karakter fuzzy pada tingkat kata (typo tolerance)
    if (t1.length >= 4 && t2.length >= 4) {
        const dice = calculateDiceSimilarity(t1, t2);
        if (dice >= 0.75)
            return true;
    }
    return false;
}
/**
 * Menghitung skor kemiripan semantik dan leksikal gabungan
 * antara item pengajuan unit dan item Master SSH (0.0 s/d 1.0)
 */
function calculateCompositeSimilarity(proposalUraian, sshUraian, proposalKategori = '', sshKategori = '') {
    const normProp = normalizeUraian(proposalUraian);
    const normSsh = normalizeUraian(sshUraian);
    if (!normProp || !normSsh)
        return 0;
    if (normProp === normSsh)
        return 1.0;
    // 1. Substring Containment Bonus (misal: "Kertas HVS A4" ada di dalam "Kertas HVS A4 75 Gram Sinar Dunia")
    let substringScore = 0;
    if (normSsh.includes(normProp)) {
        substringScore = Math.max(0.75, normProp.length / normSsh.length);
    }
    else if (normProp.includes(normSsh)) {
        substringScore = Math.max(0.75, normSsh.length / normProp.length);
    }
    // 2. Token Overlap Similarity dengan ekspansi sinonim
    const propTokens = extractMeaningfulTokens(proposalUraian);
    const sshTokens = extractMeaningfulTokens(sshUraian);
    let tokenScore = 0;
    if (propTokens.length > 0 && sshTokens.length > 0) {
        let matchedInProp = 0;
        for (const pt of propTokens) {
            const foundMatch = sshTokens.some((st) => areTokensRelated(pt, st));
            if (foundMatch)
                matchedInProp++;
        }
        let matchedInSsh = 0;
        for (const st of sshTokens) {
            const foundMatch = propTokens.some((pt) => areTokensRelated(st, pt));
            if (foundMatch)
                matchedInSsh++;
        }
        const recall = matchedInProp / propTokens.length;
        const precision = matchedInSsh / sshTokens.length;
        tokenScore = (recall * 1.5 + precision * 0.5) / 2; // Beri bobot lebih tinggi pada tercovernya kata kunci pengajuan
    }
    // 3. Karakter Sørensen-Dice
    const diceScore = calculateDiceSimilarity(normProp, normSsh);
    // 4. Kategori match bonus
    let categoryBonus = 0;
    if (proposalKategori && sshKategori) {
        const kProp = normalizeUraian(proposalKategori);
        const kSsh = normalizeUraian(sshKategori);
        if (kProp === kSsh || kProp.includes(kSsh) || kSsh.includes(kProp)) {
            categoryBonus = 0.08;
        }
    }
    // Bobot gabungan
    const rawScore = Math.max(substringScore * 0.9, tokenScore * 0.65 + diceScore * 0.35) +
        categoryBonus;
    return Math.min(1.0, Math.max(0, rawScore));
}
/**
 * Mencari kecocokan terbaik (Best Match) antara item pengajuan dan database Master SSH 2026
 */
function findBestSshMatch(itemUraian, itemKategori, priceToCheck, sshMasterItems) {
    if (!sshMasterItems || sshMasterItems.length === 0) {
        return {
            matchedItem: null,
            matchScore: 0,
            matchType: 'NONE',
            status: 'TIDAK_DITEMUKAN_DI_SSH',
            sshPrice: null,
        };
    }
    const normTarget = normalizeUraian(itemUraian);
    // 1. Exact match langsung
    const exact = sshMasterItems.find((s) => normalizeUraian(s.uraian) === normTarget);
    if (exact) {
        const isExceeding = priceToCheck > exact.hargaSsh;
        return {
            matchedItem: exact,
            matchScore: 1.0,
            matchType: 'EXACT',
            status: isExceeding ? 'MELEBIHI_SSH' : 'SESUAI_SSH',
            sshPrice: exact.hargaSsh,
        };
    }
    // 2. Cari skor tertinggi di seluruh item Master SSH
    let bestItem = null;
    let bestScore = 0;
    for (const s of sshMasterItems) {
        const score = calculateCompositeSimilarity(itemUraian, s.uraian, itemKategori, s.kategori);
        if (score > bestScore) {
            bestScore = score;
            bestItem = s;
        }
    }
    // Klasifikasi hasil berdasarkan skor kemiripan
    if (bestItem && bestScore >= 0.40) {
        const isExceeding = priceToCheck > bestItem.hargaSsh;
        return {
            matchedItem: bestItem,
            matchScore: parseFloat(bestScore.toFixed(3)),
            matchType: 'FUZZY',
            status: isExceeding ? 'MELEBIHI_SSH' : 'SESUAI_SSH',
            sshPrice: bestItem.hargaSsh,
        };
    }
    else if (bestItem && bestScore >= 0.25) {
        // Kemiripan parsial (misal ada kemiripan beberapa kata namun belum 100% pasti)
        return {
            matchedItem: bestItem,
            matchScore: parseFloat(bestScore.toFixed(3)),
            matchType: 'FUZZY',
            status: 'PERLU_CEK',
            sshPrice: bestItem.hargaSsh,
        };
    }
    // Tidak ditemukan kemiripan yang cukup
    return {
        matchedItem: null,
        matchScore: 0,
        matchType: 'NONE',
        status: 'TIDAK_DITEMUKAN_DI_SSH',
        sshPrice: null,
    };
}
/**
 * Mencari daftar kandidat item Master SSH yang paling mirip (Top Candidates)
 * Digunakan untuk modal/dropdown pemilihan manual reviewer ketika kata pada pengajuan berbeda
 */
function findTopSshMatches(itemUraian, itemKategori, priceToCheck, sshMasterItems, limit = 5) {
    if (!sshMasterItems || sshMasterItems.length === 0)
        return [];
    const scored = sshMasterItems
        .map((s) => {
        const score = calculateCompositeSimilarity(itemUraian, s.uraian, itemKategori, s.kategori);
        const isExceeding = priceToCheck > s.hargaSsh;
        const status = isExceeding
            ? 'MELEBIHI_SSH'
            : 'SESUAI_SSH';
        return {
            item: s,
            score: parseFloat(score.toFixed(3)),
            status,
        };
    })
        .filter((s) => s.score >= 0.15) // Hanya ambil yang punya kemiripan minimum
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    return scored;
}
/**
 * Sinkronisasi seluruh item pengajuan dengan database Master SSH aktif
 */
async function syncSubmissionWithSsh(submissionId) {
    // Ambil Master SSH aktif dari DATABASE
    const activeSshVersion = await prisma_1.default.sshVersion.findFirst({
        where: { isActive: true },
        include: { items: true },
    });
    const submission = await prisma_1.default.submission.findUnique({
        where: { id: submissionId },
        include: { items: true },
    });
    if (!submission)
        return;
    const sshItems = activeSshVersion ? activeSshVersion.items : [];
    for (const item of submission.items) {
        const priceToCheck = item.reviewPrice !== null && item.reviewPrice !== undefined
            ? item.reviewPrice
            : item.originalPrice;
        let match;
        if (item.sshItemId) {
            const boundSsh = sshItems.find((s) => s.id === item.sshItemId);
            if (boundSsh) {
                const isExceeding = priceToCheck > boundSsh.hargaSsh;
                match = {
                    matchedItem: boundSsh,
                    matchScore: 1.0,
                    matchType: 'EXACT',
                    status: isExceeding ? 'MELEBIHI_SSH' : 'SESUAI_SSH',
                    sshPrice: boundSsh.hargaSsh,
                };
            }
            else {
                match = findBestSshMatch(item.uraian, item.kategori, priceToCheck, sshItems);
            }
        }
        else {
            match = findBestSshMatch(item.uraian, item.kategori, priceToCheck, sshItems);
        }
        await prisma_1.default.submissionItem.update({
            where: { id: item.id },
            data: {
                sshItemId: match.matchedItem ? match.matchedItem.id : null,
                sshPrice: match.sshPrice,
                sshStatus: match.status,
            },
        });
    }
}
//# sourceMappingURL=ssh-matcher.service.js.map
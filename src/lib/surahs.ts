/** Surah metadata (1-114). Used for surah picker + auto style suggestion. */
export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTranslation: string;
  ayahCount: number;
  revelation: "Meccan" | "Medinan";
}

export const SURAHS: SurahMeta[] = [
  { number: 1, nameArabic: "ٱلْفَاتِحَة", nameEnglish: "Al-Fatihah", nameTranslation: "The Opening", ayahCount: 7, revelation: "Meccan" },
  { number: 2, nameArabic: "ٱلْبَقَرَة", nameEnglish: "Al-Baqarah", nameTranslation: "The Cow", ayahCount: 286, revelation: "Medinan" },
  { number: 3, nameArabic: "آلِ عِمْرَان", nameEnglish: "Aal-E-Imran", nameTranslation: "The Family of Imran", ayahCount: 200, revelation: "Medinan" },
  { number: 4, nameArabic: "ٱلنِّسَاء", nameEnglish: "An-Nisa", nameTranslation: "The Women", ayahCount: 176, revelation: "Medinan" },
  { number: 5, nameArabic: "ٱلْمَائِدَة", nameEnglish: "Al-Maidah", nameTranslation: "The Table Spread", ayahCount: 120, revelation: "Medinan" },
  { number: 6, nameArabic: "ٱلْأَنْعَام", nameEnglish: "Al-An'am", nameTranslation: "The Cattle", ayahCount: 165, revelation: "Meccan" },
  { number: 7, nameArabic: "ٱلْأَعْرَاف", nameEnglish: "Al-A'raf", nameTranslation: "The Heights", ayahCount: 206, revelation: "Meccan" },
  { number: 8, nameArabic: "ٱلْأَنْفَال", nameEnglish: "Al-Anfal", nameTranslation: "The Spoils of War", ayahCount: 75, revelation: "Medinan" },
  { number: 9, nameArabic: "ٱلتَّوْبَة", nameEnglish: "At-Tawbah", nameTranslation: "The Repentance", ayahCount: 129, revelation: "Medinan" },
  { number: 10, nameArabic: "يُونُس", nameEnglish: "Yunus", nameTranslation: "Jonah", ayahCount: 109, revelation: "Meccan" },
  { number: 11, nameArabic: "هُود", nameEnglish: "Hud", nameTranslation: "Hud", ayahCount: 123, revelation: "Meccan" },
  { number: 12, nameArabic: "يُوسُف", nameEnglish: "Yusuf", nameTranslation: "Joseph", ayahCount: 111, revelation: "Meccan" },
  { number: 13, nameArabic: "ٱلرَّعْد", nameEnglish: "Ar-Ra'd", nameTranslation: "The Thunder", ayahCount: 43, revelation: "Medinan" },
  { number: 14, nameArabic: "إِبْرَاهِيم", nameEnglish: "Ibrahim", nameTranslation: "Abraham", ayahCount: 52, revelation: "Meccan" },
  { number: 15, nameArabic: "ٱلْحِجْر", nameEnglish: "Al-Hijr", nameTranslation: "The Rocky Tract", ayahCount: 99, revelation: "Meccan" },
  { number: 16, nameArabic: "ٱلنَّحْل", nameEnglish: "An-Nahl", nameTranslation: "The Bee", ayahCount: 128, revelation: "Meccan" },
  { number: 17, nameArabic: "ٱلْإِسْرَاء", nameEnglish: "Al-Isra", nameTranslation: "The Night Journey", ayahCount: 111, revelation: "Meccan" },
  { number: 18, nameArabic: "ٱلْكَهْف", nameEnglish: "Al-Kahf", nameTranslation: "The Cave", ayahCount: 110, revelation: "Meccan" },
  { number: 19, nameArabic: "مَرْيَم", nameEnglish: "Maryam", nameTranslation: "Mary", ayahCount: 98, revelation: "Meccan" },
  { number: 20, nameArabic: "طه", nameEnglish: "Ta-Ha", nameTranslation: "Ta-Ha", ayahCount: 135, revelation: "Meccan" },
  { number: 21, nameArabic: "ٱلْأَنْبِيَاء", nameEnglish: "Al-Anbiya", nameTranslation: "The Prophets", ayahCount: 112, revelation: "Meccan" },
  { number: 22, nameArabic: "ٱلْحَجّ", nameEnglish: "Al-Hajj", nameTranslation: "The Pilgrimage", ayahCount: 78, revelation: "Medinan" },
  { number: 23, nameArabic: "ٱلْمُؤْمِنُون", nameEnglish: "Al-Mu'minun", nameTranslation: "The Believers", ayahCount: 118, revelation: "Meccan" },
  { number: 24, nameArabic: "ٱلنُّور", nameEnglish: "An-Nur", nameTranslation: "The Light", ayahCount: 64, revelation: "Medinan" },
  { number: 25, nameArabic: "ٱلْفُرْقَان", nameEnglish: "Al-Furqan", nameTranslation: "The Criterion", ayahCount: 77, revelation: "Meccan" },
  { number: 26, nameArabic: "ٱلشُّعَرَاء", nameEnglish: "Ash-Shu'ara", nameTranslation: "The Poets", ayahCount: 227, revelation: "Meccan" },
  { number: 27, nameArabic: "ٱلنَّمْل", nameEnglish: "An-Naml", nameTranslation: "The Ant", ayahCount: 93, revelation: "Meccan" },
  { number: 28, nameArabic: "ٱلْقَصَص", nameEnglish: "Al-Qasas", nameTranslation: "The Stories", ayahCount: 88, revelation: "Meccan" },
  { number: 29, nameArabic: "ٱلْعَنْكَبُوت", nameEnglish: "Al-Ankabut", nameTranslation: "The Spider", ayahCount: 69, revelation: "Meccan" },
  { number: 30, nameArabic: "ٱلرُّوم", nameEnglish: "Ar-Rum", nameTranslation: "The Romans", ayahCount: 60, revelation: "Meccan" },
  { number: 31, nameArabic: "لُقْمَان", nameEnglish: "Luqman", nameTranslation: "Luqman", ayahCount: 34, revelation: "Meccan" },
  { number: 32, nameArabic: "ٱلسَّجْدَة", nameEnglish: "As-Sajdah", nameTranslation: "The Prostration", ayahCount: 30, revelation: "Meccan" },
  { number: 33, nameArabic: "ٱلْأَحْزَاب", nameEnglish: "Al-Ahzab", nameTranslation: "The Confederates", ayahCount: 73, revelation: "Medinan" },
  { number: 34, nameArabic: "سَبَأ", nameEnglish: "Saba", nameTranslation: "Sheba", ayahCount: 54, revelation: "Meccan" },
  { number: 35, nameArabic: "فَاطِر", nameEnglish: "Fatir", nameTranslation: "Originator", ayahCount: 45, revelation: "Meccan" },
  { number: 36, nameArabic: "يس", nameEnglish: "Ya-Sin", nameTranslation: "Ya-Sin", ayahCount: 83, revelation: "Meccan" },
  { number: 37, nameArabic: "ٱلصَّافَّات", nameEnglish: "As-Saffat", nameTranslation: "Those Ranged in Ranks", ayahCount: 182, revelation: "Meccan" },
  { number: 38, nameArabic: "ص", nameEnglish: "Sad", nameTranslation: "Sad", ayahCount: 88, revelation: "Meccan" },
  { number: 39, nameArabic: "ٱلزُّمَر", nameEnglish: "Az-Zumar", nameTranslation: "The Groups", ayahCount: 75, revelation: "Meccan" },
  { number: 40, nameArabic: "غَافِر", nameEnglish: "Ghafir", nameTranslation: "The Forgiver", ayahCount: 85, revelation: "Meccan" },
  { number: 41, nameArabic: "فُصِّلَت", nameEnglish: "Fussilat", nameTranslation: "Explained in Detail", ayahCount: 54, revelation: "Meccan" },
  { number: 42, nameArabic: "ٱلشُّورىٰ", nameEnglish: "Ash-Shuraa", nameTranslation: "Consultation", ayahCount: 53, revelation: "Meccan" },
  { number: 43, nameArabic: "ٱلزُّخْرُف", nameEnglish: "Az-Zukhruf", nameTranslation: "Ornaments of Gold", ayahCount: 89, revelation: "Meccan" },
  { number: 44, nameArabic: "ٱلدُّخَان", nameEnglish: "Ad-Dukhan", nameTranslation: "The Smoke", ayahCount: 59, revelation: "Meccan" },
  { number: 45, nameArabic: "ٱلْجَاثِيَة", nameEnglish: "Al-Jathiyah", nameTranslation: "Crouching", ayahCount: 37, revelation: "Meccan" },
  { number: 46, nameArabic: "ٱلْأَحْقَاف", nameEnglish: "Al-Ahqaf", nameTranslation: "The Sand-Dunes", ayahCount: 35, revelation: "Meccan" },
  { number: 47, nameArabic: "مُحَمَّد", nameEnglish: "Muhammad", nameTranslation: "Muhammad", ayahCount: 38, revelation: "Medinan" },
  { number: 48, nameArabic: "ٱلْفَتْح", nameEnglish: "Al-Fath", nameTranslation: "The Victory", ayahCount: 29, revelation: "Medinan" },
  { number: 49, nameArabic: "ٱلْحُجُرَات", nameEnglish: "Al-Hujurat", nameTranslation: "The Chambers", ayahCount: 18, revelation: "Medinan" },
  { number: 50, nameArabic: "ق", nameEnglish: "Qaf", nameTranslation: "Qaf", ayahCount: 45, revelation: "Meccan" },
  { number: 51, nameArabic: "ٱلذَّارِيَات", nameEnglish: "Adh-Dhariyat", nameTranslation: "The Winnowing Winds", ayahCount: 60, revelation: "Meccan" },
  { number: 52, nameArabic: "ٱلطُّور", nameEnglish: "At-Tur", nameTranslation: "The Mount", ayahCount: 49, revelation: "Meccan" },
  { number: 53, nameArabic: "ٱلنَّجْم", nameEnglish: "An-Najm", nameTranslation: "The Star", ayahCount: 62, revelation: "Meccan" },
  { number: 54, nameArabic: "ٱلْقَمَر", nameEnglish: "Al-Qamar", nameTranslation: "The Moon", ayahCount: 55, revelation: "Meccan" },
  { number: 55, nameArabic: "ٱلرَّحْمٰن", nameEnglish: "Ar-Rahman", nameTranslation: "The Most Merciful", ayahCount: 78, revelation: "Medinan" },
  { number: 56, nameArabic: "ٱلْوَاقِعَة", nameEnglish: "Al-Waqi'ah", nameTranslation: "The Inevitable", ayahCount: 96, revelation: "Meccan" },
  { number: 57, nameArabic: "ٱلْحَدِيد", nameEnglish: "Al-Hadid", nameTranslation: "The Iron", ayahCount: 29, revelation: "Medinan" },
  { number: 58, nameArabic: "ٱلْمُجَادَلَة", nameEnglish: "Al-Mujadila", nameTranslation: "The Pleading Woman", ayahCount: 22, revelation: "Medinan" },
  { number: 59, nameArabic: "ٱلْحَشْر", nameEnglish: "Al-Hashr", nameTranslation: "The Exile", ayahCount: 24, revelation: "Medinan" },
  { number: 60, nameArabic: "ٱلْمُمْتَحَنَة", nameEnglish: "Al-Mumtahanah", nameTranslation: "She That Is to Be Examined", ayahCount: 13, revelation: "Medinan" },
  { number: 61, nameArabic: "ٱلصَّفّ", nameEnglish: "As-Saff", nameTranslation: "The Ranks", ayahCount: 14, revelation: "Medinan" },
  { number: 62, nameArabic: "ٱلْجُمُعَة", nameEnglish: "Al-Jumu'ah", nameTranslation: "Friday", ayahCount: 11, revelation: "Medinan" },
  { number: 63, nameArabic: "ٱلْمُنَافِقُون", nameEnglish: "Al-Munafiqun", nameTranslation: "The Hypocrites", ayahCount: 11, revelation: "Medinan" },
  { number: 64, nameArabic: "ٱلتَّغَابُن", nameEnglish: "At-Taghabun", nameTranslation: "Mutual Disillusion", ayahCount: 18, revelation: "Medinan" },
  { number: 65, nameArabic: "ٱلطَّلَاق", nameEnglish: "At-Talaq", nameTranslation: "Divorce", ayahCount: 12, revelation: "Medinan" },
  { number: 66, nameArabic: "ٱلتَّحْرِيم", nameEnglish: "At-Tahrim", nameTranslation: "The Prohibition", ayahCount: 12, revelation: "Medinan" },
  { number: 67, nameArabic: "ٱلْمُلْك", nameEnglish: "Al-Mulk", nameTranslation: "The Sovereignty", ayahCount: 30, revelation: "Meccan" },
  { number: 68, nameArabic: "ٱلْقَلَم", nameEnglish: "Al-Qalam", nameTranslation: "The Pen", ayahCount: 52, revelation: "Meccan" },
  { number: 69, nameArabic: "ٱلْحَاقَّة", nameEnglish: "Al-Haqqah", nameTranslation: "The Reality", ayahCount: 52, revelation: "Meccan" },
  { number: 70, nameArabic: "ٱلْمَعَارِج", nameEnglish: "Al-Ma'arij", nameTranslation: "The Ascending Stairways", ayahCount: 44, revelation: "Meccan" },
  { number: 71, nameArabic: "نُوح", nameEnglish: "Nuh", nameTranslation: "Noah", ayahCount: 28, revelation: "Meccan" },
  { number: 72, nameArabic: "ٱلْجِنّ", nameEnglish: "Al-Jinn", nameTranslation: "The Jinn", ayahCount: 28, revelation: "Meccan" },
  { number: 73, nameArabic: "ٱلْمُزَّمِّل", nameEnglish: "Al-Muzzammil", nameTranslation: "The Enshrouded One", ayahCount: 20, revelation: "Meccan" },
  { number: 74, nameArabic: "ٱلْمُدَّثِّر", nameEnglish: "Al-Muddaththir", nameTranslation: "The Cloaked One", ayahCount: 56, revelation: "Meccan" },
  { number: 75, nameArabic: "ٱلْقِيَامَة", nameEnglish: "Al-Qiyamah", nameTranslation: "The Resurrection", ayahCount: 40, revelation: "Meccan" },
  { number: 76, nameArabic: "ٱلْإِنْسَان", nameEnglish: "Al-Insan", nameTranslation: "The Human", ayahCount: 31, revelation: "Medinan" },
  { number: 77, nameArabic: "ٱلْمُرْسَلَات", nameEnglish: "Al-Mursalat", nameTranslation: "Those Sent Forth", ayahCount: 50, revelation: "Meccan" },
  { number: 78, nameArabic: "ٱلنَّبَأ", nameEnglish: "An-Naba", nameTranslation: "The Tidings", ayahCount: 40, revelation: "Meccan" },
  { number: 79, nameArabic: "ٱلنَّازِعَات", nameEnglish: "An-Nazi'at", nameTranslation: "Those Who Pull Out", ayahCount: 46, revelation: "Meccan" },
  { number: 80, nameArabic: "عَبَس", nameEnglish: "Abasa", nameTranslation: "He Frowned", ayahCount: 42, revelation: "Meccan" },
  { number: 81, nameArabic: "ٱلتَّكْوِير", nameEnglish: "At-Takwir", nameTranslation: "The Folding Up", ayahCount: 29, revelation: "Meccan" },
  { number: 82, nameArabic: "ٱلْإِنْفِطَار", nameEnglish: "Al-Infitar", nameTranslation: "The Cleaving", ayahCount: 19, revelation: "Meccan" },
  { number: 83, nameArabic: "ٱلْمُطَفِّفِين", nameEnglish: "Al-Mutaffifin", nameTranslation: "The Defrauders", ayahCount: 36, revelation: "Meccan" },
  { number: 84, nameArabic: "ٱلْإِنْشِقَاق", nameEnglish: "Al-Inshiqaq", nameTranslation: "The Splitting Open", ayahCount: 25, revelation: "Meccan" },
  { number: 85, nameArabic: "ٱلْبُرُوج", nameEnglish: "Al-Buruj", nameTranslation: "The Constellations", ayahCount: 22, revelation: "Meccan" },
  { number: 86, nameArabic: "ٱلطَّارِق", nameEnglish: "At-Tariq", nameTranslation: "The Morning Star", ayahCount: 17, revelation: "Meccan" },
  { number: 87, nameArabic: "ٱلْأَعْلَىٰ", nameEnglish: "Al-A'la", nameTranslation: "The Most High", ayahCount: 19, revelation: "Meccan" },
  { number: 88, nameArabic: "ٱلْغَاشِيَة", nameEnglish: "Al-Ghashiyah", nameTranslation: "The Overwhelming", ayahCount: 26, revelation: "Meccan" },
  { number: 89, nameArabic: "ٱلْفَجْر", nameEnglish: "Al-Fajr", nameTranslation: "The Dawn", ayahCount: 30, revelation: "Meccan" },
  { number: 90, nameArabic: "ٱلْبَلَد", nameEnglish: "Al-Balad", nameTranslation: "The City", ayahCount: 20, revelation: "Meccan" },
  { number: 91, nameArabic: "ٱلشَّمْس", nameEnglish: "Ash-Shams", nameTranslation: "The Sun", ayahCount: 15, revelation: "Meccan" },
  { number: 92, nameArabic: "ٱللَّيْل", nameEnglish: "Al-Layl", nameTranslation: "The Night", ayahCount: 21, revelation: "Meccan" },
  { number: 93, nameArabic: "ٱلضُّحَىٰ", nameEnglish: "Ad-Duhaa", nameTranslation: "The Forenoon", ayahCount: 11, revelation: "Meccan" },
  { number: 94, nameArabic: "ٱلشَّرْح", nameEnglish: "Ash-Sharh", nameTranslation: "The Relief", ayahCount: 8, revelation: "Meccan" },
  { number: 95, nameArabic: "ٱلتِّين", nameEnglish: "At-Tin", nameTranslation: "The Fig", ayahCount: 8, revelation: "Meccan" },
  { number: 96, nameArabic: "ٱلْعَلَق", nameEnglish: "Al-Alaq", nameTranslation: "The Clinging Clot", ayahCount: 19, revelation: "Meccan" },
  { number: 97, nameArabic: "ٱلْقَدْر", nameEnglish: "Al-Qadr", nameTranslation: "The Power", ayahCount: 5, revelation: "Meccan" },
  { number: 98, nameArabic: "ٱلْبَيِّنَة", nameEnglish: "Al-Bayyinah", nameTranslation: "The Clear Proof", ayahCount: 8, revelation: "Medinan" },
  { number: 99, nameArabic: "ٱلزَّلْزَلَة", nameEnglish: "Az-Zalzalah", nameTranslation: "The Earthquake", ayahCount: 8, revelation: "Medinan" },
  { number: 100, nameArabic: "ٱلْعَادِيَات", nameEnglish: "Al-Adiyat", nameTranslation: "The Coursers", ayahCount: 11, revelation: "Meccan" },
  { number: 101, nameArabic: "ٱلْقَارِعَة", nameEnglish: "Al-Qari'ah", nameTranslation: "The Calamity", ayahCount: 11, revelation: "Meccan" },
  { number: 102, nameArabic: "ٱلتَّكَاثُر", nameEnglish: "At-Takathur", nameTranslation: "The Rivalry", ayahCount: 8, revelation: "Meccan" },
  { number: 103, nameArabic: "ٱلْعَصْر", nameEnglish: "Al-Asr", nameTranslation: "The Declining Day", ayahCount: 3, revelation: "Meccan" },
  { number: 104, nameArabic: "ٱلْهُمَزَة", nameEnglish: "Al-Humazah", nameTranslation: "The Slanderer", ayahCount: 9, revelation: "Meccan" },
  { number: 105, nameArabic: "ٱلْفِيل", nameEnglish: "Al-Fil", nameTranslation: "The Elephant", ayahCount: 5, revelation: "Meccan" },
  { number: 106, nameArabic: "قُرَيْش", nameEnglish: "Quraysh", nameTranslation: "Quraysh", ayahCount: 4, revelation: "Meccan" },
  { number: 107, nameArabic: "ٱلْمَاعُون", nameEnglish: "Al-Ma'un", nameTranslation: "Small Kindnesses", ayahCount: 7, revelation: "Meccan" },
  { number: 108, nameArabic: "ٱلْكَوْثَر", nameEnglish: "Al-Kawthar", nameTranslation: "Abundance", ayahCount: 3, revelation: "Meccan" },
  { number: 109, nameArabic: "ٱلْكَافِرُون", nameEnglish: "Al-Kafirun", nameTranslation: "The Disbelievers", ayahCount: 6, revelation: "Meccan" },
  { number: 110, nameArabic: "ٱلنَّصْر", nameEnglish: "An-Nasr", nameTranslation: "Divine Support", ayahCount: 3, revelation: "Medinan" },
  { number: 111, nameArabic: "ٱلْمَسَد", nameEnglish: "Al-Masad", nameTranslation: "The Palm Fiber", ayahCount: 5, revelation: "Meccan" },
  { number: 112, nameArabic: "ٱلْإِخْلَاص", nameEnglish: "Al-Ikhlas", nameTranslation: "Sincerity", ayahCount: 4, revelation: "Meccan" },
  { number: 113, nameArabic: "ٱلْفَلَق", nameEnglish: "Al-Falaq", nameTranslation: "The Daybreak", ayahCount: 5, revelation: "Meccan" },
  { number: 114, nameArabic: "ٱلنَّاس", nameEnglish: "An-Nas", nameTranslation: "Mankind", ayahCount: 6, revelation: "Meccan" },
];

export function getSurah(number: number): SurahMeta | undefined {
  return SURAHS.find((s) => s.number === number);
}

export type ReelStyle = "calligraphic-bloom" | "liquid-light" | "sacred-geometry" | "celestial";

export const STYLES: { id: ReelStyle; name: string; description: string; tagline: string }[] = [
  { id: "calligraphic-bloom", name: "Calligraphic Bloom", description: "Ink on parchment, warm and intimate. Hand-painted ink washes bloom behind the verse like a master's reed pen meeting paper.", tagline: "warm · handmade · intimate" },
  { id: "liquid-light", name: "Liquid Light", description: "Drifting volumetric light in indigo, amber, and cream. A24-cinematic, atmospheric, dreamlike.", tagline: "cinematic · atmospheric · ethereal" },
  { id: "sacred-geometry", name: "Sacred Geometry", description: "Islamic geometric patterns — girih and 8-point stars — drawing in real-time over teal, gold, and ivory.", tagline: "geometric · ordered · contemplative" },
  { id: "celestial", name: "Celestial", description: "Drifting stars and soft nebulae, midnight to dawn. For verses about creation, the heavens, light.", tagline: "cosmic · vast · luminous" },
];

/** Pick a default style based on the surah's character. */
export function suggestStyle(surah: number): ReelStyle {
  // Cosmos / creation / heavens
  if ([67, 53, 55, 71, 78, 79, 81, 82, 84, 85, 86, 91, 100].includes(surah)) return "celestial";
  // Light / mercy / nur themes
  if ([24, 35, 39, 36].includes(surah)) return "liquid-light";
  // Order / law / structure
  if ([2, 3, 4, 5, 8, 9, 22, 33, 49].includes(surah)) return "sacred-geometry";
  // Default — intimate, devotional
  return "calligraphic-bloom";
}

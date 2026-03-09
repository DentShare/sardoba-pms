export interface UzHoliday {
  dateMonthDay: string; // MM-DD
  nameRu: string;
  nameUz: string;
  defaultBoostPercent: number;
}

export const UZ_HOLIDAYS: UzHoliday[] = [
  { dateMonthDay: '01-01', nameRu: 'Новый год', nameUz: 'Yangi yil', defaultBoostPercent: 20 },
  { dateMonthDay: '01-02', nameRu: 'Новый год (2-й день)', nameUz: 'Yangi yil (2-kun)', defaultBoostPercent: 20 },
  { dateMonthDay: '03-08', nameRu: 'Международный женский день', nameUz: 'Xotin-qizlar kuni', defaultBoostPercent: 10 },
  { dateMonthDay: '03-21', nameRu: 'Навруз', nameUz: "Navro'z", defaultBoostPercent: 50 },
  { dateMonthDay: '03-22', nameRu: 'Навруз (2-й день)', nameUz: "Navro'z (2-kun)", defaultBoostPercent: 50 },
  { dateMonthDay: '03-23', nameRu: 'Навруз (3-й день)', nameUz: "Navro'z (3-kun)", defaultBoostPercent: 30 },
  { dateMonthDay: '05-09', nameRu: 'День памяти и почестей', nameUz: 'Xotira va qadrlash kuni', defaultBoostPercent: 0 },
  { dateMonthDay: '09-01', nameRu: 'День независимости', nameUz: 'Mustaqillik kuni', defaultBoostPercent: 30 },
  { dateMonthDay: '10-01', nameRu: 'День учителей', nameUz: "O'qituvchilar kuni", defaultBoostPercent: 5 },
  { dateMonthDay: '12-08', nameRu: 'День Конституции', nameUz: 'Konstitutsiya kuni', defaultBoostPercent: 10 },
];

import { LongWeekendOption } from '../types';

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function formatMonthDay(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatFriendlyDate(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getNthDayOfMonth(year: number, monthIndex: number, dayOfWeek: number, n: number): Date {
  let d = new Date(Date.UTC(year, monthIndex, 1));
  let count = 0;
  while (d.getUTCMonth() === monthIndex) {
    if (d.getUTCDay() === dayOfWeek) {
      count++;
      if (count === n) return d;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function getLastDayOfMonth(year: number, monthIndex: number, dayOfWeek: number): Date {
  let d = new Date(Date.UTC(year, monthIndex + 1, 0));
  while (d.getUTCDay() !== dayOfWeek) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

function addDays(d: Date, n: number): Date {
  const res = new Date(d);
  res.setUTCDate(res.getUTCDate() + n);
  return res;
}

export function calculateHolidayLongWeekends(year: number = 2026): LongWeekendOption[] {
  const list: LongWeekendOption[] = [];

  // 1. Family Day (CA) & Presidents Day (US): 3rd Monday of February
  const febMon = getNthDayOfMonth(year, 1, 1, 3);
  const febFri = addDays(febMon, -3);
  list.push({
    name: "Family Day Weekend",
    country: "CA",
    dates: `${formatMonthDay(febFri)} - ${formatMonthDay(febMon)}, ${year}`,
    startDate: toIsoDate(febFri),
    endDate: toIsoDate(febMon),
    days: 4,
    season: "Winter"
  });
  list.push({
    name: "Presidents' Day Weekend",
    country: "US",
    dates: `${formatMonthDay(febFri)} - ${formatMonthDay(febMon)}, ${year}`,
    startDate: toIsoDate(febFri),
    endDate: toIsoDate(febMon),
    days: 4,
    season: "Winter"
  });

  // 2. Easter / Good Friday: Good Friday to Easter Monday
  const easterSun = getEasterSunday(year);
  const goodFri = addDays(easterSun, -2);
  const easterMon = addDays(easterSun, 1);
  list.push({
    name: "Easter / Good Friday Weekend",
    country: "CA / US",
    dates: `${formatMonthDay(goodFri)} - ${formatMonthDay(easterMon)}, ${year}`,
    startDate: toIsoDate(goodFri),
    endDate: toIsoDate(easterMon),
    days: 4,
    season: "Spring"
  });

  // 3. Victoria Day (CA): Penultimate Monday of May (Monday before May 25)
  let vicMon = new Date(Date.UTC(year, 4, 24));
  while (vicMon.getUTCDay() !== 1) {
    vicMon.setUTCDate(vicMon.getUTCDate() - 1);
  }
  const vicFri = addDays(vicMon, -3);
  list.push({
    name: "Victoria Day Weekend",
    country: "CA",
    dates: `${formatMonthDay(vicFri)} - ${formatMonthDay(vicMon)}, ${year}`,
    startDate: toIsoDate(vicFri),
    endDate: toIsoDate(vicMon),
    days: 4,
    season: "Spring"
  });

  // 4. Memorial Day (US): Last Monday of May
  const memMon = getLastDayOfMonth(year, 4, 1);
  const memFri = addDays(memMon, -3);
  list.push({
    name: "Memorial Day Weekend",
    country: "US",
    dates: `${formatMonthDay(memFri)} - ${formatMonthDay(memMon)}, ${year}`,
    startDate: toIsoDate(memFri),
    endDate: toIsoDate(memMon),
    days: 4,
    season: "Spring"
  });

  // 5. Canada Day (CA): July 1
  const canDay = new Date(Date.UTC(year, 6, 1));
  const canDayOfWeek = canDay.getUTCDay();
  let canStart: Date, canEnd: Date;
  if (canDayOfWeek === 1) {
    canStart = addDays(canDay, -3);
    canEnd = canDay;
  } else if (canDayOfWeek === 5) {
    canStart = canDay;
    canEnd = addDays(canDay, 3);
  } else if (canDayOfWeek === 6) {
    canStart = addDays(canDay, -1);
    canEnd = addDays(canDay, 2);
  } else if (canDayOfWeek === 0) {
    canStart = addDays(canDay, -2);
    canEnd = addDays(canDay, 1);
  } else if (canDayOfWeek === 4) {
    canStart = canDay;
    canEnd = addDays(canDay, 3);
  } else if (canDayOfWeek === 2) {
    canStart = addDays(canDay, -4);
    canEnd = canDay;
  } else {
    canStart = canDay;
    canEnd = addDays(canDay, 4);
  }
  const canDaysCount = Math.round((canEnd.getTime() - canStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  list.push({
    name: "Canada Day Weekend",
    country: "CA",
    dates: `${formatMonthDay(canStart)} - ${formatMonthDay(canEnd)}, ${year}`,
    startDate: toIsoDate(canStart),
    endDate: toIsoDate(canEnd),
    days: canDaysCount,
    season: "Summer"
  });

  // 6. 4th of July / Independence Day (US): July 4
  const usJul4 = new Date(Date.UTC(year, 6, 4));
  const usDayOfWeek = usJul4.getUTCDay();
  let usStart: Date, usEnd: Date;
  if (usDayOfWeek === 1) {
    usStart = addDays(usJul4, -3);
    usEnd = usJul4;
  } else if (usDayOfWeek === 5) {
    usStart = usJul4;
    usEnd = addDays(usJul4, 3);
  } else if (usDayOfWeek === 6) {
    usStart = addDays(usJul4, -1);
    usEnd = addDays(usJul4, 2);
  } else if (usDayOfWeek === 0) {
    usStart = addDays(usJul4, -2);
    usEnd = addDays(usJul4, 1);
  } else if (usDayOfWeek === 4) {
    usStart = usJul4;
    usEnd = addDays(usJul4, 3);
  } else if (usDayOfWeek === 2) {
    usStart = addDays(usJul4, -4);
    usEnd = usJul4;
  } else {
    usStart = usJul4;
    usEnd = addDays(usJul4, 4);
  }
  const usDaysCount = Math.round((usEnd.getTime() - usStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  list.push({
    name: "4th of July Weekend",
    country: "US",
    dates: `${formatMonthDay(usStart)} - ${formatMonthDay(usEnd)}, ${year}`,
    startDate: toIsoDate(usStart),
    endDate: toIsoDate(usEnd),
    days: usDaysCount,
    season: "Summer"
  });

  // 7. Civic Holiday / August Long (CA): 1st Monday of August
  const civMon = getNthDayOfMonth(year, 7, 1, 1);
  const civFri = addDays(civMon, -3);
  list.push({
    name: "Civic Holiday / August Long",
    country: "CA",
    dates: `${formatMonthDay(civFri)} - ${formatMonthDay(civMon)}, ${year}`,
    startDate: toIsoDate(civFri),
    endDate: toIsoDate(civMon),
    days: 4,
    season: "Summer"
  });

  // 8. Labor Day / Labour Day (CA & US): 1st Monday of September
  const labMon = getNthDayOfMonth(year, 8, 1, 1);
  const labFri = addDays(labMon, -3);
  list.push({
    name: "Labor Day / Labour Day",
    country: "CA / US",
    dates: `${formatMonthDay(labFri)} - ${formatMonthDay(labMon)}, ${year}`,
    startDate: toIsoDate(labFri),
    endDate: toIsoDate(labMon),
    days: 4,
    season: "Summer"
  });

  // 9. Canadian Thanksgiving (CA): 2nd Monday of October
  const octMon = getNthDayOfMonth(year, 9, 1, 2);
  const octFri = addDays(octMon, -3);
  list.push({
    name: "Canadian Thanksgiving Weekend",
    country: "CA",
    dates: `${formatMonthDay(octFri)} - ${formatMonthDay(octMon)}, ${year}`,
    startDate: toIsoDate(octFri),
    endDate: toIsoDate(octMon),
    days: 4,
    season: "Fall"
  });

  // 10. Indigenous Peoples' / Columbus Day (US): 2nd Monday of October
  list.push({
    name: "Indigenous Peoples' Day Weekend",
    country: "US",
    dates: `${formatMonthDay(octFri)} - ${formatMonthDay(octMon)}, ${year}`,
    startDate: toIsoDate(octFri),
    endDate: toIsoDate(octMon),
    days: 4,
    season: "Fall"
  });

  // 11. US Thanksgiving (US): 4th Thursday of November
  const thxThu = getNthDayOfMonth(year, 10, 4, 4);
  const thxSun = addDays(thxThu, 3);
  list.push({
    name: "US Thanksgiving Weekend",
    country: "US",
    dates: `${formatMonthDay(thxThu)} - ${formatMonthDay(thxSun)}, ${year}`,
    startDate: toIsoDate(thxThu),
    endDate: toIsoDate(thxSun),
    days: 4,
    season: "Fall"
  });

  return list;
}

import { Lunar } from 'lunar-javascript';
const lunar = Lunar.fromDate(new Date());
console.log(
  lunar.getYearGanIndex(), lunar.getYearZhiIndex(),
  lunar.getMonthGanIndex(), lunar.getMonthZhiIndex(),
  lunar.getDayGanIndex(), lunar.getDayZhiIndex(),
  lunar.getYear(), lunar.getMonth(), lunar.getDay()
);

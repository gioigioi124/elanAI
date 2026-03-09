import { Solar, Lunar } from 'lunar-javascript';
const lunar = Lunar.fromDate(new Date());
console.log(lunar.toString(), lunar.getYearInGanZhi(), lunar.getMonthInGanZhi(), lunar.getDayInGanZhi());

import { Lunar } from 'lunar-javascript';
const lunar = Lunar.fromDate(new Date());
console.log(
  typeof lunar.getDayGanIndex === 'function' ? lunar.getDayGanIndex() : 'no getDayGanIndex',
  typeof lunar.getDayZhiIndex === 'function' ? lunar.getDayZhiIndex() : 'no getDayZhiIndex'
);

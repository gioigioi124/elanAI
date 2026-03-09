import { Lunar } from 'lunar-javascript';
const lunar = Lunar.fromDate(new Date());
const times = lunar.getTimes();
times.forEach(t => {
  console.log(`${t.getZhi()}: ${t.getTianShenType()}`);
});

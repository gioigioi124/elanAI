import { Lunar } from 'lunar-javascript';
const lunar = Lunar.fromDate(new Date());

console.log('JieQi (Tiết khí):', lunar.getJieQi());
console.log('JieQiList:', lunar.getJieQiList());
console.log('getCurrentJieQi:', lunar.getCurrentJieQi()?.getName());

console.log('Xiu (Sao):', lunar.getXiu());
console.log('Animal (Con vật):', lunar.getAnimal());
console.log('Gong (Cung):', lunar.getGong());
console.log('Zheng (Chính):', lunar.getZheng());

console.log('DayYi (Việc nên làm):', lunar.getDayYi());
console.log('DayJi (Việc kiêng kỵ):', lunar.getDayJi());

console.log('DayJiShen (Cát thần):', lunar.getDayJiShen());
console.log('DayXiongSha (Hung thần):', lunar.getDayXiongSha());

const times = lunar.getTimes();
const hoangDaoHours = [];
for (let i = 0; i < times.length; i++) {
  const t = times[i];
  if (t.getTimeTianShenType() === '黃道') { // Probably '黃道'/'黄道' ? Let's just print type
    hoangDaoHours.push(`${t.getTimeZhi()} (${t.getTimeTianShenType()})`);
  }
}
console.log('Hoang Dao Hours:', hoangDaoHours);


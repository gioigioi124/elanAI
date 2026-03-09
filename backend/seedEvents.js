import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HistoricalEvent from './src/models/HistoricalEvent.js';

dotenv.config();

// Create 365 days of quotes first (for base)
const uncleHoQuotes = [
  "Không có gì quý hơn độc lập, tự do.",
  "Đoàn kết, đoàn kết, đại đoàn kết. Thành công, thành công, đại thành công.",
  "Dễ mười lần không dân cũng chịu, khó trăm lần dân liệu cũng xong.",
  "Vì lợi ích mười năm thì phải trồng cây, vì lợi ích trăm năm thì phải trồng người.",
  "Học hỏi là một việc phải tiếp tục suốt đời.",
  "Trời có bốn mùa: Xuân, Hạ, Thu, Đông. Đất có bốn phương: Đông, Tây, Nam, Bắc. Người có bốn đức: Cần, Kiệm, Liêm, Chính.",
  "Nước Việt Nam là một, dân tộc Việt Nam là một. Sông có thể cạn, núi có thể mòn, song chân lý ấy không bao giờ thay đổi.",
  "Chiến tranh có thể kéo dài 5 năm, 10 năm, 20 năm hoặc lâu hơn nữa. Hà Nội, Hải Phòng và một số thành phố, xí nghiệp có thể bị tàn phá, song nhân dân Việt Nam quyết không sợ!",
  "Thương binh, bệnh binh, gia đình quân nhân, gia đình liệt sĩ là những người có công với Tổ quốc, với nhân dân. Cho nên bổn phận của chúng ta là phải biết ơn, phải thương yêu và giúp đỡ họ.",
  "Cán bộ là cái gốc của mọi công việc. Vì vậy, huấn luyện cán bộ là công việc gốc của Đảng.",
  "Thực tiễn không có lý luận hướng dẫn thì thành thực tiễn mù quáng. Lý luận mà không liên hệ với thực tiễn là lý luận suông.",
  "Thanh niên phải có đức, có tài. Có tài mà không có đức ví như một anh làm kinh tế tài chính rất giỏi nhưng lại đi đến thụt két thì chẳng những không làm được gì ích lợi cho xã hội, mà còn có hại cho xã hội nữa. Nếu có đức mà không có tài ví như ông Bụt không làm hại gì, nhưng cũng không lợi gì cho loài người.",
  "Giữ gìn dân chủ, xây dựng nước nhà, gây đời sống mới, việc gì cũng cần có sức khỏe mới làm thành công.",
  "Tôi chỉ có một sự ham muốn, ham muốn tột bậc, là làm sao cho nước ta được hoàn toàn độc lập, dân ta được hoàn toàn tự do, đồng bào ai cũng có cơm ăn áo mặc, ai cũng được học hành.",
  "Chúng ta phải học, phải cố gắng học nhiều. Không chịu khó học thì không tiến bộ được. Không tiến bộ là thoái bộ. Xã hội càng đi tới, công việc càng nhiều, máy móc càng tinh xảo. Mình mà không chịu học thì lạc hậu, mà lạc hậu là bị đào thải, tự mình đào thải mình."
];

const events = [];
const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

for (let month = 1; month <= 12; month++) {
  for (let day = 1; day <= daysInMonth[month - 1]; day++) {
    // We'll insert a random quote for EVERY day as UncleHoQuote. 
    // We will ensure that historical controller favors UncleHo specific events or VietnamWar events first.
    // If we just want quotes to display when nothing else is there, we can mark them specifically.
    
    events.push({
      day,
      month,
      event: uncleHoQuotes[Math.floor(Math.random() * uncleHoQuotes.length)],
      type: 'UncleHoQuote'
    });
  }
}

// Now add actual historical events (these will override / be prioritized over quotes in the query)
const historicalEvents = [
  // Vietnam War (Kháng chiến chống Mỹ & Related Historical Events)
  { day: 1, month: 1, event: 'Chiến dịch Mậu Thân 1968 bắt đầu (đợt 1 kéo dài từ cuối tháng 1)', type: 'VietnamWar' },
  { day: 2, month: 1, event: 'Trận Ấp Bắc thắng lợi, báo hiệu sự sụp đổ của chiến lược "Chiến tranh đặc biệt" (1963)', type: 'VietnamWar' },
  { day: 15, month: 1, event: 'Bắt đầu đợt 1 Chiến dịch Mậu Thân (1968)', type: 'VietnamWar' },
  { day: 27, month: 1, event: 'Ký kết Hiệp định Paris chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam (1973)', type: 'VietnamWar' },
  { day: 31, month: 1, event: 'Tổng tiến công và nổi dậy Tết Mậu Thân đồng loạt nổ ra trên toàn miền Nam (1968)', type: 'VietnamWar' },
  
  { day: 3, month: 2, event: 'Thành lập Đảng Cộng sản Việt Nam (1930)', type: 'VietnamWar' },
  { day: 8, month: 2, event: 'Lực lượng vũ trang giải phóng miền Nam Việt Nam ra đời (1961)', type: 'VietnamWar' },
  
  { day: 10, month: 3, event: 'Chiến dịch Tây Nguyên mở màn bằng trận đánh Buôn Ma Thuột (1975)', type: 'VietnamWar' },
  { day: 11, month: 3, event: 'Chiến thắng Ba Gia, tiêu diệt một chiến đoàn quân đội Sài Gòn (1965)', type: 'VietnamWar' },
  { day: 24, month: 3, event: 'Giải phóng Tây Nguyên, kết thúc thắng lợi chiến dịch Tây Nguyên (1975)', type: 'VietnamWar' },
  { day: 29, month: 3, event: 'Giải phóng hoàn toàn thành phố Đà Nẵng (1975)', type: 'VietnamWar' },
  
  { day: 9, month: 4, event: 'Trận Xuân Lộc - "Cánh cửa thép" bảo vệ Sài Gòn bị chọc thủng (1975)', type: 'VietnamWar' },
  { day: 26, month: 4, event: 'Bắt đầu Chiến dịch Hồ Chí Minh lịch sử (1975)', type: 'VietnamWar' },
  { day: 30, month: 4, event: 'Đại thắng mùa Xuân 1975, giải phóng hoàn toàn miền Nam, thống nhất đất nước', type: 'VietnamWar' },
  
  { day: 1, month: 5, event: 'Lực lượng vũ trang hoàn thành giải phóng các tỉnh đồng bằng sông Cửu Long (1975)', type: 'VietnamWar' },
  { day: 7, month: 5, event: 'Chiến thắng Điện Biên Phủ, kết thúc thắng lợi cuộc kháng chiến chống Pháp (1954)', type: 'VietnamWar' },
  { day: 19, month: 5, event: 'Đoàn 559 được thành lập, mở đường Trường Sơn - đường Hồ Chí Minh (1959)', type: 'VietnamWar' },
  
  { day: 6, month: 6, event: 'Chính phủ Cách mạng lâm thời Cộng hòa miền Nam Việt Nam được thành lập (1969)', type: 'VietnamWar' },
  
  { day: 2, month: 7, event: 'Thành lập nước Cộng hòa Xã hội Chủ nghĩa Việt Nam (1976)', type: 'VietnamWar' },
  { day: 20, month: 7, event: 'Hiệp định Geneva về Đông Dương được ký kết (1954)', type: 'VietnamWar' },
  
  { day: 2, month: 8, event: 'Sự kiện Vịnh Bắc Bộ (1964)', type: 'VietnamWar' },
  { day: 5, month: 8, event: 'Đế quốc Mỹ dùng không quân và hải quân đánh phá miền Bắc Việt Nam lần thứ nhất (1964)', type: 'VietnamWar' },
  { day: 18, month: 8, event: 'Chiến thắng Vạn Tường, mở đầu cao trào "tìm Mỹ mà đánh, lùng ngụy mà diệt" (1965)', type: 'VietnamWar' },
  
  { day: 2, month: 9, event: 'Quốc khánh nước Cộng hòa Xã hội chủ nghĩa Việt Nam (1945)', type: 'VietnamWar' },
  
  { day: 4, month: 10, event: 'Trung ương Đảng ra Nghị quyết 15 đề ra đường lối đấu tranh cách mạng miền Nam (1959)', type: 'VietnamWar' },
  { day: 10, month: 10, event: 'Giải phóng Thủ đô Hà Nội (1954)', type: 'VietnamWar' },
  
  { day: 20, month: 11, event: 'Ngày Nhà giáo Việt Nam (Liên quan đến truyền thống tôn sư trọng đạo)', type: 'VietnamWar' },
  
  { day: 18, month: 12, event: 'Bắt đầu trận "Điện Biên Phủ trên không" bảo vệ Hà Nội (1972)', type: 'VietnamWar' },
  { day: 20, month: 12, event: 'Thành lập Mặt trận Dân tộc giải phóng miền Nam Việt Nam (1960)', type: 'VietnamWar' },
  { day: 22, month: 12, event: 'Thành lập Đội Việt Nam Tuyên truyền Giải phóng quân (1944)', type: 'VietnamWar' },
  { day: 30, month: 12, event: 'Kết thúc thắng lợi trận "Điện Biên Phủ trên không" bảo vệ Hà Nội (1972)', type: 'VietnamWar' },


  // Uncle Ho events (Sự kiện thực tế về Bác Hồ)
  { day: 28, month: 1, event: 'Bác Hồ về nước sau 30 năm bôn ba tìm đường cứu nước trực tiếp lãnh đạo cách mạng (1941)', type: 'UncleHo' },
  { day: 19, month: 5, event: 'Kỷ niệm Ngày sinh của Chủ tịch Hồ Chí Minh (1890)', type: 'UncleHo' },
  { day: 5, month: 6, event: 'Nguyễn Tất Thành (Bác Hồ) ra đi tìm đường cứu nước tại Bến Nhà Rồng (1911)', type: 'UncleHo' },
  { day: 13, month: 8, event: 'Chủ tịch Hồ Chí Minh ký sắc lệnh thành lập Ủy ban Dân tộc giải phóng (1945)', type: 'UncleHo' },
  { day: 2, month: 9, event: 'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập tại Quảng trường Ba Đình và đây cũng là ngày mất của Người (1969)', type: 'UncleHo' },
  { day: 8, month: 10, event: 'Chủ tịch Hồ Chí Minh gửi thư cho khối thi đua học sinh (sau này là Ngày truyền thống học sinh sinh viên)', type: 'UncleHo' },
  { day: 19, month: 12, event: 'Chủ tịch Hồ Chí Minh ra Lời kêu gọi toàn quốc kháng chiến (1946)', type: 'UncleHo' }
];

historicalEvents.forEach(e => {
  // Try to replace an existing quote event for this day, or just add it if not found (though all 365 exist)
  const existingIdx = events.findIndex(ev => ev.day === e.day && ev.month === e.month && ev.type === 'UncleHoQuote');
  if (existingIdx !== -1) {
    // We don't remove the quote, we just append the real event so it has priority
    events.push(e);
  } else {
    events.push(e);
  }
});

async function seedEvents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Clear existing events to prevent duplicates
    await HistoricalEvent.deleteMany({});
    console.log('Cleared existing events');

    await HistoricalEvent.insertMany(events);
    console.log(`Successfully seeded ${events.length} events`);

    process.exit(0);
  } catch (err) {
    console.error('Failed to seed events:', err);
    process.exit(1);
  }
}

seedEvents();

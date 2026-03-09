import React, { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Activity, Coins, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay as getDayOfWeek, isSameDay, addMonths, subMonths } from 'date-fns';
import { Lunar } from 'lunar-javascript';
import api from '../services/api';

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

const getLunarText = (lunar) => {
  const dayCan = CAN[lunar.getDayGanIndex()];
  const dayChi = CHI[lunar.getDayZhiIndex()];
  const monthCan = CAN[lunar.getMonthGanIndex()];
  const monthChi = CHI[lunar.getMonthZhiIndex()];
  const yearCan = CAN[lunar.getYearGanIndex()];
  const yearChi = CHI[lunar.getYearZhiIndex()];

  return {
    dayText: `Ngày ${dayCan} ${dayChi}`,
    monthText: `Tháng ${monthCan} ${monthChi}`,
    yearText: `Năm ${yearCan} ${yearChi}`,
    day: lunar.getDay(),
    month: lunar.getMonth(),
    year: lunar.getYear()
  };
};

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [historicalEvent, setHistoricalEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoadingEvent(true);
        const day = selectedDate.getDate();
        const month = selectedDate.getMonth() + 1; // 1-indexed
        const response = await api.get(`/api/events/${month}/${day}`);
        setHistoricalEvent(response.data);
      } catch (error) {
        console.error("Failed to fetch historical event", error);
        setHistoricalEvent({ event: "Hãy bắt đầu ngày mới với niềm vui và hy vọng!" }); // fallback
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEvent();
  }, [selectedDate]);
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const startDay = startOfMonth(currentDate);
  const endDay = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: startDay, end: endDay });
  
  const startDayOfWeek = getDayOfWeek(startDay); // 0 (Sun) to 6 (Sat)
  const paddingBefore = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const blanks = Array(paddingBefore).fill(null);

  const DAYS_OF_WEEK = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  const renderDateDetails = () => {
    const lunar = Lunar.fromDate(selectedDate);
    const textInfo = getLunarText(lunar);
    const isTdy = isSameDay(selectedDate, new Date());

    // Giờ Hoàng Đạo
    const times = lunar.getTimes();
    const hoangDaoHours = [];
    times.forEach(t => {
      if (t.getTianShenType() === '黃道' || t.getTianShenType() === '黄道') {
        const zhiName = CHI[t.getZhiIndex()];
        if (!hoangDaoHours.includes(zhiName)) {
           hoangDaoHours.push(zhiName);
        }
      }
    });

    const shenType = lunar.getDayTianShenType();
    let dayTianShen = 'Ngày Thường';
    if (shenType === '黃道' || shenType === '黄道') dayTianShen = 'Ngày Hoàng Đạo';
    if (shenType === '黑道') dayTianShen = 'Ngày Hắc Đạo';

    return (
      <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white text-center shadow-lg shadow-orange-500/30 flex flex-col justify-center relative overflow-hidden h-full min-h-[420px]">
         <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
           <CalendarDays size={180} />
         </div>
         <h2 className="text-xl font-medium opacity-90 mb-1 z-10">{DAYS_OF_WEEK[selectedDate.getDay()]}, {format(selectedDate, 'dd/MM/yyyy')}</h2>
         <div className="text-7xl font-bold my-4 z-10">{format(selectedDate, 'dd')}</div>
         
         <p className={`text-sm font-bold mt-2 z-10 py-1.5 px-4 rounded-full inline-block mx-auto backdrop-blur-sm self-center transition-all duration-300 ${
           isTdy ? 'bg-white/30 text-white' : 'bg-white/90 text-orange-600 shadow-md transform scale-105'
         }`}>
            {isTdy ? 'Hôm nay' : 'Đang chọn'}
         </p>
         
         <div className="z-10 py-3 px-4 bg-black/10 rounded-2xl md:text-sm text-white/95 mx-1 mt-4 mb-2 shadow-inner border border-white/5 flex items-center justify-center min-h-[80px]">
            {loadingEvent ? (
               <div className="flex space-x-1 items-center justify-center text-white/50 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
               </div>
            ) : (
               <div className="flex flex-col gap-1 items-center w-full">
                 <p className="text-[10px] font-bold text-yellow-200/80 uppercase tracking-widest self-start">
                   {historicalEvent?.type === 'VietnamWar' ? "🇻🇳 Sự kiện lịch sử" : historicalEvent?.type === 'UncleHo' ? "🇻🇳 Dấu ấn Bác Hồ" : "💡 Suy ngẫm"}
                 </p>
                 <span className="text-left w-full text-[13px] leading-relaxed font-medium">"{historicalEvent?.event}"</span>
               </div>
            )}
         </div>
         
         <div className="mt-auto border-t border-white/20 pt-4 space-y-3 z-10 text-left">
           <div className="flex justify-between items-center mb-1 gap-2">
             <p className="font-semibold text-2xl shrink-0">Âm: {textInfo.day}/{textInfo.month}</p>
             <span className={`text-[10px] sm:text-xs px-2 py-1 rounded font-bold uppercase tracking-wide text-center leading-tight ${
               dayTianShen === 'Ngày Hoàng Đạo' ? 'bg-amber-200 text-amber-800' : 
               dayTianShen === 'Ngày Hắc Đạo' ? 'bg-gray-800 text-gray-200' : 'bg-white/30 text-white'
             }`}>
               {dayTianShen}
             </span>
           </div>
           
           <div className="grid grid-cols-2 gap-2 text-[13px] opacity-95">
              <div className="bg-black/10 rounded-xl p-3">
                 <p className="text-white/70 text-[10px] mb-1 font-bold uppercase tracking-wider">Can Chi</p>
                 <div className="space-y-0.5">
                   <p className="whitespace-nowrap overflow-hidden text-ellipsis">- Năm <span className="font-semibold">{textInfo.yearText.replace('Năm ', '')}</span></p>
                   <p className="whitespace-nowrap overflow-hidden text-ellipsis">- Tháng <span className="font-semibold">{textInfo.monthText.replace('Tháng ', '')}</span></p>
                   <p className="whitespace-nowrap overflow-hidden text-ellipsis">- Ngày <span className="font-semibold">{textInfo.dayText.replace('Ngày ', '')}</span></p>
                 </div>
              </div>
              <div className="bg-black/10 rounded-xl p-3 flex flex-col h-full">
                 <p className="text-yellow-200 text-[10px] mb-1 font-bold uppercase tracking-wider">Giờ Hoàng Đạo</p>
                 <p className="text-xs leading-relaxed opacity-95 font-medium">{hoangDaoHours.join(", ")}</p>
              </div>
           </div>
         </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="lg:col-span-1">
        {renderDateDetails()}
      </div>
      <div className="lg:col-span-2 bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <button onClick={handlePrevMonth} className="p-2 bg-white/60 hover:bg-white rounded-full transition-colors text-gray-600 shadow-sm border border-white"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800 capitalize">Tháng {format(currentDate, 'MM - yyyy')}</h2>
          <button onClick={handleNextMonth} className="p-2 bg-white/60 hover:bg-white rounded-full transition-colors text-gray-600 shadow-sm border border-white"><ChevronRight size={20} /></button>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="text-center text-sm font-bold text-gray-500 py-2">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {blanks.map((_, i) => <div key={`blank-${i}`} className="p-2 h-16 md:h-24" />)}
          {days.map((date, i) => {
            const isTdy = isSameDay(date, new Date());
            const isSel = isSameDay(date, selectedDate);
            const lunar = Lunar.fromDate(date);
            const lDay = lunar.getDay();
            const lMonth = lunar.getMonth();
            const showMonth = lDay === 1 || i === 0;
            
            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(date)}
                className={`relative flex flex-col items-center justify-center p-1 md:p-2 rounded-xl h-16 md:h-24 transition-all cursor-pointer border
                  ${isSel ? 'bg-orange-500 border-orange-500 text-white shadow-md transform scale-105 z-10' : 
                    isTdy ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm hover:bg-orange-100 hover:border-orange-300' : 
                    'bg-white/40 border-white/40 text-gray-700 hover:bg-white hover:border-white hover:shadow-md'
                  }
                `}
                title={`${format(date, 'dd/MM/yyyy')} - Âm lịch: ${lDay}/${lMonth}`}
              >
                <span className={`text-lg md:text-2xl font-bold ${isSel ? 'text-white' : isTdy ? 'text-orange-600' : ''}`}>
                  {format(date, 'd')}
                </span>
                <span className={`text-[11px] md:text-sm font-medium ${isSel ? 'text-orange-100' : isTdy ? 'text-orange-500' : 'text-gray-400'}`}>
                  {showMonth ? `${lDay}/${lMonth}` : lDay}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const GoldPricePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("gold"); // "gold" or "lunisolar"

  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const response = await fetch("https://www.vang.today/api/prices");
        if (!response.ok) throw new Error("Failed to fetch");
        const json = await response.json();
        setData(json);
      } catch {
        setError("Không thể tải dữ liệu giá vàng");
      } finally {
        setLoading(false);
      }
    };
    fetchGoldPrice();
  }, []);

  const formatPrice = (price) => {
    if (!price && price !== 0) return "---";
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={14} className="text-green-500" />;
    if (change < 0) return <TrendingDown size={14} className="text-red-500" />;
    return <Activity size={14} className="text-gray-400" />;
  };

  const getChangeClass = (change) => {
    if (change > 0) return "text-green-600 bg-green-50";
    if (change < 0) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  const translateName = (name) => {
    const map = {
      "World Gold (XAU/USD)": "Vàng Thế Giới",
      "PNJ Hanoi": "PNJ Hà Nội",
      "VN Gold SJC": "Vàng SJC",
      "DOJI Hanoi": "DOJI Hà Nội",
      "DOJI HCM": "DOJI TPHCM",
      "DOJI Jewelry": "DOJI Nữ Trang",
      "Bao Tin SJC": "Bảo Tín SJC",
      "Bao Tin 9999": "Bảo Tín 9999",
      "PNJ 24K": "Nhẫn PNJ 24K",
      "Viettin SJC": "Viettin SJC",
      "SJC Ring": "Nhẫn trơn SJC",
      "SJC 9999": "Vàng SJC 9999",
    };
    return map[name] || name;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-white to-orange-50 p-4 md:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-amber-200/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-orange-200/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white/60 hover:bg-white backdrop-blur-md rounded-xl transition-all shadow-sm hover:shadow-md border border-white group"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          Quay lại trang chủ
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/40 border border-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-linear-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                {activeTab === 'gold' ? <Coins className="text-white" size={24} /> : <CalendarDays className="text-white" size={24} />}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600">
                {activeTab === 'gold' ? 'Giá Vàng Hôm Nay' : 'Lịch Âm Dương'}
              </h1>
            </div>
            <p className="text-gray-600 flex items-center gap-2">
              {activeTab === 'gold' ? 'Cập nhật giá vàng trong nước và quốc tế mới nhất' : 'Xem lịch âm và lịch dương chi tiết trong tháng'}
            </p>
          </div>
          
          <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-xl w-full md:w-auto border border-white/80 shadow-sm shrink-0">
            <button
              onClick={() => setActiveTab('gold')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'gold' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Coins size={16} />
              Giá Vàng
            </button>
            <button
              onClick={() => setActiveTab('lunisolar')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'lunisolar' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarDays size={16} />
              Lịch Âm Dương
            </button>
          </div>
        </div>

        {activeTab === 'gold' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {data && (
              <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-white/80 rounded-xl border border-white shadow-sm text-gray-700 w-fit mb-4">
                <Clock size={16} className="text-amber-500" />
                Cập nhật: <span className="text-gray-900 font-bold">{data.time}</span>
                <span className="text-gray-400 ml-1">({data.date})</span>
              </div>
            )}
            
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="animate-pulse bg-white/60 h-[140px] rounded-2xl border border-white shadow-sm flex flex-col justify-between p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="w-1/2 h-5 bg-gray-200 rounded-lg"></div>
                      <div className="w-8 h-4 bg-gray-200 rounded-md"></div>
                    </div>
                    <div className="space-y-2 mt-auto">
                      <div className="w-full h-7 bg-gray-200/50 rounded-xl"></div>
                      <div className="w-full h-7 bg-gray-200/50 rounded-xl"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50/80 backdrop-blur-sm text-red-600 p-8 rounded-3xl border border-red-100 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingDown size={32} className="text-red-500" />
                </div>
                <p className="font-semibold text-lg">{error}</p>
                <p className="text-sm text-red-400 mt-2">Vui lòng thử lại sau.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {Object.values(data?.prices || {}).map((item, idx) => {
                  const spread = (item.sell && item.buy) ? item.sell - item.buy : 0;
                  return (
                  <div
                    key={idx}
                    className="group relative bg-white/60 hover:bg-white backdrop-blur-xl rounded-2xl p-3 md:p-4 border border-white/80 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-[13px] md:text-sm text-gray-800 line-clamp-1 pr-1" title={translateName(item.name)}>
                        {translateName(item.name)}
                      </h3>
                      <div className="px-1.5 py-0.5 bg-amber-100/50 text-amber-600 text-[9px] font-bold rounded uppercase tracking-wider shrink-0">
                        {item.currency}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50/50 group-hover:bg-gray-50 transition-colors border border-transparent group-hover:border-gray-100">
                        <span className="text-[11px] md:text-xs text-gray-500">Mua</span>
                        <div className="text-right flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 text-[13px] md:text-sm">
                            {formatPrice(item.buy)}
                          </span>
                          {item.change_buy !== 0 && (
                            <div className={`text-[9px] flex items-center gap-0.5 px-0.5 rounded font-medium ${getChangeClass(item.change_buy)}`} title={formatPrice(Math.abs(item.change_buy))}>
                              {getChangeIcon(item.change_buy)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50/50 group-hover:bg-gray-50 transition-colors border border-transparent group-hover:border-gray-100">
                        <span className="text-[11px] md:text-xs text-gray-500">Bán</span>
                        <div className="text-right flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 text-[13px] md:text-sm">
                            {formatPrice(item.sell)}
                          </span>
                          {item.change_sell !== 0 && (
                            <div className={`text-[9px] flex items-center gap-0.5 px-0.5 rounded font-medium ${getChangeClass(item.change_sell)}`} title={formatPrice(Math.abs(item.change_sell))}>
                              {getChangeIcon(item.change_sell)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 px-1 mt-0.5">
                        <span className="text-[10px] md:text-[11px] text-gray-400">Chênh lệch:</span>
                        <span className="text-[10px] md:text-[11px] font-semibold text-red-500/80 bg-red-50 px-1.5 py-0.5 rounded">
                          {formatPrice(spread)}
                        </span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        )}

        {activeTab === 'lunisolar' && <CalendarView />}
      </div>
    </div>
  );
};

export default GoldPricePage;

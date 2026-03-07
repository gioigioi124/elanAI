import React, { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Activity, Coins } from "lucide-react";
import { Link } from "react-router";

const GoldPricePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
                <Coins className="text-white" size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600">
                Giá Vàng Hôm Nay
              </h1>
            </div>
            <p className="text-gray-600 flex items-center gap-2">
              Cập nhật giá vàng trong nước và quốc tế mới nhất
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-white/80 rounded-xl border border-white shadow-sm text-gray-700">
              <Clock size={16} className="text-amber-500" />
              Cập nhật: <span className="text-gray-900 font-bold">{data.time}</span>
              <span className="text-gray-400 ml-1">({data.date})</span>
            </div>
          )}
        </div>

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
    </div>
  );
};

export default GoldPricePage;

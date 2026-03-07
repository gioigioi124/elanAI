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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-white/60 h-40 rounded-3xl border border-white shadow-sm flex flex-col justify-between p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="w-1/2 h-6 bg-gray-200 rounded-lg"></div>
                  <div className="w-12 h-5 bg-gray-200 rounded-md"></div>
                </div>
                <div className="space-y-3">
                  <div className="w-full h-12 bg-gray-200/50 rounded-2xl"></div>
                  <div className="w-full h-12 bg-gray-200/50 rounded-2xl"></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.values(data?.prices || {}).map((item, idx) => (
              <div
                key={idx}
                className="group relative bg-white/60 hover:bg-white backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{item.name}</h3>
                  <div className="px-2.5 py-1 bg-amber-100/50 text-amber-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    {item.currency}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-gray-50/50 group-hover:bg-gray-50 transition-colors border border-transparent group-hover:border-gray-100">
                    <span className="text-sm text-gray-500">Mua vào</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-[17px]">
                        {formatPrice(item.buy)}
                      </div>
                      {item.change_buy !== 0 && (
                        <div className={`text-[10px] flex items-center justify-end gap-1 mt-0.5 px-1.5 py-0.5 rounded w-fit ml-auto font-medium ${getChangeClass(item.change_buy)}`}>
                          {getChangeIcon(item.change_buy)}
                          {formatPrice(Math.abs(item.change_buy))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-2xl bg-gray-50/50 group-hover:bg-gray-50 transition-colors border border-transparent group-hover:border-gray-100">
                    <span className="text-sm text-gray-500">Bán ra</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-[17px]">
                        {formatPrice(item.sell)}
                      </div>
                      {item.change_sell !== 0 && (
                        <div className={`text-[10px] flex items-center justify-end gap-1 mt-0.5 px-1.5 py-0.5 rounded w-fit ml-auto font-medium ${getChangeClass(item.change_sell)}`}>
                          {getChangeIcon(item.change_sell)}
                          {formatPrice(Math.abs(item.change_sell))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoldPricePage;

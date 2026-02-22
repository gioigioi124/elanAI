import React, { useState, useRef } from "react";
import { User, Camera, Save, ArrowLeft, Loader2, Phone, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";

const SettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    password: "", // Optional update
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Kích thước ảnh quá lớn (Tối đa 2MB).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result); // Base64 string
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSubmit = {
      name: formData.name,
      phone: formData.phone,
      avatar: avatarPreview,
    };

    if (formData.password) {
      dataToSubmit.password = formData.password;
    }

    const { success, message } = await updateProfile(dataToSubmit);
    setLoading(false);

    if (success) {
      toast.success("Cập nhật thông tin thành công!");
      setFormData((prev) => ({ ...prev, password: "" })); // Clear password field
    } else {
      toast.error(message || "Có lỗi xảy ra khi cập nhật!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Amber Glow Background matching App.jsx */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #f59e0b 100%)`,
          backgroundSize: "100% 100%",
        }}
      />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 z-20 flex items-center px-4 md:px-8">
        <button
          onClick={() => navigate("/")}
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white/50 transition-all flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          <span className="font-medium hidden sm:block">Quay lại</span>
        </button>
        <span className="font-semibold text-gray-800 ml-4 absolute left-1/2 -translate-x-1/2">
          Cài Đặt Tài Khoản
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto pt-24 pb-12 px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white p-6 md:p-10"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl shadow-gray-200/50 bg-violet-100 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-2xl">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-violet-400" />
                  )}

                  {/* Overlay for hover */}
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={24} />
                  </div>
                </div>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute top-0 right-0 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                    title="Xóa ảnh"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Thay đổi ảnh đại diện
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG. Kích thước tối đa 2MB.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên đăng nhập
                </label>
                <div className="px-4 py-3 bg-gray-50/50 text-gray-500 rounded-xl border border-gray-200 font-medium">
                  {user?.username}
                </div>
                <p className="text-xs text-gray-400 mt-1 px-1">
                  Tên đăng nhập không thể thay đổi.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên hiển thị
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-gray-400 text-gray-700 font-medium"
                    placeholder="Nhập tên hiển thị..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Số điện thoại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-gray-400 text-gray-700 font-medium"
                    placeholder="Nhập số điện thoại..."
                  />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mật khẩu mới (Tùy chọn)
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-gray-400 text-gray-700"
                  placeholder="Để trống nếu không muốn đổi..."
                  minLength={6}
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Lưu các thay đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default SettingsPage;

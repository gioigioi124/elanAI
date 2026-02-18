import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router";
import api from "@/services/api";
import { toast } from "sonner";

const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
};

const ChatSidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onToggle,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/conversations/${id}`);
      onDeleteConversation(id);
      toast.success("Đã xóa cuộc trò chuyện");
    } catch (error) {
      toast.error("Không thể xóa cuộc trò chuyện");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 260 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative z-40 flex-shrink-0 h-full overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <div
          className="w-[260px] h-full flex flex-col bg-white border-r border-gray-200 shadow-sm"
          style={{ minWidth: "260px" }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-violet-700 flex items-center justify-center shadow">
                <Sparkles size={15} className="text-white" />
              </div>
              <span className="font-bold text-gray-800 text-sm">ElanX AI</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-3 py-3">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-medium hover:from-violet-600 hover:to-violet-800 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Plus size={16} />
              Cuộc trò chuyện mới
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageSquare size={32} className="text-gray-300 mb-3" />
                <p className="text-xs text-gray-400">
                  Chưa có cuộc trò chuyện nào
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {conversations.map((conv) => {
                  const isActive = conv._id === currentConversationId;
                  const isHovered = hoveredId === conv._id;
                  const isDeleting = deletingId === conv._id;

                  return (
                    <motion.div
                      key={conv._id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onMouseEnter={() => setHoveredId(conv._id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => onSelectConversation(conv._id)}
                      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isActive
                          ? "bg-violet-50 border border-violet-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <MessageSquare
                        size={14}
                        className={`flex-shrink-0 ${isActive ? "text-violet-500" : "text-gray-400"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${isActive ? "text-violet-700" : "text-gray-700"}`}
                        >
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatRelativeTime(conv.updatedAt)}
                        </p>
                      </div>

                      {/* Delete button on hover */}
                      <AnimatePresence>
                        {(isHovered || isActive) && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.1 }}
                            onClick={(e) => handleDelete(e, conv._id)}
                            disabled={isDeleting}
                            className="flex-shrink-0 p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                            title="Xóa cuộc trò chuyện"
                          >
                            {isDeleting ? (
                              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account Section */}
          <div className="border-t border-gray-100 p-3">
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu((v) => !v)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <User size={13} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {user?.name || user?.username || "Tài khoản"}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    @{user?.username}
                  </p>
                </div>
                <Settings size={13} className="text-gray-400 flex-shrink-0" />
              </button>

              {/* Account dropdown */}
              <AnimatePresence>
                {showAccountMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                  >
                    {/* User info card */}
                    <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-violet-700 flex items-center justify-center">
                          <User size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {user?.name || user?.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            @{user?.username} · {user?.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} />
                        Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Collapsed toggle button (when sidebar is closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed left-3 top-3 z-50 w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Mở sidebar"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatSidebar;

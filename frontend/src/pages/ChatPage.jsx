import React, { useState, useEffect, useCallback } from "react";
import { Send, RotateCcw, Download, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatLogic } from "@/hooks/useChatLogic";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as XLSX from "xlsx";
import ChatSidebar from "@/components/ChatSidebar";
import AnnoyingFly from "@/components/AnnoyingFly";
import api from "@/services/api";

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get("/api/conversations");
      setConversations(res.data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Callbacks for useChatLogic
  const handleConversationCreated = useCallback((newConv) => {
    setCurrentConversationId(newConv._id);
    setConversations((prev) => [newConv, ...prev]);
  }, []);

  const handleConversationUpdated = useCallback(() => {
    // Refresh conversation list to update titles/timestamps
    loadConversations();
  }, [loadConversations]);

  const {
    messages,
    input,
    setInput,
    isLoading,
    loadingConversation,
    messagesEndRef,
    inputRef,
    hasTable,
    formatNumbersInText,
    handleSend,
    handleNewChat: resetChat,
  } = useChatLogic({
    conversationId: currentConversationId,
    onConversationCreated: handleConversationCreated,
    onConversationUpdated: handleConversationUpdated,
  });

  const handleNewChat = () => {
    setCurrentConversationId(null);
    resetChat();
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
    if (isMobile) setSidebarOpen(false);
  };

  const handleDeleteConversation = (id) => {
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      resetChat();
    }
  };

  // Convert markdown table to Excel and download
  const downloadTableAsExcel = (content, messageIndex) => {
    if (!content) return;
    const lines = content.split("\n");
    const tableLines = [];
    let inTable = false;
    for (const line of lines) {
      if (line.trim().startsWith("|")) {
        inTable = true;
        if (!line.includes("---")) tableLines.push(line);
      } else if (inTable) break;
    }
    if (tableLines.length === 0) return;
    const tableData = tableLines.map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(tableData);
    const colWidths = [];
    tableData.forEach((row) => {
      row.forEach((cell, colIndex) => {
        const cellLength = cell.length;
        if (!colWidths[colIndex] || colWidths[colIndex] < cellLength)
          colWidths[colIndex] = cellLength;
      });
    });
    ws["!cols"] = colWidths.map((width) => ({ wch: Math.min(width + 2, 50) }));
    XLSX.utils.book_append_sheet(wb, ws, "Bảng dữ liệu");
    XLSX.writeFile(wb, `table_${messageIndex}_${new Date().getTime()}.xlsx`);
  };

  const suggestions = [
    "Giá bông hiện tại là bao nhiêu?",
    "Khách hàng nào có giới hạn nợ trên 300 triệu?",
    "Bảng giá vận chuyển bông?",
    "Khách hàng còn nợ ở Thái Nguyên?",
  ];

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const isWelcomeScreen =
    messages.length === 1 && messages[0].role === "assistant";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent">
      <AnnoyingFly />
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <header
          className="shrink-0 bg-white/40 backdrop-blur-md border-b border-white/20 shadow-sm"
          style={{ minHeight: "57px" }}
        >
          <div className="max-w-4xl mx-auto w-full h-full flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className={`${sidebarOpen ? "hidden" : "flex"} h-9 w-9 text-gray-500 hover:bg-gray-100 rounded-xl`}
            >
              <PanelLeft size={20} />
            </Button>

            <div className="flex-1 min-w-0 flex items-center gap-3">
              {!sidebarOpen && (
                <div className="w-px h-5 bg-gray-200 hidden sm:block" />
              )}
              <h1 className="text-sm font-semibold text-gray-700 truncate">
                {currentConversationId
                  ? conversations.find((c) => c._id === currentConversationId)
                      ?.title || "Cuộc trò chuyện"
                  : "Cuộc trò chuyện mới"}
              </h1>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="gap-1.5 h-8 px-3 text-xs"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Mới</span>
            </Button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto py-6">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              {loadingConversation ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              ) : isWelcomeScreen ? (
                /* Welcome Screen */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-4xl font-bold bg-gradient-to-br from-violet-500 to-violet-800 bg-clip-text text-transparent">
                      Xin chào{user?.name ? `, ${user.name}` : ""}!
                    </h2>
                    <p className="text-lg text-gray-500 max-w-xl">
                      Tôi có thể giúp bạn về giá bông, công nợ, khách hàng, tính
                      giá vận chuyển và nhiều thông tin khác.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-4xl">
                    {suggestions.map((suggestion, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="p-4 text-left rounded-2xl border border-white/40 bg-white/30 backdrop-blur-sm hover:border-violet-300 hover:bg-white/50 transition-all text-sm font-medium text-gray-700 hover:text-violet-700 shadow-sm"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                /* Messages */
                <div className="space-y-6 pb-4">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl text-sm relative ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-tr-none p-4 shadow-lg"
                            : hasTable(msg.content)
                              ? "bg-white/60 backdrop-blur-md text-gray-800 shadow-md border border-white/40 rounded-tl-none p-4 pt-12"
                              : "bg-white/60 backdrop-blur-md text-gray-800 shadow-md border border-white/40 rounded-tl-none p-4"
                        }`}
                      >
                        {msg.role === "assistant" && hasTable(msg.content) && (
                          <Button
                            size="sm"
                            onClick={() =>
                              downloadTableAsExcel(msg.content, index)
                            }
                            className="absolute top-2 right-2 bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs z-10"
                            title="Tải bảng xuống Excel"
                          >
                            <Download size={14} />
                            <span>Excel</span>
                          </Button>
                        )}
                        {msg.role === "user" ? (
                          msg.content
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ ...props }) => (
                                <div className="overflow-x-auto my-3">
                                  <table
                                    className="min-w-full border-collapse border border-gray-300 text-xs"
                                    {...props}
                                  />
                                </div>
                              ),
                              thead: ({ ...props }) => (
                                <thead className="bg-gray-50" {...props} />
                              ),
                              th: ({ ...props }) => (
                                <th
                                  className="border border-gray-300 bg-violet-50 px-3 py-2 text-left font-semibold text-gray-700"
                                  {...props}
                                />
                              ),
                              td: ({ ...props }) => (
                                <td
                                  className="border border-gray-300 px-3 py-2"
                                  {...props}
                                />
                              ),
                              tr: ({ ...props }) => (
                                <tr className="hover:bg-gray-50" {...props} />
                              ),
                              p: ({ ...props }) => (
                                <p className="mb-2 last:mb-0" {...props} />
                              ),
                              strong: ({ ...props }) => (
                                <strong
                                  className="font-semibold text-violet-700"
                                  {...props}
                                />
                              ),
                              code: ({ inline, ...props }) =>
                                inline ? (
                                  <code
                                    className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono"
                                    {...props}
                                  />
                                ) : (
                                  <code
                                    className="block bg-gray-100 p-3 rounded my-2 text-xs font-mono"
                                    {...props}
                                  />
                                ),
                            }}
                          >
                            {formatNumbersInText(msg.content)}
                          </ReactMarkdown>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/60 backdrop-blur-md text-gray-800 shadow-md border border-white/40 rounded-2xl rounded-tl-none p-4 text-sm flex gap-1.5">
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 bg-white/20 backdrop-blur-md border-t border-white/20 py-4">
            <form
              onSubmit={handleSend}
              className="max-w-4xl mx-auto flex gap-3 px-4 sm:px-6"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                className="flex-1 bg-white/40 backdrop-blur-sm border border-white/40 focus:border-violet-400 rounded-2xl px-5 py-3.5 text-base focus:ring-2 focus:ring-violet-200 transition-all outline-none shadow-sm"
                style={{ fontSize: "16px" }}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-[54px] px-6 gap-2 bg-gradient-to-r from-violet-500 to-violet-700 hover:from-violet-600 hover:to-violet-800 text-white rounded-2xl shadow-md"
              >
                <Send size={20} />
                {!isMobile && <span>Gửi</span>}
              </Button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChatPage;

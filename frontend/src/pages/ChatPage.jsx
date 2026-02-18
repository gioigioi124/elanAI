import React, { useState, useEffect } from "react";
import {
  Send,
  RotateCcw,
  Download,
  Sparkles,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatLogic } from "@/hooks/useChatLogic";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as XLSX from "xlsx";

const ChatPage = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    messagesEndRef,
    inputRef,
    hasTable,
    formatNumbersInText,
    handleSend,
    handleNewChat,
  } = useChatLogic();

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Convert markdown table to Excel and download
  const downloadTableAsExcel = (content, messageIndex) => {
    if (!content) return;

    const lines = content.split("\n");
    const tableLines = [];
    let inTable = false;

    for (const line of lines) {
      if (line.trim().startsWith("|")) {
        inTable = true;
        if (!line.includes("---")) {
          tableLines.push(line);
        }
      } else if (inTable) {
        break;
      }
    }

    if (tableLines.length === 0) return;

    const tableData = tableLines.map((line) => {
      return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(tableData);

    const colWidths = [];
    tableData.forEach((row) => {
      row.forEach((cell, colIndex) => {
        const cellLength = cell.length;
        if (!colWidths[colIndex] || colWidths[colIndex] < cellLength) {
          colWidths[colIndex] = cellLength;
        }
      });
    });
    ws["!cols"] = colWidths.map((width) => ({ wch: Math.min(width + 2, 50) }));

    XLSX.utils.book_append_sheet(wb, ws, "Bảng dữ liệu");
    XLSX.writeFile(wb, `table_${messageIndex}_${new Date().getTime()}.xlsx`);
  };

  // Suggestion chips for welcome screen
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
    <div className="min-h-screen w-full bg-linear-to-br from-primary/5 via-white to-primary/10 flex flex-col">
      {/* Header - sticky */}
      <header className="sticky top-0 z-50 shrink-0 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-base text-gray-800">ElanX AI</h1>
              <p className="text-xs text-gray-500">Trợ lý thông minh</p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* New chat button */}
            <Button
              variant="gradient"
              onClick={handleNewChat}
              className="gap-2 h-9 px-3 sm:px-4"
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline text-sm">
                Cuộc trò chuyện mới
              </span>
            </Button>

            {/* Account info */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={14} className="text-primary" />
                  </div>
                  <span className="max-w-[120px] truncate">
                    {user.username || user.name || "Tài khoản"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1.5 h-9 px-3 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  title="Đăng xuất"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline text-sm">Đăng xuất</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-4xl mx-auto">
            {isWelcomeScreen ? (
              /* Welcome Screen */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
              >
                <div className="space-y-3">
                  <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Xin chào!
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl">
                    Tôi có thể giúp bạn về giá bông, công nợ, khách hàng, tính
                    giá vận chuyển và nhiều thông tin khác. Hãy thử một trong
                    những câu hỏi dưới đây:
                  </p>
                </div>

                {/* Suggestion Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl mt-8">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      asChild
                      variant="outline"
                      className="h-auto p-4 text-left justify-start"
                    >
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <p className="text-sm font-medium">{suggestion}</p>
                      </motion.button>
                    </Button>
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
                          ? "bg-gradient-primary text-white rounded-tr-none p-4 shadow-lg"
                          : hasTable(msg.content)
                            ? "bg-white text-gray-800 shadow-md border border-gray-200 rounded-tl-none p-4 pt-12"
                            : "bg-white text-gray-800 shadow-md border border-gray-200 rounded-tl-none p-4"
                      }`}
                    >
                      {msg.role === "assistant" && hasTable(msg.content) && (
                        <Button
                          size="sm"
                          onClick={() =>
                            downloadTableAsExcel(msg.content, index)
                          }
                          className="absolute top-2 right-2 bg-success hover:bg-success/90 text-white gap-1.5 text-xs z-10"
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
                                className="border border-gray-300 bg-primary/10 px-3 py-2 text-left font-semibold text-gray-700"
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
                                className="font-semibold text-primary"
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
                    <div className="bg-white text-gray-800 shadow-md border border-gray-200 rounded-2xl rounded-tl-none p-4 text-sm flex gap-1.5">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 px-4 sm:px-6 py-4">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              className="flex-1 bg-white border-2 border-gray-200 focus:border-primary rounded-2xl px-5 py-3.5 text-base focus:ring-2 focus:ring-primary/20 transition-all outline-none shadow-sm"
              style={{ fontSize: "16px" }}
            />
            <Button
              type="submit"
              variant="gradient"
              disabled={!input.trim() || isLoading}
              className="h-[54px] px-6 gap-2"
            >
              <Send size={20} />
              {!isMobile && <span>Gửi</span>}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNewChat}
              className="h-[54px] px-4 gap-2"
              title="Tạo trò chuyện mới"
            >
              <RotateCcw size={20} />
              {!isMobile && <span>Mới</span>}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;

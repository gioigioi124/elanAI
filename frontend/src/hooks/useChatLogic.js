import { useState, useRef, useCallback, useEffect } from "react";
import api from "@/services/api";

export const useChatLogic = () => {
  // Load messages from localStorage or use default
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("chatMessages");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate that it's an array with at least one message
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
    }
    // Default message
    return [
      {
        role: "assistant",
        content:
          "Xin chào! Giá bông, công nợ, khách hàng, tính giá... tôi sẽ giúp bạn?",
      },
    ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving chat messages:", error);
    }
  }, [messages]);

  // Check if message contains a markdown table
  const hasTable = (content) => {
    return content && content.includes("|") && content.includes("---");
  };

  // Format numbers in text with commas, handling both integers and decimals
  const formatNumbersInText = (text) => {
    if (!text) return text;

    return text.replace(
      /(?<![\w-])(\d+)(\.\d+)?(?![\w-])/g,
      (match, intPart, decPart) => {
        // Only format if integer part has 4+ digits
        if (intPart.length < 4) return match;

        // Skip if it starts with 0 (likely phone number, ID, or code)
        if (intPart.startsWith("0")) return match;

        // Skip if it looks like a phone number (10-11 digits, no decimal)
        if (!decPart && intPart.length >= 10 && intPart.length <= 11)
          return match;

        // Skip if it looks like a customer code pattern
        if (/^[A-Z]{2,}\d+$/i.test(match)) return match;

        // Format integer part with commas, preserve decimal part as-is
        const formattedInt = parseInt(intPart, 10).toLocaleString("en-US");
        return decPart ? formattedInt + decPart : formattedInt;
      },
    );
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Keep focus on input after sending
    inputRef.current?.focus();

    try {
      const response = await api.post("/api/chatbot/message", {
        message: input,
        history: messages,
      });

      const assistantMessage = {
        role: "assistant",
        content: response.data.reply,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);

      let errorMessage = "Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.";

      // Check if it's a rate limit error
      if (error.response?.status === 429 || error.response?.data?.isRateLimit) {
        errorMessage =
          "⏱️ Đã vượt quá giới hạn request của ElanX API. Vui lòng đợi 10-15 giây rồi thử lại.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (
      window.confirm("Bạn có chắc chắn muốn bắt đầu cuộc trò chuyện mới không?")
    ) {
      const defaultMessages = [
        {
          role: "assistant",
          content:
            "Xin chào! Giá bông, công nợ, khách hàng... tôi sẽ giúp bạn?",
        },
      ];
      setMessages(defaultMessages);
      setInput("");
      // Clear localStorage as well
      try {
        localStorage.setItem("chatMessages", JSON.stringify(defaultMessages));
      } catch (error) {
        console.error("Error clearing chat messages:", error);
      }
    }
  };

  return {
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
    scrollToBottom,
  };
};

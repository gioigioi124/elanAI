import { useState, useRef, useCallback, useEffect } from "react";
import api from "@/services/api";

const DEFAULT_WELCOME = {
  role: "assistant",
  content:
    "Xin chào! Giá bông, công nợ, khách hàng, tính giá... câu trả lời đầu tiên sẽ mất thời gian một chút?",
};

export const useChatLogic = ({
  conversationId,
  onConversationCreated,
  onConversationUpdated,
}) => {
  const [messages, setMessages] = useState([DEFAULT_WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([DEFAULT_WELCOME]);
      return;
    }

    const loadConversation = async () => {
      setLoadingConversation(true);
      try {
        const response = await api.get(`/api/conversations/${conversationId}`);
        const msgs = response.data.messages;
        setMessages(msgs.length > 0 ? msgs : [DEFAULT_WELCOME]);
      } catch (error) {
        console.error("Error loading conversation:", error);
        setMessages([DEFAULT_WELCOME]);
      } finally {
        setLoadingConversation(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  // Save messages to API (debounced)
  const saveMessages = useCallback(
    (msgs, convId) => {
      if (!convId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await api.put(`/api/conversations/${convId}`, { messages: msgs });
          onConversationUpdated?.();
        } catch (error) {
          console.error("Error saving conversation:", error);
        }
      }, 800);
    },
    [onConversationUpdated],
  );

  // Check if message contains a markdown table safely
  const hasTable = (content) => {
    if (!content) return false;
    // Match standard markdown table header and separator line
    return /\|.*\|[\r\n]+\s*\|(?:[-:]+\s*\|)+/.test(content);
  };

  // Format numbers in text with commas (ignore markdown code blocks, links, and inline code)
  const formatNumbersInText = (text) => {
    if (!text) return text;
    // Split the text by code blocks, inline code, and URLs/Links
    const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`]*`|\[[^\]]*\]\([^)]*\)|https?:\/\/[^\s]+)/g);
    
    return parts.map((part, index) => {
      // Even indices represent normal text, where we apply format
      if (index % 2 === 0) {
        return part.replace(
          /(?<![\w-])(\d+)(\.\d+)?(?![\w-])/g,
          (match, intPart, decPart) => {
            if (intPart.length < 4) return match;
            if (intPart.startsWith("0")) return match;
            if (!decPart && intPart.length >= 10 && intPart.length <= 11)
              return match;
            if (/^[A-Z]{2,}\d+$/i.test(match)) return match;
            const formattedInt = parseInt(intPart, 10).toLocaleString("en-US");
            return decPart ? formattedInt + decPart : formattedInt;
          }
        );
      }
      // Odd indices represent markdown structures, return exactly as is
      return part;
    }).join("");
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
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    inputRef.current?.focus();

    let currentConvId = conversationId;

    try {
      // Create conversation if none exists
      if (!currentConvId) {
        const title =
          input.length > 60 ? input.substring(0, 60) + "..." : input;
        const createRes = await api.post("/api/conversations", {
          title,
          messages: newMessages,
        });
        currentConvId = createRes.data._id;
        onConversationCreated?.(createRes.data);
      }

      // Keep only recent context to avoid token limits (Sliding Window)
      const recentContext = messages.slice(-10);

      const response = await api.post("/api/chatbot/message", {
        message: input,
        history: recentContext,
      });

      const assistantMessage = {
        role: "assistant",
        content: response.data.reply,
      };
      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages, currentConvId);
    } catch (error) {
      console.error("Chat error:", error);
      let errorMessage = "Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.";
      if (error.response?.status === 429 || error.response?.data?.isRateLimit) {
        errorMessage =
          "⏱️ Đã vượt quá giới hạn request của ElanX API. Vui lòng đợi 10-15 giây rồi thử lại.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      const errorMessages = [
        ...newMessages,
        { role: "assistant", content: errorMessage },
      ];
      setMessages(errorMessages);
      if (currentConvId) saveMessages(errorMessages, currentConvId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([DEFAULT_WELCOME]);
    setInput("");
  };

  return {
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
    handleNewChat,
    scrollToBottom,
  };
};

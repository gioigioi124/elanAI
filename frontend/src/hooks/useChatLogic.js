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

  // Check if message contains a markdown table
  const hasTable = (content) => {
    return content && content.includes("|") && content.includes("---");
  };

  // Format numbers in text with commas
  const formatNumbersInText = (text) => {
    if (!text) return text;
    return text.replace(
      /(?<![\w-])(\d+)(\.\d+)?(?![\w-])/g,
      (match, intPart, decPart) => {
        if (intPart.length < 4) return match;
        if (intPart.startsWith("0")) return match;
        if (!decPart && intPart.length >= 10 && intPart.length <= 11)
          return match;
        if (/^[A-Z]{2,}\d+$/i.test(match)) return match;
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

      const response = await api.post("/api/chatbot/message", {
        message: input,
        history: messages,
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

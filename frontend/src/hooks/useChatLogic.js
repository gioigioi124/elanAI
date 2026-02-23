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
  const preventLoadRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([DEFAULT_WELCOME]);
      return;
    }

    if (preventLoadRef.current === conversationId) {
      preventLoadRef.current = null;
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

  // Save messages to API (debounced) - TRÌ HOÃN BẰNG REACT SETTIMEOUT ĐÃ BỊ LOẠI BỎ (Fix Data Loss)
  // Backend bây giờ tự push message thẳng tại API streaming

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
    abortControllerRef.current = new AbortController();
    inputRef.current?.focus();

    let currentConvId = conversationId;

    try {
      // Create conversation if none exists
      if (!currentConvId) {
        const title =
          input.length > 60 ? input.substring(0, 60) + "..." : input;
        const createRes = await api.post("/api/conversations", {
          title,
          messages: [DEFAULT_WELCOME], // Backend sẽ tự push user msg và bot msg sau
        });
        currentConvId = createRes.data._id;
        preventLoadRef.current = currentConvId;
        onConversationCreated?.(createRes.data);
      }

      // Keep only recent context to avoid token limits (Sliding Window)
      const recentContext = messages.slice(-10);

      const token = JSON.parse(localStorage.getItem("user"))?.token || "";
      const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/api/chatbot/message";

      setIsGenerating(true);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: input,
          history: recentContext,
          conversationId: currentConvId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
         let errorMsg = "Lỗi kết nối Server";
         try {
           const errData = await response.json();
           if (errData.message) errorMsg = errData.message;
         } catch(e) {}
         throw new Error(errorMsg);
      }

      setIsLoading(false); // Stop loading animation, start streaming animation
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                streamContent += data.text;
                // Cập nhật UI ngay lập tức với từ mới
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: streamContent,
                  };
                  return updated;
                });
                scrollToBottom();
              } else if (data.error) {
                 streamContent += `\n\n**Lỗi:** ${data.error}`;
                 setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: streamContent };
                  return updated;
                 });
                 scrollToBottom();
              }
            } catch (e) {
              // Ignore fragmented chunk
            }
          }
        }
      }
      
      // Request refresh conversation list after stream finishes (for updated timestamps)
      onConversationUpdated?.();

    } catch (error) {
      if (error.name === "AbortError") {
         console.log("Chat generation stopped by user");
      } else {
         console.error("Chat error:", error);
         let errorMessage = error.message || "Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.";
         const errorMessages = [
           ...newMessages,
           { role: "assistant", content: errorMessage },
         ];
         setMessages(errorMessages);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
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
    isGenerating,
    loadingConversation,
    messagesEndRef,
    inputRef,
    hasTable,
    formatNumbersInText,
    handleSend,
    stopGenerating,
    handleNewChat,
    scrollToBottom,
  };
};

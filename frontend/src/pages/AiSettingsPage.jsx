import React from "react";
import AiKnowledgeUpload from "../components/chat/AiKnowledgeUpload";
import { Sparkles, Brain } from "lucide-react";

const AiSettingsPage = () => {
  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
          <Brain size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cấu hình AI</h1>
          <p className="text-sm text-gray-500">
            Quản lý cơ sở kiến thức cho Chatbot
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AiKnowledgeUpload />

        <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 p-6 flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-16 h-16 bg-linear-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-xl">
            <Sparkles size={32} className="animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">
            Chatbot đã sẵn sàng
          </h3>
          <p className="text-gray-600 max-w-sm">
            Chatbot ở góc dưới bên phải màn hình sẽ sử dụng dữ liệu từ các file
            Excel bạn upload để trả lời câu hỏi.
          </p>
          <div className="pt-4 flex gap-4">
            <div className="px-4 py-2 bg-indigo-50 rounded-lg text-indigo-700 text-sm font-medium">
              ElanX Flash-Latest
            </div>
            <div className="px-4 py-2 bg-purple-50 rounded-lg text-purple-700 text-sm font-medium">
              Pinecone DB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiSettingsPage;

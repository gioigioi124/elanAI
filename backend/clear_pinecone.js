import { pc, indexName } from "./src/config/ai.js";

async function clearIndex() {
  try {
    const index = pc.index(indexName);
    console.log(`Đang xóa toàn bộ dữ liệu trong index: ${indexName}...`);
    await index.deleteAll();
    console.log("Đã xóa sạch dữ liệu thành công!");
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
  }
}

clearIndex();

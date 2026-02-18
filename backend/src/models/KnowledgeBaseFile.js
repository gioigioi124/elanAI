import mongoose from "mongoose";

const knowledgeBaseFileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    rowCount: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

const KnowledgeBaseFile = mongoose.model(
  "KnowledgeBaseFile",
  knowledgeBaseFileSchema,
);

export default KnowledgeBaseFile;

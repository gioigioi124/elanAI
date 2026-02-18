import Conversation from "../models/Conversation.js";

// @desc    Get all conversations for current user
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .select("_id title updatedAt createdAt")
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Get a single conversation with messages
// @route   GET /api/conversations/:id
// @access  Private
const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    res.json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Create a new conversation
// @route   POST /api/conversations
// @access  Private
const createConversation = async (req, res) => {
  try {
    const { title, messages } = req.body;

    const conversation = await Conversation.create({
      userId: req.user._id,
      title: title || "Cuộc trò chuyện mới",
      messages: messages || [],
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Update a conversation (messages + title)
// @route   PUT /api/conversations/:id
// @access  Private
const updateConversation = async (req, res) => {
  try {
    const { messages, title } = req.body;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        ...(messages !== undefined && { messages }),
        ...(title !== undefined && { title }),
      },
      { new: true },
    );

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    res.json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/conversations/:id
// @access  Private
const deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    res.json({ message: "Đã xóa cuộc trò chuyện" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
};

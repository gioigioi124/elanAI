import User from "../models/User.js";

// @desc    Create a new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  const { username, password, name, role } = req.body;

  try {
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    const user = await User.create({
      username,
      password,
      name,
      role: role || "staff",
      warehouseCode: req.body.warehouseCode || undefined,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: "Dữ liệu người dùng không hợp lệ" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.role = req.body.role || user.role;
      user.warehouseCode = req.body.warehouseCode || user.warehouseCode; // Cho phép update warehouseCode
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (user.username === "admin") {
        return res
          .status(400)
          .json({ message: "Không thể xóa tài khoản admin gốc" });
      }
      await user.deleteOne();
      res.json({ message: "Đã xóa người dùng" });
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Get staff list for dropdowns (id and name only)
// @route   GET /api/users/staff-list
// @access  Private
const getStaffList = async (req, res) => {
  try {
    const users = await User.find({ role: "staff" })
      .select("name username role")
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export { createUser, getUsers, updateUser, deleteUser, getStaffList };

import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      // Note: Make sure JWT_SECRET is in your .env file
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback_secret_key_123"
      );

      // Get user from the token
      req.user = await User.findById(decoded.id).select("-password");

      next();
    } catch (error) {
      console.error(error);
      res
        .status(401)
        .json({ message: "Không được phép truy cập, token không hợp lệ" });
    }
  }

  if (!token) {
    res
      .status(401)
      .json({ message: "Không được phép truy cập, không có token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role ${req.user.role} không được phép truy cập tài nguyên này`,
      });
    }
    next();
  };
};

export { protect, authorize };

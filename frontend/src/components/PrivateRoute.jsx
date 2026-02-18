import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Đang tải...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có yêu cầu role cụ thể và user không có role đó
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Có thể redirect về trang 403 hoặc trang chủ
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;

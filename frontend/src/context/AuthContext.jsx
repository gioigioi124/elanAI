import { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";
import { toast } from "sonner";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post("/api/auth/login", {
        username,
        password,
      });
      if (response.data) {
        localStorage.setItem("user", JSON.stringify(response.data));
        setUser(response.data);
        return true;
      }
    } catch (error) {
      console.error("Login error:", error);
      const message =
        error.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng thử lại.";
      toast.error(message);
      return false;
    }
  };

  const register = async (username, password, name, phone) => {
    try {
      const response = await api.post("/api/auth/register", {
        username,
        password,
        name,
        phone,
      });
      if (response.data) {
        localStorage.setItem("user", JSON.stringify(response.data));
        setUser(response.data);
        toast.success("Đăng ký thành công!");
        return true;
      }
    } catch (error) {
      console.error("Register error:", error);
      const message =
        error.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("chatMessages"); // legacy cleanup
    setUser(null);
    toast.success("Đã đăng xuất");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

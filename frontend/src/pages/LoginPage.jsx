import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    if (success) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-sm bg-white/40 backdrop-blur-md border-white/40 shadow-2xl">
        {/* Header */}
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-2xl">
            🔐
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Đăng nhập
          </CardTitle>
          <CardDescription className="mt-1 text-slate-500">
            Chào mừng quay trở lại! Vui lòng nhập thông tin.
          </CardDescription>
        </CardHeader>

        {/* Form */}
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-slate-700"
              >
                Tên đăng nhập
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Mật khẩu
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              className="h-10 w-full font-semibold mt-1"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>

        {/* Footer */}
        <CardFooter className="justify-center pb-6 pt-2">
          <p className="text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Đăng ký ngay
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;

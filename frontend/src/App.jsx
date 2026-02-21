import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route } from "react-router";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import AiSettingsPage from "./pages/AiSettingsPage";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Amber Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
        radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #f59e0b 100%)
      `,
          backgroundSize: "100% 100%",
        }}
      />
      {/* Your Content/Components */}
      <div className="min-h-screen w-full relative">
        <div className="relative z-10 flex flex-col min-h-screen">
          <Toaster richColors position="top-center" />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<PrivateRoute />}>
                  <Route path="/" element={<ChatPage />} />
                </Route>
                <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
                  <Route path="/ai-settings" element={<AiSettingsPage />} />
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </div>
      </div>
    </div>
  );
}

export default App;

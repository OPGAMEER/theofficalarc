import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "@/components/AppShell";

import Home from "./pages/Home.tsx";
import Diet from "./pages/Diet.tsx";
import Workout from "./pages/Workout.tsx";

import Profile from "./pages/Profile.tsx";
import Chat from "./pages/Chat.tsx";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import History from "./pages/History.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/diet" element={<Diet />} />
                <Route path="/workout" element={<Workout />} />
                
                <Route path="/profile" element={<Profile />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/history" element={<History />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

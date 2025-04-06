import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { ConnectWallet } from "@thirdweb-dev/react";
import { useTheme } from "@/context/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-white text-[#1E1E1E]'}`}>
      <Router />
      <Toaster />
    </div>
  );
}

export default App;

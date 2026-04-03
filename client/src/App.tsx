import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ComplaintList from "./pages/ComplaintList";
import ComplaintDetail from "./pages/ComplaintDetail";
import SubmitComplaint from "./pages/SubmitComplaint";
import CitizenDashboard from "./pages/CitizenDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import StaffComplaints from "./pages/StaffComplaints";
import StaffMap from "./pages/StaffMap";
import CitizenMap from "./pages/CitizenMap";
import AuthPage from "./pages/AuthPage";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/complaints" component={ComplaintList} />
      <Route path="/complaints/new" component={SubmitComplaint} />
      <Route path="/complaints/:id" component={ComplaintDetail} />
      <Route path="/dashboard" component={CitizenDashboard} />
      <Route path="/map" component={CitizenMap} />
      <Route path="/staff" component={StaffDashboard} />
      <Route path="/staff/complaints" component={StaffComplaints} />
      <Route path="/staff/map" component={StaffMap} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

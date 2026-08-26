import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ManagerChecklists from "./pages/ManagerChecklists";
import { AutomationSettings, RecoveryPlaceholder } from "./pages/Operations";
import NotFound from "./pages/NotFound";
import Properties from "./pages/Properties";
import ReportLibrary from "./pages/ReportLibrary";
import ReportRequest from "./pages/ReportRequest";
import { Route, Switch } from "wouter";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/request/onesite"><ReportRequest source="OneSite" /></Route>
    <Route path="/request/yardi"><ReportRequest source="Yardi" /></Route>
    <Route path="/library" component={ReportLibrary} />
    <Route path="/properties" component={Properties} />
    <Route path="/automation-settings" component={AutomationSettings} />
    <Route path="/compare-periods"><RecoveryPlaceholder kind="compare" /></Route>
    <Route path="/manager-checklists" component={ManagerChecklists} />
    <Route path="/import-data"><RecoveryPlaceholder kind="import" /></Route>
    <Route path="/portal-access"><RecoveryPlaceholder kind="access" /></Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;

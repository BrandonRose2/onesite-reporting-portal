import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Compare from "./pages/Compare";
import PropertyReportsLibrary from "./pages/PropertyReportsLibrary";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Refresh from "./pages/Refresh";
import AutomationSettings from "./pages/AutomationSettings";
import ManagerChecklists from "./pages/ManagerChecklists";
import ManagerChecklistDetail from "./pages/ManagerChecklistDetail";
import SourceDocumentPreview from "./pages/SourceDocumentPreview";
import OneSiteReportingHub from "./pages/OneSiteReportingHub";
import YardiReports from "./pages/YardiReports";
import RunAReport from "./pages/RunAReport";
import AccessManagement from "./pages/AccessManagement";
import PropertyReportView from "./pages/PropertyReportView";
import ReportCatalogManager from "./pages/ReportCatalogManager";

function PortalRoute({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}><PortalRoute><Dashboard /></PortalRoute></Route>
      <Route path={"/properties"}><PortalRoute><Properties /></PortalRoute></Route>
      <Route path={"/properties/:propertyId"}><PortalRoute><PropertyDetail /></PortalRoute></Route>
      <Route path={"/history"}><PortalRoute><PropertyReportsLibrary /></PortalRoute></Route>
      <Route path={"/property-reports/:propertyId"}><PortalRoute><PropertyReportView /></PortalRoute></Route>
      <Route path={"/compare"}><PortalRoute><Compare /></PortalRoute></Route>
      <Route path={"/refresh"}><PortalRoute><Refresh /></PortalRoute></Route>
      <Route path={"/automation"}><PortalRoute><AutomationSettings /></PortalRoute></Route>
      <Route path={"/manager-checklists"}><PortalRoute><ManagerChecklists /></PortalRoute></Route>
      <Route path={"/manager-checklists/:propertyId"}><PortalRoute><ManagerChecklistDetail /></PortalRoute></Route>
      <Route path={"/source-documents/:sourceFileId"}><PortalRoute><SourceDocumentPreview /></PortalRoute></Route>
      <Route path={"/run-report"}><PortalRoute><RunAReport /></PortalRoute></Route>
      <Route path={"/onesite-reports"}><PortalRoute><OneSiteReportingHub /></PortalRoute></Route>
      <Route path={"/report-catalog"}><PortalRoute><ReportCatalogManager /></PortalRoute></Route>
      <Route path={"/yardi-reports"}><PortalRoute><YardiReports /></PortalRoute></Route>
      <Route path={"/request/yardi"}><PortalRoute><YardiReports /></PortalRoute></Route>
      <Route path={"/access"}><PortalRoute><AccessManagement /></PortalRoute></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

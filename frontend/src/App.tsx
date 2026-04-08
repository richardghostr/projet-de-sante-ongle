import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Admin and Professional pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminAnalysisDetail from "./pages/AdminAnalysisDetail";
import AdminDocuments from "./pages/AdminDocuments";
import AdminValidationProfessionals from './pages/AdminValidationProfessionals';
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import ProfessionalFollowRequests from './pages/ProfessionalFollowRequests';
import PatientAnalysisDetail from './pages/PatientAnalysisDetail';
import PatientTreatmentView from './pages/PatientTreatmentView';
import ProfessionalProfile from './pages/ProfessionalProfile';
import PatientProfile from './pages/PatientProfile';
import ConsultProfessionals from './pages/ConsultProfessionals';
import PatientFollowRequests from './pages/PatientFollowRequests';

// Treatment tracking pages
import Treatments from "./pages/Treatments";
import TreatmentDetail from "./pages/TreatmentDetail";
import ProfessionalNotes from "./pages/ProfessionalNotes";
import ProfessionalPatients from "./pages/ProfessionalPatients";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Protected routes - any authenticated user */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
            <Route path="/consult/:analysisId" element={<ProtectedRoute><ConsultProfessionals /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/history/:id" element={<ProtectedRoute><AdminAnalysisDetail /></ProtectedRoute>} />
            <Route path="/patient/follow-requests" element={<ProtectedRoute><RoleGuard allowedRoles={["user","admin"]}><PatientFollowRequests /></RoleGuard></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/professional/profile" element={<ProtectedRoute><RoleGuard allowedRoles={["professional","admin"]}><ProfessionalProfile /></RoleGuard></ProtectedRoute>} />
            <Route path="/patient/profile" element={<ProtectedRoute><RoleGuard allowedRoles={["professional","admin","user"]}><PatientProfile /></RoleGuard></ProtectedRoute>} />
            
            {/* Treatment tracking routes */}
            <Route path="/treatments" element={<ProtectedRoute><Treatments /></ProtectedRoute>} />
            <Route path="/treatments/:id" element={<ProtectedRoute><TreatmentDetail /></ProtectedRoute>} />
            <Route path="/professional-notes" element={<ProtectedRoute><ProfessionalNotes /></ProtectedRoute>} />
            <Route path="/professional/patients" element={<ProtectedRoute><RoleGuard allowedRoles={["professional","admin"]}><ProfessionalPatients /></RoleGuard></ProtectedRoute>} />
            
            {/* Admin routes - admin only */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </RoleGuard>
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin/analyses/:id"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["admin"]}>
                    <AdminAnalysisDetail />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
                <Route
                  path="/admin/documents"
                  element={
                    <ProtectedRoute>
                      <RoleGuard allowedRoles={["admin"]}>
                        <AdminDocuments />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                />
                  <Route
                    path="/admin/validate-professionals"
                    element={
                      <ProtectedRoute>
                        <RoleGuard allowedRoles={["admin"]}>
                          <AdminValidationProfessionals />
                        </RoleGuard>
                      </ProtectedRoute>
                    }
                  />
            
            {/* Professional routes - professional and admin */}
            <Route 
              path="/professional" 
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["professional", "admin"]}>
                    <ProfessionalDashboard />
                  </RoleGuard>
                </ProtectedRoute>
              } 
            />
            <Route path="/professional/follow-requests" element={<ProtectedRoute><RoleGuard allowedRoles={["professional","admin"]}><ProfessionalFollowRequests /></RoleGuard></ProtectedRoute>} />
            <Route path="/patients/:patientId/history/:id" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["professional","admin","user"]}>
                  <PatientAnalysisDetail />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/patients/:patientId/treatments/:id" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["professional","admin","user"]}>
                  <PatientTreatmentView />
                </RoleGuard>
              </ProtectedRoute>
            } />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

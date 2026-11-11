import { Navigate, Route, Routes } from 'react-router-dom';
import { ClientLogin, ClientPasswordRecovery, ClientLayout, Portal, Updates, UpdateDetail, Phases, PhaseDetail, Requests, Files, Notifications } from './features/client/index.jsx';
import { AdminLogin, AdminPasswordRecovery, AdminLayout, Clients, NewClient, AdminClient, Overview, Schedule, AdminRequests, AdminComments, Comms, AdminFiles, Settings } from './features/admin/index.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="/login" element={<ClientLogin />} />
      <Route path="/forgot-password" element={<ClientPasswordRecovery />} />
      <Route path="/portal" element={<ClientLayout />}>
        <Route index element={<Portal />} />
        <Route path="updates" element={<Updates />} />
        <Route path="updates/:id" element={<UpdateDetail />} />
        <Route path="phases" element={<Phases />} />
        <Route path="phases/:id" element={<PhaseDetail />} />
        <Route path="requests" element={<Requests />} />
        <Route path="files" element={<Files />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot-password" element={<AdminPasswordRecovery />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Clients />} />
        <Route path="new" element={<NewClient />} />
        <Route path="settings" element={<Settings />} />
        <Route path=":id" element={<AdminClient />}>
          <Route index element={<Overview />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="comments" element={<AdminComments />} />
          <Route path="comms" element={<Comms />} />
          <Route path="files" element={<AdminFiles />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

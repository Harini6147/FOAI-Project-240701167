import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Landing, Auth, home } from './pages/Public';
import Profile from './pages/Profile';
import { WorkerHome, Schemes } from './pages/Worker';
import { ClientHome, Connections } from './pages/Client';
import { PartnerHome, PartnerWorker } from './pages/Partner';
import { getUser, useDb } from './services/store';
// Role-based route guard
function Guard({ role, children }) {
  const user = getUser(useDb());
  if (!user) return <Navigate to="/signin" />;
  return role.includes(user.role) ? children : <Navigate to={home(user)} />;
}
export default function App() {
  const { loading } = useDb();
  if (loading) return <p className="p-10 text-center text-xl">Loading…</p>;
  return (<BrowserRouter><Routes><Route element={<Layout />}>
    <Route path="/" element={<Landing />} /><Route path="/signup" element={<Auth mode="up" />} /><Route path="/signin" element={<Auth mode="in" />} />
    <Route path="/profile" element={<Guard role={['worker', 'client']}><Profile /></Guard>} />
    <Route path="/worker" element={<Guard role={['worker']}><WorkerHome /></Guard>} /><Route path="/worker/schemes" element={<Guard role={['worker']}><Schemes /></Guard>} />
    <Route path="/client" element={<Guard role={['client']}><ClientHome /></Guard>} /><Route path="/client/connections" element={<Guard role={['client']}><Connections /></Guard>} />
    <Route path="/partner" element={<Guard role={['partner']}><PartnerHome /></Guard>} /><Route path="/partner/worker/:id" element={<Guard role={['partner']}><PartnerWorker /></Guard>} />
    <Route path="*" element={<Navigate to="/" />} /></Route></Routes></BrowserRouter>);
}

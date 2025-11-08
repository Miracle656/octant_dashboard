import OctantDashboard from './components/OctantDashboard';
import { BrowserRouter, Routes, Route, Link } from 'react-router';
import SparkVaultHub from './components/SparkVaultHub';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

function App() {
  return (
    <>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<OctantDashboard />} />
        <Route path="/spark" element={<SparkVaultHub />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
    </>
  );
}

export default App;
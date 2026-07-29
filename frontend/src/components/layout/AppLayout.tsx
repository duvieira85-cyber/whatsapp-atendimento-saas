import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, useMediaQuery } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/conversations': 'Conversas',
  '/departments': 'Departamentos',
  '/clients': 'Clientes',
  '/users': 'Usuários',
  '/settings': 'Configurações',
  '/integrations': 'Integrações',
  '/reports': 'Relatórios',
};

export default function AppLayout() {
  const location = useLocation();
  const isPermanent = useMediaQuery('(min-width:1024px)');

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const currentTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || '';

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          title={currentTitle}
          showMenuButton={!isPermanent}
          onMenuToggle={handleMenuToggle}
        />
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden', minHeight: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import ExtensionIcon from '@mui/icons-material/Extension';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../hooks/useSidebar';

const COLLAPSED_WIDTH = 72;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface Props {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const isPermanent = useMediaQuery(theme.breakpoints.up(1024));
  const expandedWidth = 200;
  const drawerWidth = collapsed ? COLLAPSED_WIDTH : expandedWidth;

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Conversas', path: '/conversations', icon: <ChatIcon /> },
    { label: 'Clientes', path: '/clients', icon: <PeopleIcon /> },
    { label: 'Departamentos', path: '/departments', icon: <BusinessIcon /> },
    { label: 'Usuários', path: '/users', icon: <GroupIcon />, roles: ['super_admin', 'admin'] },
    { label: 'Integrações', path: '/integrations', icon: <ExtensionIcon />, roles: ['super_admin', 'admin'] },
    { label: 'Relatórios', path: '/reports', icon: <BarChartIcon />, roles: ['super_admin', 'admin', 'supervisor'] },
    { label: 'Configurações', path: '/settings', icon: <SettingsIcon /> },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <Drawer
      variant={isPermanent ? 'permanent' : 'temporary'}
      open={isPermanent ? true : mobileOpen}
      onClose={isPermanent ? undefined : onMobileClose}
      sx={{
        width: isPermanent ? drawerWidth : 'auto',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: '#3B0764',
          color: '#FFFFFF',
          position: isPermanent ? 'relative' : 'fixed',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 0 : 2,
          py: 1.25,
          minHeight: 52,
        }}
      >
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, fontSize: 14 }}
            >
              Atendimento
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            >
              Plataforma SaaS
            </Typography>
          </Box>
        )}
        {collapsed && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'rgba(130, 10, 209, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#FFFFFF' }}>A</Typography>
          </Box>
        )}
        {isPermanent && (
          <IconButton
            onClick={toggle}
            size="small"
            aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            sx={{
              color: 'rgba(255,255,255,0.5)',
              '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.08)' },
              flexShrink: 0,
            }}
          >
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <List sx={{ flex: 1, px: collapsed ? 0.5 : 1, py: 1 }}>
        {visibleItems.map((item) => {
          const isSelected = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 0.25 }}>
              <Tooltip
                title={collapsed ? item.label : ''}
                placement="right"
                arrow
                disableHoverListener={!collapsed}
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={() => navigate(item.path)}
                  aria-label={item.label}
                  sx={{
                    minHeight: 40,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: collapsed ? 0 : 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    mx: collapsed ? 0.5 : 0,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(130, 10, 209, 0.35)',
                      '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.45)' },
                      '& .MuiListItemIcon-root': { color: '#FFFFFF' },
                    },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 36,
                      color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                      justifyContent: 'center',
                      transition: 'color 0.15s',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 450,
                        color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ px: collapsed ? 1 : 2, py: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: collapsed ? 0 : 1,
            py: 0.5,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.04)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: '#820AD1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 700,
              fontSize: 11,
              color: '#FFFFFF',
            }}
          >
            {user?.first_name?.charAt(0) || user?.username?.charAt(0) || '?'}
          </Box>
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: '#FFFFFF', fontWeight: 600, fontSize: 11, display: 'block' }}
              >
                {user?.first_name || user?.username || 'Usuário'}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, display: 'block', fontFamily: 'monospace' }}
              >
                {user?.username || ''}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

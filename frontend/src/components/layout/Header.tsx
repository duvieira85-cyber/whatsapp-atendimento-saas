import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  title?: string;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  attendant: 'Atendente',
};

export default function Header({ title, onMenuToggle, showMenuButton }: Props) {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isBelow1024 = useMediaQuery(theme.breakpoints.down(1024));
  const profileRef = useRef<HTMLDivElement>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 0.75,
        minHeight: 48,
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid',
        borderColor: 'divider',
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      {showMenuButton && (
        <IconButton
          onClick={onMenuToggle}
          size="small"
          aria-label="Abrir menu"
          sx={{ color: 'text.secondary', mr: 0.5 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography
            variant="h6"
            noWrap
            sx={{ fontWeight: 600, fontSize: 15, color: 'text.primary' }}
          >
            {title}
          </Typography>
        )}
      </Box>

      <Chip
        label={roleLabels[user?.role || ''] || user?.role}
        size="small"
        variant="outlined"
        sx={{
          height: 22,
          fontSize: 10,
          fontWeight: 500,
          borderColor: '#ECE8F4',
          color: 'text.secondary',
          display: { xs: 'none', sm: 'inline-flex' },
        }}
      />

      <Box
        ref={profileRef}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          px: 0.75,
          py: 0.25,
          borderRadius: 2,
          transition: 'background-color 0.12s',
          '&:hover': { bgcolor: '#F3E8FF' },
          '&:focus-visible': { outline: '2px solid #820AD1', outlineOffset: 2 },
        }}
        role="button"
        tabIndex={0}
        aria-label="Menu do usuário"
        onKeyDown={(e) => { if (e.key === 'Enter') setAnchorEl(e.currentTarget); }}
      >
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: '#820AD1',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {user?.first_name?.charAt(0) || user?.username?.charAt(0) || '?'}
        </Avatar>
        {!isBelow1024 && (
          <>
            <Box sx={{ minWidth: 0, display: { xs: 'none', md: 'block' } }}>
              <Typography
                variant="caption"
                noWrap
                sx={{ fontWeight: 600, fontSize: 11, color: 'text.primary', display: 'block' }}
              >
                {user?.first_name || 'Usuário'}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ fontSize: 9, color: 'text.secondary', display: 'block', fontFamily: 'monospace' }}
              >
                {user?.username || ''}
              </Typography>
            </Box>
            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary', display: { xs: 'none', md: 'block' } }} />
          </>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: { minWidth: 200, mt: 0.5 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {user?.username}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Meu Perfil</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Configurações</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { setAnchorEl(null); logout(); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Sair</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

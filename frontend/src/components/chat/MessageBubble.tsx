import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReplyIcon from '@mui/icons-material/Reply';
import EditIcon from '@mui/icons-material/Edit';
import ForwardIcon from '@mui/icons-material/Forward';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isOwn: boolean;
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function MessageBubble({ message, isOwn }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  if (message.sender_type === 'system') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5, px: 2 }}>
        <Typography variant="caption" sx={{
          color: 'text.secondary',
          fontStyle: 'italic',
          bgcolor: '#F3F4F6',
          px: 2,
          py: 0.5,
          borderRadius: 1.5,
          fontSize: 12,
          textAlign: 'center',
        }}>
          {message.content}
        </Typography>
      </Box>
    );
  }

  if (message.sender_type === 'internal_note') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 0.5, px: 2 }} onContextMenu={handleContextMenu}>
        <Paper
          elevation={0}
          sx={{
            maxWidth: '70%',
            p: 1.5,
            borderRadius: 2,
            bgcolor: '#FFFBEB',
            border: '1px solid',
            borderColor: '#FDE68A',
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="caption" color="#D97706" sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
            Nota interna • {message.sender_name}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#1F2937' }}>
            {message.content}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.25 }}>
            <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 10 }}>
              {formatTime(message.created_at)}
            </Typography>
          </Box>
        </Paper>
        <Menu
          open={!!contextMenu}
          onClose={() => setContextMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
        >
          <MenuItem onClick={() => setContextMenu(null)}>
            <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Copiar</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  return (
    <Box
      sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', mb: 0.5, px: 2 }}
      onContextMenu={handleContextMenu}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: '72%',
          p: 1.25,
          borderRadius: 2,
          bgcolor: isOwn ? '#F3E8FF' : '#FFFFFF',
          borderTopRightRadius: isOwn ? 4 : 2,
          borderTopLeftRadius: isOwn ? 2 : 4,
          wordBreak: 'break-word',
          position: 'relative',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {!isOwn && message.sender_name && (
          <Typography variant="caption" color="#820AD1" sx={{ fontSize: 11, fontWeight: 600, display: 'block', mb: 0.25 }}>
            {message.sender_name}
          </Typography>
        )}
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.4, color: '#1F2937' }}>
          {message.content}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
          <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 10 }}>
            {formatTime(message.created_at)}
          </Typography>
          {isOwn && (
            <DoneAllIcon sx={{ fontSize: 14, color: '#820AD1' }} />
          )}
        </Box>
      </Paper>
      <Menu
        open={!!contextMenu}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
      >
        <MenuItem onClick={() => setContextMenu(null)}>
          <ListItemIcon><ReplyIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Responder</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setContextMenu(null)}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Copiar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setContextMenu(null)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setContextMenu(null)}>
          <ListItemIcon><ForwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Encaminhar</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

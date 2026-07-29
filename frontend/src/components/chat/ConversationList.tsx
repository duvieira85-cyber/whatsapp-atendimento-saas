import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Chip,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckIcon from '@mui/icons-material/Check';
import type { Conversation, Department } from '../../types';

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'queue_time' | 'priority' | 'unread' | 'attributed' | 'waiting';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'name_asc', label: 'Nome (A \u2192 Z)' },
  { value: 'name_desc', label: 'Nome (Z \u2192 A)' },
  { value: 'queue_time', label: 'Tempo na fila' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'unread', label: 'N\u00e3o lidas primeiro' },
  { value: 'attributed', label: 'Atribu\u00eddas primeiro' },
  { value: 'waiting', label: 'Aguardando primeiro' },
];

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2 };

const SORT_STORAGE_KEY = 'conversation_sort';

function getInitialSort(): SortOption {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored && SORT_OPTIONS.some((o) => o.value === stored)) return stored as SortOption;
  } catch {}
  return 'newest';
}

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  departments?: Department[];
  selectedQueue?: string | null;
  onSelectQueue?: (departmentId: string | null) => void;
  onOpenQueuePanel?: () => void;
  loading?: boolean;
}

const statusLabels: Record<string, string> = {
  waiting: 'Aguardando',
  active: 'Ativo',
  closed: 'Encerrado',
  transferred: 'Transferido',
};

const statusColors: Record<string, 'warning' | 'success' | 'default' | 'info'> = {
  waiting: 'warning',
  active: 'success',
  closed: 'default',
  transferred: 'info',
};

const formatRelativeTime = (dateStr: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export default function ConversationList({ conversations, selectedId, onSelect, departments, selectedQueue, onSelectQueue, onOpenQueuePanel, loading }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(getInitialSort);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    try { localStorage.setItem(SORT_STORAGE_KEY, sortBy); } catch {}
  }, [sortBy]);

  const sorted = useMemo(() => {
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.client_details?.name?.toLowerCase().includes(q) ||
          c.client_details?.phone?.includes(q) ||
          c.last_message?.toLowerCase().includes(q),
      );
    }
    if (filterStatus) {
      list = list.filter((c) => c.status === filterStatus);
    }
    const s = sortBy;
    const copy = [...list];
    copy.sort((a, b) => {
      switch (s) {
        case 'oldest':
          return (a.last_message_at || '').localeCompare(b.last_message_at || '');
        case 'name_asc':
          return (a.client_details?.name || '').localeCompare(b.client_details?.name || '');
        case 'name_desc':
          return (b.client_details?.name || '').localeCompare(a.client_details?.name || '');
        case 'queue_time':
          return (a.entered_queue_at || '').localeCompare(b.entered_queue_at || '');
        case 'priority':
          return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
        case 'unread':
          return (b.unread_count || 0) - (a.unread_count || 0);
        case 'attributed':
          return (b.attendant ? 1 : 0) - (a.attendant ? 1 : 0);
        case 'waiting':
          return (a.status === 'waiting' ? 0 : 1) - (b.status === 'waiting' ? 0 : 1);
        default:
          return (b.last_message_at || '').localeCompare(a.last_message_at || '');
      }
    });
    return copy;
  }, [conversations, search, filterStatus, sortBy]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    conversations.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [conversations]);

  const queueItems = useMemo(() => {
    if (!departments || !conversations) return [];
    return departments.filter((d) => conversations.some((c) => c.department === d.id));
  }, [departments, conversations]);

  const queueCount = (deptId: string | null) => {
    if (deptId === null) return conversations.length;
    return conversations.filter((c) => c.department === deptId).length;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#FFFFFF' }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Conversas
          </Typography>
          {onOpenQueuePanel && (
            <Tooltip title="Filtrar por fila">
              <IconButton size="small" onClick={onOpenQueuePanel} sx={{ width: 28, height: 28 }}>
                <FilterListIcon sx={{ fontSize: 18, color: selectedQueue ? '#820AD1' : '#9CA3AF' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Pesquisar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: '#F3F4F6',
                fontSize: 13,
                '&:hover': { bgcolor: '#EEF0F4' },
                '& fieldset': { border: 'none' },
              },
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            sx={{
              borderRadius: 2, p: 0.75,
              color: sortBy === 'newest' ? '#9CA3AF' : '#820AD1',
              bgcolor: sortBy === 'newest' ? 'transparent' : 'rgba(130,10,209,0.06)',
              '&:hover': { bgcolor: sortBy === 'newest' ? '#F3F4F6' : 'rgba(130,10,209,0.1)' },
            }}
          >
            <SwapVertIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Menu
            anchorEl={sortMenuAnchor}
            open={Boolean(sortMenuAnchor)}
            onClose={() => setSortMenuAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 220, mt: 0.5 } } }}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                selected={sortBy === opt.value}
                onClick={() => { setSortBy(opt.value); setSortMenuAnchor(null); }}
                sx={{ fontSize: 13, py: 0.75 }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  {sortBy === opt.value && <CheckIcon sx={{ fontSize: 18, color: '#820AD1' }} />}
                </ListItemIcon>
                {opt.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {queueItems.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, flexWrap: 'nowrap', overflow: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 0 } }}>
            <Chip
              label={`Todas (${queueCount(null)})`}
              size="small"
              onClick={() => onSelectQueue?.(null)}
              sx={{
                height: 24, fontSize: 11, fontWeight: 500, borderRadius: 1.5, flexShrink: 0, cursor: 'pointer',
                bgcolor: selectedQueue === null ? '#820AD1' : '#F3F4F6',
                color: selectedQueue === null ? '#FFFFFF' : '#6B7280',
                '&:hover': { opacity: 0.85 },
                transition: 'all 0.12s ease',
              }}
            />
            {queueItems.map((dept) => {
              const isSelected = selectedQueue === dept.id;
              const count = queueCount(dept.id);
              if (count === 0 && !isSelected) return null;
              return (
                <Chip
                  key={dept.id}
                  label={`${dept.name} (${count})`}
                  size="small"
                  onClick={() => onSelectQueue?.(dept.id)}
                  sx={{
                    height: 24, fontSize: 11, fontWeight: 500, borderRadius: 1.5, flexShrink: 0, cursor: 'pointer',
                    bgcolor: isSelected ? '#820AD1' : '#F3F4F6',
                    color: isSelected ? '#FFFFFF' : '#6B7280',
                    '&:hover': { opacity: 0.85 },
                    transition: 'all 0.12s ease',
                  }}
                />
              );
            })}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {['waiting', 'active', 'closed'].map((s) => (
            <Chip
              key={s}
              label={`${statusLabels[s]} (${statusCounts[s] || 0})`}
              size="small"
              color={filterStatus === s ? statusColors[s] : 'default'}
              variant={filterStatus === s ? 'filled' : 'outlined'}
              onClick={() => setFilterStatus(filterStatus === s ? null : s)}
              sx={{
                cursor: 'pointer', height: 24, fontSize: 11, fontWeight: 500,
                transition: 'all 0.12s', '&:hover': { opacity: 0.8 },
              }}
            />
          ))}
          {sortBy !== 'newest' && (
            <Chip
              label="Ordenado"
              size="small"
              onDelete={() => setSortBy('newest')}
              sx={{
                height: 24, fontSize: 11, fontWeight: 500,
                bgcolor: 'rgba(130,10,209,0.08)', color: '#820AD1',
                '& .MuiChip-deleteIcon': { fontSize: 14, color: '#820AD1' },
              }}
            />
          )}
        </Box>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3, fontSize: 13 }}>
            Carregando...
          </Typography>
        )}
        {!loading && sorted.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3, fontSize: 13 }}>
            Nenhuma conversa encontrada
          </Typography>
        )}
        {sorted.map((conv) => {
          const isSelected = conv.id === selectedId;
          const clientName = conv.client_details?.name || 'Cliente';
          const lastMsg = conv.last_message || 'Sem mensagens';
          const time = formatRelativeTime(conv.last_message_at);
          const hasUnread = (conv.unread_count ?? 0) > 0;

          return (
            <ListItemButton
              key={conv.id}
              selected={isSelected}
              onClick={() => onSelect(conv.id)}
              sx={{
                px: 2, py: 1.25, mx: 1, borderRadius: 1.5, mb: 0.25,
                transition: 'all 0.12s ease',
                '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.03)' },
                '&.Mui-selected': {
                  bgcolor: 'rgba(130, 10, 209, 0.08)',
                  '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.12)' },
                },
              }}
            >
              <ListItemAvatar>
                <Badge
                  color="success"
                  variant="dot"
                  invisible={conv.status !== 'active'}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  sx={{
                    '& .MuiBadge-dot': {
                      width: 10, height: 10, borderRadius: '50%', border: '2px solid #fff',
                      bgcolor: conv.status === 'active' ? '#22C55E' : undefined,
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: isSelected ? '#820AD1' : '#6D28D9',
                      width: 42, height: 42, fontSize: 16, fontWeight: 600,
                    }}
                  >
                    {clientName.charAt(0).toUpperCase()}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: hasUnread ? 700 : isSelected ? 600 : 500,
                        fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis', maxWidth: 180, color: 'text.primary',
                      }}
                    >
                      {clientName}
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: hasUnread ? 'text.primary' : '#9CA3AF',
                      fontSize: 11, fontWeight: hasUnread ? 600 : 400, flexShrink: 0, ml: 1,
                    }}>
                      {time}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        color={hasUnread ? 'text.primary' : 'text.secondary'}
                        sx={{
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 210, display: 'block',
                          fontWeight: hasUnread ? 500 : 400, fontSize: 13,
                        }}
                      >
                        {lastMsg}
                      </Typography>
                      {hasUnread && (
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 20, height: 20, borderRadius: '10px',
                          bgcolor: '#820AD1', color: '#fff',
                          fontWeight: 700, fontSize: 10, px: 0.5, flexShrink: 0,
                        }}>
                          {conv.unread_count}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minWidth: 0 }}>
                        {conv.department_name && (
                          <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 11 }}>
                            {conv.department_name}
                          </Typography>
                        )}
                        {conv.attendant_name && (
                          <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 11 }}>
                            {'\u2022'} {conv.attendant_name}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={statusLabels[conv.status] || conv.status}
                        size="small"
                        color={statusColors[conv.status] || 'default'}
                        sx={{
                          height: 20, fontSize: 10, fontWeight: 600, borderRadius: 1,
                          '&.MuiChip-colorWarning': { bgcolor: '#FEF3C7', color: '#92400E' },
                          '&.MuiChip-colorSuccess': { bgcolor: '#D1FAE5', color: '#065F46' },
                        }}
                      />
                    </Box>
                  </Box>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

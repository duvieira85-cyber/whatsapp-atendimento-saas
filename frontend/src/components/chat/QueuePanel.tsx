import { useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Conversation, Department } from '../../types';

interface QueueSummary {
  departmentId: string | null;
  departmentName: string;
  color: string;
  total: number;
  waiting: number;
  active: number;
}

interface Props {
  conversations: Conversation[];
  departments: Department[];
  selectedQueue: string | null;
  onSelectQueue: (departmentId: string | null) => void;
  loading?: boolean;
  variant?: 'sidebar' | 'drawer';
  onClose?: () => void;
}

export default function QueuePanel({ conversations, departments, selectedQueue, onSelectQueue, loading, variant = 'drawer', onClose }: Props) {
  const queues = useMemo(() => {
    const deptMap = new Map<string, Department>();
    for (const d of departments) deptMap.set(d.id, d);

    const map = new Map<string | null, QueueSummary>();
    map.set(null, { departmentId: null, departmentName: 'Todas', color: '#820AD1', total: 0, waiting: 0, active: 0 });

    for (const c of conversations) {
      const key = c.department ?? '__none__';
      if (!map.has(key)) {
        const dept = deptMap.get(key);
        map.set(key, {
          departmentId: key,
          departmentName: dept?.name || (c.department_name ?? 'Sem Departamento'),
          color: dept?.color || '#9CA3AF',
          total: 0, waiting: 0, active: 0,
        });
      }
      const q = map.get(key)!;
      q.total++;
      if (c.status === 'waiting') q.waiting++;
      if (c.status === 'active') q.active++;
    }
    const nullEntry = map.get(null)!;
    nullEntry.total = conversations.length;
    nullEntry.waiting = conversations.filter((c) => c.status === 'waiting').length;
    nullEntry.active = conversations.filter((c) => c.status === 'active').length;

    return Array.from(map.values()).filter((q) => q.departmentId === null || q.total > 0);
  }, [conversations, departments]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 10 }}>
          Filas
        </Typography>
        {onClose && (
          <IconButton size="small" onClick={onClose} aria-label="Fechar">
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
      <List sx={{ flex: 1, overflow: 'auto', py: 0, px: 1 }}>
        {loading && <CircularProgress size={16} sx={{ display: 'block', mx: 'auto', mt: 2 }} />}
        {queues.map((q) => {
          const isSelected = selectedQueue === q.departmentId;
          return (
            <ListItemButton
              key={q.departmentId ?? '__all__'}
              selected={isSelected}
              onClick={() => onSelectQueue(q.departmentId)}
              sx={{
                px: 1.5, py: 1,
                minHeight: 40,
                borderRadius: 2,
                mb: 0.25,
                transition: 'all 0.12s ease',
                '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.04)' },
                '&.Mui-selected': {
                  bgcolor: 'rgba(130, 10, 209, 0.08)',
                  '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.12)' },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', overflow: 'hidden' }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: q.departmentId === null ? '#820AD1' : q.color,
                  flexShrink: 0,
                }} />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontWeight: isSelected ? 600 : 450,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: isSelected ? 'text.primary' : 'text.secondary',
                  }}
                >
                  {q.departmentName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                  {q.waiting > 0 && (
                    <Box sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      px: 0.5,
                      borderRadius: '9px',
                      bgcolor: '#FEF3C7',
                      color: '#92400E',
                      fontWeight: 700,
                      fontSize: 10,
                      lineHeight: 1,
                    }}>
                      {q.waiting}
                    </Box>
                  )}
                  {q.active > 0 && (
                    <Box sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      px: 0.5,
                      borderRadius: '9px',
                      bgcolor: '#D1FAE5',
                      color: '#065F46',
                      fontWeight: 700,
                      fontSize: 10,
                      lineHeight: 1,
                    }}>
                      {q.active}
                    </Box>
                  )}
                </Box>
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

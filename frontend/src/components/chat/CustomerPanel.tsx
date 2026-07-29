import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import type { Conversation } from '../../types';

interface Props {
  conversation: Conversation;
  onClose?: () => void;
}

function formatDuration(start: string | null, end?: string | null): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.max(0, e - s);
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Aguardando', color: '#92400E', bg: '#FEF3C7' },
  active: { label: 'Em Atendimento', color: '#065F46', bg: '#D1FAE5' },
  closed: { label: 'Encerrado', color: '#6B7280', bg: '#F3F4F6' },
  transferred: { label: 'Transferido', color: '#6B7280', bg: '#F3F4F6' },
};

const priorityConfig: Record<string, { label: string; color: 'default' | 'warning' | 'error' }> = {
  normal: { label: 'Normal', color: 'default' },
  high: { label: 'Alta', color: 'warning' },
  urgent: { label: 'Urgente', color: 'error' },
};

export default function CustomerPanel({ conversation, onClose }: Props) {
  const client = conversation.client_details;
  const [expanded, setExpanded] = useState<string | false>('priority');

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const statusInfo = statusLabel[conversation.status] || statusLabel.closed;
  const priorityInfo = priorityConfig[conversation.priority] || priorityConfig.normal;

  const timeInQueue = useMemo(
    () => formatDuration(conversation.entered_queue_at, conversation.started_at),
    [conversation.entered_queue_at, conversation.started_at],
  );

  const timeInService = useMemo(
    () => formatDuration(conversation.started_at, conversation.status === 'closed' ? conversation.updated_at : null),
    [conversation.started_at, conversation.updated_at, conversation.status],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#FFFFFF' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.25, minHeight: 44,
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
          Cliente
        </Typography>
        {onClose && (
          <Tooltip title="Fechar painel">
            <IconButton size="small" onClick={onClose} sx={{ width: 28, height: 28 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Top card: Avatar + Name + Phone */}
        <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '50%',
            bgcolor: '#820AD1', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 17, flexShrink: 0,
          }}>
            {(client?.name || '?').charAt(0).toUpperCase()}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>
              {client?.name || '—'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <PhoneIcon sx={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }} />
              <Typography noWrap variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                {client?.phone || '—'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Info section - inline fields */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <InfoRow icon={<BusinessIcon sx={{ fontSize: 12 }} />} label="Departamento" value={conversation.department_name || '—'} />
          <InfoRow icon={<PersonIcon sx={{ fontSize: 12 }} />} label="Responsável" value={conversation.attendant_name || '—'} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
            <Box sx={{
              display: 'inline-flex', px: 1, py: 0.25, borderRadius: 1,
              bgcolor: statusInfo.bg, color: statusInfo.color,
              fontWeight: 600, fontSize: 11,
            }}>
              {statusInfo.label}
            </Box>
            <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap' }}>
              Fila: {timeInQueue}
            </Typography>
            {conversation.status === 'active' && (
              <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap' }}>
                • Atendimento: {timeInService}
              </Typography>
            )}
          </Box>
          {client?.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
              <EmailIcon sx={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }} />
              <Typography noWrap variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                {client.email}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Accordions */}
        <Accordion expanded={expanded === 'priority'} onChange={handleChange('priority')} sx={{ '&.Mui-expanded': { mb: 0 } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ px: 2, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 11, letterSpacing: '0.04em' }}>
              Prioridade
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            <Chip
              label={priorityInfo.label}
              color={priorityInfo.color}
              size="small"
              sx={{ fontWeight: 600, borderRadius: 1, height: 24 }}
            />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'tags'} onChange={handleChange('tags')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ px: 2, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 11, letterSpacing: '0.04em' }}>
                Tags
              </Typography>
              <Tooltip title="Editar tags">
                <IconButton size="small" sx={{ p: 0.25 }}><EditIcon sx={{ fontSize: 13 }} /></IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {client?.tags?.length ? client.tags.map((t, i) => (
                <Chip key={i} label={t} size="small" variant="outlined" sx={{ borderRadius: 1, fontSize: 11, height: 24 }} />
              )) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>Nenhuma tag</Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'notes'} onChange={handleChange('notes')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ px: 2, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 11, letterSpacing: '0.04em' }}>
                Observações
              </Typography>
              <Tooltip title="Editar observações">
                <IconButton size="small" sx={{ p: 0.25 }}><EditIcon sx={{ fontSize: 13 }} /></IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#FAFAFA' }}>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.5 }}>
                {client?.notes || conversation.notes || 'Nenhuma observação'}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'history'} onChange={handleChange('history')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ px: 2, minHeight: 40, '&.Mui-expanded': { minHeight: 40 } }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 11, letterSpacing: '0.04em' }}>
              Histórico
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <InfoRow label="Total de mensagens" value={String(conversation.message_count)} />
              <InfoRow label="Primeiro contato" value={new Date(conversation.created_at).toLocaleString('pt-BR')} />
              <InfoRow label="Último contato" value={conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString('pt-BR') : '—'} />
              <InfoRow label="Canal" value="WhatsApp" />
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, minHeight: 22 }}>
      {icon && <Box sx={{ display: 'flex', color: '#9CA3AF', flexShrink: 0 }}>{icon}</Box>}
      <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 11, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
    </Box>
  );
}

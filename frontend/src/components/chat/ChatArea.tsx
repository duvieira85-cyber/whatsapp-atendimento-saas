import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  ToggleButton,
  Tooltip,
  Divider,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PhoneIcon from '@mui/icons-material/Phone';
import BlockIcon from '@mui/icons-material/Block';
import ArchiveIcon from '@mui/icons-material/Archive';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import type { Conversation, Message, Department } from '../../types';
import {
  getConversationMessages,
  sendMessage,
  closeConversation,
  reopenConversation,
  transferConversation,
  assignConversation,
} from '../../services/conversations';
import { listDepartments } from '../../services/departments';
import { useRealtimeEvent } from '../../contexts/WebSocketContext';
import MessageBubble from './MessageBubble';

interface Props {
  conversation: Conversation;
  currentUserId: string | null;
  currentUserName: string;
  onUpdate: () => void;
  onBack?: () => void;
  onToggleCustomerPanel?: () => void;
  customerPanelOpen?: boolean;
}

const statusLabels: Record<string, string> = {
  waiting: 'Aguardando',
  active: 'Em Atendimento',
  closed: 'Encerrado',
  transferred: 'Transferido',
};

const statusStyle: Record<string, { bg: string; color: string }> = {
  waiting: { bg: '#FEF3C7', color: '#92400E' },
  active: { bg: '#D1FAE5', color: '#065F46' },
  closed: { bg: '#F3F4F6', color: '#6B7280' },
  transferred: { bg: '#F3F4F6', color: '#6B7280' },
};

function formatDuration(start: string | null, end?: string | null): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.max(0, e - s);
  const totalSec = Math.floor(diff / 1000);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ChatArea({ conversation, currentUserId, currentUserName, onUpdate, onBack, onToggleCustomerPanel, customerPanelOpen }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [internalNoteMode, setInternalNoteMode] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [transferDept, setTransferDept] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convId = conversation.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const refreshMessages = useCallback(async () => {
    try {
      const data = await getConversationMessages(convId);
      setMessages((data.results || []).reverse());
    } catch {
      // erro tratado silenciosamente
    }
  }, [convId]);

  useEffect(() => {
    setLoadingMsgs(true);
    refreshMessages().finally(() => setLoadingMsgs(false));
  }, [refreshMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useRealtimeEvent('message.received', useCallback((data) => {
    if (data.conversation_id === convId) {
      refreshMessages();
    }
  }, [convId, refreshMessages]));

  useRealtimeEvent('message.sent', useCallback((data) => {
    if (data.conversation_id === convId) {
      refreshMessages();
    }
  }, [convId, refreshMessages]));
  useEffect(() => { inputRef.current?.focus(); }, [convId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');

    if (internalNoteMode) {
      const localNote: Message = {
        id: `internal_${Date.now()}`,
        conversation: convId,
        sender_type: 'internal_note',
        sender: currentUserId,
        sender_name: currentUserName,
        content: text,
        message_type: 'text',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, localNote]);
      setInternalNoteMode(false);
      setSending(false);
      return;
    }

    try {
      const msg = await sendMessage({ conversation: convId, content: text });
      setMessages((prev) => [...prev, msg]);
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, convId, internalNoteMode, currentUserId, currentUserName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = async () => {
    await closeConversation(convId);
    onUpdate();
  };

  const handleReopen = async () => {
    await reopenConversation(convId);
    onUpdate();
  };

  const handleAssign = async () => {
    await assignConversation(convId, {});
    onUpdate();
  };

  const handleTransfer = useCallback(async () => {
    const deptId = transferDept;
    const currentConvId = convId;
    if (!deptId || !currentConvId) return;
    try {
      await transferConversation(currentConvId, { department_id: deptId });
    } catch {
      alert('Erro ao transferir conversa. Tente novamente.');
      return;
    }
    setTransferDialogOpen(false);
    setTransferDept('');
    onUpdate();
  }, [transferDept, convId, onUpdate]);

  const openTransferDialog = async () => {
    setMenuAnchor(null);
    try {
      const data = await listDepartments();
      setDepartments(data.results || []);
    } catch {
      setDepartments([]);
    }
    setTransferDialogOpen(true);
  };

  const timeInQueue = useMemo(
    () => formatDuration(conversation.entered_queue_at, conversation.started_at),
    [conversation.entered_queue_at, conversation.started_at],
  );

  const timeInService = useMemo(
    () => formatDuration(conversation.started_at, conversation.status === 'closed' ? conversation.updated_at : null),
    [conversation.started_at, conversation.updated_at, conversation.status],
  );

  const isClosed = conversation.status === 'closed';
  const clientName = conversation.client_details?.name || 'Cliente';
  const clientPhone = conversation.client_details?.phone || '';
  const statusInfo = statusStyle[conversation.status] || statusStyle.closed;

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateGroup = getDateGroup(msg.created_at);
      if (dateGroup !== lastDate) {
        groups.push({ date: dateGroup, msgs: [] });
        lastDate = dateGroup;
      }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [messages]);

  const showAssign = !isClosed && !conversation.attendant_name;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#FFFFFF' }}>
      {/* ── HEADER ── */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        {/* Line 1: Avatar + Name + Phone | Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 0.75, gap: 1.5, minHeight: 48 }}>
          {onBack && (
            <IconButton size="small" onClick={onBack} aria-label="Voltar">
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}
          <Avatar sx={{ bgcolor: '#6D28D9', width: 36, height: 36, flexShrink: 0, fontSize: 15 }}>
            {clientName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0, overflow: 'hidden' }}>
            <Typography
              noWrap
              variant="subtitle2"
              sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}
            >
              {clientName}
            </Typography>
            {clientPhone && (
              <Typography
                noWrap
                variant="caption"
                sx={{ color: 'text.secondary', fontSize: 12 }}
              >
                {clientPhone}
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0, alignItems: 'center' }}>
            {showAssign && (
              <Tooltip title="Assumir conversa">
                <IconButton size="small" onClick={handleAssign} sx={{ width: 30, height: 30, color: '#820AD1' }}>
                  <PersonAddIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}
            {!isClosed && (
              <>
                <Tooltip title="Transferir">
                  <IconButton size="small" onClick={openTransferDialog} sx={{ width: 30, height: 30, color: '#F59E0B' }}>
                    <SwapHorizIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Encerrar conversa">
                  <IconButton size="small" onClick={() => { setMenuAnchor(null); handleClose(); }} sx={{ width: 30, height: 30, color: '#EF4444' }}>
                    <CheckCircleIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {isClosed && (
              <Tooltip title="Reabrir conversa">
                <IconButton size="small" onClick={handleReopen} sx={{ width: 30, height: 30 }}>
                  <CheckCircleIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Mais opções">
              <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ width: 30, height: 30 }}>
                <MoreVertIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            {onToggleCustomerPanel && (
              <Tooltip title={customerPanelOpen ? 'Ocultar detalhes' : 'Mostrar detalhes'}>
                <IconButton
                  size="small"
                  onClick={onToggleCustomerPanel}
                  sx={{
                    width: 30, height: 30, ml: 0.5,
                    color: customerPanelOpen ? '#820AD1' : '#6B7280',
                    bgcolor: customerPanelOpen ? 'rgba(130,10,209,0.08)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(130,10,209,0.12)' },
                  }}
                >
                  {customerPanelOpen ? <ChevronRightIcon sx={{ fontSize: 17 }} /> : <ChevronLeftIcon sx={{ fontSize: 17 }} />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Line 2: Status + Department + Attendant | Timers */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 0.25, minHeight: 28,
          bgcolor: '#FAFAFA',
        }}>
          <Box sx={{
            display: 'inline-flex', px: 0.75, py: 0.125, borderRadius: 0.75,
            bgcolor: statusInfo.bg, color: statusInfo.color,
            fontWeight: 600, fontSize: 10, lineHeight: '18px', whiteSpace: 'nowrap',
          }}>
            {statusLabels[conversation.status] || conversation.status}
          </Box>
          {conversation.department_name && (
            <Typography noWrap variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              {conversation.department_name}
            </Typography>
          )}
          {conversation.attendant_name && (
            <Typography noWrap variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              • {conversation.attendant_name}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography noWrap variant="caption" sx={{ color: '#9CA3AF', fontSize: 10 }}>
            Fila: {timeInQueue}
          </Typography>
          {conversation.status === 'active' && (
            <Typography noWrap variant="caption" sx={{ color: '#9CA3AF', fontSize: 10 }}>
              • Atendimento: {timeInService}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── MESSAGES ── */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#FAFAFA', py: 1 }}>
        {loadingMsgs ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
        ) : messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4, fontSize: 13 }}>
            Nenhuma mensagem ainda. Envie uma mensagem para iniciar o atendimento.
          </Typography>
        ) : (
          groupedMessages.map((group) => (
            <Fragment key={group.date}>
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                <Typography variant="caption" sx={{
                  bgcolor: '#F3E8FF', color: '#6D28D9',
                  px: 1.5, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 500,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}>
                  {group.date}
                </Typography>
              </Box>
              {group.msgs.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_type === 'attendant' || msg.sender_type === 'internal_note'} />
              ))}
            </Fragment>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* ── FILE PREVIEW ── */}
      {files.length > 0 && (
        <Box sx={{ px: 2, py: 0.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {files.map((f, i) => (
            <Chip key={i} label={f.name} size="small" onDelete={() => setFiles((prev) => prev.filter((_, j) => j !== i))} sx={{ fontSize: 11 }} />
          ))}
        </Box>
      )}

      {/* ── INPUT ── */}
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', px: 2, py: 1,
        bgcolor: '#FFFFFF', borderTop: '1px solid', borderColor: 'divider', gap: 0.75,
        flexShrink: 0,
      }}>
        <Tooltip title="Anexar arquivo">
          <IconButton size="small" component="label" sx={{ width: 36, height: 36, flexShrink: 0, mb: 0.25 }}>
            <AttachFileIcon sx={{ fontSize: 20, color: '#6B7280' }} />
            <input type="file" hidden multiple onChange={(e) => {
              if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
            }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Emoji">
          <IconButton size="small" sx={{ width: 36, height: 36, flexShrink: 0, mb: 0.25 }}>
            <EmojiEmotionsIcon sx={{ fontSize: 20, color: '#6B7280' }} />
          </IconButton>
        </Tooltip>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder={internalNoteMode ? 'Digite uma nota interna...' : 'Digite uma mensagem'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isClosed}
          multiline
          maxRows={3}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: '#F9FAFB',
              fontSize: 14,
              '& fieldset': { borderColor: '#E5E7EB' },
              '&:hover fieldset': { borderColor: '#820AD1' },
              '&.Mui-focused fieldset': { borderColor: '#820AD1', borderWidth: 2 },
            },
          }}
          InputProps={{
            startAdornment: internalNoteMode ? (
              <InputAdornment position="start">
                <Chip label="Nota Interna" size="small" color="warning" onDelete={() => setInternalNoteMode(false)} sx={{ height: 20, fontSize: 10 }} />
              </InputAdornment>
            ) : undefined,
          }}
        />
        <Tooltip title="Nota interna">
          <ToggleButton
            value="note"
            selected={internalNoteMode}
            onChange={() => setInternalNoteMode(!internalNoteMode)}
            size="small"
            sx={{ border: 'none', p: 0.5, borderRadius: 1.5, flexShrink: 0, width: 36, height: 36, mb: 0.25, '&.Mui-selected': { bgcolor: '#FFFBEB' } }}
          >
            <NoteAddIcon sx={{ fontSize: 19, color: internalNoteMode ? '#F59E0B' : '#6B7280' }} />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Mensagem de áudio">
          <IconButton size="small" sx={{ width: 36, height: 36, flexShrink: 0, mb: 0.25 }}>
            <KeyboardVoiceIcon sx={{ fontSize: 20, color: '#6B7280' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Enviar (Enter)">
          <IconButton
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            sx={{
              width: 42, height: 42, flexShrink: 0, mb: 0.25,
              bgcolor: !inputText.trim() || sending ? '#F3F4F6' : '#820AD1',
              color: !inputText.trim() || sending ? '#9CA3AF' : '#FFFFFF',
              '&:hover': { bgcolor: !inputText.trim() || sending ? '#F3F4F6' : '#6E00C7' },
              transition: 'all 0.15s ease',
            }}
          >
            {sending ? <CircularProgress size={18} /> : <SendIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── MORE OPTIONS MENU ── */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <ListItemIcon><PhoneIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Ligar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <ListItemIcon><BlockIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Bloquear cliente</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Arquivar</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── TRANSFER DIALOG ── */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Transferir Conversa</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Departamento</InputLabel>
            <Select value={transferDept} label="Departamento" onChange={(e) => setTransferDept(e.target.value)}>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleTransfer} disabled={!transferDept}>
            Transferir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

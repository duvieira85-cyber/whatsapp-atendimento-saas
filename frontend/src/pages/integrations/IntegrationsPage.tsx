import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Fade,
  Grow,
  Zoom,
  Menu,
  Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  AccessTime as AccessTimeIcon,
  Webhook as WebhookIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import type { Integration } from '../../types';

const providerIcons: Record<string, string> = {
  evolution: '\u{1F9EC}',
  meta_cloud: '\u{1F4AC}',
  twilio: '\u{1F4DE}',
  gupshup: '\u{1F4E8}',
};

const providerLabels: Record<string, string> = {
  evolution: 'Evolution API',
  meta_cloud: 'Meta Cloud API',
  twilio: 'Twilio',
  gupshup: 'Gupshup',
};

type ConnectionPhase =
  | 'never_connected'
  | 'generating'
  | 'awaiting_scan'
  | 'connected'
  | 'disconnected'
  | 'error';

interface EvolutionState {
  phase: ConnectionPhase;
  qrCode: string;
  errorMessage: string;
  connectedInfo: ConnectedInfo | null;
}

interface ConnectedInfo {
  instanceName: string;
  channelId: string;
  connectedAt: string;
  webhookUrl: string;
  phoneNumber?: string;
}

const PHASE_LABELS: Record<ConnectionPhase, string> = {
  never_connected: 'Nunca conectado',
  generating: 'Gerando QR Code',
  awaiting_scan: 'Aguardando leitura',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  error: 'Erro',
};

const PHASE_COLORS: Record<ConnectionPhase, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  never_connected: 'default',
  generating: 'info',
  awaiting_scan: 'warning',
  connected: 'success',
  disconnected: 'default',
  error: 'error',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

interface EvolutionCardProps {
  integration: Integration;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: (integration: Integration) => void;
  onDelete: (integration: Integration) => void;
  onTest: (integration: Integration) => void;
  testingId: string | null;
}

function EvolutionCard({
  integration,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  onTest,
  testingId,
}: EvolutionCardProps) {
  const isActive = integration.status === 'active' || integration.status === 'connected';
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAction = (cb: () => void) => {
    handleMenuClose();
    cb();
  };

  return (
    <Grow in timeout={400}>
      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
          },
          border: '1px solid',
          borderColor: isActive ? 'success.light' : 'divider',
          overflow: 'visible',
        }}
      >
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: isActive ? 'success.light' : 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {providerIcons.evolution}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={600} noWrap>
                  {integration.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {providerLabels.evolution}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              {isActive ? (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                  label="Conectado"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 500, borderRadius: 1.5 }}
                />
              ) : (
                <Chip
                  icon={<LinkOffIcon sx={{ fontSize: 14 }} />}
                  label="Desconectado"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 500, borderRadius: 1.5 }}
                />
              )}
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
                {!isActive && (
                  <MenuItem onClick={() => handleAction(() => onConnect(integration.id))} dense>
                    <LinkIcon sx={{ mr: 1.5, fontSize: 18 }} /> Conectar
                  </MenuItem>
                )}
                <MenuItem onClick={() => handleAction(() => onTest(integration))} dense disabled={testingId === integration.id}>
                  {testingId === integration.id ? <CircularProgress size={16} sx={{ mr: 1.5 }} /> : <PlayArrowIcon sx={{ mr: 1.5, fontSize: 18 }} />}
                  Testar conexão
                </MenuItem>
                <MenuItem onClick={() => handleAction(() => onEdit(integration))} dense>
                  <EditIcon sx={{ mr: 1.5, fontSize: 18 }} /> Editar
                </MenuItem>
                <MenuItem onClick={() => handleAction(() => onDelete(integration))} dense>
                  <DeleteIcon sx={{ mr: 1.5, fontSize: 18 }} /> Excluir
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {isActive && (
            <Fade in timeout={500}>
              <Box
                sx={{
                  mt: 2.5,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {(integration.config?.instance_name as string) || '\u2014'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LanguageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {String(integration.config?.evolution_url || '\u2014')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatDate(integration.last_sync_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WebhookIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="body2" color="success.main" fontWeight={500}>
                      Webhook ativo
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}

          {!isActive && (
            <Box sx={{ mt: 2.5, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<LinkIcon />}
                onClick={() => onConnect(integration.id)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2.5 }}
              >
                Conectar
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grow>
  );
}

function ConnectingCard({
  integration,
  state,
  onRefreshQr,
  onCancel,
}: {
  integration: Integration;
  state: EvolutionState;
  onRefreshQr: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const isGenerating = state.phase === 'generating';
  const isAwaitingScan = state.phase === 'awaiting_scan';
  const isError = state.phase === 'error';

  return (
    <Zoom in timeout={300}>
      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          border: '2px solid',
          borderColor: isError ? 'error.main' : 'primary.main',
          overflow: 'visible',
        }}
      >
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: isError ? 'error.50' : 'primary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              {isAwaitingScan ? '\u{1F4CB}' : isError ? '\u26A0\uFE0F' : '\u{1F9EC}'}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {integration.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {providerLabels.evolution}
              </Typography>
            </Box>
            <Chip
              label={PHASE_LABELS[state.phase]}
              color={PHASE_COLORS[state.phase]}
              size="small"
              sx={{ fontWeight: 500, borderRadius: 1.5 }}
            />
          </Box>

          {isGenerating && (
            <Fade in timeout={300}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Gerando QR Code...
                </Typography>
              </Box>
            </Fade>
          )}

          {isAwaitingScan && state.qrCode && (
            <Fade in timeout={500}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    display: 'inline-block',
                    p: 1.5,
                    bgcolor: 'white',
                    borderRadius: 3,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                  }}
                >
                  <Box
                    component="img"
                    src={state.qrCode}
                    alt="QR Code"
                    sx={{
                      width: 220,
                      height: 220,
                      display: 'block',
                      imageRendering: 'pixelated',
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Escaneie o QR Code com o WhatsApp do número que será usado como atendimento
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <Tooltip title="Atualizar QR Code">
                    <IconButton size="small" onClick={() => onRefreshQr(integration.id)}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ width: '100%', maxWidth: 280, mx: 'auto', mb: 1 }}>
                  <Box
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        animation: 'progress-animation 2s ease-in-out infinite',
                        '@keyframes progress-animation': {
                          '0%': { width: '0%', ml: 0 },
                          '50%': { width: '60%', ml: '20%' },
                          '100%': { width: '0%', ml: '100%' },
                        },
                      }}
                    />
                  </Box>
                </Box>
                <Typography variant="caption" color="text.disabled">
                  Aguardando leitura... O status é verificado automaticamente.
                </Typography>
              </Box>
            </Fade>
          )}

          {isError && (
            <Fade in timeout={300}>
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <ErrorIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
                  {state.errorMessage || 'Erro ao conectar. Tente novamente.'}
                </Typography>
              </Box>
            </Fade>
          )}

          <Box sx={{ mt: 2.5, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => onCancel(integration.id)}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Cancelar
            </Button>
            {isError && (
              <Button
                variant="contained"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => onRefreshQr(integration.id)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Tentar novamente
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
}

interface OtherIntegrationCardProps {
  integration: Integration;
  onEdit: (integration: Integration) => void;
  onDelete: (integration: Integration) => void;
  onTest: (integration: Integration) => void;
  testingId: string | null;
}

function OtherIntegrationCard({ integration, onEdit, onDelete, onTest, testingId }: OtherIntegrationCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAction = (cb: () => void) => {
    handleMenuClose();
    cb();
  };

  return (
    <Card
      sx={{
        mb: 1,
        borderRadius: 2,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1">
              {providerIcons[integration.provider] || '\u{1F4E6}'} {integration.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {providerLabels[integration.provider] || integration.provider}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={
                integration.status === 'active'
                  ? 'Ativo'
                  : integration.status === 'error'
                    ? 'Erro'
                    : 'Inativo'
              }
              color={
                integration.status === 'active'
                  ? 'success'
                  : integration.status === 'error'
                    ? 'error'
                    : 'default'
              }
              size="small"
              sx={{ fontWeight: 500, borderRadius: 1.5 }}
            />
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
              <MenuItem onClick={() => handleAction(() => onTest(integration))} dense disabled={testingId === integration.id}>
                {testingId === integration.id ? <CircularProgress size={16} sx={{ mr: 1.5 }} /> : <PlayArrowIcon sx={{ mr: 1.5, fontSize: 18 }} />}
                Testar conexão
              </MenuItem>
              <MenuItem onClick={() => handleAction(() => onEdit(integration))} dense>
                <EditIcon sx={{ mr: 1.5, fontSize: 18 }} /> Editar
              </MenuItem>
              <MenuItem onClick={() => handleAction(() => onDelete(integration))} dense>
                <DeleteIcon sx={{ mr: 1.5, fontSize: 18 }} /> Excluir
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
};

const defaultFormData = {
  provider: 'evolution' as const,
  name: '',
  evolution_url: '',
  api_key: '',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evolutionStates, setEvolutionStates] = useState<Record<string, EvolutionState>>({});
  const pollIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [dialogError, setDialogError] = useState('');
  const [dialogSaving, setDialogSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const clearPolling = useCallback((id: string) => {
    if (pollIntervals.current[id]) {
      clearInterval(pollIntervals.current[id]);
      delete pollIntervals.current[id];
    }
  }, []);

  const setEvolutionState = useCallback((id: string, updater: EvolutionState | ((prev: EvolutionState) => EvolutionState)) => {
    setEvolutionStates((prev) => ({
      ...prev,
      [id]: typeof updater === 'function' ? updater(prev[id]) : updater,
    }));
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const r = await api.get('/integrations/');
      setIntegrations(r.data.results || r.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
    return () => {
      Object.values(pollIntervals.current).forEach(clearInterval);
    };
  }, [fetchIntegrations]);

  const startPolling = useCallback(
    (integrationId: string, integrationName?: string, integrationWebhookUrl?: string) => {
      clearPolling(integrationId);
      pollIntervals.current[integrationId] = setInterval(async () => {
        try {
          const r = await api.get(`/integrations/${integrationId}/evolution_status/`);
          const status = r.data.connection_status;
          setEvolutionState(integrationId, (prev) => ({
            ...prev,
            phase: status === 'connected' ? 'connected' : status === 'error' ? 'error' : 'awaiting_scan',
          }));
          if (status === 'connected') {
            setEvolutionState(integrationId, (prev) => ({
              ...prev,
              qrCode: '',
              connectedInfo: {
                instanceName: r.data.instance_name || integrationName || '',
                channelId: r.data.channel_id || '',
                connectedAt: r.data.last_sync_at || new Date().toISOString(),
                webhookUrl: integrationWebhookUrl || '',
              },
            }));
            clearPolling(integrationId);
            fetchIntegrations();
          }
        } catch {
          // ignore
        }
      }, 3000);
    },
    [clearPolling, setEvolutionState, fetchIntegrations],
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData });
    setDialogError('');
    setDialogOpen(true);
  };

  const openEditDialog = (integration: Integration) => {
    setEditingId(integration.id);
    setFormData({
      provider: integration.provider as 'evolution',
      name: integration.name,
      evolution_url: (integration.config?.evolution_url as string) || '',
      api_key: (integration.config?.api_key as string) || '',
    });
    setDialogError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setDialogError('');
    setDialogSaving(true);
    try {
      if (editingId) {
        await api.patch(`/integrations/${editingId}/`, {
          provider: formData.provider,
          name: formData.name,
          config: {
            evolution_url: formData.evolution_url,
            api_key: formData.api_key,
          },
        });
        showSnackbar('Integração atualizada com sucesso', 'success');
      } else {
        await api.post('/integrations/', {
          provider: formData.provider,
          name: formData.name,
          config: {
            evolution_url: formData.evolution_url,
            api_key: formData.api_key,
          },
        });
        showSnackbar('Integração criada com sucesso', 'success');
      }
      setDialogOpen(false);
      setFormData({ ...defaultFormData });
      fetchIntegrations();
    } catch (err) {
      console.error('Erro ao salvar integração:', err);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response: { data?: { error?: string } } }).response?.data?.error || 'Erro ao salvar integração')
          : 'Erro ao salvar integração';
      setDialogError(msg);
    } finally {
      setDialogSaving(false);
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    setTestingId(integration.id);
    try {
      const r = await api.post(`/integrations/${integration.id}/test/`);
      showSnackbar(r.data.message || 'Conexão testada com sucesso', 'success');
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response: { data?: { error?: string } } }).response?.data?.error || 'Erro ao testar conexão')
          : 'Erro ao testar conexão';
      showSnackbar(msg, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/integrations/${deleteTarget.id}/`);
      showSnackbar('Integração excluída com sucesso', 'success');
      setDeleteTarget(null);
      fetchIntegrations();
    } catch (err) {
      console.error('Erro ao excluir integração:', err);
      showSnackbar('Erro ao excluir integração', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleConnect = async (integrationId: string) => {
    const existing = evolutionStates[integrationId];
    if (existing && (existing.phase === 'generating' || existing.phase === 'awaiting_scan')) {
      return;
    }
    if (existing && existing.phase === 'connected') {
      return;
    }

    const integ = integrations.find((i) => i.id === integrationId);

    setEvolutionState(integrationId, {
      phase: 'generating',
      qrCode: '',
      errorMessage: '',
      connectedInfo: null,
    });

    try {
      const r = await api.post(`/integrations/${integrationId}/evolution_connect/`);
      const qr = r.data.qr_code || '';
      const status = r.data.connection_status || 'pending';

      if (status === 'connected') {
        setEvolutionState(integrationId, {
          phase: 'connected',
          qrCode: '',
          errorMessage: '',
          connectedInfo: {
            instanceName: r.data.instance_name || '',
            channelId: r.data.channel_id || '',
            connectedAt: r.data.last_sync_at || new Date().toISOString(),
            webhookUrl: integ?.webhook_url || '',
          },
        });
        fetchIntegrations();
      } else if (qr) {
        setEvolutionState(integrationId, {
          phase: 'awaiting_scan',
          qrCode: qr,
          errorMessage: '',
          connectedInfo: null,
        });
        startPolling(integrationId, integ?.name, integ?.webhook_url);
      } else {
        setEvolutionState(integrationId, {
          phase: 'awaiting_scan',
          qrCode: '',
          errorMessage: '',
          connectedInfo: null,
        });
        startPolling(integrationId, integ?.name, integ?.webhook_url);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response: { data: { error?: string } } }).response?.data?.error || 'Erro ao conectar')
          : 'Erro ao conectar';
      setEvolutionState(integrationId, {
        phase: 'error',
        qrCode: '',
        errorMessage: msg,
        connectedInfo: null,
      });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      await api.post(`/integrations/${integrationId}/evolution_disconnect/`);
    } catch {
      // ignore
    }
    clearPolling(integrationId);
    setEvolutionState(integrationId, {
      phase: 'disconnected',
      qrCode: '',
      errorMessage: '',
      connectedInfo: null,
    });
    fetchIntegrations();
  };

  const handleRefreshQr = async (integrationId: string) => {
    setEvolutionState(integrationId, (prev) => ({
      ...prev,
      phase: 'generating',
    }));
    try {
      const r = await api.get(`/integrations/${integrationId}/evolution_qrcode/`);
      const qr = r.data.qr_code || '';
      if (qr) {
        setEvolutionState(integrationId, (prev) => ({
          ...prev,
          phase: 'awaiting_scan',
          qrCode: qr,
          errorMessage: '',
        }));
      } else {
        setEvolutionState(integrationId, (prev) => ({
          ...prev,
          phase: 'awaiting_scan',
        }));
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response: { data: { error?: string } } }).response?.data?.error || 'Erro ao obter QR Code')
          : 'Erro ao obter QR Code';
      setEvolutionState(integrationId, {
        phase: 'disconnected',
        qrCode: '',
        errorMessage: msg,
        connectedInfo: null,
      });
    }
  };

  const handleCancel = (integrationId: string) => {
    clearPolling(integrationId);
    setEvolutionState(integrationId, {
      phase: 'disconnected',
      qrCode: '',
      errorMessage: '',
      connectedInfo: null,
    });
  };

  const evolutionIntegrations = integrations.filter((i) => i.provider === 'evolution');
  const otherIntegrations = integrations.filter((i) => i.provider !== 'evolution');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Integrações
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Conecte e gerencie seus canais de atendimento
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2.5 }}
        >
          Nova Integração
        </Button>
      </Box>

      {evolutionIntegrations.length > 0 && (
        <Box mb={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Evolution API
            </Typography>
            <Chip
              label={`${evolutionIntegrations.length} integração(ões)`}
              size="small"
              variant="outlined"
              sx={{ borderRadius: 1.5 }}
            />
          </Box>

          {evolutionIntegrations.map((integration) => {
            const state = evolutionStates[integration.id];

            if (state && (state.phase === 'generating' || state.phase === 'awaiting_scan' || state.phase === 'error')) {
              return (
                <ConnectingCard
                  key={integration.id}
                  integration={integration}
                  state={state}
                  onRefreshQr={handleRefreshQr}
                  onCancel={handleCancel}
                />
              );
            }

            return (
              <EvolutionCard
                key={integration.id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onEdit={openEditDialog}
                onDelete={setDeleteTarget}
                onTest={handleTestConnection}
                testingId={testingId}
              />
            );
          })}
        </Box>
      )}

      {otherIntegrations.length > 0 && (
        <Box mb={4}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Outras Integrações
          </Typography>
          {otherIntegrations.map((integration) => (
            <OtherIntegrationCard
              key={integration.id}
              integration={integration}
              onEdit={openEditDialog}
              onDelete={setDeleteTarget}
              onTest={handleTestConnection}
              testingId={testingId}
            />
          ))}
        </Box>
      )}

      {integrations.length === 0 && !loading && (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: 'grey.50',
            border: '2px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Box sx={{ fontSize: 48, mb: 2 }}>{'\u{1F4E6}'}</Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhuma integração cadastrada
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Clique em "Nova Integração" para conectar um canal de atendimento.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Nova Integração
          </Button>
        </Paper>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !dialogSaving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? 'Editar Integração' : 'Nova Integração'}</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {dialogError}
            </Alert>
          )}
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Provedor</InputLabel>
            <Select
              value={formData.provider}
              label="Provedor"
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as 'evolution' })}
              disabled={dialogSaving}
            >
              <MenuItem value="evolution">Evolution API</MenuItem>
              <MenuItem value="meta_cloud">Meta Cloud API</MenuItem>
              <MenuItem value="twilio">Twilio</MenuItem>
              <MenuItem value="gupshup">Gupshup</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2 }}
            disabled={dialogSaving}
          />
          {formData.provider === 'evolution' && (
            <>
              <TextField
                fullWidth
                size="small"
                label="URL da Evolution API"
                placeholder="http://evolution:8080"
                value={formData.evolution_url}
                onChange={(e) => setFormData({ ...formData, evolution_url: e.target.value })}
                sx={{ mt: 2 }}
                disabled={dialogSaving}
              />
              <TextField
                fullWidth
                size="small"
                label="API Key"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                sx={{ mt: 2 }}
                disabled={dialogSaving}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={dialogSaving} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.name || dialogSaving}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {dialogSaving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {editingId ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Excluir Integração</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja realmente excluir esta integração?
          </Typography>
          {deleteTarget && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {deleteTarget.name} ({providerLabels[deleteTarget.provider] || deleteTarget.provider})
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {deleting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ borderRadius: 2 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

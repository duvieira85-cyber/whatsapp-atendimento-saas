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
  Slide,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  AccessTime as AccessTimeIcon,
  Webhook as WebhookIcon,
  Warning as WarningIcon,
  Add as AddIcon,
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
  if (!dateStr) return '—';
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

function EvolutionCard({
  integration,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}) {
  const isActive = integration.status === 'active' || integration.status === 'connected';

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
          border: isActive ? '1px solid' : '1px solid',
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
                      {(integration.config?.instance_name as string) || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LanguageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {String(integration.config?.evolution_url || '—')}
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

          <Box sx={{ mt: 2.5, display: 'flex', gap: 1 }}>
            {isActive ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LinkOffIcon />}
                onClick={() => onDisconnect(integration.id)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
              >
                Desconectar
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                startIcon={<LinkIcon />}
                onClick={() => onConnect(integration.id)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                }}
              >
                Conectar
              </Button>
            )}
          </Box>
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

function OtherIntegrationCard({ integration }: { integration: Integration }) {
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
        </Box>
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evolutionStates, setEvolutionStates] = useState<Record<string, EvolutionState>>({});
  const pollIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [formData, setFormData] = useState({
    provider: 'evolution',
    name: '',
    evolution_url: '',
    api_key: '',
  });
  const [createError, setCreateError] = useState('');

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

  const handleCreate = async () => {
    setCreateError('');
    try {
      await api.post('/integrations/', {
        provider: formData.provider,
        name: formData.name,
        config: {
          evolution_url: formData.evolution_url,
          api_key: formData.api_key,
        },
      });
      setDialogOpen(false);
      setCreateError('');
      setFormData({ provider: 'evolution', name: '', evolution_url: '', api_key: '' });
      fetchIntegrations();
    } catch (err) {
      console.error('Erro ao criar integração:', err);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response: { data?: { error?: string } } }).response?.data?.error || 'Erro ao salvar integração')
          : 'Erro ao salvar integração';
      setCreateError(msg);
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

  const isAnyConnecting = Object.values(evolutionStates).some(
    (s) => s.phase === 'generating' || s.phase === 'awaiting_scan',
  );

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
          onClick={() => { setCreateError(''); setDialogOpen(true); }}
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
            <OtherIntegrationCard key={integration.id} integration={integration} />
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
            onClick={() => { setCreateError(''); setDialogOpen(true); }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Nova Integração
          </Button>
        </Paper>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Nova Integração</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {createError}
            </Alert>
          )}
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Provedor</InputLabel>
            <Select
              value={formData.provider}
              label="Provedor"
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
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
              />
              <TextField
                fullWidth
                size="small"
                label="API Key"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!formData.name}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

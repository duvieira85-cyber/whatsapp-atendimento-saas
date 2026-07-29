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
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
} from '@mui/material';
import {
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import type { Integration } from '../../types';

function formatBrazilianPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone;
}

type PageState = 'loading' | 'no_connection' | 'connected';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
};

export default function IntegrationsPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrPhase, setQrPhase] = useState<'generating' | 'awaiting' | 'error'>('generating');
  const [qrError, setQrError] = useState('');

  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const showSnack = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const clearPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  }, []);

  const startPolling = useCallback((id: string) => {
    clearPolling();
    pollInterval.current = setInterval(async () => {
      try {
        const r = await api.get(`/integrations/${id}/evolution_status/`);
        const status = r.data.connection_status;
        if (status === 'connected') {
          clearPolling();
          setQrDialogOpen(false);
          setPageState('connected');
          const r2 = await api.get(`/integrations/${id}/`);
          setPhoneNumber(formatBrazilianPhone(r2.data.connected_number || ''));
          showSnack('WhatsApp conectado com sucesso!', 'success');
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }, [clearPolling]);

  const loadIntegration = useCallback(async () => {
    try {
      const r = await api.get('/integrations/');
      const list = r.data.results || r.data || [];
      const integration = list.find((i: Integration) => i.provider === 'evolution') || list[0];
      if (integration) {
        setIntegrationId(integration.id);
        if (integration.status === 'connected' || integration.status === 'active') {
          setPageState('connected');
          setPhoneNumber(formatBrazilianPhone(integration.connected_number || ''));
        } else {
          setPageState('no_connection');
        }
      } else {
        setPageState('no_connection');
      }
    } catch {
      setPageState('no_connection');
    }
  }, []);

  useEffect(() => {
    loadIntegration();
    return clearPolling;
  }, [loadIntegration, clearPolling]);

  const handleConnect = async () => {
    try {
      const id = integrationId || (await api.post('/integrations/', { name: 'WhatsApp' })).data.id as string;
      if (!id) return;
      if (!integrationId) setIntegrationId(id);

      setQrDialogOpen(true);
      setQrPhase('generating');
      setQrCode(null);
      setQrError('');

      const r = await api.post(`/integrations/${id}/evolution_connect/`);
      const qr = r.data.qr_code || '';
      const status = r.data.connection_status || 'pending';

      if (status === 'connected') {
        setQrDialogOpen(false);
        setPageState('connected');
        setPhoneNumber(formatBrazilianPhone(r.data.connected_number || ''));
        showSnack('WhatsApp conectado com sucesso!', 'success');
        return;
      }

      if (qr) {
        setQrCode(qr);
        setQrPhase('awaiting');
        startPolling(id);
      } else {
        setQrPhase('awaiting');
        startPolling(id);
      }
    } catch {
      setQrPhase('error');
      setQrError('Erro ao conectar. Tente novamente.');
      showSnack('Erro ao conectar WhatsApp.', 'error');
    }
  };

  const handleRefreshQr = async () => {
    if (!integrationId) return;
    setQrPhase('generating');
    try {
      const r = await api.get(`/integrations/${integrationId}/evolution_qrcode/`);
      const qr = r.data.qr_code || '';
      if (qr) {
        setQrCode(qr);
        setQrPhase('awaiting');
      } else {
        setQrPhase('awaiting');
      }
    } catch {
      setQrPhase('error');
      setQrError('Erro ao obter QR Code.');
    }
  };

  const handleCloseQr = () => {
    setQrDialogOpen(false);
    clearPolling();
  };

  const handleOpenDisconnect = () => {
    setDisconnectDialogOpen(true);
  };

  const handleDisconnectConfirm = async () => {
    if (!integrationId) return;
    setDisconnecting(true);
    try {
      await api.post(`/integrations/${integrationId}/evolution_disconnect/`);
      setDisconnectDialogOpen(false);
      setPageState('no_connection');
      setPhoneNumber(null);
      clearPolling();
      showSnack('WhatsApp desconectado com sucesso.', 'success');
    } catch {
      showSnack('Erro ao desconectar WhatsApp.', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            WhatsApp
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Conecte o número utilizado para atender seus clientes.
          </Typography>
        </Box>
      </Box>

      {pageState === 'no_connection' && (
        <Fade in timeout={400}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                maxWidth: 440,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <Box sx={{ fontSize: 64, mb: 2, lineHeight: 1 }}>{'\u{1F4F1}'}</Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                WhatsApp
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2 }}>
                Nenhum número conectado. Conecte um número de WhatsApp para começar a atender seus clientes.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<LinkIcon />}
                onClick={handleConnect}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.2,
                  boxShadow: '0 4px 14px rgba(130, 10, 209, 0.35)',
                  '&:hover': {
                    boxShadow: '0 6px 24px rgba(130, 10, 209, 0.45)',
                  },
                }}
              >
                Conectar WhatsApp
              </Button>
            </Paper>
          </Box>
        </Fade>
      )}

      {pageState === 'connected' && (
        <Fade in timeout={400}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
            <Paper
              elevation={0}
              sx={{
                p: 5,
                textAlign: 'center',
                maxWidth: 440,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'success.light',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  bgcolor: 'success.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
              <Typography variant="h5" fontWeight={700} color="success.main" gutterBottom>
                {'\u{1F7E2} Conectado'}
              </Typography>
              {phoneNumber && (
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                  {phoneNumber}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Seu WhatsApp está conectado e pronto para receber mensagens.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="large"
                startIcon={<LinkOffIcon />}
                onClick={handleOpenDisconnect}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3 }}
              >
                Desconectar WhatsApp
              </Button>
            </Paper>
          </Box>
        </Fade>
      )}

      <Dialog open={qrDialogOpen} onClose={handleCloseQr} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 600, pt: 3 }}>
          Conectar WhatsApp
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          {qrPhase === 'generating' && (
            <Box sx={{ py: 6 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Gerando QR Code...
              </Typography>
            </Box>
          )}

          {qrPhase === 'awaiting' && qrCode && (
            <Box>
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
                  src={qrCode}
                  alt="QR Code"
                  sx={{ width: 220, height: 220, display: 'block' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Escaneie este QR Code utilizando o aplicativo WhatsApp.
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                Aguardando conexão...
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCloseQr}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Cancelar
                </Button>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshQr}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Atualizar QR Code
                </Button>
              </Box>
            </Box>
          )}

          {qrPhase === 'awaiting' && !qrCode && (
            <Box sx={{ py: 4 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Aguardando QR Code...
              </Typography>
            </Box>
          )}

          {qrPhase === 'error' && (
            <Box sx={{ py: 4 }}>
              <Box sx={{ fontSize: 48, mb: 1 }}>{'\u26A0\uFE0F'}</Box>
              <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
                {qrError || 'Erro ao conectar. Tente novamente.'}
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleRefreshQr}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Tentar novamente
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Desconectar WhatsApp</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Deseja realmente desconectar o WhatsApp? Esta ação encerrará a sessão atual.
          </Typography>
          {phoneNumber && (
            <Typography variant="body2" fontWeight={500} sx={{ mt: 1.5 }}>
              {phoneNumber}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setDisconnectDialogOpen(false)}
            disabled={disconnecting}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDisconnectConfirm}
            disabled={disconnecting}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {disconnecting ? <CircularProgress size={20} /> : 'Desconectar'}
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

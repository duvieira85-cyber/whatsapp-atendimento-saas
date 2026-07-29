import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { changePassword } from '../../services/auth';

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As novas senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword });
      setSuccess('Senha alterada com sucesso!');
      setTimeout(() => { onClose(); reset(); }, 1500);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs || 'Erro ao alterar senha.');
      } else {
        setError('Erro ao alterar senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    setError('');
    setSuccess('');
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock fontSize="small" /> Redefinir Senha
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              fullWidth size="small" label="Senha atual" type={showOld ? 'text' : 'password'}
              value={oldPassword} onChange={e => setOldPassword(e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowOld(!showOld)} edge="end">
                    {showOld ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>,
              }}
            />
            <TextField
              fullWidth size="small" label="Nova senha" type={showNew ? 'text' : 'password'}
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowNew(!showNew)} edge="end">
                    {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>,
              }}
            />
            <TextField
              fullWidth size="small" label="Confirmar nova senha" type={showConfirm ? 'text' : 'password'}
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowConfirm(!showConfirm)} edge="end">
                    {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'A salvar...' : 'Alterar Senha'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}
        message={success} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  );
}

export default function SettingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Box>
      <Typography variant="h5" mb={3}>Configurações</Typography>

      <Paper sx={{ p: 3, maxWidth: 600, mb: 3 }}>
        <Typography variant="h6" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock fontSize="small" /> Segurança
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Altere a sua senha de acesso ao sistema.
        </Typography>
        <Button variant="outlined" onClick={() => setDialogOpen(true)}>
          Redefinir Senha
        </Button>
      </Paper>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h6" mb={2}>Empresa</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Nome da empresa" size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Telefone WhatsApp" size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="E-mail" size="small" />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained">Salvar</Button>
          </Grid>
        </Grid>
      </Paper>

      <ChangePasswordDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}

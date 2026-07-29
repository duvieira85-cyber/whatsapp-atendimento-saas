import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  FormGroup,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Tooltip,
  Alert,
  Snackbar,
  Slide,
  Grow,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
  SwapHoriz as SwapHorizIcon,
  Badge as BadgeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import type { User, Department } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  attendant: 'Atendente',
};

const roleColors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  super_admin: 'error',
  admin: 'warning',
  supervisor: 'info',
  attendant: 'default',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '', password: '', first_name: '', last_name: '',
    role: 'attendant', is_active: true,
  });
  const [createDepts, setCreateDepts] = useState<Set<string>>(new Set());
  const [departmentList, setDepartmentList] = useState<Department[]>([]);
  const [userDepts, setUserDepts] = useState<Record<string, { name: string; color: string }[]>>({});
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const fetchUsers = useCallback(() => {
    Promise.all([
      api.get('/auth/users/'),
      api.get('/departments/', { params: { is_active: true } }),
      api.get('/departments/members/'),
    ]).then(([usersRes, deptsRes, membersRes]) => {
      setUsers(usersRes.data.results);
      const depts = Array.isArray(deptsRes.data) ? deptsRes.data : deptsRes.data.results || [];
      const members = Array.isArray(membersRes.data) ? membersRes.data : membersRes.data.results || [];
      const deptMap: Record<string, { name: string; color: string }> = {};
      for (const d of depts) deptMap[d.id] = d;
      const userDeptMap: Record<string, { name: string; color: string }[]> = {};
      for (const m of members) {
        const dept = deptMap[m.department];
        if (dept) {
          if (!userDeptMap[m.user]) userDeptMap[m.user] = [];
          userDeptMap[m.user].push(dept);
        }
      }
      setUserDepts(userDeptMap);
      setDepartmentList(depts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const selectedUsers = useMemo(
    () => users.filter((u) => selected.has(u.id)),
    [users, selected],
  );

  const allSelected = users.length > 0 && selected.size === users.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleOpenDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const protectedUsers = useMemo(() => {
    const protectedSet = new Set<number>();
    if (!currentUser) return protectedSet;
    for (const u of selectedUsers) {
      if (u.id === currentUser.id) {
        protectedSet.add(u.id);
      }
    }
    return protectedSet;
  }, [selectedUsers, currentUser]);

  const handleConfirmDelete = async () => {
    if (selectedUsers.length === 0) return;
    setDeleting(true);
    const results = await Promise.allSettled(
      selectedUsers.map((u) => api.delete(`/auth/users/${u.id}/`)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    setDeleteDialogOpen(false);
    setSelected(new Set());
    fetchUsers();

    if (failed === 0) {
      setSnackbar({ open: true, message: `${succeeded} usuário(s) excluído(s) com sucesso.`, severity: 'success' });
    } else if (succeeded > 0) {
      setSnackbar({ open: true, message: `${succeeded} excluído(s), ${failed} falha(s).`, severity: 'error' });
    } else {
      setSnackbar({ open: true, message: 'Não foi possível excluir os usuários selecionados.', severity: 'error' });
    }
    setDeleting(false);
  };

  const allActive = selectedUsers.length > 0 && selectedUsers.every((u) => u.is_active);

  const handleBatchToggle = async () => {
    const value = !allActive;
    const label = value ? 'ativado(s)' : 'desativado(s)';
    setBatchProcessing(true);
    await Promise.allSettled(
      selectedUsers.map((u) => api.patch(`/auth/users/${u.id}/`, { is_active: value })),
    );
    setSelected(new Set());
    fetchUsers();
    setBatchProcessing(false);
    setSnackbar({ open: true, message: `${selectedUsers.length} usuário(s) ${label}.`, severity: 'success' });
  };

  const handleOpenDeptDialog = async () => {
    try {
      const r = await api.get('/departments/', { params: { is_active: true } });
      const data = Array.isArray(r.data) ? r.data : r.data.results || [];
      setDepartmentList(data);
      setSelectedDepts(new Set());
      setDeptDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: 'Erro ao carregar departamentos.', severity: 'error' });
    }
  };

  const handleDeptToggle = (id: string) => {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleConfirmDeptChange = async () => {
    setBatchProcessing(true);
    for (const u of selectedUsers) {
      try {
        const existing = await api.get('/departments/members/', { params: { user: u.id } });
        const existingData = Array.isArray(existing.data) ? existing.data : existing.data.results || [];
        for (const mem of existingData) {
          await api.delete(`/departments/members/${mem.id}/`);
        }
      } catch { /* skip */ }
      for (const deptId of selectedDepts) {
        try {
          await api.post('/departments/members/', { user: u.id, department: deptId });
        } catch { /* skip duplicates */ }
      }
    }
    setDeptDialogOpen(false);
    setSelected(new Set());
    fetchUsers();
    setBatchProcessing(false);
    setSnackbar({ open: true, message: `Departamento(s) atualizado(s) para ${selectedUsers.length} usuário(s).`, severity: 'success' });
  };

  const handleOpenRoleDialog = () => {
    setSelectedRole('');
    setRoleDialogOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedRole) return;
    setBatchProcessing(true);
    await Promise.allSettled(
      selectedUsers.map((u) => api.patch(`/auth/users/${u.id}/`, { role: selectedRole })),
    );
    setRoleDialogOpen(false);
    setSelected(new Set());
    fetchUsers();
    setBatchProcessing(false);
    setSnackbar({ open: true, message: `Função alterada para ${selectedUsers.length} usuário(s).`, severity: 'success' });
  };

  const handleOpenCreate = async () => {
    setCreateForm({ username: '', password: '', first_name: '', last_name: '', role: 'attendant', is_active: true });
    setCreateDepts(new Set());
    setShowPassword(false);
    try {
      const r = await api.get('/departments/', { params: { is_active: true } });
      const data = Array.isArray(r.data) ? r.data : r.data.results || [];
      setDepartmentList(data);
    } catch { /* ignore */ }
    setCreateDialogOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateDialogOpen(false);
  };

  const handleCreateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleCreateUser = async () => {
    if (!createForm.password.trim()) {
      setSnackbar({ open: true, message: 'Senha é obrigatória.', severity: 'error' });
      return;
    }
    setCreating(true);
    try {
      const created = await api.post('/auth/users/', createForm);
      const userId = created.data.id;
      for (const deptId of createDepts) {
        try {
          await api.post('/departments/members/', { user: userId, department: deptId });
        } catch { /* skip duplicates */ }
      }
      setCreateDialogOpen(false);
      fetchUsers();
      setSnackbar({ open: true, message: 'Usuário criado com sucesso.', severity: 'success' });
    } catch (err: unknown) {
      let msg = 'Erro ao criar usuário.';
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response: { data?: Record<string, string | string[]> } }).response?.data;
        if (data) {
          const firstKey = Object.keys(data)[0];
          const val = data[firstKey];
          msg = Array.isArray(val) ? val[0] : val;
        }
      }
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Usuários</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          Novo Usuário
        </Button>
      </Box>

      {selected.size > 0 && (
        <Slide direction="down" in mountOnEnter unmountOnExit>
          <Paper sx={{ mb: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>
              {selected.size} selecionado(s)
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Button size="small" startIcon={allActive ? <ToggleOffIcon /> : <ToggleOnIcon />} onClick={handleBatchToggle} disabled={batchProcessing} sx={{ borderRadius: 2, textTransform: 'none' }}>
              {allActive ? 'Desativar' : 'Ativar'}
            </Button>
            <Button size="small" startIcon={<SwapHorizIcon />} onClick={handleOpenDeptDialog} disabled={batchProcessing} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Alterar Departamento
            </Button>
            <Button size="small" startIcon={<BadgeIcon />} onClick={handleOpenRoleDialog} disabled={batchProcessing} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Alterar Função
            </Button>
            <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={handleOpenDelete} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Excluir
            </Button>
          </Paper>
        </Slide>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox checked={allSelected} indeterminate={selected.size > 0 && !allSelected} onChange={handleSelectAll} />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Login</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Departamento(s)</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Função</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ativo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <Grow key={user.id} in timeout={200}>
                <TableRow hover selected={selected.has(user.id)} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(user.id)} onChange={() => handleSelectOne(user.id)} />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={500}>
                      {user.first_name} {user.last_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {user.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {userDepts[user.id]?.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {userDepts[user.id].slice(0, 2).map((d) => (
                          <Chip key={d.name} label={d.name} size="small" sx={{ fontWeight: 500, borderRadius: 1.5, bgcolor: d.color || '#1976d2', color: '#fff' }} />
                        ))}
                        {userDepts[user.id].length > 2 && (
                          <Tooltip
                            title={
                              <Box>
                                {userDepts[user.id].map((d) => <Typography key={d.name} variant="body2">{d.name}</Typography>)}
                              </Box>
                            }
                          >
                            <Chip label={`+${userDepts[user.id].length - 2}`} size="small" variant="outlined" sx={{ fontWeight: 500, borderRadius: 1.5 }} />
                          </Tooltip>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={roleLabels[user.role] || user.role} color={roleColors[user.role]} size="small" sx={{ fontWeight: 500, borderRadius: 1.5 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={user.is_active ? 'Ativo' : 'Inativo'} color={user.is_active ? 'success' : 'default'} size="small" sx={{ fontWeight: 500, borderRadius: 1.5 }} />
                  </TableCell>
                </TableRow>
              </Grow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createDialogOpen} onClose={handleCloseCreate} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Novo Usuário</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Nome" value={createForm.first_name} onChange={handleCreateField('first_name')} sx={{ mt: 1 }} autoComplete="off" />
          <TextField fullWidth size="small" label="Sobrenome" value={createForm.last_name} onChange={handleCreateField('last_name')} sx={{ mt: 2 }} autoComplete="off" />
          <TextField fullWidth size="small" label="Login" value={createForm.username} onChange={handleCreateField('username')} sx={{ mt: 2 }} required autoComplete="off" />
          <TextField fullWidth size="small" label="Senha" type={showPassword ? 'text' : 'password'} value={createForm.password} onChange={handleCreateField('password')} sx={{ mt: 2 }} required autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword((s) => !s)} edge="end">
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField fullWidth size="small" label="Função" select value={createForm.role} onChange={handleCreateField('role')} sx={{ mt: 2 }} autoComplete="off">
            <MenuItem value="attendant">Atendente</MenuItem>
            <MenuItem value="supervisor">Supervisor</MenuItem>
            <MenuItem value="admin">Administrador</MenuItem>
            <MenuItem value="super_admin">Super Admin</MenuItem>
          </TextField>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Departamento(s)</Typography>
            {departmentList.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Nenhum departamento ativo disponível.</Typography>
            ) : (
              <FormGroup>
                {departmentList.map((dept) => (
                  <FormControlLabel
                    key={dept.id}
                    control={<Checkbox checked={createDepts.has(dept.id)} onChange={() => {
                      setCreateDepts((prev) => {
                        const next = new Set(prev);
                        if (next.has(dept.id)) next.delete(dept.id);
                        else next.add(dept.id);
                        return next;
                      });
                    }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dept.color || '#1976d2' }} />
                        <Typography variant="body2">{dept.name}</Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            )}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Status</Typography>
            <RadioGroup row value={String(createForm.is_active)} onChange={(e) => setCreateForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}>
              <FormControlLabel value="true" control={<Radio />} label="Ativo" />
              <FormControlLabel value="false" control={<Radio />} label="Inativo" />
            </RadioGroup>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseCreate} disabled={creating} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleCreateUser} disabled={creating} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {creating ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deptDialogOpen} onClose={() => setDeptDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Alterar Departamento</DialogTitle>
        <DialogContent>
          {departmentList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nenhum departamento ativo disponível.</Typography>
          ) : (
            <FormGroup>
              {departmentList.map((dept) => (
                <FormControlLabel
                  key={dept.id}
                  control={<Checkbox checked={selectedDepts.has(dept.id)} onChange={() => handleDeptToggle(dept.id)} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dept.color || '#1976d2' }} />
                      <Typography variant="body2">{dept.name}</Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeptDialogOpen(false)} disabled={batchProcessing} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmDeptChange} disabled={batchProcessing || selectedDepts.size === 0} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {batchProcessing ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Alterar Função</DialogTitle>
        <DialogContent>
          <FormLabel sx={{ mb: 1, display: 'block' }}>Nova função para {selectedUsers.length} usuário(s):</FormLabel>
          <RadioGroup value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            {(['attendant', 'supervisor', 'admin', 'super_admin'] as const).map((role) => (
              <FormControlLabel key={role} value={role} control={<Radio />} label={roleLabels[role]} />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setRoleDialogOpen(false)} disabled={batchProcessing} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmRoleChange} disabled={batchProcessing || !selectedRole} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {batchProcessing ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <DeleteOutline sx={{ fontSize: 64, color: 'error.main', bgcolor: 'error.light', borderRadius: '50%', p: 1.5, opacity: 0.9 }} />
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>Excluir Usuários</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Você está prestes a excluir {selectedUsers.length} usuário(s).
          </Typography>
          {selectedUsers.length > 0 && (
            <Box sx={{ textAlign: 'left', bgcolor: 'grey.50', borderRadius: 2, p: 1.5, maxHeight: 180, overflow: 'auto' }}>
              {selectedUsers.map((u) => (
                <Typography key={u.id} variant="body2" sx={{ py: 0.25 }}>
                  • {u.first_name} {u.last_name} ({u.email})
                </Typography>
              ))}
            </Box>
          )}
          {protectedUsers.size > 0 && (
            <Alert severity="warning" sx={{ mt: 2, textAlign: 'left', borderRadius: 2 }}>
              {Array.from(protectedUsers).map((id) => {
                const u = users.find((x) => x.id === id);
                if (!u) return null;
                return <div key={id}>• {u.first_name} {u.last_name} — Você não pode excluir a si mesmo.</div>;
              })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={handleCancelDelete} disabled={deleting} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting || selectedUsers.length === 0} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {deleting ? <CircularProgress size={20} sx={{ color: 'common.white' }} /> : 'Excluir Usuários'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

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
  Switch,
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
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LockReset as LockResetIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Forum as ForumIcon,
  Lock as LockIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { adminResetPassword } from '../../services/auth';
import type { User, Department } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const roleLabels: Record<string, string> = {
  super_admin: 'Administrador',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  attendant: 'Atendente',
};

const roleColors: Record<string, 'primary' | 'info' | 'default'> = {
  super_admin: 'primary',
  admin: 'primary',
  supervisor: 'info',
  attendant: 'info',
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
  const [userDepts, setUserDepts] = useState<Record<string, { id: string; name: string; color: string }[]>>({});
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', username: '', role: 'attendant', is_active: true });
  const [editDepts, setEditDepts] = useState<Set<string>>(new Set());
  const [editSaving, setEditSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetForm, setResetForm] = useState({ new_password: '', confirm_password: '' });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
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
      const deptMap: Record<string, { id: string; name: string; color: string }> = {};
      for (const d of depts) deptMap[d.id] = d;
      const userDeptMap: Record<string, { id: string; name: string; color: string }[]> = {};
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

  const handleOpenEdit = (user: User) => {
    setEditTarget(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
    });
    setEditDepts(new Set(userDepts[user.id]?.map((d) => d.id) ?? []));
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditTarget(null);
  };

  const handleEditField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (editForm.role === 'attendant' && editDepts.size === 0) {
      setSnackbar({ open: true, message: 'Atendente deve ter pelo menos um departamento.', severity: 'error' });
      return;
    }
    setEditSaving(true);
    try {
      await api.patch(`/auth/users/${editTarget.id}/`, editForm);
      const currentDeptIds = new Set(userDepts[editTarget.id]?.map((d) => d.id) ?? []);
      const toAdd = [...editDepts].filter((id) => !currentDeptIds.has(id));
      const toRemove = [...currentDeptIds].filter((id) => !editDepts.has(id));
      if (toRemove.length > 0 || toAdd.length > 0) {
        const membersRes = await api.get('/departments/members/', { params: { user: editTarget.id } });
        const existingMembers = Array.isArray(membersRes.data) ? membersRes.data : membersRes.data.results || [];
        for (const mem of existingMembers) {
          if (toRemove.includes(mem.department)) {
            await api.delete(`/departments/members/${mem.id}/`);
          }
        }
        for (const deptId of toAdd) {
          await api.post('/departments/members/', { user: editTarget.id, department: deptId });
        }
      }
      setEditDialogOpen(false);
      setEditTarget(null);
      fetchUsers();
      setSnackbar({ open: true, message: 'Usuário atualizado com sucesso.', severity: 'success' });
    } catch (err: unknown) {
      let msg = 'Erro ao atualizar usuário.';
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
      setEditSaving(false);
    }
  };

  const handleOpenReset = (user: User) => {
    setResetTarget(user);
    setResetForm({ new_password: '', confirm_password: '' });
    setShowResetPassword(false);
    setShowResetConfirm(false);
    setResetDialogOpen(true);
  };

  const handleCloseReset = () => {
    setResetDialogOpen(false);
    setResetTarget(null);
  };

  const handleResetSubmit = async () => {
    if (!resetTarget) return;
    if (!resetForm.new_password || !resetForm.confirm_password) {
      setSnackbar({ open: true, message: 'Preencha todos os campos.', severity: 'error' });
      return;
    }
    if (resetForm.new_password !== resetForm.confirm_password) {
      setSnackbar({ open: true, message: 'As senhas não coincidem.', severity: 'error' });
      return;
    }
    if (resetForm.new_password.length < 6) {
      setSnackbar({ open: true, message: 'A senha deve ter no mínimo 6 caracteres.', severity: 'error' });
      return;
    }
    setResetSaving(true);
    try {
      await adminResetPassword(resetTarget.id, resetForm);
      setResetDialogOpen(false);
      setResetTarget(null);
      setSnackbar({ open: true, message: 'Senha redefinida com sucesso.', severity: 'success' });
    } catch (err: unknown) {
      let msg = 'Erro ao redefinir senha.';
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
      setResetSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Usuários
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Gerencie administradores e atendentes da sua empresa.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            size="large"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.2,
              boxShadow: '0 4px 14px rgba(130, 10, 209, 0.35)',
              '&:hover': {
                boxShadow: '0 6px 24px rgba(130, 10, 209, 0.45)',
              },
            }}
          >
            Novo Usuário
          </Button>
        </Box>
      </Box>

      {selected.size > 0 && (
        <Slide direction="down" in mountOnEnter unmountOnExit>
          <Paper sx={{ mb: 3, p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>
              {selected.size} selecionado(s)
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Button size="small" startIcon={allActive ? <ToggleOffIcon /> : <ToggleOnIcon />} onClick={handleBatchToggle} disabled={batchProcessing} sx={{ borderRadius: 2, textTransform: 'none' }}>
              {allActive ? 'Desativar' : 'Ativar'}
            </Button>
            <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={handleOpenDelete} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Excluir
            </Button>
          </Paper>
        </Slide>
      )}

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <TableContainer component={Paper} elevation={0} sx={{ boxShadow: 'none', borderRadius: 0 }}>
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
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <Grow key={user.id} in timeout={200}>
                  <TableRow
                    hover
                    selected={selected.has(user.id)}
                    sx={{
                      '&:last-child td': { border: 0 },
                      '& td': { py: 1.5 },
                      '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.03)' },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(130, 10, 209, 0.06)',
                        '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.09)' },
                      },
                    }}
                  >
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
                            <Chip key={d.name} label={d.name} size="small" sx={{ fontWeight: 500, borderRadius: 1.5, bgcolor: d.color || '#820AD1', color: '#fff', height: 24, '& .MuiChip-label': { px: 1 } }} />
                          ))}
                          {userDepts[user.id].length > 2 && (
                            <Tooltip
                              title={
                                <Box>
                                  {userDepts[user.id].map((d) => <Typography key={d.name} variant="body2">{d.name}</Typography>)}
                                </Box>
                              }
                            >
                              <Chip label={`+${userDepts[user.id].length - 2}`} size="small" variant="outlined" sx={{ fontWeight: 500, borderRadius: 1.5, height: 24, '& .MuiChip-label': { px: 1 } }} />
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
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </Grow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
            <MenuItem value="admin">Administrador</MenuItem>
            <MenuItem value="attendant">Atendente</MenuItem>
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

      <Dialog open={editDialogOpen} onClose={handleCloseEdit} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Editar Usuário</DialogTitle>
        <DialogContent>
          {/* Dados do Usuário */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 2 }}>
            <PersonIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={600} color="primary.main">Dados do Usuário</Typography>
          </Box>
          <TextField fullWidth size="small" label="Nome Completo" value={`${editForm.first_name} ${editForm.last_name}`.trim()}
            onChange={e => {
              const parts = e.target.value.trim().split(' ');
              setEditForm(f => ({ ...f, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' }));
            }} sx={{ mb: 2 }} autoComplete="off" />
          <TextField fullWidth size="small" label="Login" value={editForm.username} onChange={handleEditField('username')} required autoComplete="off" />

          <Divider sx={{ my: 2.5 }} />

          {/* Perfil de acesso */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AdminPanelSettingsIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={600} color="primary.main">Perfil de acesso</Typography>
          </Box>
          <TextField fullWidth size="small" label="Função" select value={editForm.role} onChange={handleEditField('role')} sx={{ mb: 0.5 }} autoComplete="off">
            <MenuItem value="admin">Administrador</MenuItem>
            <MenuItem value="attendant">Atendente</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Define o nível de acesso deste usuário dentro do sistema.
          </Typography>

          {/* Atendimento */}
          {editForm.role !== 'super_admin' && (
            <Box sx={{ mt: 2.5 }}>
              <Divider sx={{ mb: 2.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ForumIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600} color="primary.main">Atendimento</Typography>
              </Box>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                  Departamentos de Atendimento
                </Typography>
                {departmentList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Nenhum departamento ativo disponível.</Typography>
                ) : (
                  <FormGroup>
                    {departmentList.map((dept) => (
                      <FormControlLabel
                        key={dept.id}
                        control={<Checkbox size="small" checked={editDepts.has(dept.id)} onChange={() => {
                          setEditDepts((prev) => {
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  Este usuário receberá conversas destes departamentos.
                </Typography>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 2.5 }} />

          {/* Segurança */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LockIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={600} color="primary.main">Segurança</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Gerencie a senha deste usuário.
          </Typography>
          <Button variant="outlined" startIcon={<LockResetIcon />} onClick={() => editTarget && handleOpenReset(editTarget)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Redefinir Senha
          </Button>

          <Divider sx={{ my: 2.5 }} />

          {/* Conta */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SettingsIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={600} color="primary.main">Conta</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Switch checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} />
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {editForm.is_active ? 'Usuário ativo' : 'Usuário inativo'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {editForm.is_active ? 'Pode acessar o sistema normalmente.' : 'Não pode acessar o sistema.'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseEdit} disabled={editSaving} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={editSaving} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {editSaving ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetDialogOpen} onClose={handleCloseReset} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockResetIcon fontSize="small" /> Redefinir Senha
        </DialogTitle>
        <DialogContent>
          {resetTarget && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Redefinir senha de <strong>{resetTarget.first_name} {resetTarget.last_name}</strong> ({resetTarget.username})
            </Typography>
          )}
          <TextField fullWidth size="small" label="Nova senha" type={showResetPassword ? 'text' : 'password'}
            value={resetForm.new_password} onChange={e => setResetForm(f => ({ ...f, new_password: e.target.value }))}
            sx={{ mt: 1 }} autoComplete="new-password"
            InputProps={{
              endAdornment: <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowResetPassword(s => !s)} edge="end">
                  {showResetPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>,
            }}
          />
          <TextField fullWidth size="small" label="Confirmar nova senha" type={showResetConfirm ? 'text' : 'password'}
            value={resetForm.confirm_password} onChange={e => setResetForm(f => ({ ...f, confirm_password: e.target.value }))}
            sx={{ mt: 2 }} autoComplete="new-password"
            InputProps={{
              endAdornment: <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowResetConfirm(s => !s)} edge="end">
                  {showResetConfirm ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>,
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseReset} disabled={resetSaving} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleResetSubmit} disabled={resetSaving} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {resetSaving ? <CircularProgress size={20} /> : 'Redefinir'}
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

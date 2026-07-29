import { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Alert,
  Snackbar,
  Slide,
  Grow,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteOutline,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import type { Department } from '../../types';

interface DepartmentForm {
  name: string;
  description: string;
  order: number;
}

const emptyForm: DepartmentForm = { name: '', description: '', order: 0 };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DepartmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const r = await api.get('/departments/');
      const data = r.data;
      setDepartments(Array.isArray(data) ? data : data.results || []);
    } catch {
      setSnackbar({ open: true, message: 'Erro ao carregar departamentos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const selectedDepts = useMemo(
    () => departments.filter((d) => selected.has(d.id)),
    [departments, selected],
  );

  const allSelected = departments.length > 0 && selected.size === departments.length;
  const allActive = selectedDepts.length > 0 && selectedDepts.every((d) => d.is_active);

  const handleSelectAll = () => {
    if (allSelected) { setSelected(new Set()); }
    else { setSelected(new Set(departments.map((d) => d.id))); }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelected(next);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingId(dept.id);
    setForm({
      name: dept.name,
      description: dept.description || '',
      order: dept.order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: 'Nome é obrigatório', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/departments/${editingId}/`, form);
        setSnackbar({ open: true, message: 'Departamento atualizado', severity: 'success' });
      } else {
        await api.post('/departments/', form);
        setSnackbar({ open: true, message: 'Departamento criado', severity: 'success' });
      }
      handleClose();
      fetchDepartments();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response: { data?: { name?: string[] | string; detail?: string } } }).response?.data?.name?.[0] ||
              (err as { response: { data?: { name?: string[] | string; detail?: string } } }).response?.data?.detail ||
              'Erro ao salvar')
          : 'Erro ao salvar';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      await api.patch(`/departments/${dept.id}/`, { is_active: !dept.is_active });
      setSnackbar({
        open: true, message: dept.is_active ? 'Departamento desativado' : 'Departamento ativado', severity: 'success',
      });
      fetchDepartments();
    } catch {
      setSnackbar({ open: true, message: 'Erro ao alterar status', severity: 'error' });
    }
  };

  const handleBatchToggle = async () => {
    const value = !allActive;
    const label = value ? 'ativado(s)' : 'desativado(s)';
    setBatchProcessing(true);
    await Promise.allSettled(
      selectedDepts.map((d) => api.patch(`/departments/${d.id}/`, { is_active: value })),
    );
    setSelected(new Set());
    fetchDepartments();
    setBatchProcessing(false);
    setSnackbar({ open: true, message: `${selectedDepts.length} departamento(s) ${label}.`, severity: 'success' });
  };

  const handleDelete = (dept: Department) => {
    setSelected(new Set([dept.id]));
    setDeleteDialogOpen(true);
  };

  const handleOpenDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    const results = await Promise.allSettled(
      selectedDepts.map((d) => api.delete(`/departments/${d.id}/`)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    setDeleteDialogOpen(false);
    setSelected(new Set());
    fetchDepartments();
    if (failed === 0) {
      setSnackbar({ open: true, message: `${succeeded} departamento(s) excluído(s).`, severity: 'success' });
    } else if (succeeded > 0) {
      setSnackbar({ open: true, message: `${succeeded} excluído(s), ${failed} falha(s).`, severity: 'error' });
    } else {
      setSnackbar({ open: true, message: 'Não foi possível excluir os departamentos selecionados.', severity: 'error' });
    }
    setDeleting(false);
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Departamentos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Gerencie os setores de atendimento da sua empresa.
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
            Novo Departamento
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
            <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={handleOpenDelete} disabled={batchProcessing} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Excluir
            </Button>
          </Paper>
        </Slide>
      )}

      {departments.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: 'grey.50', border: '2px dashed', borderColor: 'grey.300' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>Nenhum departamento cadastrado</Typography>
          <Typography variant="body2" color="text.secondary">
            Clique em "Novo Departamento" para criar o primeiro setor de atendimento.
          </Typography>
        </Paper>
      ) : (
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
                  <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Membros</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ordem</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {departments.map((dept) => (
                  <Grow key={dept.id} in timeout={200}>
                    <TableRow
                      hover
                      selected={selected.has(dept.id)}
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
                        <Checkbox checked={selected.has(dept.id)} onChange={() => handleSelectOne(dept.id)} />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={500}>{dept.name}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dept.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={dept.member_count ?? 0} size="small" color="primary" variant="outlined" sx={{ fontWeight: 500, borderRadius: 1.5 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{dept.order}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={dept.is_active ? 'Ativo' : 'Inativo'} color={dept.is_active ? 'success' : 'default'} size="small" sx={{ fontWeight: 500, borderRadius: 1.5 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title={dept.is_active ? 'Desativar' : 'Ativar'}>
                            <IconButton size="small" onClick={() => handleToggleActive(dept)}>
                              {dept.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenEdit(dept)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" color="error" onClick={() => handleDelete(dept)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </Grow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1 }} required />
          <TextField fullWidth size="small" label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} sx={{ mt: 2 }} multiline rows={2} />
          <TextField fullWidth size="small" label="Posição" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleClose} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || saving} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {saving ? <CircularProgress size={20} /> : editingId ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <DeleteOutline sx={{ fontSize: 64, color: 'error.main', bgcolor: 'error.light', borderRadius: '50%', p: 1.5, opacity: 0.9 }} />
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>Excluir Departamentos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Você está prestes a excluir {selectedDepts.length} departamento(s).
          </Typography>
          {selectedDepts.length > 0 && (
            <Box sx={{ textAlign: 'left', bgcolor: 'grey.50', borderRadius: 2, p: 1.5, maxHeight: 180, overflow: 'auto' }}>
              {selectedDepts.map((d) => (
                <Typography key={d.id} variant="body2" sx={{ py: 0.25 }}>• {d.name}</Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={handleCancelDelete} disabled={deleting} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting || selectedDepts.length === 0} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {deleting ? <CircularProgress size={20} sx={{ color: 'common.white' }} /> : 'Excluir Departamentos'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

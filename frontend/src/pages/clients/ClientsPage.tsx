import { useState, useEffect } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api';
import type { Client } from '../../types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params: Record<string, unknown> = {};
    if (search) params.search = search;
    api.get('/clients/', { params }).then((r) => {
      setClients(r.data.results);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search]);

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Clientes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Gerencie os contatos da sua empresa.
          </Typography>
        </Box>
      </Box>

      <TextField
        size="small"
        placeholder="Buscar clientes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, width: 300 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
        }}
      />

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
                <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Telefone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>E-mail</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Bloqueado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cadastro</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  hover
                  sx={{
                    '&:last-child td': { border: 0 },
                    '& td': { py: 1.5 },
                    '&:hover': { bgcolor: 'rgba(130, 10, 209, 0.03)' },
                  }}
                >
                  <TableCell>
                    <Typography fontWeight={500}>{client.name}</Typography>
                  </TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.email || '-'}</TableCell>
                  <TableCell>
                    {client.tags?.map((tag) => (
                      <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, fontWeight: 500, borderRadius: 1.5 }} />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={client.is_blocked ? 'Sim' : 'Não'}
                      color={client.is_blocked ? 'error' : 'success'}
                      size="small"
                      sx={{ fontWeight: 500, borderRadius: 1.5 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

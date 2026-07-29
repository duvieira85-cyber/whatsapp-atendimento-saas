import { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import PendingIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import api from '../../services/api';
import type { DashboardSummary } from '../../types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary/').then((r) => {
      setSummary(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  const cards = [
    { label: 'Em Atendimento', value: summary?.active || 0, icon: <ChatIcon />, color: '#820AD1', bgcolor: '#F3E8FF' },
    { label: 'Aguardando', value: summary?.waiting || 0, icon: <PendingIcon />, color: '#F59E0B', bgcolor: '#FFFBEB' },
    { label: 'Urgentes', value: summary?.urgent || 0, icon: <WarningIcon />, color: '#EF4444', bgcolor: '#FEF2F2' },
    { label: 'Encerradas', value: summary?.closed || 0, icon: <CheckCircleIcon />, color: '#22C55E', bgcolor: '#F0FDF4' },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>Dashboard</Typography>
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.15s ease',
                '&:hover': {
                  boxShadow: '0px 4px 12px rgba(0,0,0,0.06)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h3" fontWeight={700} sx={{ color: 'text.primary' }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: card.bgcolor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

import { Box, Typography, Grid, Card, CardContent, Paper, Button } from '@mui/material';

export default function ReportsPage() {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Relatórios
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Visualize métricas e análises do atendimento.
          </Typography>
        </Box>
      </Box>
      <Grid container spacing={3}>
        {['Geral', 'Por Período', 'Por Atendente', 'SLA'].map((report) => (
          <Grid item xs={12} sm={6} key={report}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
                },
              }}
            >
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>{report}</Typography>
                <Typography variant="body2" color="text.secondary" mb={2.5}>
                  Visualizar relatório {report.toLowerCase()}
                </Typography>
                <Button variant="outlined" size="small" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}>
                  Abrir
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

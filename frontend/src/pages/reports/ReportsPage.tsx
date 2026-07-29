import { Box, Typography, Grid, Card, CardContent, Paper, Button } from '@mui/material';

export default function ReportsPage() {
  return (
    <Box>
      <Typography variant="h5" mb={3}>Relatórios</Typography>
      <Grid container spacing={2}>
        {['Geral', 'Por Período', 'Por Atendente', 'SLA'].map((report) => (
          <Grid item xs={12} sm={6} key={report}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{report}</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Visualizar relatório {report.toLowerCase()}
                </Typography>
                <Button variant="outlined" size="small">Abrir</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

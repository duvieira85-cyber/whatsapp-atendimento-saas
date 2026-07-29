import { Box, Typography, Paper, Grid, TextField, Button } from '@mui/material';

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant="h5" mb={3}>Configurações</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
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
    </Box>
  );
}

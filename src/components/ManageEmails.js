import React, { useState } from 'react';
import { Box, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import EmailContacts from './EmailContacts';
import EmailDistributionLists from './EmailDistributionLists';

function ManageEmails({ open, onClose, onDataChange }) {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Gestionar Correos y Listas de Correo</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="email management tabs" indicatorColor="primary">
            <Tab
              label="Contactos de Correo"
              sx={{
                color: tabValue === 0 ? 'black !important' : 'grey.500',
                fontWeight: tabValue === 0 ? 'bold' : 'normal',
              }}
            />
            <Tab
              label="Listas de Distribución de Correo"
              sx={{
                color: tabValue === 1 ? 'black !important' : 'grey.500',
                fontWeight: tabValue === 1 ? 'bold' : 'normal',
              }}
            />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && <EmailContacts onDataChange={onDataChange} />}
          {tabValue === 1 && <EmailDistributionLists onDataChange={onDataChange} />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#424242' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ManageEmails;

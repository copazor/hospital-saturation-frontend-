import React, { useState } from 'react';
import { Box, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import Contacts from './Contacts';
import DistributionLists from './DistributionLists';

function ManagePhones({ open, onClose, onDataChange }) {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Gestionar Teléfonos y Listas</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="phone management tabs" indicatorColor="primary" textColor="inherit">
            <Tab
              label="Contactos Teléfonos"
              sx={{
                color: tabValue === 0 ? 'black !important' : 'grey.500',
                fontWeight: tabValue === 0 ? 'bold' : 'normal',
              }}
            />
            <Tab
              label="Lista de distribución teléfonos"
              sx={{
                color: tabValue === 1 ? 'black !important' : 'grey.500',
                fontWeight: tabValue === 1 ? 'bold' : 'normal',
              }}
            />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && <Contacts onDataChange={onDataChange} />}
          {tabValue === 1 && <DistributionLists onDataChange={onDataChange} />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#616161' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ManagePhones;

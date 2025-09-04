import React from 'react';
import { Box, Typography, Button, AppBar, Toolbar } from '@mui/material';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

function Dashboard({ children }) { // Aceptar 'children' como prop
  const { user, logout, authState } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Protocolo de Saturación Hospitalaria
          </Typography>
          {authState.role !== 'viewer' && (
          <Button sx={{ color: 'white' }} onClick={() => handleNavigate('/calculator')}>
            Calculadora
          </Button>
          )}
          <Button sx={{ color: 'white' }} onClick={() => handleNavigate('/history')}>
            Historial
          </Button>
          <Button sx={{ color: 'white' }} onClick={() => handleNavigate('/statistics')}>
            Estadísticas
          </Button>
          <Button 
            sx={{ fontSize: '0.8rem', padding: '4px 8px', color: 'white' }} 
            onClick={logout}
          >
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, p: 3 }}>
        {children} {/* Renderizar los componentes hijos aquí */}
      </Box>
    </Box>
  );
}

export default Dashboard;
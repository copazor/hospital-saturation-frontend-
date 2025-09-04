import React from 'react';
import { createTheme, ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material'; // Import CircularProgress and Box
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Importa Navigate y useLocation
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MedicoQuirurgicoProtocol from './components/MedicoQuirurgicoProtocol'; // Importa la calculadora
import History from './components/History'; // Importa el componente de historial (lo crearemos después)
import Statistics from './components/Statistics'; // Importa el componente de estadísticas
import { AuthProvider, useAuth } from './components/AuthContext';
import { CalculatorProvider } from './components/CalculatorContext';

// Define un tema con colores pastel
const theme = createTheme({
  palette: {
    primary: {
      main: '#e3f2fd', // Azul pastel muy claro (para la barra de navegación)
    },
    secondary: {
      main: '#ffcc80', // Naranja pastel
    },
    background: {
      default: '#f0f4f8', // Gris azulado muy claro
      paper: '#ffffff',
    },
    text: {
      primary: '#37474f', // Gris oscuro
      secondary: '#546e7a', // Gris azulado
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: {
      fontWeight: 600,
      color: '#37474f',
    },
    body1: {
      color: '#546e7a',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiRadio: { // Nuevos styleOverrides para los Radio buttons
      styleOverrides: {
        root: {
          color: '#9e9e9e', // Color del círculo no seleccionado (gris medio)
          '&.Mui-checked': {
            color: '#424242', // Color del círculo seleccionado (gris oscuro)
          },
        },
      },
    },
    MuiFormControlLabel: { // Para el texto de los Radio buttons
      styleOverrides: {
        label: {
          color: '#37474f', // Color del texto (gris oscuro)
        },
      },
    },
  },
});

// Componente para manejar las rutas protegidas
function PrivateRoutes() {
  const { authState, loading } = useAuth(); // Consume loading state
  const token = authState.token;
  console.log('PrivateRoutes - token from useAuth():', token);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tempToken = queryParams.get('temp_token');
  const isHistoryRoute = location.pathname === '/history';

  // If loading, show a loading indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Allow access to history route if a temp_token is provided for PDF generation
  if (isHistoryRoute && tempToken) {
    return (
      <Dashboard>
        <CalculatorProvider>
          <History />
        </CalculatorProvider>
      </Dashboard>
    );
  }

  return token ? (
    <Dashboard> {/* Dashboard ahora envuelve las rutas */}
      <CalculatorProvider> {/* Move CalculatorProvider here */}
        <Routes>
          {authState.role !== 'viewer' && (
            <Route path="/calculator" element={<MedicoQuirurgicoProtocol />} />
          )}
          <Route path="/history" element={<History />} /> {/* Ruta para el historial */}
          <Route path="/statistics" element={<Statistics />} /> {/* Ruta para las estadísticas */}
          <Route path="*" element={<Navigate to={authState.role === 'viewer' ? "/history" : "/calculator"} replace />} /> {/* Redirige a calculadora por defecto */}
        </Routes>
      </CalculatorProvider>
    </Dashboard>
  ) : (
    <Navigate to="/login" replace />
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normaliza el CSS y aplica el tema */}
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<PrivateRoutes />} /> {/* Rutas protegidas */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

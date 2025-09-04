import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Paper, Alert, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const response = await fetch('http://127.0.0.1:8000/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.detail || 'Error de autenticación');
        return;
      }

      const data = await response.json();
      console.log('Login exitoso:', data);
      login(data.access_token);
      navigate('/calculator');

    } catch (err) {
      console.error('Error de red o del servidor:', err);
      setError('No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#f5f5f5', // Slightly darker background for contrast
      }}
    >
      <Paper elevation={8} sx={{ p: 4, maxWidth: 400, width: '100%', textAlign: 'center', borderRadius: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Iniciar Sesión
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            label="Usuario"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            InputLabelProps={{
              sx: {
                '&.Mui-focused': {
                  color: 'grey',
                },
              },
            }}
          />
          <TextField
            label="Contraseña"
            variant="outlined"
            fullWidth
            margin="normal"
            type={showPassword ? 'text' : 'password'} // Conditional type
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputLabelProps={{
              sx: {
                '&.Mui-focused': {
                  color: 'grey',
                },
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3, mb: 2, backgroundColor: '#1976d2', color: 'white' }}
          >
            Entrar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default Login;

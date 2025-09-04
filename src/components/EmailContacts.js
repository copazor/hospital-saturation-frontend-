import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, DialogContentText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from './AuthContext';

function EmailContacts({ onDataChange }) {
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [contactToDeleteId, setContactToDeleteId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/email-contacts/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch email contacts');
      }
      const data = await response.json();
      setContacts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleOpenDialog = (contact = null) => {
    setEditingContact(contact);
    setName(contact ? contact.name : '');
    setEmail(contact ? contact.email : '');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingContact(null);
    setName('');
    setEmail('');
  };

  const handleSave = async () => {
    const url = editingContact
      ? `http://127.0.0.1:8000/email-contacts/${editingContact.id}`
      : 'http://127.0.0.1:8000/email-contacts/';
    const method = editingContact ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email }),
      });

      if (!response.ok) {
        throw new Error('Failed to save email contact');
      }

      fetchContacts();
      handleCloseDialog();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = (contactId) => {
    setContactToDeleteId(contactId);
    setOpenDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/email-contacts/${contactToDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete email contact');
      }

      fetchContacts();
      if (onDataChange) onDataChange();
      setOpenDeleteConfirmDialog(false);
      setContactToDeleteId(null);
    } catch (err) {
      setError(err.message);
      setOpenDeleteConfirmDialog(false);
      setContactToDeleteId(null);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Mis Contactos de Correo
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleOpenDialog()}
        sx={{ mb: 2 }}
      >
        Añadir Contacto de Correo
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo Electrónico</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>{contact.name}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(contact)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(contact.id)} sx={{ '&:hover': { color: '#d32f2f' } }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editingContact ? 'Editar Contacto' : 'Añadir Contacto'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre"
            type="text"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Correo Electrónico"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} sx={{ color: 'grey.700' }}>Cancelar</Button>
          <Button onClick={handleSave} sx={{ color: 'grey.700' }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteConfirmDialog}
        onClose={() => setOpenDeleteConfirmDialog(false)}
      >
        <DialogTitle>{"Confirmar Eliminación"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirmDialog(false)} sx={{ color: '#616161' }}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} sx={{ color: '#d32f2f' }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EmailContacts;

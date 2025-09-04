import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Select, 
  MenuItem, InputLabel, FormControl, Chip, DialogContentText 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from './AuthContext';

function DistributionLists({ onDataChange }) {
  const { token } = useAuth();
  const [lists, setLists] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [listToDeleteId, setListToDeleteId] = useState(null);
  const [name, setName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listsRes, contactsRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/distribution-lists/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://127.0.0.1:8000/contacts/', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!listsRes.ok || !contactsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const listsData = await listsRes.json();
      const contactsData = await contactsRes.json();

      setLists(listsData);
      setContacts(contactsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (list = null) => {
    setEditingList(list);
    setName(list ? list.name : '');
    setSelectedContacts(list ? list.contacts.map(c => c.id) : []);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingList(null);
    setName('');
    setSelectedContacts([]);
  };

  const handleSave = async () => {
    const url = editingList
      ? `http://127.0.0.1:8000/distribution-lists/${editingList.id}`
      : 'http://127.0.0.1:8000/distribution-lists/';
    const method = editingList ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, contact_ids: selectedContacts }),
      });

      if (!response.ok) {
        throw new Error('Failed to save list');
      }

      fetchData();
      handleCloseDialog();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = (listId) => {
    setListToDeleteId(listId);
    setOpenDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/distribution-lists/${listToDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete list');
      }

      fetchData();
      if (onDataChange) onDataChange();
      setOpenDeleteConfirmDialog(false);
      setListToDeleteId(null);
    } catch (err) {
      setError(err.message);
      setOpenDeleteConfirmDialog(false);
      setListToDeleteId(null);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Mis Listas de Distribución
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleOpenDialog()}
        sx={{ mb: 2 }}
      >
        Añadir Lista
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Contactos</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lists.map((list) => (
              <TableRow key={list.id}>
                <TableCell>{list.name}</TableCell>
                <TableCell>
                  {list.contacts.map(c => c.name).join(', ')}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(list)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(list.id)} sx={{ '&:hover': { color: '#d32f2f' } }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingList ? 'Editar Lista' : 'Añadir Lista'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre de la Lista"
            type="text"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="contacts-select-label">Contactos</InputLabel>
            <Select
              labelId="contacts-select-label"
              multiple
              value={selectedContacts}
              onChange={(e) => setSelectedContacts(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => {
                    const contact = contacts.find(c => c.id === id);
                    return <Chip key={id} label={contact ? contact.name : ''} />;
                  })}
                </Box>
              )}
            >
              {contacts.map((contact) => (
                <MenuItem key={contact.id} value={contact.id}>
                  {contact.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

export default DistributionLists;

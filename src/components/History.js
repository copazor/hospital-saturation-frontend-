import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, IconButton, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert,
  Typography, Paper, Tabs, Tab, List, ListItem, ListItemText, ListItemSecondaryAction, Checkbox, FormControlLabel,
  FormGroup, MenuItem, Select, InputLabel, FormControl, Tooltip, // Existing imports
  Pagination, Accordion, AccordionSummary, AccordionDetails, RadioGroup, Radio, Divider // Added missing components
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DescriptionIcon from '@mui/icons-material/Description';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // Added CheckCircleOutlineIcon
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Added ErrorOutlineIcon
import SearchIcon from '@mui/icons-material/Search'; // Added SearchIcon


import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuth } from './AuthContext';
import { useCalculator } from './CalculatorContext';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = 'http://localhost:8000';

const inputDataLabels = {
  scenario: "Escenario",
  hospitalized_patients: "Pacientes Hospitalizados",
  esi_c2_patients: "Pacientes ESI C2",
  reanimador_patients: "Pacientes en Reanimador",
  critical_patient_protocol: "Protocolo Paciente Crítico",
  waiting_72_hours_patients: "Pacientes en Espera > 72h",
  sar_active: "SAR Activo",
  sar_patients: "Pacientes en SAR"
};

const alertColorsForTable = {
  "Verde": { background: '#e8f5e9', text: '#2e7d32' },
  "Amarilla": { background: '#fffde7', text: '#fbc02d' },
  "Naranja": { background: '#ffe0b2', text: '#ef6c00' },
  "Roja": { background: '#ffebee', text: '#c62828' },
};

const formatProtocolType = (protocolType) => {
  return protocolType === 'medico_quirurgico' ? 'Médico Quirúrgico' : protocolType;
};

const formatValue = (key, value) => {
    if (key === 'scenario') {
      if (value === 'capacidad_reducida') return 'Capacidad Reducida';
      if (value === 'capacidad_completa') return 'Capacidad Completa';
    }
    if (key === 'sar_active') {
      return value ? 'Sí' : 'No';
    }
    if (value === null) {
      return 'No aplica';
    }
    return value.toString();
};

const renderProtocolStatus = (protocolType, value) => {
  let text = 'No aplica';
  let bgColor = 'transparent';
  let textColor = 'inherit';

  if (protocolType === 'critical_patient_protocol') {
    if (value === 'amarilla') {
      text = 'Clave Amarilla';
      bgColor = alertColorsForTable["Amarilla"].background;
      textColor = alertColorsForTable["Amarilla"].text;
    } else if (value === 'roja') {
      text = 'Clave Roja';
      bgColor = alertColorsForTable["Roja"].background;
      textColor = alertColorsForTable["Roja"].text;
    } else if (value === null || (typeof value === 'string' && value.toLowerCase() === 'none')) {
      text = 'No Activado';
    }
  }

  return (
    <Box
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.5,
        borderRadius: '4px',
        bgcolor: bgColor,
        color: textColor,
        fontWeight: bgColor !== 'transparent' ? 'bold' : 'normal',
        border: bgColor !== 'transparent' ? `1px solid ${textColor}` : 'none',
      }}
    >
      {text}
    </Box>
  );
};

const generateWhatsAppMessage = (evaluation) => {
  let message = `*Evaluación de Saturación Hospitalaria*\n`;
  message += `Fecha: ${dayjs(evaluation.timestamp).format('DD/MM/YYYY HH:mm:ss')}\n`;
  message += `Tipo de Protocolo: ${formatProtocolType(evaluation.protocol_type)}\n`;
  message += `Nivel de Alerta: ${evaluation.alert_level}\n`;
  message += `Puntaje: ${evaluation.total_score}\n`;
  message += `Evaluador: ${evaluation.evaluator_id}\n\n`;

  const inputData = JSON.parse(evaluation.input_data || '{}');
  message += `*Detalles de la Evaluación*\n`;
  message += Object.entries(inputData).map(([key, value]) => {
    let formattedValue = formatValue(key, value);
    if (key === 'reanimador_patients' && inputData.sar_active) {
      formattedValue = 'SAR activo';
    } else if (key === 'critical_patient_protocol') {
      if (value === 'amarilla') formattedValue = 'Clave Amarilla';
      else if (value === 'roja') formattedValue = 'Clave Roja';
      else formattedValue = 'No Activado';
    }
    return `${inputDataLabels[key] || key}: ${formattedValue}`;
  }).join('\n') + '\n';

  // The following section for "Resultados de Evaluación" is intentionally excluded from WhatsApp message as per user request.
  // const evaluationResults = JSON.parse(evaluation.evaluation_results || '{}');
  // Object.entries(evaluationResults).forEach(([key, value]) => {
  //   const formattedKey = key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  //   message += `${formattedKey}: ${value !== null ? value.toString() : 'No aplica'}\n`;
  // });

  return message;
};

const generateReportContent = (evaluation) => {
  const sections = [];

  // 1. Datos Generales de la Activación
  const section1Content = [
    { label: 'Fecha y Hora de Activación', value: dayjs(evaluation.timestamp).format('DD/MM/YYYY HH:mm:ss') },
    { label: 'Nombre del evaluador(a)', value: evaluation.evaluator_name },
    { label: 'Nivel de Alerta Alcanzado', value: evaluation.alert_level },
    { label: 'Puntaje Total Obtenido', value: evaluation.total_score },
  ];
  sections.push({ title: '1. Datos Generales de la Activación', content: section1Content, type: 'two-column' });

  // 2. Criterios de Activación
  const section2Content = [];
  const inputData = JSON.parse(evaluation.input_data || '{}');
  Object.entries(inputData).forEach(([key, value]) => {
    let formattedValue = formatValue(key, value);
    if (key === 'reanimador_patients' && inputData.sar_active) {
      formattedValue = 'SAR activo';
    } else if (key === 'critical_patient_protocol') {
      if (value === 'amarilla') formattedValue = 'Clave Amarilla';
      else if (value === 'roja') formattedValue = 'Clave Roja';
      else formattedValue = 'No Activado';
    }
    section2Content.push({ label: inputDataLabels[key] || key, value: formattedValue });
  });
  sections.push({ title: '2. Criterios de Activación', content: section2Content, type: 'two-column' });

  // 3. Medidas del Protocolo Implementadas
  const section3Content = evaluation.actions && evaluation.actions.length > 0 ? evaluation.actions : [];
  sections.push({ title: '3. Medidas del Protocolo Implementadas', content: section3Content, type: 'measures' });

  // 4. Resultados y Análisis
  const evaluationResults = JSON.parse(evaluation.evaluation_results || '{}');
  let analysisContent;
  if (typeof evaluationResults.analysis_text === 'string') {
    analysisContent = evaluationResults.analysis_text;
  } else {
    analysisContent = `1. Gestión de Pacientes:
  * Movimientos Efectivos Realizados: ${evaluationResults.effective_movements || ''}
  * Movimientos Potenciales Adicionales Identificados: ${evaluationResults.potential_additional_add_movements || ''}

2. Dificultades y Facilitadores:
  * Principales Dificultades en la Implementación: ${evaluationResults.main_difficulties || ''}
  * Factores que Facilitaron la Gestión: ${evaluationResults.facilitating_factors || ''}

3. Comentarios y Recomendaciones Adicionales: ${evaluationResults.additional_comments || ''}`;
  }
  const section4Content = {
    reEvaluationTime: evaluationResults.re_evaluation_time || null,
    analysis: analysisContent,
  };
  sections.push({ title: '4. Resultados y Análisis', content: section4Content, type: 'editable-analysis' });

  // 5. Decisión Final
  let section5Content = '';
  section5Content += `<span style="font-weight: bold;">Decisión:</span> ${evaluationResults.final_decision === 'mantener_naranja' ? 'Mantener clave naranja' : evaluationResults.final_decision === 'subir_roja' ? 'Subir a clave roja' : evaluationResults.final_decision === 'mantener_roja' ? 'Mantener clave roja' : evaluationResults.final_decision === 'bajar_naranja' ? 'Bajar a clave naranja' : 'No aplica'}\n`; // Assuming final_decision exists
  section5Content += `<strong>Horario y fecha de próxima evaluación:</strong> ${evaluationResults.next_evaluation_timestamp ? dayjs(evaluationResults.next_evaluation_timestamp).format('DD/MM/YYYY HH:mm:ss') : 'No aplica'}
`; // Assuming next_evaluation_timestamp exists
  sections.push({ title: '5. Decisión Final', content: section5Content, type: 'decision-final' });

  return sections;
};

const formatReportContentForDownload = (reportContent) => {
  let formattedText = '';

  reportContent.forEach(section => {
    formattedText += `
--- ${section.title} ---

`;
    if (section.type === 'two-column') {
      section.content.forEach(item => {
        formattedText += `${item.label}: ${item.value}
`;
      });
    } else if (section.type === 'measures') {
      if (section.content.length > 0) {
        section.content.forEach(action => {
          formattedText += `- ${action.measure_description} (Estado: ${action.status === 'applied' ? 'Aplicada' : action.status === 'in_process' ? 'En Proceso' : 'No Aplicada'})
`;
        });
      } else {
        formattedText += 'No hay medidas registradas.';
      }
    } else if (section.type === 'editable-analysis') {
      formattedText += `Hora de Reevaluación: ${section.content.reEvaluationTime ? dayjs(section.content.reEvaluationTime).format('DD/MM/YYYY HH:mm') : 'No registrado'}
`;
      formattedText += `Análisis de la Gestión:
${section.content.analysis}
`;
    } else if (section.type === 'decision-final') {
      // This section's content is already a formatted string in the generateReportContent function
      formattedText += section.content;
    } else {
      formattedText += `${section.content}
`;
    }
  });

  return formattedText;
};



function History() {
  const { authState, isTokenValid } = useAuth();
  const { updateCalculatorMeasures } = useCalculator();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [newTimestamp, setNewTimestamp] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [totalEvaluations, setTotalEvaluations] = useState(0);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState(null);
  const [openShareModal, setOpenShareModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [openMeasuresModal, setOpenMeasuresModal] = useState(false);
  const [selectedMeasuresEvaluation, setSelectedMeasuresEvaluation] = useState(null);
  const [measuresStatus, setMeasuresStatus] = useState({});
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [distributionLists, setDistributionLists] = useState([]);
  const [selectedLists, setSelectedLists] = useState([]);
  const [manualPhoneNumber, setManualPhoneNumber] = useState('');
  const [openAddContactModal, setOpenAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [openCreateListModal, setOpenCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedContactsForList, setSelectedContactsForList] = useState([]);
  const [openConfirmDeleteContact, setOpenConfirmDeleteContact] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [openConfirmDeleteList, setOpenConfirmDeleteList] = useState(false);
  const [listToDelete, setListToDelete] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [openEditListModal, setOpenEditListModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [editedListName, setEditedListName] = useState('');
  const [selectedContactsForEditList, setSelectedContactsForEditList] = useState([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [openReportModal, setOpenReportModal] = useState(false);
  const [reportContent, setReportContent] = useState([]);
  const [reEvaluationTime, setReEvaluationTime] = useState(null);
  const [analysisText, setAnalysisText] = useState('');
  const [reEvaluationDecision, setReEvaluationDecision] = useState('');
  const [nextReEvaluationDateTime, setNextReEvaluationDateTime] = useState(null);
  const [hasUnsavedChangesInDecisionFinal, setHasUnsavedChangesInDecisionFinal] = useState(false); // New state variable
  const [showSaveSuccessMessage, setShowSaveSuccessMessage] = useState(false); // New state variable for save success message

  const handleExportToExcel = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }

    try {
      let url = `${API_URL}/export-evaluations-excel`;
      const params = new URLSearchParams();

      if (startDate) {
        params.append('start_date', startDate.toISOString());
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al exportar a Excel.');
      }

      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `evaluaciones_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlBlob);

    } catch (err) {
      console.error("Error in Excel export process:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    if (openAlertDialog && alertMessage === "Informe guardado con éxito." && showSaveSuccessMessage) {
      const timer = setTimeout(() => {
        setOpenAlertDialog(false);
        setAlertMessage(''); // Clear the message
        setShowSaveSuccessMessage(false); // Reset the flag
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer); // Cleanup the timer
    }
  }, [openAlertDialog, alertMessage, showSaveSuccessMessage]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSendToContact = (contact) => {
    const whatsappUrl = `https://wa.me/${contact.phone_number}?text=${encodeURIComponent(whatsAppMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleViewDetails = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedEvaluation(null);
  };

  const handleEditClick = (evaluation) => {
    setEditingEvaluation(evaluation);
    setNewTimestamp(dayjs(evaluation.timestamp));
    setOpenEditModal(true);
  };

  const handleEditModalClose = () => {
    setOpenEditModal(false);
    setEditingEvaluation(null);
    setNewTimestamp(null);
  };

  const handleTimestampChange = (newValue) => {
    setNewTimestamp(newValue);
  };

  const handleSaveChanges = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }

    if (!editingEvaluation || !newTimestamp) return;

    const evaluationUpdate = {
      timestamp: newTimestamp.toISOString(),
    };

    try {
      const response = await fetch(`${API_URL}/evaluations/${editingEvaluation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify(evaluationUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar los cambios.');
      }

      fetchEvaluations();
      handleEditModalClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClick = (evaluation) => {
    setEvaluationToDelete(evaluation);
    setOpenConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    if (!evaluationToDelete) return;

    try {
      const response = await fetch(`${API_URL}/evaluations/${evaluationToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar la evaluación.');
      }

      fetchEvaluations();
      setOpenConfirmDelete(false);
      setEvaluationToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelDelete = () => {
    setOpenConfirmDelete(false);
    setEvaluationToDelete(null);
  };

  const handleCloseShareModal = () => {
    setOpenShareModal(false);
    setWhatsAppMessage('');
  };

  const handleListCheckboxChange = (listId) => {
    setSelectedLists((prevSelected) =>
      prevSelected.includes(listId)
        ? prevSelected.filter((id) => id !== listId)
        : [...prevSelected, listId]
    );
  };

  const handleAddContact = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    if (!newContactName || !newContactNumber) {
      alert('Por favor, ingresa el nombre y el número del contacto.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/whatsapp-contacts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify({ name: newContactName, phone_number: newContactNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al agregar el contacto.');
      }

      setNewContactName('');
      setNewContactNumber('');
      setOpenAddContactModal(false);
      fetchWhatsappContacts(); // Refresh contacts list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleContactSelectionForList = (contactId) => {
    setSelectedContactsForList((prevSelected) =>
      prevSelected.includes(contactId)
        ? prevSelected.filter((id) => id !== contactId)
        : [...prevSelected, contactId]
    );
  };

  const handleCreateList = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    if (!newListName) {
      alert('Por favor, ingresa un nombre para la lista.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/distribution-lists/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify({ name: newListName, contact_ids: selectedContactsForList }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear la lista de distribución.');
      }

      setNewListName('');
      setSelectedContactsForList([]);
      setOpenCreateListModal(false);
      fetchDistributionLists(); // Refresh distribution lists
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteContactClick = (contact) => {
    setContactToDelete(contact);
    setOpenConfirmDeleteContact(true);
  };

  const handleCancelDeleteContact = () => {
    setOpenConfirmDeleteContact(false);
    setContactToDelete(null);
  };

  const handleConfirmDeleteContact = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    if (!contactToDelete) return;

    try {
      const response = await fetch(`${API_URL}/whatsapp-contacts/${contactToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar el contacto.');
      }

      fetchWhatsappContacts();
      setOpenConfirmDeleteContact(false);
      setContactToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteListClick = (list) => {
    setListToDelete(list);
    setOpenConfirmDeleteList(true);
  };

  const handleCancelDeleteList = () => {
    setOpenConfirmDeleteList(false);
    setListToDelete(null);
  };

  const handleConfirmDeleteList = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    if (!listToDelete) return;

    try {
      const response = await fetch(`${API_URL}/distribution-lists/${listToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar la lista de distribución.');
      }

      fetchDistributionLists();
      setOpenConfirmDeleteList(false);
      setListToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditListClick = (list) => {
    setEditingList(list);
    setEditedListName(list.name);
    setSelectedContactsForEditList(list.contacts.map(c => c.id));
    setOpenEditListModal(true);
  };

  const handleEditListModalClose = () => {
    setOpenEditListModal(false);
    setEditingList(null);
    setEditedListName('');
    setSelectedContactsForEditList([]);
  };

  const handleUpdateList = async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    if (!editingList) return;

    const listUpdate = {
      name: editedListName,
      contact_ids: selectedContactsForEditList,
    };

    try {
      const response = await fetch(`${API_URL}/distribution-lists/${editingList.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify(listUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar la lista de distribución.');
      }

      fetchDistributionLists();
      handleEditListModalClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendWhatsApp = async () => {
    if (manualPhoneNumber) {
      const whatsappUrl = `https://wa.me/${manualPhoneNumber}?text=${encodeURIComponent(whatsAppMessage)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      alert('Por favor, ingresa un número de teléfono manual.');
    }
  };

  const handleShareClick = (evaluation) => {
    const message = generateWhatsAppMessage(evaluation);
    setWhatsAppMessage(message);
    setSelectedEvaluation(evaluation); // Add this line
    setOpenShareModal(true);
  };

  const handleViewMeasures = (evaluation) => {
    setSelectedMeasuresEvaluation(evaluation);
    // Initialize measuresStatus from the evaluation's actions
    const initialStatus = {};
    if (evaluation.actions) {
      evaluation.actions.forEach(action => {
        initialStatus[action.id] = action.status;
      });
    }
    setMeasuresStatus(initialStatus);
    setOpenMeasuresModal(true);
  };

  const handleCloseMeasuresModal = () => {
    setOpenMeasuresModal(false);
    setSelectedMeasuresEvaluation(null);
    setMeasuresStatus({});
  };

  const handleSaveAnalysis = async (showSuccessMessage = true) => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }

    if (!selectedEvaluation) return;

    // --- START OF NEW VALIDATION LOGIC ---
    if (!reEvaluationTime) {
      setAlertMessage("Por favor, registra el horario de reevaluación.");
      setOpenAlertDialog(true);
      return;
    }

    if (!reEvaluationDecision) {
      setAlertMessage("Por favor, selecciona una decisión final en '5. Decisión Final'.");
      setOpenAlertDialog(true);
      return;
    }

    if (!nextReEvaluationDateTime) {
      setAlertMessage("Por favor, registra el horario y fecha de la próxima evaluación en '5. Decisión Final'.");
      setOpenAlertDialog(true);
      return;
    }
    // --- END OF NEW VALIDATION LOGIC ---

    const evaluationResults = JSON.parse(selectedEvaluation.evaluation_results || '{}');
    evaluationResults.re_evaluation_time = reEvaluationTime ? reEvaluationTime.toISOString() : null;
    evaluationResults.analysis_text = analysisText;
    evaluationResults.final_decision = reEvaluationDecision;
    evaluationResults.next_evaluation_timestamp = nextReEvaluationDateTime ? nextReEvaluationDateTime.toISOString() : null;

    const evaluationUpdate = {
      evaluation_results: JSON.stringify(evaluationResults),
    };

    try {
      const response = await fetch(`${API_URL}/evaluations/${selectedEvaluation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify(evaluationUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar los cambios.');
      }

      const updatedEvaluation = await response.json();
      console.log('Updated evaluation from server:', updatedEvaluation);
      setSelectedEvaluation(updatedEvaluation); // Update the selected evaluation state
      fetchEvaluations(); // Re-fetch data from server
      setHasUnsavedChangesInDecisionFinal(false); // Reset unsaved changes flag
      if (showSuccessMessage) { // Conditional display
        setShowSaveSuccessMessage(true); // Indicate that save success message should be shown
        setAlertMessage("Guardado con éxito."); // Success message
        setOpenAlertDialog(true); // Open the alert dialog
      }

      return updatedEvaluation;
    } catch (err) {
      setError(err.message);
      return null; // Return null on error
    }
  };

  const handleDownloadReport = async () => {
    // Check if the evaluation has been saved with a final decision
    if (!selectedEvaluation || !selectedEvaluation.evaluation_results) {
      setAlertMessage("Por favor, guarda la evaluación antes de descargar el informe.");
      setOpenAlertDialog(true);
      return;
    }

    const currentEvaluationResults = JSON.parse(selectedEvaluation.evaluation_results);
    if (!currentEvaluationResults.final_decision || !currentEvaluationResults.next_evaluation_timestamp) {
      setAlertMessage("Por favor, guarda la evaluación con una decisión final y fecha de próxima evaluación antes de descargar el informe.");
      setOpenAlertDialog(true);
      return;
    }

    if (hasUnsavedChangesInDecisionFinal) {
      setAlertMessage("Por favor, guarda los cambios en la sección '5. Decisión Final' antes de descargar el informe.");
      setOpenAlertDialog(true);
      return;
    }

    // --- START OF VALIDATION FOR DOWNLOAD ---
    if (!reEvaluationTime) {
      setAlertMessage("Por favor, registra el horario de reevaluación.");
      setOpenAlertDialog(true);
      return;
    }

    if (!reEvaluationDecision) {
      setAlertMessage("Por favor, selecciona una decisión final en '5. Decisión Final'.");
      setOpenAlertDialog(true);
      return;
    }

    if (!nextReEvaluationDateTime) {
      setAlertMessage("Por favor, registra el horario y fecha de la próxima evaluación en '5. Decisión Final'.");
      setOpenAlertDialog(true);
      return;
    }
    // --- END OF VALIDATION FOR DOWNLOAD ---

    // Save the analysis before downloading the report
    const updatedEval = await handleSaveAnalysis(false); // Do not show success message
    if (!updatedEval) {
      console.error("Failed to save analysis before downloading report. Aborting download.");
      return; // Stop the download process if save failed
    }

    try {
      const alertLevel = updatedEval?.alert_level || 'Verde'; // Use updatedEval here
      const colors = alertColorsForTable[alertLevel] || alertColorsForTable['Verde'];

      // Regenerate reportContent with the latest updatedEval
      const latestReportContent = generateReportContent(updatedEval);
      setReportContent(latestReportContent); // Update the state for consistency

      let reportHtmlContent = `
        <h1 style="text-align: center; font-weight: bold; padding: 1.5; background-color: ${colors.background}; color: ${colors.text}; border-radius: 4px;">
          Informe de Gestión de Clave de Saturación
        </h1>
      `;

      latestReportContent.forEach(section => { // Use latestReportContent here
        reportHtmlContent += `<h2 style="margin-top: 2rem; margin-bottom: 0.5rem; font-weight: bold; color: darkblue;">${section.title}</h2>`;
        if (section.type === 'two-column') {
          
          reportHtmlContent += `<table style="width: 100%; border-collapse: separate; border-spacing: 6px;">`;
          // Iterate through content in pairs for two columns
          for (let i = 0; i < section.content.length; i += 2) {
            const item1 = section.content[i];
            const item2 = section.content[i + 1]; // Might be undefined if odd number of items

            reportHtmlContent += `<tr>`;
            reportHtmlContent += `
              <td style="padding: 0.5rem; vertical-align: top; width: 50%;${section.title === '2. Criterios de Activación' ? ' background-color: #f0f0f0; border-radius: 8px; padding: 1rem; border: 1px solid #e0e0e0;' : ''}">
                <p style="font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6;">
                  ${item1.label}: <span style="font-weight: normal;">${item1.value}</span>
                </p>
              </td>
            `;
            if (item2) {
              reportHtmlContent += `
                <td style="padding: 0.5rem; vertical-align: top; width: 50%;${section.title === '2. Criterios de Activación' ? ' background-color: #f0f0f0; border-radius: 8px; padding: 1rem; border: 1px solid #e0e0e0;' : ''}">
                  <p style="font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6;">
                    ${item2.label}: <span style="font-weight: normal;">${item2.value}</span>
                  </p>
                </td>
              `;
            } else {
              // If there's an odd number of items, add an empty cell to complete the row
              reportHtmlContent += `<td style="width: 50%;"></td>`;
            }
            reportHtmlContent += `</tr>`;
          }
          reportHtmlContent += `</table>`;
        } else if (section.type === 'measures') {
          if (section.content.length > 0) {
            [...section.content].sort((a, b) => {
              const statusOrder = { 'applied': 0, 'in_process': 1, 'not_applied': 2 };
              const priorityA = statusOrder[a.status];
              const priorityB = statusOrder[b.status];
              if (priorityA < priorityB) return -1;
              if (priorityA > priorityB) return 1;
              return a.original_order_index - b.original_order_index;
            }).forEach(action => {
              const borderColor = action.status === 'applied' ? '#4CAF50' : (action.status === 'in_process' ? '#C8E6C9' : '#e0e0e0');
              reportHtmlContent += `
                <div style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 1rem; padding: 1rem; border-radius: 1px; border: 1px solid #e0e0e0; border-left: 8px solid ${borderColor}; width: 100%; margin: 0 0 1rem 0; page-break-inside: avoid;">
                  <p style="text-align: justify; margin-bottom: 0.5rem;">${action.measure_description}</p>
                  <p style="color: text.secondary; font-size: 0.875rem;">Estado: ${action.status === 'applied' ? 'Aplicada' : action.status === 'in_process' ? 'En Proceso' : 'No Aplicada'}</p>
                </div>
              `;
            });
          } else {
            reportHtmlContent += `<p style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6;">No hay medidas registradas.</p>`;
          }
        } else if (section.type === 'editable-analysis') {
          reportHtmlContent += `
            <p><strong>Hora de Reevaluación:</strong> ${reEvaluationTime ? dayjs(reEvaluationTime).format('DD/MM/YYYY HH:mm') : 'No registrado'}</p>
            <p style="font-weight: bold;">Análisis de la Gestión:</p>
            <p style="white-space: pre-wrap; text-align: justify;">${analysisText}</p>
          `;
        } else if (section.type === 'decision-final') {
          reportHtmlContent += `<p style="white-space: pre-wrap;">${section.content}</p>`;
        }
      });

      const stylesheetUrl = `${window.location.protocol}//${window.location.host}/print.css`;

      const htmlContent = `
        <html>
          <head>
            <link rel="stylesheet" href="${stylesheetUrl}">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif; }
              h1, h2 { color: #333; }
              p { color: #555; }
            </style>
          </head>
          <body>
            ${reportHtmlContent}
          </body>
        </html>
      `;

      const response = await fetch(`${API_URL}/report/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify({ html_content: htmlContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al generar el PDF desde el servidor.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let filename = `Informe_Evaluacion.pdf`;
      if (selectedEvaluation) {
        filename = `Informe_Evaluacion_${dayjs(selectedEvaluation.timestamp).format('YYYYMMDD_HHmmss')}.pdf`;
      }
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error in PDF generation process:", err);
      setError(err.message);
    }
  };

  const handleGenerateReport = (evaluation) => {
    const content = generateReportContent(evaluation);
    setReportContent(content);
    setSelectedEvaluation(evaluation);

    const evaluationResults = JSON.parse(evaluation.evaluation_results || '{}'); // Parse evaluation_results here

        const analysisSection = content.find(section => section.title === '4. Resultados y Análisis');    if (analysisSection) {      setReEvaluationTime(analysisSection.content.reEvaluationTime ? dayjs(analysisSection.content.reEvaluationTime) : null);      let cleanedAnalysisText = analysisSection.content.analysis;      if (cleanedAnalysisText && cleanedAnalysisText.startsWith('Análisis de la Gestión:\n')) {        cleanedAnalysisText = cleanedAnalysisText.substring('Análisis de la Gestión:\n'.length);      }      setAnalysisText(cleanedAnalysisText);    }

    // Initialize reEvaluationDecision and nextReEvaluationDateTime
    setReEvaluationDecision(evaluationResults.final_decision || '');
    setNextReEvaluationDateTime(evaluationResults.next_evaluation_timestamp ? dayjs(evaluationResults.next_evaluation_timestamp) : null);

    setOpenReportModal(true);
  };

  const handleCloseReportModal = () => {
    setOpenReportModal(false);
    setReportContent('');
  };

  const handleMeasureStatusChange = async (actionId, status) => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/actions/${actionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify({ status: status }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar el estado de la medida.');
      }
      setMeasuresStatus(prevStatus => ({
        ...prevStatus,
        [actionId]: status,
      }));
      // Optionally, update the selectedMeasuresEvaluation to reflect the change immediately
      setSelectedMeasuresEvaluation(prevEval => {
        if (!prevEval) return null;
        const updatedActions = prevEval.actions.map(action =>
          action.id === actionId ? { ...action, status: status } : action
        );
        const updatedEvaluation = { ...prevEval, actions: updatedActions };

        // Update the main evaluations array
        setEvaluations(prevEvaluations =>
          prevEvaluations.map(evalItem =>
            evalItem.id === updatedEvaluation.id ? updatedEvaluation : evalItem
          )
        );

        updateCalculatorMeasures(updatedEvaluation); // Call the new function for Calculator sync
        return updatedEvaluation;
      });
    } catch (err) {
      const errorDetail = err.message || 'Error desconocido.';
      if (errorDetail.includes("Solo se pueden editar las medidas de las últimas 2 claves activadas")) {
        setAlertMessage(errorDetail);
        setOpenAlertDialog(true);
      } else {
        setError(errorDetail);
      }
    }
  };

  const fetchWhatsappContacts = useCallback(async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/whatsapp-contacts/`, {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Error al cargar contactos de WhatsApp.');
      }
      const data = await response.json();
      setWhatsappContacts(data);
    } catch (err) {
      setError(err.message);
    }
  }, [authState.token, isTokenValid]);

  const fetchDistributionLists = useCallback(async () => {
    if (!isTokenValid()) {
      setError("Su sesión ha expirado. Por favor, inicie sesión de nuevo.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/distribution-lists/`, {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Error al cargar listas de distribución.');
      }
      const data = await response.json();
      setDistributionLists(data);
    } catch (err) {
      setError(err.message);
    }
  }, [authState.token, isTokenValid]);

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/evaluations/`;
      const params = new URLSearchParams();

      if (startDate || endDate) {
        if (startDate) {
          params.append('start_date', startDate.toISOString());
        }
        if (endDate) {
          params.append('end_date', endDate.toISOString());
        }
        params.append('skip', (page - 1) * rowsPerPage);
        params.append('limit', rowsPerPage);
      } else {
        params.append('skip', (page - 1) * rowsPerPage);
        params.append('limit', rowsPerPage);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar el historial.');
      }

      const data = await response.json();
      setEvaluations(data.evaluations);

      if (startDate || endDate) {
        setTotalEvaluations(data.total_count);
      } else {
        setTotalEvaluations(Math.min(data.total_count, 30));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authState.token, startDate, endDate, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const currentLocation = useLocation(); // Initialize useLocation

  // ... existing fetchEvaluations ...

  useEffect(() => {
    console.log("History useEffect triggered."); // Log 1
    const queryParams = new URLSearchParams(currentLocation.search);
    const evaluationIdFromUrl = queryParams.get('evaluation_id');
    const tempToken = queryParams.get('temp_token');
    console.log("URL Params:", { evaluationIdFromUrl, tempToken }); // Log 2

    // Flow for PDF generation using a temporary token
    if (evaluationIdFromUrl && tempToken) {
      console.log("Temp token flow initiated."); // Log 3
      const fetchSingleEvaluationWithTempToken = async () => {
        setLoading(true);
        setError(null);
        try {
          console.log("Fetching with temp token from:", `${API_URL}/public/reports/${evaluationIdFromUrl}`); // Log 4
          // Use the new public endpoint for temp tokens
          const response = await fetch(`${API_URL}/public/reports/${evaluationIdFromUrl}`, {
            headers: {
              'Authorization': `Bearer ${tempToken}`,
            },
          });
          console.log("Fetch response status:", response.status); // Log 5
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error data from fetch:", errorData); // Log 6
            throw new Error(errorData.detail || 'Error al cargar el informe de la evaluación.');
          }
          const data = await response.json();
          console.log("Data received, opening report modal."); // Log 7
          setSelectedEvaluation(data);
          const content = generateReportContent(data);
          setReportContent(content);
          setOpenReportModal(true);
        } catch (err) {
          console.error("Error in temp token flow:", err); // Log 8
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchSingleEvaluationWithTempToken();
    } 
    // Regular user flow (logged in)
    else if (authState.token) {
      // If an evaluation ID is present (e.g., from a shared link by a logged-in user)
      if (evaluationIdFromUrl) {
        const fetchSingleEvaluation = async () => {
          setLoading(true);
          setError(null);
          try {
            // Use the standard authenticated endpoint
            const response = await fetch(`${API_URL}/evaluations/${evaluationIdFromUrl}`, {
              headers: {
                'Authorization': `Bearer ${authState.token}`,
              },
            });
            if (!response.ok) {
              throw new Error('Error al cargar la evaluación.');
            }
            const data = await response.json();
            setSelectedEvaluation(data);
            const content = generateReportContent(data);
            setReportContent(content);
            setOpenReportModal(true);
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };
        fetchSingleEvaluation();
      } else {
        // Default view: fetch the list of all evaluations
        fetchEvaluations();
      }
    } else {
        console.log("No authState.token and no temp token. Doing nothing."); // Log 9
    }
  }, [authState.token, fetchEvaluations, currentLocation.search]); // Add currentLocation.search to dependencies

  useEffect(() => {
    if (openShareModal && authState.token) {
      fetchWhatsappContacts();
      fetchDistributionLists();
    }
  }, [openShareModal, authState.token, fetchWhatsappContacts, fetchDistributionLists]);

  const canPerformActions = authState.role === 'administrador' || authState.role === 'editor_gestor';

  const selectedListsContacts = Array.from(distributionLists
    .filter(list => selectedLists.includes(list.id))
    .flatMap(list => list.contacts)
    .reduce((map, contact) => map.set(contact.id, contact), new Map()).values())
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Historial de Evaluaciones
        </Typography>

        {authState.role !== 'visor' && (
          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <DatePicker
                label="Fecha de Inicio"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} size="small" InputLabelProps={{ sx: { '&.Mui-focused': { color: 'grey' } } }} />}
                format="DD/MM/YYYY"
              />
            <DatePicker
              label="Fecha de Término"
              value={endDate}
              onChange={setEndDate}
              renderInput={(params) => <TextField {...params} size="small" />}
              format="DD/MM/YYYY"
            />
            <Button variant="contained" onClick={() => { setStartDate(null); setEndDate(null); }}>Limpiar</Button>
            {canPerformActions && <Button variant="contained" color="success" onClick={handleExportToExcel}>Exportar a Excel</Button>}
          </Paper>
        )}

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha y Hora</TableCell>
                    <TableCell>Tipo de Protocolo</TableCell>
                    <TableCell>Nivel de Alerta</TableCell>
                    <TableCell>Puntaje</TableCell>
                    <TableCell>Evaluador</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {evaluations.map((evaluation) => (
                    <TableRow key={evaluation.id} sx={{ bgcolor: alertColorsForTable[evaluation.alert_level]?.background }}>
                      <TableCell>{dayjs(evaluation.timestamp).format('DD/MM/YYYY HH:mm:ss')}</TableCell>
                      <TableCell>{formatProtocolType(evaluation.protocol_type)}</TableCell>
                      <TableCell sx={{ color: alertColorsForTable[evaluation.alert_level]?.text, fontWeight: 'bold' }}>
                        {evaluation.alert_level}
                      </TableCell>
                      <TableCell>{evaluation.total_score}</TableCell>
                      <TableCell>{evaluation.evaluator_name}</TableCell>
                      <TableCell>
                        <Tooltip title="Ver Detalles">
                          <IconButton onClick={() => handleViewDetails(evaluation)}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        {authState.role !== 'viewer' && (
                          <Tooltip title="Compartir">
                            <IconButton onClick={() => handleShareClick(evaluation)}>
                              <ShareIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Ver Medidas">
                          <IconButton onClick={() => handleViewMeasures(evaluation)}>
                            <ListAltIcon />
                          </IconButton>
                        </Tooltip>
                        {(evaluation.alert_level === 'Naranja' || evaluation.alert_level === 'Roja') && authState.role !== 'viewer' && (
                          <Tooltip title="Generar Informe">
                            <IconButton onClick={() => handleGenerateReport(evaluation)}>
                              <DescriptionIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canPerformActions && (
                          <>
                            <Tooltip title="Editar">
                              <IconButton onClick={() => handleEditClick(evaluation)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton onClick={() => handleDeleteClick(evaluation)} sx={{ '&:hover': { color: '#b71c1c' } }}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(totalEvaluations / rowsPerPage)}
                page={page}
                onChange={handleChangePage}
                color="primary"
              />
            </Box>
          </>
        )}

        {selectedEvaluation && (
          <Dialog open={openModal} onClose={handleCloseModal} maxWidth="xs" fullWidth>
            <DialogTitle sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: alertColorsForTable[selectedEvaluation.alert_level]?.background,
              color: alertColorsForTable[selectedEvaluation.alert_level]?.text,
              py: 1.5,
            }}>
              Clave {selectedEvaluation.alert_level}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container>
                {(() => {
                  const inputData = JSON.parse(selectedEvaluation.input_data || '{}');
                  return Object.entries(inputData).map(([key, value], index) => {
                    let displayValue = formatValue(key, value);
                    if (key === 'reanimador_patients' && inputData.sar_active) {
                      displayValue = 'SAR activo';
                    } else if (key === 'critical_patient_protocol') {
                      displayValue = renderProtocolStatus(key, value);
                    }
                    return (
                      <Grid item xs={12} key={key} sx={{ backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white', p: 1 }}>
                        <Typography variant="body2">
                          <strong>{inputDataLabels[key] || key}:</strong> {displayValue}
                        </Typography>
                      </Grid>
                    );
                  });
                })()}
                {Object.entries(JSON.parse(selectedEvaluation.evaluation_results || '{}'))
                  .filter(([key]) => !['re_evaluation_time', 'analysis_text', 'final_decision', 'next_evaluation_timestamp'].includes(key))
                  .map(([key, value], index) => (
                  <Grid item xs={12} key={key} sx={{ backgroundColor: (Object.keys(JSON.parse(selectedEvaluation.input_data || '{}')).length + index) % 2 === 0 ? '#f5f5f5' : 'white', p: 1 }}>
                    <Typography variant="body2">
                      <strong>{key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</strong> {value !== null ? value.toString() : 'No aplica'}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal} sx={{ color: '#424242' }}>Cerrar</Button>
            </DialogActions>
          </Dialog>
        )}

        {editingEvaluation && (
          <Dialog open={openEditModal} onClose={handleEditModalClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: alertColorsForTable[editingEvaluation?.alert_level]?.background || '#e0f2f7',
              color: alertColorsForTable[editingEvaluation?.alert_level]?.text || '#01579b',
              py: 1.5,
            }}>Editar Fecha y Hora</DialogTitle>
            <DialogContent sx={{ pt: '20px !important', px: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <DateTimePicker
                  label="Nueva Fecha y Hora"
                  value={newTimestamp}
                  onChange={handleTimestampChange}
                  renderInput={(params) => <TextField {...params} />}
                  format="DD/MM/YYYY HH:mm"
                        sx={{ // Add sx prop to DateTimePicker
                          '& .MuiInputLabel-root': {
                            color: '#333333', // Default label color
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#333333', // Keep label color dark gray when focused
                          },
                          '& .MuiInputLabel-root.Mui-active': { // Targeting active state
                            color: '#333333 !important',
                          },
                          '& .MuiInputLabel-root::selection': { // Targeting text selection on label
                            backgroundColor: 'transparent', // Prevent background color change
                            color: '#333333',
                          },
                        }}
                      />
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center' }}>
              <Button onClick={handleEditModalClose} sx={{ color: '#424242' }}>Cancelar</Button>
              <Button onClick={handleSaveChanges} variant="contained" sx={{ backgroundColor: '#1976d2', color: '#ffffff' }}>Guardar</Button>
            </DialogActions>
          </Dialog>
        )}

        {openConfirmDelete && (
          <Dialog open={openConfirmDelete} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
              <ErrorOutlineIcon sx={{ color: '#fbc02d', fontSize: 40, mb: 1 }} />
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Confirmar Eliminación
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center', pt: 0 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ¿Estás seguro de que quieres eliminar esta evaluación de forma definitiva?
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button onClick={handleCancelDelete} sx={{ color: '#424242' }}>Cancelar</Button>
              <Button onClick={handleConfirmDelete} sx={{ backgroundColor: '#b71c1c', color: '#ffffff', '&:hover': { backgroundColor: '#d32f2f' } }} variant="contained">Eliminar</Button>
            </DialogActions>
          </Dialog>
        )}

        {openShareModal && (
          <Dialog open={openShareModal} onClose={handleCloseShareModal} maxWidth="md" fullWidth>
            <DialogTitle sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              py: 1.5,
              backgroundColor: alertColorsForTable[selectedEvaluation?.alert_level]?.background || '#e8f5e9',
              color: alertColorsForTable[selectedEvaluation?.alert_level]?.text || 'inherit',
            }}>
              Compartir Resumen
            </DialogTitle>
            <DialogContent dividers>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Mensaje a Compartir</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    value={whatsAppMessage}
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </AccordionDetails>
              </Accordion>

              <Accordion sx={{ mt: 2 }} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Destinatarios</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={selectedTab} onChange={handleTabChange} aria-label="contact and list tabs">
                      <Tab label="Contactos" sx={{ '&.Mui-selected': { fontWeight: 'bold', color: 'black' } }} />
                      <Tab label="Listas de Distribución" sx={{ '&.Mui-selected': { fontWeight: 'bold', color: 'black' } }} />
                    </Tabs>
                  </Box>
                  <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderTop: 0, borderRadius: '0 0 4px 4px' }}>
                    {selectedTab === 0 && (
                      <Box>
                        <Button variant="outlined" size="small" onClick={() => setOpenAddContactModal(true)} sx={{ color: '#424242', borderColor: '#424242', mb: 1 }}>
                        Agregar Contacto
                      </Button>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SearchIcon sx={{ color: '#616161', mr: 1 }} />
                        <TextField
                          variant="standard"
                          placeholder="Buscar contacto..."
                          value={contactSearchQuery}
                          onChange={(e) => setContactSearchQuery(e.target.value)}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{ maxHeight: 150, overflowY: 'auto', mt: 1 }}>
                        {whatsappContacts.length === 0 ? (
                          <Typography variant="body2" color="textSecondary">No hay contactos registrados.</Typography>
                        ) : (
                          [...whatsappContacts]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .filter(contact => contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                            .map((contact, index) => (
                    <Box key={contact.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5' }}>
                              <Typography>{contact.name} ({contact.phone_number})</Typography>
                              <Box>
                                <Tooltip title="Enviar por WhatsApp">
                    <IconButton onClick={() => handleSendToContact(contact)} size="small" sx={{ '&:hover': { color: '#25D366' }, mr: 1 }}>
                      <WhatsAppIcon />
                    </IconButton>
                  </Tooltip>
                                <Tooltip title="Eliminar Contacto">
                    <IconButton onClick={() => handleDeleteContactClick(contact)} size="small" sx={{ '&:hover': { color: '#b71c1c' } }}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                              </Box>
                            </Box>
                          ))
                        )}
                      </Box>
                      </Box>
                    )}
                    {selectedTab === 1 && (
                      <Box>
                        <Button variant="outlined" size="small" onClick={() => setOpenCreateListModal(true)} sx={{ color: '#424242', borderColor: '#424242', mb: 1 }}>
                        Crear Lista
                      </Button>
                      <Box sx={{ maxHeight: 150, overflowY: 'auto', mt: 1 }}>
                        {distributionLists.length === 0 ? (
                          <Typography variant="body2" color="textSecondary">No hay listas de distribución.</Typography>
                        ) : (
                          distributionLists.map((list, index) => (
                            <Box key={list.id} sx={{ backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Checkbox
                                  checked={selectedLists.includes(list.id)}
                                  onChange={() => handleListCheckboxChange(list.id)}
                                  sx={{ '&.Mui-checked': { color: '#616161' } }}
                                />
                                  <Typography>{list.name} ({list.contacts.length} contactos)</Typography>
                                </Box>
                                <Box>
                                  <Tooltip title="Editar Lista">
                    <IconButton onClick={() => handleEditListClick(list)} size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                                  <Tooltip title="Eliminar Lista">
                                    <IconButton onClick={() => handleDeleteListClick(list)} size="small" sx={{ '&:hover': { color: '#b71c1c' } }}>
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                            </Box>
                          ))
                        )}
                      </Box>
                        {selectedLists.length > 0 && (
                          <Box mt={2}>
                            <Typography variant="subtitle1" fontWeight="bold">Contactos en Listas Seleccionadas</Typography>
                            <Box sx={{ maxHeight: 150, overflowY: 'auto', mt: 1 }}>
                              {selectedListsContacts.map((contact, index) => (
                                <Box key={contact.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 4, backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5' }}>
                                  <Typography>{contact.name} ({contact.phone_number})</Typography>
                                  <Tooltip title="Enviar por WhatsApp">
                                    <IconButton onClick={() => handleSendToContact(contact)} size="small" sx={{ '&:hover': { color: '#25D366' } }}>
                                      <WhatsAppIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Envío Manual</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      label="Número de Teléfono Manual (ej: +56912345678)"
                      value={manualPhoneNumber}
                      onChange={(e) => setManualPhoneNumber(e.target.value)}
                      sx={{ flexGrow: 1, mr: 1 }}
                    />
                    <Tooltip title="Enviar por WhatsApp">
                    <IconButton onClick={handleSendWhatsApp} sx={{ '&:hover': { color: '#25D366' } }}>
                      <WhatsAppIcon />
                    </IconButton>
                  </Tooltip>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button onClick={handleCloseShareModal} sx={{ color: '#424242' }}>Cerrar</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Add Contact Modal */}
        <Dialog open={openAddContactModal} onClose={() => setOpenAddContactModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', py: 1.5 }}>
            Agregar Nuevo Contacto
          </DialogTitle>
          <DialogContent dividers>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre del Contacto"
              type="text"
              fullWidth
              variant="outlined"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Número de Teléfono (ej: +56912345678)"
              type="text"
              fullWidth
              variant="outlined"
              value={newContactNumber}
              onChange={(e) => setNewContactNumber(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button onClick={() => setOpenAddContactModal(false)} sx={{ color: '#424242' }}>Cancelar</Button>
            <Button onClick={handleAddContact} variant="contained" sx={{ backgroundColor: '#1976d2', color: '#ffffff' }}>Guardar Contacto</Button>
          </DialogActions>
        </Dialog>

        {/* Create List Modal */}
        <Dialog open={openCreateListModal} onClose={() => setOpenCreateListModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', py: 1.5 }}>
            Crear Nueva Lista de Distribución
          </DialogTitle>
          <DialogContent dividers>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre de la Lista"
              type="text"
              fullWidth
              variant="outlined"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle1" gutterBottom>Seleccionar Contactos:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SearchIcon sx={{ color: '#616161', mr: 1 }} />
              <TextField
                variant="standard"
                placeholder="Buscar contacto..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                fullWidth
              />
            </Box>
            <Box sx={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px', p: 1 }}>
              {whatsappContacts.length === 0 ? (
                <Typography variant="body2" color="textSecondary">No hay contactos para agregar a la lista.</Typography>
              ) : (
                [...whatsappContacts]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .filter(contact => contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                  .map((contact, index) => (
                    <Box key={contact.id} sx={{ display: 'flex', alignItems: 'center', backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5' }}>
                      <Checkbox
                        checked={selectedContactsForList.includes(contact.id)}
                        onChange={() => handleContactSelectionForList(contact.id)}
                        sx={{ '&.Mui-checked': { color: '#616161' } }}
                      />
                      <Typography>{contact.name} ({contact.phone_number})</Typography>
                    </Box>
                  ))
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button onClick={() => setOpenCreateListModal(false)} sx={{ color: '#424242' }}>Cancelar</Button>
            <Button onClick={handleCreateList} variant="contained" sx={{ backgroundColor: '#1976d2', color: '#ffffff' }}>Crear Lista</Button>
          </DialogActions>
        </Dialog>

        {/* Edit List Modal */}
        <Dialog open={openEditListModal} onClose={handleEditListModalClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', py: 1.5 }}>
            Editar Lista de Distribución
          </DialogTitle>
          <DialogContent dividers>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre de la Lista"
              type="text"
              fullWidth
              variant="outlined"
              value={editedListName}
              onChange={(e) => setEditedListName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle1" gutterBottom>Seleccionar Contactos:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SearchIcon sx={{ color: '#616161', mr: 1 }} />
              <TextField
                variant="standard"
                placeholder="Buscar contacto..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                fullWidth
              />
            </Box>
            <Box sx={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px', p: 1 }}>
              {[...whatsappContacts]
                .sort((a, b) => a.name.localeCompare(b.name))
                .filter(contact => contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                .map((contact, index) => (
                  <Box key={contact.id} sx={{ display: 'flex', alignItems: 'center', backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5' }}>
                    <Checkbox
                      checked={selectedContactsForEditList.includes(contact.id)}
                      onChange={() => {
                        const newSelectedContacts = selectedContactsForEditList.includes(contact.id)
                          ? selectedContactsForEditList.filter(id => id !== contact.id)
                          : [...selectedContactsForEditList, contact.id];
                        setSelectedContactsForEditList(newSelectedContacts);
                      }}
                      sx={{ '&.Mui-checked': { color: '#616161' } }}
                    />
                    <Typography>{contact.name} ({contact.phone_number})</Typography>
                  </Box>
                ))
              }
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button onClick={handleEditListModalClose} sx={{ color: '#424242' }}>Cancelar</Button>
            <Button onClick={handleUpdateList} variant="contained" sx={{ backgroundColor: '#1976d2', color: '#ffffff' }}>Guardar Cambios</Button>
          </DialogActions>
        </Dialog>

        {/* Confirm Delete Contact Modal */}
        {openConfirmDeleteContact && (
          <Dialog open={openConfirmDeleteContact} onClose={handleCancelDeleteContact} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
              <ErrorOutlineIcon sx={{ color: '#fbc02d', fontSize: 40, mb: 1 }} />
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Confirmar Eliminación de Contacto
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center', pt: 0 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ¿Estás seguro de que quieres eliminar el contacto "{contactToDelete?.name}" de forma definitiva?
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button onClick={handleCancelDeleteContact} sx={{ color: '#424242' }}>Cancelar</Button>
              <Button onClick={handleConfirmDeleteContact} sx={{ backgroundColor: '#b71c1c', color: '#ffffff', '&:hover': { backgroundColor: '#d32f2f' } }} variant="contained">Eliminar</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Confirm Delete List Modal */}
        {openConfirmDeleteList && (
          <Dialog open={openConfirmDeleteList} onClose={handleCancelDeleteList} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
              <ErrorOutlineIcon sx={{ color: '#fbc02d', fontSize: 40, mb: 1 }} />
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Confirmar Eliminación de Lista
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center', pt: 0 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ¿Estás seguro de que quieres eliminar la lista "{listToDelete?.name}" de forma definitiva?
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button onClick={handleCancelDeleteList} sx={{ color: '#424242' }}>Cancelar</Button>
              <Button onClick={handleConfirmDeleteList} sx={{ backgroundColor: '#b71c1c', color: '#ffffff', '&:hover': { backgroundColor: '#d32f2f' } }} variant="contained">Eliminar</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Report Modal */}
        <Dialog id="report-container" open={openReportModal} onClose={handleCloseReportModal} maxWidth="md" fullWidth>
          <DialogTitle id="report-title" sx={{
            textAlign: 'center',
            fontWeight: 'bold',
            py: 1.5,
            backgroundColor: alertColorsForTable[selectedEvaluation?.alert_level]?.background || '#e0f2f7',
            color: alertColorsForTable[selectedEvaluation?.alert_level]?.text || '#01579b',
          }}>
            Informe de Gestión de Clave de Saturación
          </DialogTitle>
          <DialogContent dividers>
            <Box id="printable-report-area" sx={{ maxHeight: '60vh', overflowY: 'auto', p: 1 }}>
              {Array.isArray(reportContent) ? (
                reportContent.map((section, index) => (
                  <Box key={index} className="report-section-avoid-break">
                    {section.type === 'editable-analysis' ? (
                      <Box> {/* Apply class to the outer box */}
                        <Typography variant="h6" sx={{ mt: index === 0 ? 0 : 2, mb: 0.5, fontWeight: 'bold' }}>
                          {section.title}
                        </Typography>
                        <Box> {/* Inner box for content, no class needed here as outer box handles break */}
                          <DateTimePicker
                            label="Hora de Reevaluación"
                            value={reEvaluationTime}
                            onChange={(newValue) => {
                              setReEvaluationTime(newValue);
                              setHasUnsavedChangesInDecisionFinal(true);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                sx={{ mb: 2 }}
                              />
                            )}
                            format="DD/MM/YYYY HH:mm"
                            sx={{
                              '& .MuiInputLabel-root': {
                                color: '#333333', // Default label color
                              },
                              '& .MuiInputLabel-root.Mui-focused': {
                                color: '#333333', // Keep label color dark gray when focused
                              },
                              '& .MuiInputLabel-root.Mui-active': { // Targeting active state
                                color: '#333333 !important',
                              },
                              '& .MuiInputLabel-root::selection': { // Targeting text selection on label
                                backgroundColor: 'transparent', // Prevent background color change
                                color: '#333333',
                              },
                              '& .MuiInputBase-input': { // Apply input text color directly here
                                color: '#333333 !important',
                                '-webkit-text-fill-color': '#333333 !important',
                              },
                              '& .MuiInputBase-input:focus': {
                                color: '#333333 !important',
                                '-webkit-text-fill-color': '#333333 !important',
                              },
                              '& .MuiInputBase-input:active': {
                                color: '#333333 !important',
                                '-webkit-text-fill-color': '#333333 !important',
                              },
                              '& .MuiDialogActions-root .MuiButton-root': {
                                color: '#333333 !important', // Dark gray color for dialog buttons
                              },
                            }}
                            slotProps={{
                              actionBar: {
                                actions: ['cancel', 'accept'],
                                sx: {
                                  '&.MuiDialogActions-root .MuiButton-root': {
                                    color: '#333333 !important',
                                  },
                                },
                              },
                            }}
                          />
                          <TextField
                            label="Análisis de la Gestión"
                            multiline
                            fullWidth
                            variant="outlined"
                            value={analysisText}
                            onChange={(e) => setAnalysisText(e.target.value)}
                            rows={10}
                            inputProps={{ style: { textAlign: 'justify' } }}
                            sx={{ mt: 2 }}
                            InputLabelProps={{ sx: { '&.Mui-focused': { color: 'rgba(0, 0, 0, 0.6)' } } }}
                          />
                        </Box>
                      </Box>
                    ) : (
                      // Original rendering for other section types
                      <Box>
                        <Typography variant="h6" sx={{ mt: index === 0 ? 0 : 2, mb: 0.5, fontWeight: 'bold' }}>
                          {section.title}
                        </Typography>
                        {section.type === 'two-column' ? (
                          <Grid container spacing={1}>
                            {section.content.map((item, itemIndex) => (
                              <Grid item xs={6} key={itemIndex} className={section.title !== '1. Datos Generales de la Activación' ? 'report-grid-item--boxed' : ''} sx={section.title !== '1. Datos Generales de la Activación' ? { backgroundColor: '#f0f0f0', borderRadius: '8px', p: 1, border: '4px solid white' } : { p: 1 }}>
                                {section.title === '1. Datos Generales de la Activación' ? (
                                  <Typography variant="body1" sx={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif', lineHeight: 1.6 }}>
                                    <span style={{ fontWeight: 'bold' }}>{item.label}:</span> {item.value}
                                  </Typography>
                                ) : (
                                  <>
                                    <Typography variant="body1" className="report-item-label" sx={{ fontWeight: 'bold', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>{item.label}</Typography>
                                    <Typography variant="body1" className="report-item-value" sx={{ whiteSpace: 'pre-wrap', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif', lineHeight: 1.6 }}>{item.value}</Typography>
                                  </>
                                )}
                              </Grid>
                            ))}
                          </Grid>
                        ) : section.type === 'measures' ? (
                          <List>
                            {section.content.length > 0 ? (
                              [...section.content].sort((a, b) => {
                                const statusOrder = {
                                  'applied': 0,
                                  'in_process': 1,
                                  'not_applied': 2
                                };
                                const priorityA = statusOrder[a.status];
                                const priorityB = statusOrder[b.status];

                                if (priorityA < priorityB) return -1;
                                if (priorityA > priorityB) return 1;

                                return a.original_order_index - b.original_order_index;
                              }).map((action, itemIndex) => (

                                <ListItem 
                                  key={itemIndex} 
                                  className={`measure-status--${action.status}`} /* New dynamic class */
                                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 1, p: 2, borderRadius: 1, border: '1px solid #e0e0e0', borderLeft: action.status === 'applied' ? '8px solid #4CAF50' : (action.status === 'in_process' ? '8px solid #C8E6C9' : '8px solid #e0e0e0'), }}
                                >
                                  <ListItemText primary={action.measure_description} sx={{ textAlign: 'justify' }} />
                                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Estado: {action.status === 'applied' ? 'Aplicada' : action.status === 'in_process' ? 'En Proceso' : 'No Aplicada'}
                                  </Typography>
                                </ListItem>
                              ))
                            ) : (
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif', lineHeight: 1.6 }}>
                                No hay medidas registradas.
                              </Typography>
                            )}
                          </List>
                        ) : section.type === 'decision-final' ? (
                          <Box>
                            <FormControl component="fieldset" fullWidth margin="none">
                              <RadioGroup
                                row
                                name="reEvaluationDecision"
                                value={reEvaluationDecision}
                                onChange={(e) => {
  setReEvaluationDecision(e.target.value);
  setHasUnsavedChangesInDecisionFinal(true);
}}
                              >
                                {selectedEvaluation?.alert_level?.toLowerCase().trim() === 'naranja' && (
                                  <>
                                    <FormControlLabel value="mantener_naranja" control={<Radio />} label="Mantener clave naranja" />
                                    <FormControlLabel value="subir_roja" control={<Radio />} label="Subir a clave roja" />
                                  </>
                                )}
                                {selectedEvaluation?.alert_level?.toLowerCase().trim() === 'roja' && (
                                  <>
                                    <FormControlLabel value="mantener_roja" control={<Radio />} label="Mantener clave roja" />
                                    <FormControlLabel value="bajar_naranja" control={<Radio />} label="Bajar a clave naranja" />
                                  </>
                                )}
                              </RadioGroup>
                            </FormControl>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                              <DateTimePicker
                                label="Horario y fecha de próxima evaluación"
                                value={nextReEvaluationDateTime}
                                onChange={(newValue) => {
  setNextReEvaluationDateTime(newValue);
  setHasUnsavedChangesInDecisionFinal(true);
}}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    fullWidth
                                    margin="normal"
                                    InputLabelProps={{
                                      style: { fontSize: '0.6rem' }, // Keep existing style
                                      sx: { '&.Mui-focused': { color: '#333333' } }
                                    }}
                                  />
                                )}
                                format="DD/MM/YYYY HH:mm:ss"
                                sx={{ // Add sx prop to DateTimePicker
                                  '& .MuiInputLabel-root': {
                                    color: '#333333', // Default label color
                                  },
                                  '& .MuiInputLabel-root.Mui-focused': {
                                    color: '#333333', // Keep label color dark gray when focused
                                  },
                                  '& .MuiInputLabel-root.Mui-active': { // Targeting active state
                                    color: '#333333 !important',
                                  },
                                  '& .MuiInputLabel-root::selection': { // Targeting text selection on label
                                    backgroundColor: 'transparent', // Prevent background color change
                                    color: '#333333',
                                  },
                                }}
                                slotProps={{
                                  actionBar: {
                                    actions: ['cancel', 'accept'],
                                    sx: {
                                      '&.MuiDialogActions-root .MuiButton-root': {
                                        color: '#333333 !important',
                                      },
                                    },
                                  },
                                }}
                              />
                            </LocalizationProvider>
                          </Box>
                        ) : (<Box></Box>)}
                      </Box>
                    )}
                    {index < reportContent.length - 1 && (
                      <Divider sx={{ my: 2 }} />
                    )}
                  </Box>
                ))
              ) : null}
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button onClick={handleCloseReportModal} sx={{ color: '#424242' }}>Cerrar</Button>
            <Button onClick={handleDownloadReport} variant="outlined" sx={{ color: '#1976d2', borderColor: '#1976d2' }}>Descargar</Button>
            <Button onClick={handleSaveAnalysis} variant="contained" sx={{ backgroundColor: '#1976d2', color: '#ffffff' }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* Triggered Measures Modal */}
        {selectedMeasuresEvaluation && (
          <Dialog open={openMeasuresModal} onClose={handleCloseMeasuresModal} maxWidth="sm" fullWidth>
            <DialogTitle sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: alertColorsForTable[selectedMeasuresEvaluation.alert_level]?.background || '#e0f2f7',
              color: alertColorsForTable[selectedMeasuresEvaluation.alert_level]?.text || '#01579b',
              py: 1.5,
            }}>
              Medidas Clave {selectedMeasuresEvaluation.alert_level}
            </DialogTitle>
            <DialogContent dividers>
              <List>
                {selectedMeasuresEvaluation.actions
                  .map((action) => ({
                    measure_description: action.measure_description,
                    id: action.id,
                    status: measuresStatus[action.id] || action.status, // Use current status from state
                    original_order_index: action.original_order_index // Use original_order_index from backend
                  }))
                  .sort((a, b) => {
                    const getStatusPriority = (status) => {
                      if (status === 'not_applied') return 0;
                      if (status === 'in_process') return 1;
                      if (status === 'applied') return 2;
                      return 0;
                    };
                    const priorityA = getStatusPriority(a.status);
                    const priorityB = getStatusPriority(b.status);

                    if (priorityA < priorityB) return -1;
                    if (priorityA > priorityB) return 1;

                    // Secondary sort: by original_order_index from backend
                    return a.original_order_index - b.original_order_index;
                  })
                  .map((action) => (
                    <ListItem key={action.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 1, p: 2, borderRadius: 1, border: '1px solid #e0e0e0', borderLeft: action.status === 'applied' ? '8px solid #4CAF50' : (action.status === 'in_process' ? '8px solid #C8E6C9' : '8px solid #e0e0e0'), }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <ListItemText primary={action.measure_description} sx={{ mb: 1 }} />
                      </Box>
                      <FormControl component="fieldset" variant="standard" sx={{ ml: 2 }} disabled={authState.role === 'viewer'}>
                        <RadioGroup row name={`measure-status-${action.id}`} value={action.status} onChange={(e) => handleMeasureStatusChange(action.id, e.target.value)}>
                          <FormControlLabel value="applied" control={<Radio size="small" />} label="Aplicada" />
                          <FormControlLabel value="in_process" control={<Radio size="small" />} label="En proceso" />
                          <FormControlLabel value="not_applied" control={<Radio size="small" />} label="No aplicada" />
                        </RadioGroup>
                      </FormControl>
                    </ListItem>
                  ))}
              </List>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center' }}>
              <Button onClick={handleCloseMeasuresModal} sx={{ color: '#424242' }}>Cerrar</Button>
            </DialogActions>
          </Dialog>
        )}

      </Box>

      {/* Custom Alert Dialog */}
      <Dialog
        open={openAlertDialog}
        onClose={() => setOpenAlertDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ textAlign: 'center', pb: 1 }}>
          {alertMessage === "Guardado con éxito." ? (
            <CheckCircleOutlineIcon sx={{ color: '#2196f3', fontSize: 40, mb: 1 }} /> // Blue checkmark for success
          ) : (
            <InfoOutlinedIcon sx={{ color: '#2196f3', fontSize: 40, mb: 1 }} /> // Default info icon for other alerts
          )}
          {/* Removed "Información" title */}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 0 }}>
          <Typography
            id="alert-dialog-description"
            variant="body1"
            sx={{ mb: 1, color: alertMessage === "Guardado con éxito." ? '#2196f3' : 'text.primary' }} // Blue color for success
          >
            {alertMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={() => setOpenAlertDialog(false)}
            variant="contained"
            autoFocus
            sx={{
              backgroundColor: '#1976d2', // Always blue
              color: '#ffffff'
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}



export default History;
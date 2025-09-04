import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  FormControl, // New import
  FormLabel,   // New import
  RadioGroup,  // New import
  Radio,       // New import
  FormControlLabel, // New import
  FormHelperText // New import
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // New import
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'; // New import
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'; // New import
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const alertColors = {
  verde: '#e8f5e9',
  amarilla: '#fffde7',
  naranja: '#ffe0b2',
  roja: '#ffebee',
  default: '#9E9E9E',
};

// Helper function to format labels and values
const formatValue = (key, value) => {
    if (key === 'scenario') {
      if (value === 'capacidad_reducida') return 'Capacidad Reducida';
      if (value === 'capacidad_completa') return 'Capacidad Completa';
    }
    if (key === 'critical_patient_protocol') {
      if (value === null || (typeof value === 'string' && value.toLowerCase() === 'none')) return 'No Activado';
      if (value === 'amarilla') return 'Clave Amarilla';
      if (value === 'roja') return 'Clave Roja';
    }
    if (key === 'sar_active') {
      return value ? 'Sí' : 'No';
    }
    if (value === null) {
      return 'No aplica';
    }
    return value.toString();
};

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

function Report({ evaluation, onClose }) {
  const reportRef = useRef();
  const analysisTextFieldRef = useRef(null); // New ref
  const [reEvaluationTime, setReEvaluationTime] = useState('');
  const [reEvaluationTimeError, setReEvaluationTimeError] = useState('');
  const [reEvaluationDecision, setReEvaluationDecision] = useState(''); // New state
  const [reEvaluationDecisionError, setReEvaluationDecisionError] = useState(''); // New state
  const [nextReEvaluationDateTime, setNextReEvaluationDateTime] = useState(null); // New state
  const [analysis, setAnalysis] = useState(
`1. Gestión de Pacientes:
*   Movimientos Efectivos Realizados: 
*   Movimientos Potenciales Adicionales Identificados: 

2. Dificultades y Facilitadores:
*   Principales Dificultades en la Implementación: 
*   Factores que Facilitaron la Gestión: 

3. Comentarios y Recomendaciones Adicionales:`
  );
  const [copySuccess, setCopySuccess] = useState('');

  const generateReportText = () => {
    const inputData = JSON.parse(evaluation.input_data);
    const measuresText = evaluation.actions
      ? evaluation.actions
          .map(
            (action) =>
              `- ${action.measure_description} (Estado: ${
                action.status === 'not_applied'
                  ? 'No Aplicada'
                  : action.status === 'in_process'
                  ? 'En Proceso'
                  : 'Aplicada'
              })`
          )
          .join('\n')
      : 'No hay medidas asociadas.';

    const reportText = `
Informe de Gestión de Clave de Saturación
=======================================

1. Datos Generales de la Activación
-----------------------------------
ID de la Evaluación: ${evaluation.id}
Fecha y Hora de Activación: ${dayjs(evaluation.timestamp).format('DD/MM/YYYY HH:mm:ss')}
Nivel de Alerta Alcanzado: ${evaluation.alert_level}
Puntaje Total Obtenido: ${evaluation.total_score}

2. Criterios de Activación
--------------------------
${Object.entries(inputData)
  .map(([key, value]) => `${inputDataLabels[key] || key}: ${formatValue(key, value)}`)
  .join('\n')}

3. Medidas del Protocolo Implementadas
--------------------------------------
${measuresText}

4. Resultados y Análisis
------------------------
Hora de Reevaluación: ${reEvaluationTime}

${analysis}
`;
    return reportText.trim();
  };


  const handleCopyToClipboard = () => {
    if (!reEvaluationTime) {
      setReEvaluationTimeError('La Hora de Reevaluación es obligatoria.');
      return;
    }
    setReEvaluationTimeError(''); // Clear any previous error

    if (!reEvaluationDecision) {
      setReEvaluationDecisionError('La Decisión Final es obligatoria.');
      return;
    }
    setReEvaluationDecisionError(''); // Clear any previous error

    const reportText = generateReportText();
    navigator.clipboard.writeText(reportText).then(() => {
      setCopySuccess('¡Copiado!');
      setTimeout(() => setCopySuccess(''), 2000);
    }).catch(err => {
      setCopySuccess('Error al copiar');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const handleDownloadPdf = async () => {
    if (!reEvaluationTime) {
      setReEvaluationTimeError('La Hora de Reevaluación es obligatoria.');
      return;
    }
    setReEvaluationTimeError(''); // Clear any previous error

    if (!reEvaluationDecision) {
      setReEvaluationDecisionError('La Decisión Final es obligatoria.');
      return;
    }
    setReEvaluationDecisionError(''); // Clear any previous error

    const input = reportRef.current;
    const originalWidth = input.style.width;
    input.style.width = '794px';

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    let currentY = margin;

    const addElementToPdf = async (element) => {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 190; // 210mm - 2*margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (currentY + imgHeight > pageHeight - margin && currentY > margin) {
        pdf.addPage();
        currentY = margin;
      }

      pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight;
    };

    // --- Start: Temporary replacement for analysis TextField ---
    const analysisInput = analysisTextFieldRef.current; // analysisTextFieldRef.current is now the textarea
    const analysisInputParent = analysisInput.parentNode; // Get the parent of the textarea

    const tempDiv = document.createElement('div');
    tempDiv.textContent = analysisInput.value; // Copy content
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.textAlign = 'justify';
    tempDiv.style.wordBreak = 'break-word';
    tempDiv.style.width = analysisInput.offsetWidth + 'px'; // Match width
    tempDiv.style.padding = window.getComputedStyle(analysisInput).padding; // Match padding
    tempDiv.style.fontFamily = window.getComputedStyle(analysisInput).fontFamily; // Match font
    tempDiv.style.fontSize = window.getComputedStyle(analysisInput).fontSize; // Match font size
    tempDiv.style.lineHeight = window.getComputedStyle(analysisInput).lineHeight; // Match line height
    tempDiv.style.boxSizing = 'border-box'; // Ensure padding is included in width

    analysisInputParent.replaceChild(tempDiv, analysisInput); // Replace textarea with div
    // --- End: Temporary replacement for analysis TextField ---

    await addElementToPdf(document.getElementById('report-part-1'));
    await addElementToPdf(document.getElementById('report-part-2-header'));

    const measureItems = document.querySelectorAll('.measure-item');
    for (const item of measureItems) {
      await addElementToPdf(item);
    }

    const analysisTitleElement = document.getElementById('analysis-title');
    const originalAnalysisTitleText = analysisTitleElement.textContent;
    analysisTitleElement.textContent = '4. Resultados y Análisis';

    await addElementToPdf(document.getElementById('report-part-3'));
    await addElementToPdf(document.getElementById('report-part-4')); // Add this line

    // --- Start: Revert temporary replacement ---
    analysisInputParent.replaceChild(analysisInput, tempDiv); // Revert div back to textarea
    // --- End: Revert temporary replacement ---

    analysisTitleElement.textContent = originalAnalysisTitleText; // Revert the text

    input.style.width = originalWidth;
    pdf.save(`informe-evaluacion-${evaluation.id}.pdf`);
  };

  if (!evaluation) {
    return null;
  }

  const inputData = JSON.parse(evaluation.input_data);

  return (
    <Paper sx={{ p: 3 }}>
      <Box ref={reportRef} sx={{ mb: 3, p: 2, border: '1px solid #eee' }}>
        <div id="report-part-1">
          <Box
            sx={{
              backgroundColor: alertColors[evaluation.alert_level?.toLowerCase().trim()] || alertColors.default,
              p: 2,
              borderRadius: 1,
              mb: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ color: '#333333' }}>
              Informe de Gestión de Clave de Saturación
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>1. Datos Generales de la Activación</Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}><Typography><strong>Fecha y Hora de Activación:</strong> {dayjs(evaluation.timestamp).format('DD/MM/YYYY HH:mm:ss')}</Typography></Grid>
            <Grid item xs={6}><Typography><strong>Nombre del evaluador(a):</strong> {evaluation.evaluator_name}</Typography></Grid>
            <Grid item xs={6}><Typography><strong>Nivel de Alerta Alcanzado:</strong> {evaluation.alert_level}</Typography></Grid>
            <Grid item xs={6}><Typography><strong>Puntaje Total Obtenido:</strong> {evaluation.total_score}</Typography></Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>2. Criterios de Activación</Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {Object.entries(inputData).map(([key, value]) => (
              <Grid item xs={12} sm={6} key={key}>
                <Paper elevation={0} sx={{ p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {inputDataLabels[key] || key}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatValue(key, value)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </div>

        <div id="report-part-2-header">
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>3. Medidas del Protocolo Implementadas</Typography>
        </div>
        <List dense>
            {evaluation.actions && evaluation.actions.map((action) => (
              <div key={action.id} className="measure-item" style={{ pageBreakInside: 'avoid' }}>
                <ListItem
                  sx={{
                    backgroundColor: 'grey.100',
                    borderRadius: 1,
                    mb: 0.5,
                    py: 1,
                    px: 2,
                    borderLeft: action.status === 'applied' ? '8px solid #4CAF50' : (action.status === 'in_process' ? '8px solid #C8E6C9' : '8px solid #e0e0e0'),
                  }}
                >
                  <ListItemText
                    primary={action.measure_description}
                    secondary={`Estado: ${action.status === 'not_applied' ? 'No Aplicada' : action.status === 'in_process' ? 'En Proceso' : 'Aplicada'}`}
                    primaryTypographyProps={{ style: { textAlign: 'justify' } }}
                  />
                </ListItem>
              </div>
            ))}
        </List>

        <div id="report-part-3">
          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom id="analysis-title">4. Resultados y Análisis (Editable)</Typography>
          <TextField
            label="Hora de Reevaluación"
            type="time"
            value={reEvaluationTime}
            onChange={(e) => setReEvaluationTime(e.target.value)}
            fullWidth
            margin="normal"
            required // Add this prop
            error={!!reEvaluationTimeError}
            helperText={reEvaluationTimeError}
            InputLabelProps={{
              shrink: true,
              disableAnimation: true, // Hide the asterisk animation
              required: false, // Hide the asterisk itself
            }}
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
              // New attempts to override input color
              '& .MuiInputBase-input': {
                color: '#333333 !important',
                '-webkit-text-fill-color': '#333333 !important', // For Webkit browsers
              },
              '& .MuiInputBase-input:focus': {
                color: '#333333 !important',
                '-webkit-text-fill-color': '#333333 !important',
              },
              '& .MuiInputBase-input:active': {
                color: '#333333 !important',
                '-webkit-text-fill-color': '#333333 !important',
              },
            }}
        />
        />
          <TextField
            label="Análisis de la Gestión"
            multiline
            rows={10}
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            variant="outlined"
            fullWidth
            inputRef={analysisTextFieldRef} // Assign ref to the internal input element
            id="analysis-textfield" // Keep ID for now, might not be needed
            inputProps={{ style: { textAlign: 'justify', whiteSpace: 'pre-wrap' } }}
          />
        </div>

        <div id="report-part-4">
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>5. Decisión Final</Typography>
          {/* Decision Radio Group */}
          <FormControl component="fieldset" fullWidth margin="normal" error={!!reEvaluationDecisionError}>
            <FormLabel component="legend"></FormLabel>
            <RadioGroup
              row
              name="reEvaluationDecision"
              value={reEvaluationDecision}
              onChange={(e) => setReEvaluationDecision(e.target.value)}
            >
              {/* Temporarily render all options for debugging */}
              <FormControlLabel value="mantener_naranja" control={<Radio />} label="Mantener clave naranja" />
              <FormControlLabel value="subir_roja" control={<Radio />} label="Subir a clave roja" />
              <FormControlLabel value="mantener_roja" control={<Radio />} label="Mantener clave roja" />
              <FormControlLabel value="bajar_naranja" control={<Radio />} label="Bajar a clave naranja" />
            </RadioGroup>
            <FormHelperText>{reEvaluationDecisionError}</FormHelperText>
          </FormControl>

          {/* Next Re-evaluation Date/Time */}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <DateTimePicker
              label="Horario y fecha de próxima evaluación"
              value={nextReEvaluationDateTime}
              onChange={(newValue) => setNextReEvaluationDateTime(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{
                    style: { fontSize: '0.6rem' }, // Keep existing style
                    sx: { '&.Mui-focused': { color: '#333333' } }
                  }} // Adjust font size
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
                    // Target the DialogActions root and then the buttons within it
                    '&.MuiDialogActions-root .MuiButton-root': {
                      color: '#333333 !important', // Force dark gray color
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </div>
      </Box>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#333333' }}>Cerrar</Button>
        <Button onClick={handleCopyToClipboard} sx={{ color: '#333333' }}>{copySuccess || 'Copiar'}</Button>
        <Button onClick={handleDownloadPdf} variant="contained">Descargar como PDF</Button>
      </DialogActions>

      <Snackbar
          open={!!reEvaluationTimeError}
          autoHideDuration={6000}
          onClose={() => setReEvaluationTimeError('')}
          message={reEvaluationTimeError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
}

export default Report;
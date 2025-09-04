import React, { useEffect, useState, useCallback } from 'react';
import { useCalculator } from './CalculatorContext';
import { Box, Typography, TextField, Button, Paper, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Grid, Alert, List, ListItem, ListItemText, Checkbox } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from './AuthContext';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

const API_URL = 'http://localhost:8000';

const alertColors = {
  "Verde": { background: '#e8f5e9', text: '#2e7d32' },
  "Amarilla": { background: '#fffde7', text: '#fbc02d' },
  "Naranja": { background: '#ffe0b2', text: '#ef6c00' },
  "Roja": { background: '#ffebee', text: '#c62828' },
};

function MedicoQuirurgicoProtocol() {
  const { authState } = useAuth();
  const {
    scenario,
    setScenario,
    hospitalizedPatients, setHospitalizedPatients,
    esiC2Patients, setEsiC2Patients,
    reanimadorPatients, setReanimadorPatients,
    criticalPatientProtocol,
    setCriticalPatientProtocol,
    waiting72HoursPatients, setWaiting72HoursPatients,
    sarActive, setSarActive,
    sarPatients, setSarPatients,
    result, setResult,
    error, setError,
    measureStatus, setMeasureStatus,
    resetCalculatorState,
    evaluations,
    fetchEvaluations,
  } = useCalculator();
  const [copySuccess, setCopySuccess] = useState(false);
  const [evaluatorName, setEvaluatorName] = useState(''); // New state variable for evaluator name

  const stableFetchEvaluations = useCallback(fetchEvaluations, [fetchEvaluations]);

  useEffect(() => {
    if (authState.token) {
      stableFetchEvaluations(authState.token);
    }
  }, [authState.token, stableFetchEvaluations]);

  const loadLatestEvaluation = () => {
    if (evaluations && evaluations.length > 0) {
      const latest = evaluations[0];
      const data = JSON.parse(latest.input_data);
      setScenario(data.scenario || 'capacidad_reducida');
      setHospitalizedPatients(data.hospitalized_patients?.toString() || '');
      setEsiC2Patients(data.esi_c2_patients?.toString() || '');
      setReanimadorPatients(data.reanimador_patients?.toString() || '');
      setCriticalPatientProtocol(data.critical_patient_protocol || 'none');
      setWaiting72HoursPatients(data.waiting_72_hours_patients?.toString() || '');
      setSarActive(data.sar_active || false);
      setSarPatients(data.sar_patients?.toString() || '');
      setResult(null);
      setError(null);
    }
  };

  useEffect(() => {
    if (result && result.measures) {
      const initialStatus = {};
      result.measures.forEach(measure => {
        initialStatus[measure.id] = measure.status || 'not_applied';
      });
      setMeasureStatus(initialStatus);
    } else {
      if (Object.keys(measureStatus).length > 0) {
        setMeasureStatus({});
      }
    }
  }, [result, setMeasureStatus, measureStatus]);

  const handleMeasureStatusChange = async (measureId, status) => {
    try {
      const response = await fetch(`${API_URL}/actions/${measureId}`, {
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
      setMeasureStatus(prevStatus => ({
        ...prevStatus,
        [measureId]: status,
      }));
      setResult(prevResult => {
        if (!prevResult) return null;
        const updatedMeasures = prevResult.measures.map(measure =>
          measure.id === measureId ? { ...measure, status: status } : measure
        );
        return { ...prevResult, measures: updatedMeasures };
      });
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado de la medida.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResult(null);
    setError(null);
    if (!scenario || hospitalizedPatients === '' || esiC2Patients === '' || (!sarActive && reanimadorPatients === '') ||
      criticalPatientProtocol === '' || waiting72HoursPatients === '' || (sarActive && sarPatients === '')) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (sarActive) {
      const sarPatientsNum = parseInt(sarPatients || 0);
      if (scenario === 'capacidad_reducida' && sarPatientsNum < 6) {
        setError('Para la capacidad reducida, el número de pacientes en SAR debe ser 6 o más.');
        return;
      }
      if (scenario === 'capacidad_completa' && sarPatientsNum < 8) {
        setError('Para la capacidad completa, el número de pacientes en SAR debe ser 8 o más.');
        return;
      }
    }
    const inputData = {
      scenario,
      hospitalized_patients: parseInt(hospitalizedPatients || 0),
      reanimador_patients: sarActive ? 0 : parseInt(reanimadorPatients || 0),
      esi_c2_patients: parseInt(esiC2Patients || 0),
      critical_patient_protocol: criticalPatientProtocol || "none",
      waiting_72_hours_patients: parseInt(waiting72HoursPatients || 0),
      sar_active: Boolean(sarActive),
      sar_patients: sarActive ? parseInt(sarPatients || 0) : 0,
      timestamp: dayjs().tz('America/Santiago').utc().toISOString(),
      evaluator_name: evaluatorName, // Added evaluator name
    };
    console.log('DEBUG MedicoQuirurgicoProtocol.js - token before fetch:', authState.token);
    try {
      const response = await fetch(`${API_URL}/calculate-medico-quirurgico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify(inputData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.detail || 'Error al calcular el riesgo.');
        return;
      }
      const data = await response.json();
      setResult(data);
      stableFetchEvaluations(authState.token); // Actualiza el historial de evaluaciones
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  const sortedMeasures =
    result && result.measures ? result.measures.map((measure) => ({ // Removed index here
      measure: measure.measure_description,
      id: measure.id,
      status: measure.status || 'not_applied',
      // originalIndex: index // Removed originalIndex here
    })).sort((a, b) => {
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
    }) : [];

  const handleCopyToClipboard = () => {
    if (!result) return;
    const measuresText = sortedMeasures.length > 0
      ? sortedMeasures.map(item => {
        const statusLabel = {
          applied: '(Aplicada)',
          in_process: ' (En proceso)',
          not_applied: ' (No aplicada)',
        }[item.status] || '';
        return `- ${item.measure} ${statusLabel}`;
      }).join('\n')
      : 'Sin medidas específicas.';
    const textToCopy = `Resultados del Protocolo de Saturación:\n- Nivel de Alerta: ${result.alert_level}\n- Puntaje Total: ${result.score}\n\nMedidas a Aplicar:\n${measuresText}\n\n${result.reevaluation_note ? `Nota: ${result.reevaluation_note}` : ''}`.trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      setError('No se pudo copiar al portapapeles.');
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
          Protocolo de Saturación Médico/Quirúrgico
        </Typography>
        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend" sx={{ '&.Mui-focused': { color: 'grey' } }}>Situación del Reanimador</FormLabel>
          <RadioGroup row name="scenario" value={scenario} onChange={(e) => setScenario(e.target.value)}>
            <FormControlLabel value="capacidad_reducida" control={<Radio />} label="Capacidad Reducida" />
            <FormControlLabel value="capacidad_completa" control={<Radio />} label="Capacidad Completa" />
          </RadioGroup>
        </FormControl>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Número de pacientes hospitalizados" variant="outlined" fullWidth margin="normal" type="number" value={hospitalizedPatients} onChange={(e) => setHospitalizedPatients(e.target.value)} InputLabelProps={{ sx: { '&.Mui-focused': { color: 'grey' } } }} /></Grid>
            <Grid item xs={12}><TextField label="Número total de ESI C2 (en atención y en espera)" variant="outlined" fullWidth margin="normal" type="number" value={esiC2Patients} onChange={(e) => setEsiC2Patients(e.target.value)} InputLabelProps={{ sx: { '&.Mui-focused': { color: 'grey' } } }} /></Grid>
            <Grid item xs={12}><TextField label="Número de pacientes en Reanimador" variant="outlined" fullWidth margin="normal" type="number" value={reanimadorPatients} onChange={(e) => setReanimadorPatients(e.target.value)} disabled={sarActive} InputLabelProps={{ sx: { '&.Mui-focused': { color: 'grey' } } }} /></Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <FormLabel sx={{ '&.Mui-focused': { color: 'grey' } }}>Protocolo paciente crítico</FormLabel>
                <RadioGroup row name="criticalPatientProtocol" value={criticalPatientProtocol} onChange={(e) => setCriticalPatientProtocol(e.target.value)}>
                  <FormControlLabel value="none" control={<Radio />} label="No activado" />
                  <FormControlLabel value="amarilla" control={<Radio />} label="Clave Amarilla" />
                  <FormControlLabel value="roja" control={<Radio />} label="Clave Roja" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12}><TextField label="Número de pacientes en espera de cama hospitalaria por 72+ horas" variant="outlined" fullWidth margin="normal" type="number" value={waiting72HoursPatients} onChange={(e) => setWaiting72HoursPatients(e.target.value)} InputLabelProps={{ sx: { '&.Mui-focused': { color: 'grey' } } }} /></Grid>
            <Grid item xs={12}><TextField label="Nombre del Evaluador" variant="outlined" fullWidth margin="normal" value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} required InputLabelProps={{ required: false, sx: { '&.Mui-focused': { color: 'grey' } } }} /></Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox checked={sarActive} onChange={(e) => setSarActive(e.target.checked)} sx={{ '&.Mui-checked': { color: '#1976d2' } }} />} label={
                <React.Fragment>
                  Activar Sobresaturación Aguda de Reanimador (SAR)
                  <Typography variant="caption" display="block" color="text.secondary">
                    {scenario === 'capacidad_reducida' ? '(Condición SAR: Suma de pacientes en reanimador y supernumerarios ≥ 6)' : '(Condición SAR: Suma de pacientes en reanimador y supernumerarios ≥ 8)'}
                  </Typography>
                </React.Fragment>
              }
              />
            </Grid>
            {sarActive && (<Grid item xs={12}><TextField label="Pacientes en SAR (Reanimador + supernumerarios)" variant="outlined" fullWidth margin="normal" type="number" value={sarPatients} onChange={(e) => setSarPatients(e.target.value)} InputLabelProps={{ sx: { '&.Mui-focused': { color: 'grey' } } }} /></Grid>)}
          </Grid>
          <Box sx={{ mt: 3, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button type="submit" variant="contained" sx={{ flex: '1 1 100%', mb: { xs: 1, sm: 0 }, backgroundColor: '#1976d2', color: 'white' }} disabled={authState.role === 'viewer'}>Calcular Nivel de Saturación</Button>
            <Button type="button" variant="outlined" color="info" onClick={loadLatestEvaluation} disabled={!evaluations || evaluations.length === 0} sx={{ flex: '1 1 48%' }}>Cargar Última Evaluación</Button>
            <Button type="button" variant="outlined" color="info" onClick={resetCalculatorState} sx={{ flex: '1 1 48%' }}>Reiniciar Calculadora</Button>
          </Box>
        </Box>
      </Paper>
      {error && (<Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>)}
      {result && (
        <Paper elevation={3} sx={{ p: 4, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>Resultados del Protocolo</Typography>
            <Button startIcon={<ContentCopyIcon />} onClick={handleCopyToClipboard} disabled={copySuccess} sx={{ color: 'grey' }}>{copySuccess ? '¡Copiado!' : 'Copiar'}</Button>
          </Box>
          <Typography variant="body1">Puntaje Total: <strong>{result.score}</strong></Typography>
          <Typography variant="h5" sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: alertColors[result.alert_level]?.background || 'transparent', color: alertColors[result.alert_level]?.text || 'inherit', fontWeight: 'bold', fontSize: '1.8rem', display: 'inline-block' }}>
            Nivel de Alerta: {result.alert_level}
          </Typography>
          {result.alert_level !== "Verde" && (<Typography variant="h6" sx={{ mt: 2 }} gutterBottom>Medidas a Aplicar:</Typography>)}
          <List>
            {sortedMeasures.map((item) => (
              <ListItem key={item.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 1, p: 2, borderRadius: 1, border: '1px solid #e0e0e0', borderLeft: item.status === 'applied' ? '8px solid #4CAF50' : (item.status === 'in_process' ? '8px solid #C8E6C9' : '8px solid #e0e0e0'), }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <ListItemText primary={result.alert_level === "Verde" ? item.measure : `${item.measure}`} sx={{ mb: 1 }} />
                </Box>
                {result.alert_level !== "Verde" && (
                  <FormControl component="fieldset" variant="standard" sx={{ ml: 2 }}>
                    <RadioGroup row name={`measure-status-${item.id}`} value={item.status} onChange={(e) => handleMeasureStatusChange(item.id, e.target.value)}>
                      <FormControlLabel value="applied" control={<Radio size="small" />} label="Aplicada" />
                      <FormControlLabel value="in_process" control={<Radio size="small" />} label="En proceso" />
                      <FormControlLabel value="not_applied" control={<Radio size="small" />} label="No aplicada" />
                    </RadioGroup>
                  </FormControl>
                )}
              </ListItem>
            ))}
          </List>
          {result.reevaluation_note && (
            <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: alertColors[result.alert_level]?.background || '#f5f5f5', color: alertColors[result.alert_level]?.text || '#616161', }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'inherit' }}>
                NOTA: {result.reevaluation_note}
              </Typography>
            </Paper>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default MedicoQuirurgicoProtocol;
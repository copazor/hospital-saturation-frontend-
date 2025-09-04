import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormGroup,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  Modal,
} from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useCalculator } from './CalculatorContext';
import { useAuth } from './AuthContext';
import dayjs from 'dayjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler);

const segmentColors = {
  "Verde": { background: 'rgba(75, 192, 192, 0.6)', border: 'rgba(75, 192, 192, 1)' },
  "Amarilla": { background: 'rgba(255, 206, 86, 0.6)', border: 'rgba(255, 206, 86, 1)' },
  "Naranja": { background: 'rgba(255, 159, 64, 0.6)', border: 'rgba(255, 159, 64, 1)' },
  "Roja": { background: 'rgba(255, 99, 132, 0.6)', border: 'rgba(255, 99, 132, 1)' },
  
  "Claves de Contención (Verde y Amarilla)": { background: 'rgba(120, 220, 120, 0.6)', border: 'rgba(120, 220, 120, 1)' }, // Un color combinado
  "Claves de intervención (Naranja y Roja)": { background: 'rgba(255, 150, 150, 0.6)', border: 'rgba(255, 150, 150, 1)' }, // Rojo claro
};

const criteria = [
    { key: 'hospitalized_patients', label: 'Pacientes Hospitalizados' },
    { key: 'esi_c2_patients', label: 'Pacientes ESI C2 en Espera y Atención' },
    { key: 'reanimador_patients', label: 'Pacientes en Reanimador' },
    { key: 'waiting_72_hours_patients', label: 'Pacientes >72 horas en UEH' },
    { key: 'total_score', label: 'Puntaje Calculado'}
];

// Custom Checkbox Icons
const CustomCheckboxIcon = ({ color }) => (
  <Box sx={{
    width: 18, height: 18, bgcolor: color, borderRadius: '3px', border: '1px solid rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white' }} />
  </Box>
);

const CustomSquareIcon = ({ color }) => (
  <Box sx={{
    width: 18, height: 18, bgcolor: color, borderRadius: '3px', border: '1px solid rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
  </Box>
);

const CustomCheckboxCheckedIcon = ({ color }) => (
  <Box sx={{
    width: 18, height: 18, bgcolor: color, borderRadius: '3px', border: '1px solid rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#757575' }} />
  </Box>
);

function Statistics() {
  const { evaluations, fetchEvaluations } = useCalculator();
  const { authState } = useAuth();
  const { token } = authState;
  console.log('DEBUG Statistics.js - token:', token);
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month'));
  const [endDate, setEndDate] = useState(dayjs());
  const [granularity, setGranularity] = useState('day');
  const [selectedAlertLevels, setSelectedAlertLevels] = useState([]);
  const [hospitalizedView, setHospitalizedView] = useState('both');
  const [esiC2View, setEsiC2View] = useState('both');
  const [reanimadorView, setReanimadorView] = useState('both');
  const [waiting72HoursView, setWaiting72HoursView] = useState('both');
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [showSar, setShowSar] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false);
  const [fullScreenCriticalPatientProtocol, setFullScreenCriticalPatientProtocol] = useState(false);
  const [fullScreenHospitalizedPatientsChart, setFullScreenHospitalizedPatientsChart] = useState(false);
  const [fullScreenEsiC2PatientsChart, setFullScreenEsiC2PatientsChart] = useState(false);
  const [fullScreenReanimadorPatientsChart, setFullScreenReanimadorPatientsChart] = useState(false);
  const [fullScreenWaiting72HoursPatientsChart, setFullScreenWaiting72HoursPatientsChart] = useState(false);

  React.useEffect(() => {
    if (token) {
      // For statistics, we generally want all data within the selected date range.
      // If no date range is selected, fetch all available data (limit=null).
      // The backend will handle the default limit of 30 if no dates are provided.
      fetchEvaluations(token, startDate, endDate, null);
    }
  }, [token, startDate, endDate, fetchEvaluations]);

  const parseInputData = (data) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Error parsing input_data string:", e);
        return {}; // Return an empty object or handle error as appropriate
      }
    }
    return data;
  };

  const handleGranularityChange = (event, newGranularity) => {
    if (newGranularity !== null) {
      setGranularity(newGranularity);
    }
  };

  const handleHospitalizedViewChange = (event, newView) => {
    if (newView !== null) {
      setHospitalizedView(newView);
      console.log('hospitalizedView changed to:', newView); // Added console.log
    }
  };

  const handleEsiC2ViewChange = (event, newView) => {
    if (newView !== null) {
      setEsiC2View(newView);
      console.log('esiC2View changed to:', newView); // Added console.log
    }
  };

  const handleReanimadorViewChange = (event, newView) => {
    if (newView !== null) {
      setReanimadorView(newView);
      console.log('reanimadorView changed to:', newView);
    }
  };

  const handleWaiting72HoursViewChange = (event, newView) => {
    if (newView !== null) {
      setWaiting72HoursView(newView);
      console.log('waiting72HoursView changed to:', newView);
    }
  };

  const handleAlertLevelChange = (level) => {
    setSelectedAlertLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handlePredict = async () => {
    setLoadingPrediction(true);
    try {
        const response = await fetch('https://hospital-saturation-backend.onrender.com/predict', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setPredictionData(data.predictions);
    } catch (error) {
        console.error("Failed to fetch prediction:", error);
        // Handle error appropriately in the UI
    } finally {
        setLoadingPrediction(false);
    }
  };

  const filteredEvaluations = useMemo(() => {
    if (!evaluations) return [];
    return evaluations.filter(ev => {
      const evalDate = dayjs(ev.timestamp);
      const start = dayjs.isDayjs(startDate) ? startDate : dayjs(startDate);
      const end = dayjs.isDayjs(endDate) ? endDate : dayjs(endDate);
      if (!start.isValid() || !end.isValid()) return false;
      return evalDate.isAfter(start.startOf('day')) && evalDate.isBefore(end.endOf('day'));
    });
  }, [evaluations, startDate, endDate]);

  const alertLevelData = useMemo(() => {
    if (!filteredEvaluations || filteredEvaluations.length === 0) {
        return { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }], percentages: [] };
    }
    const counts = filteredEvaluations.reduce((acc, ev) => {
        acc[ev.alert_level] = (acc[ev.alert_level] || 0) + 1;
        return acc;
    }, {});

    const combinedContencionLabel = 'Claves de Contención (Verde y Amarilla)';
    const combinedIntervencionLabel = 'Claves de intervención (Naranja y Roja)';

    const isContencionSelected = selectedAlertLevels.includes(combinedContencionLabel);
    const isIntervencionSelected = selectedAlertLevels.includes(combinedIntervencionLabel);

    let chartLabels = [];
    let chartData = [];
    let chartBackgroundColors = [];
    let chartBorderColors = [];

    // Logic for chart data
    if (isContencionSelected) {
        const combinedValue = (counts["Verde"] || 0) + (counts["Amarilla"] || 0);
        if (combinedValue > 0) {
            chartLabels.push(combinedContencionLabel);
            chartData.push(combinedValue);
            chartBackgroundColors.push(segmentColors[combinedContencionLabel].background);
            chartBorderColors.push(segmentColors[combinedContencionLabel].border);
        }
    } else {
        if (counts["Verde"] > 0) {
            chartLabels.push("Verde");
            chartData.push(counts["Verde"]);
            chartBackgroundColors.push(segmentColors["Verde"].background);
            chartBorderColors.push(segmentColors["Verde"].border);
        }
        if (counts["Amarilla"] > 0) {
            chartLabels.push("Amarilla");
            chartData.push(counts["Amarilla"]);
            chartBackgroundColors.push(segmentColors["Amarilla"].background);
            chartBorderColors.push(segmentColors["Amarilla"].border);
        }
    }

    if (isIntervencionSelected) {
        const combinedValue = (counts["Naranja"] || 0) + (counts["Roja"] || 0);
        if (combinedValue > 0) {
            chartLabels.push(combinedIntervencionLabel);
            chartData.push(combinedValue);
            chartBackgroundColors.push(segmentColors[combinedIntervencionLabel].background);
            chartBorderColors.push(segmentColors[combinedIntervencionLabel].border);
        }
    } else {
        if (counts["Naranja"] > 0) {
            chartLabels.push("Naranja");
            chartData.push(counts["Naranja"]);
            chartBackgroundColors.push(segmentColors["Naranja"].background);
            chartBorderColors.push(segmentColors["Naranja"].border);
        }
        if (counts["Roja"] > 0) {
            chartLabels.push("Roja");
            chartData.push(counts["Roja"]);
            chartBackgroundColors.push(segmentColors["Roja"].background);
            chartBorderColors.push(segmentColors["Roja"].border);
        }
    }

    // If no specific alert levels are selected, show all original levels
    if (selectedAlertLevels.length === 0) {
        chartLabels = [];
        chartData = [];
        chartBackgroundColors = [];
        chartBorderColors = [];
        ["Verde", "Amarilla", "Naranja", "Roja"].forEach(label => {
            if (counts[label] > 0) {
                chartLabels.push(label);
                chartData.push(counts[label]);
                chartBackgroundColors.push(segmentColors[label].background);
                chartBorderColors.push(segmentColors[label].border);
            }
        });
    }

    const total = chartData.reduce((sum, val) => sum + val, 0);
    const displayPercentages = chartData.map(val => {
        let percentage;
        if (total > 0) {
            percentage = (val / total * 100).toFixed(1);
        } else {
            percentage = 0;
        }
        return percentage;
    });

    return {
        labels: chartLabels,
        datasets: [{
            data: chartData,
            backgroundColor: chartBackgroundColors,
            borderColor: chartBorderColors,
            borderWidth: 1,
        }],
        percentages: displayPercentages,
    };
}, [filteredEvaluations, selectedAlertLevels]);

  

  const alertLevelOptions = useMemo(() => ({
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      datalabels: {
        id: 'datalabels',
        beforeDraw: function(chart) {
          const { height, ctx } = chart;
          ctx.restore();
          const fontSize = (height / 114).toFixed(2);
          ctx.font = fontSize + "em sans-serif";
          ctx.textBaseline = "middle";
        },
        formatter: (value, ctx) => {
          const dataArr = ctx.chart.data.datasets[0].data.filter(d => d > 0);
          let sum = dataArr.reduce((a, b) => a + b, 0);
          let percentage = (value * 100 / sum).toFixed(1) + '% ';
          return percentage;
        },
        color: '#000',
        font: { weight: 'bold' }
      }
    },
    layout: { padding: { top: 0, bottom: 0 } }
  }), []);

  const criticalPatientProtocolData = useMemo(() => {
    if (!filteredEvaluations || filteredEvaluations.length === 0) {
        return { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }] };
    }
    let noneCount = 0;
    let yellowCount = 0;
    let redCount = 0;

    filteredEvaluations.forEach(ev => {
      const inputData = parseInputData(ev.input_data);
      if (inputData.critical_patient_protocol === 'none') {
        noneCount++;
      } else if (inputData.critical_patient_protocol === 'amarilla') {
        yellowCount++;
      } else if (inputData.critical_patient_protocol === 'roja') {
        redCount++;
      }
    });

    return {
      labels: ['No activado', 'Clave Amarilla Crítica', 'Clave Roja Crítica'],
      datasets: [{
        data: [noneCount, yellowCount, redCount],
        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
        borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)'],
        borderWidth: 1,
      }],
    };
  }, [filteredEvaluations]);

  const criticalPatientProtocolOptions = useMemo(() => ({
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      datalabels: {
        formatter: (value, ctx) => {
          if (!ctx.chart.data.datasets || ctx.chart.data.datasets.length === 0) {
            return '';
          }
          // If the value is 0, return an empty string to hide the label
          if (value === 0) {
            return '';
          }
          const dataArr = ctx.chart.data.datasets[0].data.filter(d => d > 0);
          let sum = dataArr.reduce((a, b) => a + b, 0);
          let percentage = (value * 100 / sum).toFixed(1) + '% ';
          return percentage;
        },
        color: '#fff',
        font: { weight: 'bold' }
      }
    },
    layout: { padding: { top: 0, bottom: 0 } }
  }), []);

  const timeSeriesData = useMemo(() => {
    if (!filteredEvaluations) {
      return {};
    }
    console.log('filteredEvaluations length:', filteredEvaluations.length);
    const getReportingDayKey = (timestamp) => {
      const ts = dayjs(timestamp);
      if (ts.hour() >= 7) {
        return ts.format('YYYY-MM-DD');
      } else {
        return ts.subtract(1, 'day').format('YYYY-MM-DD');
      }
    };

    const getTimeSlot = (timestamp) => {
      const ts = dayjs(timestamp);
      if (ts.hour() >= 7 && ts.hour() < 19) {
        return 'morning';
      } else {
        return 'night';
      }
    };

    const totalSarPatients = filteredEvaluations.reduce((sum, ev) => sum + (parseInputData(ev.input_data).sar_patients || 0), 0);
    const sarActivationCount = filteredEvaluations.filter(ev => (parseInputData(ev.input_data).sar_patients || 0) > 0).length;
    const overallSarAverage = sarActivationCount > 0 ? totalSarPatients / sarActivationCount : 0;

    const chartDataByCriterion = {};

    if (granularity === 'day') {
      const dailyRecords = [];
      filteredEvaluations.forEach(ev => {
        dailyRecords.push({
          timestamp: ev.timestamp,
          input_data: parseInputData(ev.input_data),
          reportingDayKey: getReportingDayKey(ev.timestamp),
          timeSlot: getTimeSlot(ev.timestamp),
          total_score: ev.total_score,
          alert_level: ev.alert_level,
        });
      });
      dailyRecords.sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)));

      criteria.forEach(({ key, label }) => {
        const datasets = [];
        let currentLabels = dailyRecords.map(record => dayjs(record.timestamp).format('DD/MM HH:mm'));

        if (key === 'total_score') {
          const allLabelsSet = new Set();
          dailyRecords.forEach(record => allLabelsSet.add(dayjs(record.timestamp).format('DD/MM HH:mm')));
          if (predictionData) {
            const lastHistoricalDate = dailyRecords.length > 0 ? dayjs(dailyRecords[dailyRecords.length - 1].timestamp) : null;
            if (lastHistoricalDate) {
              for (let i = 0; i < predictionData.length; i++) {
                const predDate = lastHistoricalDate.add(i + 1, 'day');
                allLabelsSet.add(predDate.format('DD/MM HH:mm'));
              }
            }
          }
          const allLabels = Array.from(allLabelsSet).sort((a, b) => dayjs(a, 'DD/MM HH:mm').diff(dayjs(b, 'DD/MM HH:mm')));

          const historicalData = allLabels.map(label => {
            const record = dailyRecords.find(r => dayjs(r.timestamp).format('DD/MM HH:mm') === label);
            return record ? record.total_score || 0 : null;
          });

          datasets.push({
            label: 'Puntaje histórico',
            data: historicalData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: false,
            tension: 0.1,
            yAxisID: 'y',
            datalabels: { display: false },
          });

          if (predictionData) {
            const lastHistoricalDate = dailyRecords.length > 0 ? dayjs(dailyRecords[dailyRecords.length - 1].timestamp) : null;
            const predictionValues = allLabels.map(label => null);
            const confidenceLower = allLabels.map(label => null);
            const confidenceUpper = allLabels.map(label => null);

            if (lastHistoricalDate) {
              for (let i = 0; i < predictionData.length; i++) {
                const pred = predictionData[i];
                const predDate = lastHistoricalDate.add(i + 1, 'day');
                const labelIndex = allLabels.indexOf(predDate.format('DD/MM HH:mm'));
                if (labelIndex !== -1) {
                  predictionValues[labelIndex] = pred.predicted_value;
                  confidenceLower[labelIndex] = pred.confidence_min;
                  confidenceUpper[labelIndex] = pred.confidence_max;
                }
              }
            }

            datasets.push({
              label: 'Predicción de puntaje (7 días)',
              data: predictionValues,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: false,
              borderDash: [5, 5],
              tension: 0.1,
              yAxisID: 'y',
              datalabels: { display: false },
            });

            

            
          }
          chartDataByCriterion[key] = { labels: allLabels, datasets };
        } else if (key === 'esi_c2_patients') {
            let relevantRecords = [];
            let averageValue = 0;
            let averageLabel = '';

            if (esiC2View === 'day') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'morning');
                const dayTotal = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? dayTotal / relevantRecords.length : 0;
                averageLabel = 'Promedio ESI C2 Diurno';
            } else if (esiC2View === 'night') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'night');
                const nightTotal = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? nightTotal / relevantRecords.length : 0;
                averageLabel = 'Promedio ESI C2 Nocturno';
            } else { // esiC2View === 'both'
                relevantRecords = dailyRecords;
                const total = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? total / relevantRecords.length : 0;
                averageLabel = 'Promedio ESI C2 General';
            }

            currentLabels = relevantRecords.map(record => dayjs(record.timestamp).format('DD/MM HH:mm'));

            datasets.push({
                label: '',
                data: relevantRecords.map(record => record.input_data[key] || 0),
                backgroundColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 0.8)' : 'rgba(0, 0, 139, 0.8)'),
                borderColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 1)' : 'rgba(0, 0, 139, 1)'),
                borderWidth: 1,
                type: 'bar',
                yAxisID: 'y',
                datalabels: { display: false },
            });

            datasets.push({
                label: '',
                data: currentLabels.map(() => averageValue),
                borderColor: 'rgba(255, 99, 132, 1)',
                type: 'line',
                borderDash: [5, 5],
                pointRadius: 0,
                yAxisID: 'y',
                datalabels: { display: false },
                fill: false,
            });
            chartDataByCriterion[key] = { labels: currentLabels, datasets, averageValue };
        } else if (key === 'hospitalized_patients') {
            let relevantRecords = [];
            let averageValue = 0;
            let averageLabel = '';

            if (hospitalizedView === 'day') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'morning');
                const dayTotal = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? dayTotal / relevantRecords.length : 0;
                averageLabel = 'Promedio Diurno';
            } else if (hospitalizedView === 'night') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'night');
                const nightTotal = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? nightTotal / relevantRecords.length : 0;
                averageLabel = 'Promedio Nocturno';
            } else { // hospitalizedView === 'both'
                relevantRecords = dailyRecords;
                const total = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? total / relevantRecords.length : 0;
                averageLabel = 'Promedio General';
            }

            currentLabels = relevantRecords.map(record => dayjs(record.timestamp).format('DD/MM HH:mm'));

            datasets.push({
                label: '',
                data: relevantRecords.map(record => record.input_data[key] || 0),
                backgroundColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 0.8)' : 'rgba(0, 0, 139, 0.8)'),
                borderColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 1)' : 'rgba(0, 0, 139, 1)'),
                borderWidth: 1,
                type: 'bar',
                yAxisID: 'y',
                datalabels: { display: false },
            });

            datasets.push({
                label: '',
                data: currentLabels.map(() => averageValue),
                borderColor: 'rgba(255, 99, 132, 1)',
                type: 'line',
                borderDash: [5, 5],
                pointRadius: 0,
                yAxisID: 'y',
                datalabels: { display: false },
                fill: false,
            });
            chartDataByCriterion[key] = { labels: currentLabels, datasets, averageValue };
        } else if (key === 'reanimador_patients') {
            let relevantRecords = [];
            let averageLabel = '';

            if (reanimadorView === 'day') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'morning');
                averageLabel = 'Promedio Diurno';
            } else if (reanimadorView === 'night') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'night');
                averageLabel = 'Promedio Nocturno';
            } else { // reanimadorView === 'both'
                relevantRecords = dailyRecords;
                averageLabel = 'Promedio General';
            }

            let currentLabels = relevantRecords.map(record => dayjs(record.timestamp).format('DD/MM HH:mm'));
            let datasets = [];

            const reanimadorData = relevantRecords.map(record => record.input_data[key] || 0); // Data for the main bar
            const sarData = relevantRecords.map(record => record.input_data.sar_patients || 0); // Data for SAR bar

            let valuesForAverage = [];
            let countForAverage = 0;

            relevantRecords.forEach((record, index) => {
                const reanimadorVal = reanimadorData[index];
                const sarVal = sarData[index];

                let valueToAdd = 0;
                let shouldCount = false;

                if (reanimadorVal > 0) {
                    valueToAdd = reanimadorVal;
                    shouldCount = true;
                } else if (reanimadorVal === 0 && sarVal === 0) {
                    valueToAdd = 0;
                    shouldCount = true;
                } else if (sarVal > 0 && (reanimadorView === 'both' || showSar)) {
                    valueToAdd = sarVal;
                    shouldCount = true;
                }
                // If reanimadorVal is 0 and sarVal > 0 but SAR is not visible, shouldCount remains false, so it's skipped.

                if (shouldCount) {
                    valuesForAverage.push(valueToAdd);
                    countForAverage++;
                }
            });

            const reanimadorAverage = countForAverage > 0 ? valuesForAverage.reduce((sum, val) => sum + val, 0) / countForAverage : 0;

            datasets.push({
                label: 'Pacientes en Reanimador',
                data: reanimadorData,
                backgroundColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 0.8)' : 'rgba(0, 0, 139, 0.8)'),
                borderColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 1)' : 'rgba(0, 0, 139, 1)'),
                borderWidth: 1,
                type: 'bar',
                yAxisID: 'y',
                datalabels: { display: false },
            });

            datasets.push({
                label: averageLabel,
                data: currentLabels.map(() => reanimadorAverage),
                borderColor: 'rgba(255, 99, 132, 1)',
                type: 'line',
                borderDash: [5, 5],
                pointRadius: 0,
                yAxisID: 'y',
                datalabels: { display: false },
                fill: false,
            });

            if (reanimadorView === 'both' || showSar) { // SAR included in General by default, or if showSar is true for Diurno/Nocturno
                const sarData = relevantRecords.map(record => {
                    const inputData = parseInputData(record.input_data);
                    return inputData.sar_patients || 0;
                });

                datasets.push({
                    label: `SAR ${reanimadorView === 'day' ? 'Diurno' : reanimadorView === 'night' ? 'Nocturno' : 'General'}`,
                    data: sarData,
                    backgroundColor: 'rgba(255, 165, 0, 0.8)', // Orange color for SAR
                    borderColor: 'rgba(255, 165, 0, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    yAxisID: 'y',
                    datalabels: { display: false },
                });
            }
            chartDataByCriterion[key] = { labels: currentLabels, datasets, averageValue: reanimadorAverage };
        } else if (key === 'waiting_72_hours_patients') {
            let relevantRecords = [];
            let averageValue = 0; // Initialize averageValue
            let averageLabel = ''; // Initialize averageLabel

            if (waiting72HoursView === 'day') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'morning');
                const dayTotal = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? dayTotal / relevantRecords.length : 0;
                averageLabel = 'Promedio Diurno';
            } else if (waiting72HoursView === 'night') {
                relevantRecords = dailyRecords.filter(r => r.timeSlot === 'night');
                const nightTotal = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? nightTotal / relevantRecords.length : 0;
                averageLabel = 'Promedio Nocturno';
            } else { // waiting72HoursView === 'both'
                relevantRecords = dailyRecords;
                const total = relevantRecords.reduce((sum, r) => sum + (r.input_data[key] || 0), 0);
                averageValue = relevantRecords.length > 0 ? total / relevantRecords.length : 0;
                averageLabel = 'Promedio General';
            }

            currentLabels = relevantRecords.map(record => dayjs(record.timestamp).format('DD/MM HH:mm'));

            datasets.push({
                label: label, // This is the label for the bars
                data: relevantRecords.map(record => record.input_data[key] || 0),
                backgroundColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 0.8)' : 'rgba(0, 0, 139, 0.8)'),
                borderColor: relevantRecords.map(record => record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 1)' : 'rgba(0, 0, 139, 1)'),
                borderWidth: 1,
                type: 'bar',
                yAxisID: 'y',
                datalabels: { display: false },
            });

            // Add the average line dataset
            datasets.push({
                label: averageLabel, // Label for the average line
                data: currentLabels.map(() => averageValue), // Data is the average value repeated for each label
                borderColor: 'rgba(255, 99, 132, 1)', // Red color for the average line
                type: 'line',
                borderDash: [5, 5], // Dashed line
                pointRadius: 0, // No points on the line
                yAxisID: 'y',
                datalabels: { display: false },
                fill: false,
            });

            chartDataByCriterion[key] = { labels: currentLabels, datasets, averageValue }; // Store averageValue
        } else { // General case for other criteria
          let currentBackgroundColors = [];
          let currentBorderColors = [];

          dailyRecords.forEach(record => {
            const color = record.timeSlot === 'morning' ? 'rgba(173, 216, 230, 0.8)' : 'rgba(0, 0, 139, 0.8)';
            currentBackgroundColors.push(color);
            currentBorderColors.push(color.replace('0.8', '1'));
          });

          datasets.push({
            label: label,
            data: dailyRecords.map(record => record.input_data[key] || 0),
            backgroundColor: currentBackgroundColors,
            borderColor: currentBorderColors,
            borderWidth: 1,
            type: 'bar',
            yAxisID: 'y',
            datalabels: { display: false },
          });
          chartDataByCriterion[key] = { labels: currentLabels, datasets };
        }
      });

      console.log('chartDataByCriterion:', chartDataByCriterion);
      chartDataByCriterion.alert_level = { data: dailyRecords.map(r => r.alert_level) };

      return { ...chartDataByCriterion, dailyRecords };

    } else {
      return {};
    }
  }, [filteredEvaluations, granularity, showSar, predictionData, hospitalizedView, esiC2View, reanimadorView, waiting72HoursView]);

  console.log('timeSeriesData:', timeSeriesData);

  console.log('filteredEvaluations:', filteredEvaluations);

  console.log('DEBUG Statistics.js - filteredEvaluations content:', filteredEvaluations);

  const getChartOptions = (titleText) => ({
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        display: titleText !== 'Pacientes Hospitalizados' && titleText !== 'Pacientes ESI C2 en Espera y Atención' && titleText !== 'Pacientes >72 horas en UEH', // Conditionally hide legend
      },
      title: {
        display: true,
        text: titleText,
      },
      datalabels: {
        display: false, // Ocultar datalabels por defecto para gráficos de línea/barra
      },
    },
    scales: {
      x: {
        type: 'category', // Asegura que el eje X se trate como categorías
        labels: timeSeriesData.labels, // Usa las etiquetas generadas
      },
      y: {
        beginAtZero: true,
      },
    },
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Estadísticas de Saturación Hospitalaria
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                label="Fecha de Inicio"
                value={startDate}
                onChange={(newValue) => {
                  console.log('DEBUG Statistics.js - New startDate selected:', newValue);
                  setStartDate(newValue);
                }}
                renderInput={(params) => <TextField {...params} />}
                format="DD/MM/YYYY"
              />
            </LocalizationProvider>
          </Grid>
          <Grid item>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                label="Fecha de Fin"
                value={endDate}
                onChange={(newValue) => {
                  console.log('DEBUG Statistics.js - New endDate selected:', newValue);
                  setEndDate(newValue);
                }}
                renderInput={(params) => <TextField {...params} />}
                format="DD/MM/YYYY"
              />
            </LocalizationProvider>
          </Grid>
          <Grid item>
            <ToggleButtonGroup
              value={granularity}
              exclusive
              onChange={handleGranularityChange}
              aria-label="text granularity"
            >
              <ToggleButton value="day" aria-label="day">
                Diario
              </ToggleButton>
              {/* <ToggleButton value="month" aria-label="month">
                Mensual
              </ToggleButton> */}
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Gráfico de Niveles de Alerta */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 460 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Distribución de Niveles de Alerta
              </Typography>
              <IconButton onClick={() => setFullscreenChart({ key: 'alert_level_distribution_paper', label: 'Distribución de Niveles de Alerta' })}>
                <FullscreenIcon />
              </IconButton>
            </Box>
            <Box sx={{ height: 290, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {alertLevelData.labels.length > 0 ? (
                <Pie data={alertLevelData} options={alertLevelOptions} plugins={[ChartDataLabels]} />
              ) : (
                <Typography>No hay datos disponibles para este período.</Typography>
              )}
            </Box>
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedAlertLevels.includes('Claves de Contención (Verde y Amarilla)')}
                    onChange={() => handleAlertLevelChange('Claves de Contención (Verde y Amarilla)')}
                    icon={<CustomCheckboxIcon color={segmentColors["Claves de Contención (Verde y Amarilla)"].background} />}
                    checkedIcon={<CustomCheckboxCheckedIcon color={segmentColors["Claves de Contención (Verde y Amarilla)"].background} />}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem' }}>Claves de Contención (Verde + Amarilla)</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedAlertLevels.includes('Claves de intervención (Naranja y Roja)')}
                    onChange={() => handleAlertLevelChange('Claves de intervención (Naranja y Roja)')}
                    icon={<CustomCheckboxIcon color={segmentColors["Claves de intervención (Naranja y Roja)"].background} />}
                    checkedIcon={<CustomCheckboxCheckedIcon color={segmentColors["Claves de intervención (Naranja y Roja)"].background} />}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem' }}>Claves de Intervención (Naranja + Roja)</Typography>}
              />
              {["Verde", "Amarilla", "Naranja", "Roja"].map((label) => {
                const counts = filteredEvaluations.reduce((acc, ev) => {
                  acc[ev.alert_level] = (acc[ev.alert_level] || 0) + 1;
                  return acc;
                }, {});
                const totalEvaluations = filteredEvaluations.length;
                const value = counts[label] || 0;
                const percentage = totalEvaluations > 0 ? ((value / totalEvaluations) * 100).toFixed(1) : '0.0';
                const backgroundColor = segmentColors[label].background;
                const borderColor = segmentColors[label].border;

                return (
                  <FormControlLabel
                    key={label}
                    sx={{ opacity: (selectedAlertLevels.includes('Claves de Contención (Verde y Amarilla)') && (label === 'Verde' || label === 'Amarilla')) || (selectedAlertLevels.includes('Claves de intervención (Naranja y Roja)') && (label === 'Naranja' || label === 'Roja')) ? 0.5 : 1 }}
                    control={
                      <CustomSquareIcon color={backgroundColor} />
                    }
                    label={<Typography sx={{ fontSize: '0.875rem' }}>{label}</Typography>}
                  />
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Gráfico de Protocolo de Paciente Crítico */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 460 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Activación de Protocolo de Paciente Crítico
              </Typography>
              <IconButton onClick={() => setFullScreenCriticalPatientProtocol(true)}>
                <FullscreenIcon />
              </IconButton>
            </Box>
            <Box sx={{ height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {criticalPatientProtocolData.labels.length > 0 ? (
                <Pie data={criticalPatientProtocolData} options={criticalPatientProtocolOptions} plugins={[ChartDataLabels]} />
              ) : (
                <Typography>No hay datos disponibles para este período.</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Dialog
          open={fullScreenCriticalPatientProtocol}
          onClose={() => setFullScreenCriticalPatientProtocol(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Activación de Protocolo de Paciente Crítico
              <IconButton onClick={() => setFullScreenCriticalPatientProtocol(false)}>
                <FullscreenExitIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Paper elevation={2} sx={{ p: 3, height: 600 }}>
              <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {criticalPatientProtocolData.labels.length > 0 ? (
                  <Pie data={criticalPatientProtocolData} options={criticalPatientProtocolOptions} plugins={[ChartDataLabels]} />
                ) : (
                  <Typography>No hay datos disponibles para este período.</Typography>
                )}
              </Box>
            </Paper>
          </DialogContent>
        </Dialog>

        {/* Gráficos de Series de Tiempo por Criterio */}
        {criteria.map((criterion) => (
          <Grid item xs={12} md={criterion.key === 'total_score' ? 12 : 6} key={criterion.key}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    {criterion.label}
                  </Typography>
                </Box>
                {criterion.key === 'total_score' && (token && (authState.role === 'editor_gestor' || authState.role === 'administrador' || authState.role === 'viewer')) && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={handlePredict}
                      disabled={loadingPrediction}
                      sx={{ mb: 1 }} // Add margin-bottom to separate from fullscreen button
                    >
                      {loadingPrediction ? <CircularProgress size={24} /> : 'Predecir Puntaje (7 días)'}
                    </Button>
                    <IconButton onClick={() => setFullscreenChart({ key: criterion.key, label: criterion.label })}>
                      <FullscreenIcon />
                    </IconButton>
                  </Box>
                )}
                {criterion.key === 'hospitalized_patients' && (
                  <IconButton onClick={() => setFullScreenHospitalizedPatientsChart(true)}>
                    <FullscreenIcon />
                  </IconButton>
                )}
                {criterion.key === 'esi_c2_patients' && (
                  <IconButton onClick={() => setFullScreenEsiC2PatientsChart(true)}>
                    <FullscreenIcon />
                  </IconButton>
                )}
                {criterion.key === 'reanimador_patients' && (
                  <IconButton onClick={() => setFullScreenReanimadorPatientsChart(true)}>
                    <FullscreenIcon />
                  </IconButton>
                )}
                {criterion.key === 'waiting_72_hours_patients' && (
                  <IconButton onClick={() => setFullScreenWaiting72HoursPatientsChart(true)}>
                    <FullscreenIcon />
                  </IconButton>
                )}
              </Box>
              {criterion.key === 'hospitalized_patients' && (
                <ToggleButtonGroup
                  value={hospitalizedView}
                  exclusive
                  onChange={handleHospitalizedViewChange}
                  aria-label="hospitalized patients view"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="both">General</ToggleButton>
                  <ToggleButton value="day">Diurno</ToggleButton>
                  <ToggleButton value="night">Nocturno</ToggleButton>
                </ToggleButtonGroup>
              )}
              {criterion.key === 'esi_c2_patients' && (
                <ToggleButtonGroup
                  value={esiC2View}
                  exclusive
                  onChange={handleEsiC2ViewChange}
                  aria-label="esi c2 patients view"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="both">General</ToggleButton>
                  <ToggleButton value="day">Diurno</ToggleButton>
                  <ToggleButton value="night">Nocturno</ToggleButton>
                </ToggleButtonGroup>
              )}
              {criterion.key === 'reanimador_patients' && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <ToggleButtonGroup
                    value={reanimadorView}
                    exclusive
                    onChange={handleReanimadorViewChange}
                    aria-label="reanimador patients view"
                    sx={{ mr: 2 }}
                  >
                    <ToggleButton value="both">General</ToggleButton>
                    <ToggleButton value="day">Diurno</ToggleButton>
                    <ToggleButton value="night">Nocturno</ToggleButton>
                  </ToggleButtonGroup>
                  <ToggleButton
                    value="sar"
                    selected={showSar}
                    onChange={() => setShowSar(!showSar)}
                    aria-label="show sar data"
                  >
                    SAR
                  </ToggleButton>
                </Box>
              )}
              {criterion.key === 'waiting_72_hours_patients' && (
                <ToggleButtonGroup
                  value={waiting72HoursView}
                  exclusive
                  onChange={handleWaiting72HoursViewChange}
                  aria-label="waiting 72 hours patients view"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="both">General</ToggleButton>
                  <ToggleButton value="day">Diurno</ToggleButton>
                  <ToggleButton value="night">Nocturno</ToggleButton>
                </ToggleButtonGroup>
              )}
              
              <Box sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {timeSeriesData[criterion.key] && timeSeriesData[criterion.key].labels && timeSeriesData[criterion.key].labels.length > 0 ? (
                  <Line
                    data={timeSeriesData[criterion.key]}
                    options={
                      criterion.key === 'hospitalized_patients'
                        ? {
                            ...getChartOptions(criterion.label),
                            plugins: {
                              ...getChartOptions(criterion.label).plugins,
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    if (context.datasetIndex === 0) { // This is the bar data
                                        return `Pacientes: ${context.parsed.y}, Promedio: ${timeSeriesData[criterion.key].averageValue.toFixed(2)}`;
                                    }
                                    return null; // Hide tooltip for the average line
                                  }
                                }
                              }
                            }
                          }
                        : criterion.key === 'total_score'
                        ? {
                            ...getChartOptions(criterion.label),
                            plugins: {
                              ...getChartOptions(criterion.label).plugins,
                              legend: {
                                labels: {
                                  generateLabels: function(chart) {
                                    const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
                                    const predictionLabelIndex = original.findIndex(label => label.text === 'Predicción de puntaje (7 días)');
                                    if (predictionLabelIndex > -1) {
                                      original[predictionLabelIndex].lineDash = [5, 5];
                                      
                                      original[predictionLabelIndex].lineWidth = 2; // Line thickness
                                      original[predictionLabelIndex].usePointStyle = true; // Use point style
                                      original[predictionLabelIndex].pointStyle = 'line'; // Set point style to line
                                      original[predictionLabelIndex].boxWidth = 20; // Width of the line in legend
                                    }
                                    return original;
                                  }
                                }
                              }
                            }
                          }
                        : criterion.key === 'esi_c2_patients'
                        ? {
                            ...getChartOptions(criterion.label),
                            plugins: {
                              ...getChartOptions(criterion.label).plugins,
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    if (context.datasetIndex === 0) { // This is the bar data
                                        return `Pacientes: ${context.parsed.y}`;
                                    }
                                    return null;
                                  },
                                  afterBody: function(context) {
                                    return `Promedio: ${timeSeriesData[criterion.key].averageValue.toFixed(2)}`;
                                  }
                                }
                              }
                            }
                          }
                        : criterion.key === 'reanimador_patients'
                        ? {
                            ...getChartOptions(criterion.label),
                            plugins: {
                              ...getChartOptions(criterion.label).plugins,
                              legend: {
                                labels: {
                                  filter: function(legendItem, chartData) {
                                    const labelsToHide = ['Pacientes en Reanimador', 'Promedio General', 'Promedio Diurno', 'Promedio Nocturno', 'SAR General', 'SAR Diurno', 'SAR Nocturno'];
                                    return !labelsToHide.includes(legendItem.text);
                                  }
                                }
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    if (context.dataset.label === 'Pacientes en Reanimador') {
                                        return `Pacientes: ${context.parsed.y}`;
                                    } else if (context.dataset.label.startsWith('SAR')) {
                                        return `SAR: ${context.parsed.y}`;
                                    }
                                    return null;
                                  },
                                  afterBody: function(context) {
                                    // Only show average for the main 'Pacientes en Reanimador' bar
                                    if (criterion.key === 'reanimador_patients') {
                                        return `Promedio: ${timeSeriesData[criterion.key].averageValue.toFixed(2)}`;
                                    }
                                    return null;
                                  }
                                }
                              }
                            }
                          }
                        : criterion.key === 'waiting_72_hours_patients'
                        ? {
                            ...getChartOptions(criterion.label),
                            plugins: {
                              ...getChartOptions(criterion.label).plugins,
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    if (context.datasetIndex === 0) { // This is the bar data
                                        return `Pacientes: ${context.parsed.y}`;
                                    }
                                    return null;
                                  },
                                  afterBody: function(context) {
                                    return `Promedio: ${timeSeriesData[criterion.key].averageValue.toFixed(2)}`;
                                  }
                                }
                              }
                            }
                          }
                        : getChartOptions(criterion.label)
                    }
                    plugins={[ChartDataLabels]}
                  />
                ) : (
                  <Typography>No hay datos disponibles para este período o criterio.</Typography>
                )}
              </Box>
              
            </Paper>
          </Grid>
        ))}
      </Grid>

      

      {/* Fullscreen Modal */}
      <Modal
        open={!!fullscreenChart}
        onClose={() => setFullscreenChart(null)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{
          width: '90%',
          height: '90%',
          bgcolor: 'background.paper',
          p: 3,
          borderRadius: 2,
          outline: 'none',
          position: 'relative'
        }}>
          <IconButton
            onClick={() => setFullscreenChart(null)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <FullscreenExitIcon />
          </IconButton>
          {fullscreenChart && fullscreenChart.key === 'alert_level_distribution_paper' ? (
            <Paper elevation={2} sx={{ p: 3, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Distribución de Niveles de Alerta
                </Typography>
                {/* The close button is already handled by the modal's IconButton */}
              </Box>
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {alertLevelData.labels.length > 0 ? (
                  <Pie data={alertLevelData} options={alertLevelOptions} plugins={[ChartDataLabels]} />
                ) : (
                  <Typography>No hay datos disponibles para este período.</Typography>
                )}
              </Box>
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedAlertLevels.includes('Claves de Contención (Verde y Amarilla)')}
                      onChange={() => handleAlertLevelChange('Claves de Contención (Verde y Amarilla)')}
                      icon={<CustomCheckboxIcon color={segmentColors["Claves de Contención (Verde y Amarilla)"].background} />}
                      checkedIcon={<CustomCheckboxCheckedIcon color={segmentColors["Claves de Contención (Verde y Amarilla)"].background} />}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.875rem' }}>Claves de Contención (Verde + Amarilla)</Typography>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedAlertLevels.includes('Claves de intervención (Naranja y Roja)')}
                      onChange={() => handleAlertLevelChange('Claves de intervención (Naranja y Roja)')}
                      icon={<CustomCheckboxIcon color={segmentColors["Claves de intervención (Naranja y Roja)"].background} />}
                      checkedIcon={<CustomCheckboxCheckedIcon color={segmentColors["Claves de intervención (Naranja y Roja)"].background} />}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.875rem' }}>Claves de Intervención (Naranja + Roja)</Typography>}
                />
                {["Verde", "Amarilla", "Naranja", "Roja"].map((label) => {
                  const counts = filteredEvaluations.reduce((acc, ev) => {
                    acc[ev.alert_level] = (acc[ev.alert_level] || 0) + 1;
                    return acc;
                  }, {});
                  const totalEvaluations = filteredEvaluations.length;
                  const value = counts[label] || 0;
                  const percentage = totalEvaluations > 0 ? ((value / totalEvaluations) * 100).toFixed(1) : '0.0';
                  const backgroundColor = segmentColors[label].background;
                  const borderColor = segmentColors[label].border;

                  return (
                    <FormControlLabel
                      key={label}
                      sx={{ opacity: (selectedAlertLevels.includes('Claves de Contención (Verde y Amarilla)') && (label === 'Verde' || label === 'Amarilla')) || (selectedAlertLevels.includes('Claves de intervención (Naranja y Roja)') && (label === 'Naranja' || label === 'Roja')) ? 0.5 : 1 }}
                      control={
                        <CustomSquareIcon color={backgroundColor} />
                      }
                      label={<Typography sx={{ fontSize: '0.875rem' }}>{label}</Typography>}
                    />
                  );
                })}
              </Box>
            </Paper>
          ) : fullscreenChart && fullscreenChart.key === 'total_score' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'absolute', top: 8, right: 50 }}>
              <Button
                variant="contained"
                onClick={handlePredict}
                disabled={loadingPrediction}
                sx={{ mb: 1 }}
              >
                {loadingPrediction ? <CircularProgress size={24} /> : 'Predecir Puntaje (7 días)'}
              </Button>
            </Box>
          )}
          {fullscreenChart && fullscreenChart.key === 'hospitalized_patients' && (
            <ToggleButtonGroup
              value={hospitalizedView}
              exclusive
              onChange={handleHospitalizedViewChange}
              aria-label="hospitalized patients view"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="both">General</ToggleButton>
              <ToggleButton value="day">Diurno</ToggleButton>
              <ToggleButton value="night">Nocturno</ToggleButton>
            </ToggleButtonGroup>
          )}
          {fullscreenChart && fullscreenChart.key === 'reanimador_patients' && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ToggleButtonGroup
                value={reanimadorView}
                exclusive
                onChange={handleReanimadorViewChange}
                aria-label="reanimador patients view"
                sx={{ mr: 2 }}
              >
                <ToggleButton value="both">General</ToggleButton>
                <ToggleButton value="day">Diurno</ToggleButton>
                <ToggleButton value="night">Nocturno</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButton
                value="sar"
                selected={showSar}
                onChange={() => setShowSar(!showSar)}
                aria-label="show sar data"
              >
                SAR
              </ToggleButton>
            </Box>
          )}
          {fullscreenChart && timeSeriesData[fullscreenChart.key] && timeSeriesData[fullscreenChart.key].labels && timeSeriesData[fullscreenChart.key].labels.length > 0 ? (
            <Line
              data={timeSeriesData[fullscreenChart.key]}
              options={
                fullscreenChart.key === 'hospitalized_patients'
                  ? {
                      ...getChartOptions(fullscreenChart.label),
                      plugins: {
                        ...getChartOptions(fullscreenChart.label).plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              if (context.datasetIndex === 0) { // This is the bar data
                                  return `Pacientes: ${context.parsed.y}, Promedio: ${timeSeriesData[fullscreenChart.key].averageValue.toFixed(2)}`;
                              }
                              return null; // Hide tooltip for the average line
                            }
                          }
                        }
                      }
                    }
                  : fullscreenChart.key === 'reanimador_patients'
                  ? {
                      ...getChartOptions(fullscreenChart.label),
                      plugins: {
                        ...getChartOptions(fullscreenChart.label).plugins,
                        legend: {
                          labels: {
                            filter: function(legendItem, chartData) {
                              const labelsToHide = ['Pacientes en Reanimador', 'Promedio General', 'Promedio Diurno', 'Promedio Nocturno', 'SAR General', 'SAR Diurno', 'SAR Nocturno'];
                              return !labelsToHide.includes(legendItem.text);
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              if (context.dataset.label === 'Pacientes en Reanimador') {
                                  return `Pacientes: ${context.parsed.y}`;
                              } else if (context.dataset.label.startsWith('SAR')) {
                                  return `SAR: ${context.parsed.y}`;
                              }
                              return null;
                            },
                            afterBody: function(context) {
                              if (fullscreenChart.key === 'reanimador_patients') {
                                  return `Promedio: ${timeSeriesData[fullscreenChart.key].averageValue.toFixed(2)}`;
                              }
                              return null;
                            }
                          }
                        }
                      }
                    }
                  : fullscreenChart.key === 'waiting_72_hours_patients'
                  ? {
                      ...getChartOptions(fullscreenChart.label),
                      plugins: {
                        ...getChartOptions(fullscreenChart.label).plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              if (context.datasetIndex === 0) { // This is the bar data
                                  return `Pacientes: ${context.parsed.y}`;
                              }
                              return null;
                            },
                            afterBody: function(context) {
                              return `Promedio: ${timeSeriesData[fullscreenChart.key].averageValue.toFixed(2)}`;
                            }
                          }
                        }
                      }
                    }
                  : getChartOptions(fullscreenChart.label)
              }
              plugins={[ChartDataLabels]}
            />
          ) : null }
        </Box>
      </Modal>

      {/* Fullscreen Modal for Hospitalized Patients Chart */}
      <Modal
        open={fullScreenHospitalizedPatientsChart}
        onClose={() => setFullScreenHospitalizedPatientsChart(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{
          width: '90%',
          height: '90%',
          bgcolor: 'background.paper',
          p: 3,
          borderRadius: 2,
          outline: 'none',
          position: 'relative'
        }}>
          <IconButton
            onClick={() => setFullScreenHospitalizedPatientsChart(false)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <FullscreenExitIcon />
          </IconButton>
          <Paper elevation={2} sx={{ p: 3, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Pacientes Hospitalizados
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {timeSeriesData['hospitalized_patients'] && timeSeriesData['hospitalized_patients'].labels && timeSeriesData['hospitalized_patients'].labels.length > 0 ? (
                <Line
                  data={timeSeriesData['hospitalized_patients']}
                  options={{
                    ...getChartOptions('Pacientes Hospitalizados'),
                    plugins: {
                      ...getChartOptions('Pacientes Hospitalizados').plugins,
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            if (context.datasetIndex === 0) { // This is the bar data
                                return `Pacientes: ${context.parsed.y}, Promedio: ${timeSeriesData['hospitalized_patients'].averageValue.toFixed(2)}`;
                            }
                            return null; // Hide tooltip for the average line
                          }
                        }
                      }
                    }
                  }}
                  plugins={[ChartDataLabels]}
                />
              ) : (
                <Typography>No hay datos disponibles para este período o criterio.</Typography>
              )}
            </Box>
            <ToggleButtonGroup
              value={hospitalizedView}
              exclusive
              onChange={handleHospitalizedViewChange}
              aria-label="hospitalized patients view"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="both">General</ToggleButton>
              <ToggleButton value="day">Diurno</ToggleButton>
              <ToggleButton value="night">Nocturno</ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>
      </Modal>

      {/* Fullscreen Modal for ESI C2 Patients Chart */}
      <Modal
        open={fullScreenEsiC2PatientsChart}
        onClose={() => setFullScreenEsiC2PatientsChart(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{
          width: '90%',
          height: '90%',
          bgcolor: 'background.paper',
          p: 3,
          borderRadius: 2,
          outline: 'none',
          position: 'relative'
        }}>
          <IconButton
            onClick={() => setFullScreenEsiC2PatientsChart(false)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <FullscreenExitIcon />
          </IconButton>
          <Paper elevation={2} sx={{ p: 3, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Pacientes ESI C2 en Espera y Atención
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {timeSeriesData['esi_c2_patients'] && timeSeriesData['esi_c2_patients'].labels && timeSeriesData['esi_c2_patients'].labels.length > 0 ? (
                <Line
                  data={timeSeriesData['esi_c2_patients']}
                  options={{
                    ...getChartOptions('Pacientes ESI C2 en Espera y Atención'),
                    plugins: {
                      ...getChartOptions('Pacientes ESI C2 en Espera y Atención').plugins,
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            if (context.datasetIndex === 0) { // This is the bar data
                                return `Pacientes: ${context.parsed.y}`;
                            }
                            return null;
                          },
                          afterBody: function(context) {
                            return `Promedio: ${timeSeriesData['esi_c2_patients'].averageValue.toFixed(2)}`;
                          }
                        }
                      }
                    }
                  }}
                  plugins={[ChartDataLabels]}
                />
              ) : (
                <Typography>No hay datos disponibles para este período o criterio.</Typography>
              )}
            </Box>
            <ToggleButtonGroup
              value={esiC2View}
              exclusive
              onChange={handleEsiC2ViewChange}
              aria-label="esi c2 patients view"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="both">General</ToggleButton>
              <ToggleButton value="day">Diurno</ToggleButton>
              <ToggleButton value="night">Nocturno</ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>
      </Modal>

      {/* Fullscreen Modal for Reanimador Patients Chart */}
      <Modal
        open={fullScreenReanimadorPatientsChart}
        onClose={() => setFullScreenReanimadorPatientsChart(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{
          width: '90%',
          height: '90%',
          bgcolor: 'background.paper',
          p: 3,
          borderRadius: 2,
          outline: 'none',
          position: 'relative'
        }}>
          <IconButton
            onClick={() => setFullScreenReanimadorPatientsChart(false)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <FullscreenExitIcon />
          </IconButton>
          <Paper elevation={2} sx={{ p: 3, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Pacientes en Reanimador
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {timeSeriesData['reanimador_patients'] && timeSeriesData['reanimador_patients'].labels && timeSeriesData['reanimador_patients'].labels.length > 0 ? (
                <Line
                  data={timeSeriesData['reanimador_patients']}
                  options={{
                    ...getChartOptions('Pacientes en Reanimador'),
                    plugins: {
                      ...getChartOptions('Pacientes en Reanimador').plugins,
                      legend: {
                        labels: {
                          filter: function(legendItem, chartData) {
                            const labelsToHide = ['Pacientes en Reanimador', 'Promedio General', 'Promedio Diurno', 'Promedio Nocturno', 'SAR General', 'SAR Diurno', 'SAR Nocturno'];
                            return !labelsToHide.includes(legendItem.text);
                          }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            if (context.dataset.label === 'Pacientes en Reanimador') {
                                return `Pacientes: ${context.parsed.y}`;
                            } else if (context.dataset.label.startsWith('SAR')) {
                                return `SAR: ${context.parsed.y}`;
                            }
                            return null;
                          },
                          afterBody: function(context) {
                            if (true) { // Always show average for fullscreen reanimador chart
                                return `Promedio: ${timeSeriesData['reanimador_patients'].averageValue.toFixed(2)}`;
                            }
                            return null;
                          }
                        }
                      }
                    }
                  }}
                  plugins={[ChartDataLabels]}
                />
              ) : (
                <Typography>No hay datos disponibles para este período o criterio.</Typography>
              )}
            </Box>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ToggleButtonGroup
                value={reanimadorView}
                exclusive
                onChange={handleReanimadorViewChange}
                aria-label="reanimador patients view"
                sx={{ mr: 2 }}
              >
                <ToggleButton value="both">General</ToggleButton>
                <ToggleButton value="day">Diurno</ToggleButton>
                <ToggleButton value="night">Nocturno</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButton
                value="sar"
                selected={showSar}
                onChange={() => setShowSar(!showSar)}
                aria-label="show sar data"
              >
                SAR
              </ToggleButton>
            </Box>
          </Paper>
        </Box>
      </Modal>
        {/* Fullscreen Modal for Waiting 72 Hours Patients Chart */}
      <Modal
        open={fullScreenWaiting72HoursPatientsChart}
        onClose={() => setFullScreenWaiting72HoursPatientsChart(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{
          width: '90%',
          height: '90%',
          bgcolor: 'background.paper',
          p: 3,
          borderRadius: 2,
          outline: 'none',
          position: 'relative'
        }}>
          <IconButton
            onClick={() => setFullScreenWaiting72HoursPatientsChart(false)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <FullscreenExitIcon />
          </IconButton>
          <Paper elevation={2} sx={{ p: 3, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Pacientes >72 horas en UEH
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {timeSeriesData['waiting_72_hours_patients'] && timeSeriesData['waiting_72_hours_patients'].labels && timeSeriesData['waiting_72_hours_patients'].labels.length > 0 ? (
                <Line
                  data={timeSeriesData['waiting_72_hours_patients']}
                  options={{
                    ...getChartOptions('Pacientes >72 horas en UEH'),
                    plugins: {
                      ...getChartOptions('Pacientes >72 horas en UEH').plugins,
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            if (context.datasetIndex === 0) { // This is the bar data
                                return `Pacientes: ${context.parsed.y}`;
                            }
                            return null;
                          },
                          afterBody: function(context) {
                            return `Promedio: ${timeSeriesData['waiting_72_hours_patients'].averageValue.toFixed(2)}`;
                          }
                        }
                      }
                    }
                  }}
                  plugins={[ChartDataLabels]}
                />
              ) : (
                <Typography>No hay datos disponibles para este período o criterio.</Typography>
              )}
            </Box>
            <ToggleButtonGroup
              value={waiting72HoursView}
              exclusive
              onChange={handleWaiting72HoursViewChange}
              aria-label="waiting 72 hours patients view"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="both">General</ToggleButton>
              <ToggleButton value="day">Diurno</ToggleButton>
              <ToggleButton value="night">Nocturno</ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>
      </Modal>

      
    </Box>
  );
}

export default Statistics;
import React, { createContext, useState, useContext, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const CalculatorContext = createContext();

export function useCalculator() {
  return useContext(CalculatorContext);
}

export function CalculatorProvider({ children }) {
  const [scenario, setScenario] = useState(null);
  const [hospitalizedPatients, setHospitalizedPatients] = useState('');
  const [esiC2Patients, setEsiC2Patients] = useState('');
  const [reanimadorPatients, setReanimadorPatients] = useState('');
  const [criticalPatientProtocol, setCriticalPatientProtocol] = useState('none');
  const [waiting72HoursPatients, setWaiting72HoursPatients] = useState('');
  const [sarActive, setSarActive] = useState(false);
  const [sarPatients, setSarPatients] = useState('');

  // Effect to automatically set sarActive based on reanimadorPatients and scenario
  React.useEffect(() => {
    const numReanimadorPatients = parseInt(reanimadorPatients);
    let shouldBeSarActive = false;

    if (!isNaN(numReanimadorPatients)) {
      if (scenario === 'capacidad_reducida') {
        shouldBeSarActive = numReanimadorPatients >= 6;
      } else if (scenario === 'capacidad_completa') {
        shouldBeSarActive = numReanimadorPatients >= 8;
      }
    }
    setSarActive(shouldBeSarActive);
  }, [reanimadorPatients, scenario]);

  // Effect to update sarPatients based on sarActive and reanimadorPatients
  React.useEffect(() => {
    if (sarActive) {
      setSarPatients(reanimadorPatients);
    } else {
      setSarPatients('0');
    }
  }, [sarActive, reanimadorPatients]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [measureStatus, setMeasureStatus] = useState({});
  const [evaluations, setEvaluations] = useState([]); // Estado para el historial

  const fetchEvaluations = useCallback(async (token, startDateFilter, endDateFilter, limitFilter) => {
    try {
      let url = 'http://127.0.0.1:8000/evaluations/';
      const params = new URLSearchParams();

      if (startDateFilter) {
        // Convert startDate to the beginning of the day in UTC
        params.append('start_date', startDateFilter.startOf('day').utc().toISOString());
      }
      if (endDateFilter) {
        // Convert endDate to the end of the day in UTC
        params.append('end_date', endDateFilter.endOf('day').utc().toISOString());
      }
      if (limitFilter != null) { // Only append limit if it's not null or undefined
        params.append('limit', limitFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log("DEBUG: Fetching evaluations from URL:", url);
      console.log("DEBUG: Fetching evaluations with token:", token);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log("DEBUG: Response received, response.ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("DEBUG: Error response data:", errorData);
        throw new Error(errorData.detail || 'Error al cargar el historial.');
      }

      const data = await response.json();
      console.log("DEBUG: Datos recibidos de la API:", data);
      // No need to sort here, backend handles ordering
      const processedData = data.evaluations.map(evalItem => ({
        ...evalItem,
        timestamp: dayjs.utc(evalItem.timestamp).tz('America/Santiago')
      }));
      setEvaluations(processedData);
      console.log("DEBUG: Current evaluations state in CalculatorContext:", processedData);
      return processedData; // Devuelve los datos para uso inmediato si es necesario
    } catch (err) {
      console.error('DEBUG: Error fetching evaluations in catch block:', err);
      setError(err.message || 'No se pudo cargar el historial de evaluaciones.');
      return [];
    }
  }, [setEvaluations, setError]);

  const resetCalculatorState = () => {
    setScenario(null);
    setHospitalizedPatients('');
    setEsiC2Patients('');
    setReanimadorPatients('');
    setCriticalPatientProtocol('none');
    setWaiting72HoursPatients('');
    setSarActive(false);
    setSarPatients('');
    setResult(null);
    setError(null);
    setMeasureStatus({});
  };

  const updateCalculatorMeasures = useCallback((evaluation) => {
    if (evaluation && evaluation.actions) {
      // Directly update the measures within the current result object
      setResult(prevResult => {
        if (!prevResult) return null; // If there's no previous result, nothing to update
        const getStatusPriority = (status) => {
        if (status === 'not_applied') return 0;
        if (status === 'in_process') return 1;
        if (status === 'applied') return 2;
        return 0;
      };
      const updatedMeasures = [...evaluation.actions].sort((a, b) => {
        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);

        if (priorityA < priorityB) return -1;
        if (priorityA > priorityB) return 1;

        return a.original_order_index - b.original_order_index;
      });
        return { ...prevResult, measures: updatedMeasures };
      });

      const newMeasureStatus = {};
      evaluation.actions.forEach(action => {
        newMeasureStatus[action.id] = action.status;
      });
      setMeasureStatus(newMeasureStatus);
    }
  }, [setResult, setMeasureStatus]);

  const value = {
    scenario, setScenario,
    hospitalizedPatients, setHospitalizedPatients,
    esiC2Patients, setEsiC2Patients,
    reanimadorPatients, setReanimadorPatients,
    criticalPatientProtocol, setCriticalPatientProtocol,
    waiting72HoursPatients, setWaiting72HoursPatients,
    sarActive, setSarActive,
    sarPatients, setSarPatients,
    result, setResult,
    error, setError,
    measureStatus, setMeasureStatus,
    resetCalculatorState,
    evaluations, // Exponer el historial
    fetchEvaluations, // Exponer la función de carga
    updateCalculatorMeasures, // Exponer la nueva función
  };

  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
}
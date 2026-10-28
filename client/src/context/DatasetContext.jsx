import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const DatasetContext = createContext(null);

export const DatasetProvider = ({ children }) => {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(() => {
    return localStorage.getItem('insightai_selected_dataset') || null;
  });
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [datasetLoading, setDatasetLoading] = useState(false);

  // Fetch list of datasets when user is logged in
  const fetchDatasets = async () => {
    if (!user) {
      setDatasets([]);
      setSelectedDataset(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/datasets');
      if (res.data.success) {
        const list = res.data.datasets || [];
        setDatasets(list);

        if (list.length > 0) {
          const exists = list.some((d) => d._id === selectedDatasetId);
          if (!selectedDatasetId || !exists) {
            setSelectedDatasetId(list[0]._id);
            localStorage.setItem('insightai_selected_dataset', list[0]._id);
          }
        } else {
          setSelectedDatasetId(null);
          setSelectedDataset(null);
          localStorage.removeItem('insightai_selected_dataset');
        }
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full details of selected dataset
  const fetchSelectedDatasetDetails = async (id) => {
    if (!id) {
      setSelectedDataset(null);
      return;
    }
    setDatasetLoading(true);
    try {
      const res = await api.get(`/datasets/${id}`);
      if (res.data.success) {
        setSelectedDataset(res.data.dataset);
      }
    } catch (err) {
      console.error('Error fetching dataset details:', err);
    } finally {
      setDatasetLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [user]);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchSelectedDatasetDetails(selectedDatasetId);
    } else {
      setSelectedDataset(null);
    }
  }, [selectedDatasetId]);

  const selectDataset = (id) => {
    setSelectedDatasetId(id);
    localStorage.setItem('insightai_selected_dataset', id);
  };

  const uploadDataset = async (formData) => {
    const res = await api.post('/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (res.data.success && res.data.dataset) {
      await fetchDatasets();
      selectDataset(res.data.dataset._id);
    }
    return res.data;
  };

  const loadSampleDataset = async () => {
    setLoading(true);
    try {
      const res = await api.post('/datasets/sample');
      if (res.data.success && res.data.dataset) {
        await fetchDatasets();
        selectDataset(res.data.dataset._id);
      }
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const switchWorksheet = async (sheetName) => {
    if (!selectedDatasetId || !sheetName) return;
    setDatasetLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/sheet`, { sheetName });
      if (res.data.success) {
        await fetchSelectedDatasetDetails(selectedDatasetId);
        await fetchDatasets();
      }
      return res.data;
    } finally {
      setDatasetLoading(false);
    }
  };

  const updateColumnType = async (columnKey, newType) => {
    if (!selectedDatasetId) return;
    try {
      const res = await api.patch(`/datasets/${selectedDatasetId}/columns`, {
        columnKey,
        newType,
      });
      if (res.data.success) {
        await fetchSelectedDatasetDetails(selectedDatasetId);
      }
      return res.data;
    } catch (err) {
      console.error('Failed to change column type:', err);
      throw err;
    }
  };

  const renameDataset = async (id, newName) => {
    const res = await api.patch(`/datasets/${id}`, { name: newName });
    if (res.data.success) {
      await fetchDatasets();
      if (selectedDatasetId === id) {
        setSelectedDataset((prev) => (prev ? { ...prev, name: newName } : prev));
      }
    }
    return res.data;
  };

  const deleteDataset = async (id) => {
    const res = await api.delete(`/datasets/${id}`);
    if (res.data.success) {
      if (selectedDatasetId === id) {
        setSelectedDatasetId(null);
        setSelectedDataset(null);
        localStorage.removeItem('insightai_selected_dataset');
      }
      await fetchDatasets();
    }
    return res.data;
  };

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        selectedDatasetId,
        selectedDataset,
        loading,
        datasetLoading,
        selectDataset,
        refreshDatasets: fetchDatasets,
        refreshSelectedDataset: () => fetchSelectedDatasetDetails(selectedDatasetId),
        uploadDataset,
        loadSampleDataset,
        switchWorksheet,
        updateColumnType,
        renameDataset,
        deleteDataset,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};

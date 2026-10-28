import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Sliders } from 'lucide-react';
import api from '../../services/api';
import { useDataset } from '../../context/DatasetContext';

const DataTable = ({ datasetId }) => {
  const { updateColumnType, selectedDataset } = useDataset();
  const [data, setData] = useState({ rows: [], columns: [], totalRows: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(false);
  const [editingCol, setEditingCol] = useState(null);

  const fetchRows = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const res = await api.get(`/datasets/${datasetId}/preview`, {
        params: {
          page,
          limit,
          search,
          sortBy: sortBy || undefined,
          sortOrder,
        },
      });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load table rows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [datasetId, page, limit, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRows();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (colKey) => {
    if (sortBy === colKey) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortBy('');
        setSortOrder('asc');
      }
    } else {
      setSortBy(colKey);
      setSortOrder('asc');
    }
  };

  const handleTypeChange = async (colKey, newType) => {
    try {
      await updateColumnType(colKey, newType);
      setEditingCol(null);
      fetchRows();
    } catch (err) {
      console.error('Failed to update column type:', err);
    }
  };

  const columns = data.columns || [];
  const rows = data.rows || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-brand-600" />
          <h2 className="text-base font-bold text-slate-800">Dataset Records</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {data.totalRows} {data.totalRows === 1 ? 'row' : 'rows'}
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full"
            />
          </div>

          {/* Rows per page */}
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none shrink-0"
          >
            <option value={10}>10 rows</option>
            <option value={15}>15 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>

      {/* Table Data Container */}
      <div className="overflow-x-auto min-h-[300px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 text-xs font-semibold text-brand-600">
              <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <span>Updating records...</span>
            </div>
          </div>
        )}

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold select-none">
              <th className="py-3 px-4 w-12 text-slate-400">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="py-3 px-4 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer hover:text-brand-600 transition-colors flex items-center space-x-1"
                    >
                      <span>{col.name}</span>
                      {sortBy === col.key ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>

                    {/* Column Type Badge / Switcher */}
                    <div className="relative inline-block">
                      {editingCol === col.key ? (
                        <select
                          value={col.type}
                          autoFocus
                          onBlur={() => setEditingCol(null)}
                          onChange={(e) => handleTypeChange(col.key, e.target.value)}
                          className="text-[10px] bg-white border border-brand-500 rounded px-1 py-0.5 text-slate-700 outline-none"
                        >
                          <option value="numeric">numeric</option>
                          <option value="categorical">categorical</option>
                          <option value="date">date</option>
                          <option value="boolean">boolean</option>
                        </select>
                      ) : (
                        <button
                          type="button"
                          title="Click to change detected type"
                          onClick={() => setEditingCol(col.key)}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors font-mono lowercase ${
                            col.type === 'numeric'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : col.type === 'date'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : col.type === 'boolean'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {col.type}
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400">
                  {search ? 'No records match your search filter.' : 'No rows found in this dataset.'}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                    {(page - 1) * limit + index + 1}
                  </td>
                  {columns.map((col) => {
                    const val = row[col.key];
                    const isNull = val === null || val === undefined || val === '';
                    return (
                      <td key={col.key} className="py-2.5 px-4 whitespace-nowrap">
                        {isNull ? (
                          <span className="text-slate-300 italic">—</span>
                        ) : typeof val === 'number' ? (
                          val.toLocaleString()
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="text-center sm:text-left">
          Showing <span className="font-semibold text-slate-700">{rows.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">
            {Math.min(page * limit, data.totalRows)}
          </span>{' '}
          of <span className="font-semibold text-slate-700">{data.totalRows}</span> entries
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="font-medium text-slate-700">
            Page {page} of {Math.max(1, data.totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;


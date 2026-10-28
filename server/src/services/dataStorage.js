const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Dataset = require('../models/Dataset');
const AnalysisHistory = require('../models/AnalysisHistory');

// In-Memory store for zero-config development when MongoDB is offline
const memoryStore = {
  users: [],
  datasets: [],
  history: [],
};

const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// ==================== USER OPERATIONS ====================
const findUserByEmail = async (email, selectPassword = false) => {
  const norm = email.toLowerCase().trim();
  if (isMongoConnected()) {
    const q = User.findOne({ email: norm });
    if (selectPassword) q.select('+password');
    return q.exec();
  }
  // In-memory fallback
  const user = memoryStore.users.find((u) => u.email === norm);
  if (!user) return null;
  return {
    ...user,
    _id: user.id,
    comparePassword: async (candidate) => bcrypt.compare(candidate, user.password),
    toJSON: () => {
      const { password, ...rest } = user;
      return { ...rest, _id: user.id };
    },
    save: async function () {
      const idx = memoryStore.users.findIndex((u) => u.id === user.id);
      if (idx !== -1) memoryStore.users[idx] = this;
      return this;
    },
  };
};

const findUserById = async (id) => {
  if (isMongoConnected()) {
    return User.findById(id);
  }
  const user = memoryStore.users.find((u) => u.id === String(id) || u._id === String(id));
  if (!user) return null;
  return {
    ...user,
    _id: user.id,
    comparePassword: async (candidate) => bcrypt.compare(candidate, user.password),
    toJSON: () => {
      const { password, ...rest } = user;
      return { ...rest, _id: user.id };
    },
    save: async function () {
      const idx = memoryStore.users.findIndex((u) => u.id === user.id);
      if (idx !== -1) memoryStore.users[idx] = this;
      return this;
    },
  };
};

const createUser = async ({ name, email, password, googleId = null, avatar = '', isEmailVerified = false }) => {
  const norm = email.toLowerCase().trim();
  if (isMongoConnected()) {
    return User.create({ name, email: norm, password, googleId, avatar, isEmailVerified });
  }

  // Hash password for in-memory user
  let hashedPassword = password;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  }

  const newId = 'mem_user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const userObj = {
    id: newId,
    _id: newId,
    name: name.trim(),
    email: norm,
    password: hashedPassword,
    googleId,
    avatar,
    isEmailVerified,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryStore.users.push(userObj);

  return {
    ...userObj,
    comparePassword: async (candidate) => bcrypt.compare(candidate, userObj.password),
    toJSON: () => {
      const { password: _, ...rest } = userObj;
      return rest;
    },
    save: async function () {
      return this;
    },
  };
};

// ==================== DATASET OPERATIONS ====================
const createDataset = async (datasetData) => {
  if (isMongoConnected()) {
    return Dataset.create(datasetData);
  }

  const newId = 'mem_ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const datasetObj = {
    ...datasetData,
    _id: newId,
    id: newId,
    owner: {
      equals: (otherId) => String(otherId) === String(datasetData.owner),
      toString: () => String(datasetData.owner),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: async function () {
      const idx = memoryStore.datasets.findIndex((d) => d._id === this._id);
      if (idx !== -1) memoryStore.datasets[idx] = this;
      return this;
    },
  };

  memoryStore.datasets.unshift(datasetObj);
  return datasetObj;
};

const getDatasetsByOwner = async (ownerId) => {
  if (isMongoConnected()) {
    return Dataset.find({ owner: ownerId }).select('-records').sort({ createdAt: -1 });
  }

  return memoryStore.datasets
    .filter((d) => String(d.owner?.toString ? d.owner.toString() : d.owner) === String(ownerId))
    .map(({ records, ...rest }) => rest);
};

const getDatasetById = async (id) => {
  if (isMongoConnected()) {
    return Dataset.findById(id);
  }

  const ds = memoryStore.datasets.find((d) => String(d._id) === String(id));
  if (!ds) return null;
  return {
    ...ds,
    owner: {
      equals: (otherId) => String(otherId) === String(ds.owner?.toString ? ds.owner.toString() : ds.owner),
      toString: () => String(ds.owner?.toString ? ds.owner.toString() : ds.owner),
    },
    save: async function () {
      const idx = memoryStore.datasets.findIndex((d) => d._id === this._id);
      if (idx !== -1) memoryStore.datasets[idx] = this;
      return this;
    },
  };
};

const deleteDatasetById = async (id) => {
  if (isMongoConnected()) {
    await AnalysisHistory.deleteMany({ dataset: id });
    return Dataset.findByIdAndDelete(id);
  }

  memoryStore.datasets = memoryStore.datasets.filter((d) => String(d._id) !== String(id));
  memoryStore.history = memoryStore.history.filter((h) => String(h.dataset) !== String(id));
  return true;
};

// ==================== HISTORY OPERATIONS ====================
const createHistory = async (historyData) => {
  if (isMongoConnected()) {
    return AnalysisHistory.create(historyData);
  }

  const newId = 'mem_hist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const histObj = {
    ...historyData,
    _id: newId,
    id: newId,
    createdAt: new Date(),
  };

  memoryStore.history.push(histObj);
  return histObj;
};

const getHistoryByDataset = async (datasetId) => {
  if (isMongoConnected()) {
    return AnalysisHistory.find({ dataset: datasetId }).sort({ createdAt: 1 });
  }

  return memoryStore.history.filter((h) => String(h.dataset) === String(datasetId));
};

module.exports = {
  isMongoConnected,
  findUserByEmail,
  findUserById,
  createUser,
  createDataset,
  getDatasetsByOwner,
  getDatasetById,
  deleteDatasetById,
  createHistory,
  getHistoryByDataset,
};


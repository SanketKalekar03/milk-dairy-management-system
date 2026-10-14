import 'dotenv/config';
import dns from 'node:dns';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';

// Ensure DNS SRV lookups work reliably on networks that block or reject local SRV queries
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

const recordSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  milkType: { type: String, enum: ['Cow', 'Buffalo'], required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  rate: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
const MilkRecord = mongoose.model('MilkRecord', recordSchema);

// In-memory fallback stores so the app works seamlessly even if MongoDB Atlas IP is not yet whitelisted
let isDbConnected = false;
let memCustomers = [
  { _id: '670000000000000000000001', name: 'Asha Patil', createdAt: new Date() },
  { _id: '670000000000000000000002', name: 'Ramesh Jadhav', createdAt: new Date() },
];
let memRecords = [
  {
    _id: '670000000000000000000003',
    customer: { _id: '670000000000000000000001', name: 'Asha Patil' },
    milkType: 'Cow',
    quantity: 10,
    rate: 60,
    totalAmount: 600,
    date: new Date(),
    createdAt: new Date(),
  }
];

// Status endpoint
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'online',
    database: isDbConnected ? 'connected' : 'memory_fallback',
    message: isDbConnected ? 'Connected to MongoDB Atlas' : 'Running in local mode (MongoDB connecting / offline)'
  });
});

app.get('/api/customers', async (_req, res, next) => {
  try {
    if (isDbConnected) {
      return res.json(await Customer.find().sort({ name: 1 }));
    }
    res.json(memCustomers.slice().sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error) { next(error); }
});

app.post('/api/customers', async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'Customer name is required.' });

    if (isDbConnected) {
      return res.status(201).json(await Customer.create({ name }));
    }

    const newCustomer = {
      _id: new mongoose.Types.ObjectId().toString(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memCustomers.push(newCustomer);
    res.status(201).json(newCustomer);
  } catch (error) { next(error); }
});

app.get('/api/records', async (_req, res, next) => {
  try {
    if (isDbConnected) {
      return res.json(await MilkRecord.find().populate('customer', 'name').sort({ date: -1, createdAt: -1 }));
    }
    res.json(memRecords.slice().sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (error) { next(error); }
});

app.post('/api/records', async (req, res, next) => {
  try {
    const { customerId, milkType, quantity, rate, date } = req.body;
    const litres = Number(quantity);
    const price = Number(rate);
    if (!mongoose.isValidObjectId(customerId) || !['Cow', 'Buffalo'].includes(milkType) || !Number.isFinite(litres) || litres <= 0 || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: 'Enter a customer, milk type, positive quantity, and valid rate.' });
    }

    if (isDbConnected) {
      if (!await Customer.exists({ _id: customerId })) return res.status(404).json({ message: 'Customer not found.' });
      const record = await MilkRecord.create({ customer: customerId, milkType, quantity: litres, rate: price, totalAmount: litres * price, ...(date && { date }) });
      return res.status(201).json(await record.populate('customer', 'name'));
    }

    const customer = memCustomers.find((c) => c._id.toString() === customerId.toString());
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    const newRecord = {
      _id: new mongoose.Types.ObjectId().toString(),
      customer: { _id: customer._id, name: customer.name },
      milkType,
      quantity: litres,
      rate: price,
      totalAmount: litres * price,
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
    };
    memRecords.unshift(newRecord);
    res.status(201).json(newRecord);
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Server error. Check the backend and database connection.' });
});

const port = process.env.PORT || 5000;

// Start server immediately so frontend is never blocked
app.listen(port, () => {
  console.log(`Milk dairy API running on port ${port}`);
  connectMongo();
});

async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI not specified. Using in-memory fallback.');
    return;
  }
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isDbConnected = true;
    console.log('MongoDB Atlas connected successfully!');
  } catch (error) {
    isDbConnected = false;
    console.warn('MongoDB connection note:', error.message);
    console.warn('API is running in resilient in-memory mode so your app is fully functional.');
  }
}

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
mongoose.set('bufferCommands', false);

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

// Status endpoint
app.get('/api/status', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'online' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
    message: connected ? 'Connected to MongoDB' : 'MongoDB is not connected.',
  });
});

app.use('/api/customers', requireDatabase);
app.use('/api/records', requireDatabase);

app.get('/api/customers', async (_req, res, next) => {
  try {
    res.json(await Customer.find().sort({ name: 1 }));
  } catch (error) { next(error); }
});

app.post('/api/customers', async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'Customer name is required.' });

    res.status(201).json(await Customer.create({ name }));
  } catch (error) { next(error); }
});

app.get('/api/records', async (_req, res, next) => {
  try {
    res.json(await MilkRecord.find().populate('customer', 'name').sort({ date: -1, createdAt: -1 }));
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

    if (!await Customer.exists({ _id: customerId })) return res.status(404).json({ message: 'Customer not found.' });
    const record = await MilkRecord.create({ customer: customerId, milkType, quantity: litres, rate: price, totalAmount: litres * price, ...(date && { date }) });
    res.status(201).json(await record.populate('customer', 'name'));
  } catch (error) { next(error); }
});

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database unavailable. Check the MongoDB connection and try again.' });
  }
  next();
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Server error. Check the backend and database connection.' });
});

const port = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Configure it in server/.env before starting the API.');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  app.listen(port, () => console.log(`Milk dairy API running on port ${port} with MongoDB connected`));
}

startServer().catch((error) => {
  console.error('Unable to start the API:', error.message);
  process.exitCode = 1;
});

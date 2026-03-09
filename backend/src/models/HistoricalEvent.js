import mongoose from 'mongoose';

const historicalEventSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  month: { type: Number, required: true },
  event: { type: String, required: true },
  type: { type: String, enum: ['VietnamWar', 'UncleHo', 'UncleHoQuote'], required: true },
});

// Create compound index for fast lookups
historicalEventSchema.index({ month: 1, day: 1 });

const HistoricalEvent = mongoose.model('HistoricalEvent', historicalEventSchema);

export default HistoricalEvent;

import mongoose from 'mongoose';
import HistoricalEvent from '../models/HistoricalEvent.js';

export const getEventByDate = async (req, res) => {
  try {
    const { month, day } = req.params;
    const searchMonth = parseInt(month, 10);
    const searchDay = parseInt(day, 10);

    if (isNaN(searchMonth) || isNaN(searchDay)) {
      return res.status(400).json({ error: 'Ngày tháng không hợp lệ' });
    }

    // First try finding a Vietnam War event on this day
    let eventObj = await HistoricalEvent.findOne({
      month: searchMonth,
      day: searchDay,
      type: 'VietnamWar'
    });

    // If not found, try an Uncle Ho event on this day
    if (!eventObj) {
      eventObj = await HistoricalEvent.findOne({
        month: searchMonth,
        day: searchDay,
        type: 'UncleHo'
      });
    }

    // If still not found, finally get the Uncle Ho Quote for this day
    if (!eventObj) {
      eventObj = await HistoricalEvent.findOne({
        month: searchMonth,
        day: searchDay,
        type: 'UncleHoQuote'
      });
    }

    // Failsafe grab a random Uncle Ho quote
    if (!eventObj) {
      const quoteCount = await HistoricalEvent.countDocuments({ type: 'UncleHoQuote' });
      if (quoteCount > 0) {
        const randomSkip = Math.floor(Math.random() * quoteCount);
        eventObj = await HistoricalEvent.findOne({ type: 'UncleHoQuote' }).skip(randomSkip);
      }
    }

    if (!eventObj) {
      return res.status(200).json({ event: 'Hôm nay nhắc nhở chúng ta luôn nỗ lực vì tương lai.', type: 'General' });
    }

    res.status(200).json({ event: eventObj.event, type: eventObj.type });
  } catch (error) {
    console.error('Error fetching historical event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

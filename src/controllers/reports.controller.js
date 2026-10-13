const Attendance = require('../models/Attendance');
const AidDelivery = require('../models/AidDelivery');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, isValidMonth } = require('../utils/dates');

// GET /api/reports/summary?date=YYYY-MM-DD  o  ?month=YYYY-MM
exports.summary = async (req, res) => {
  const { date, month } = req.query;
  let match;
  let period;

  if (month) {
    if (!isValidMonth(month)) throw new HttpError(400, 'month debe tener formato YYYY-MM');
    match = { date: { $regex: `^${month}` } };
    period = { month };
  } else {
    const day = date || todayISO();
    if (!isValidDate(day)) throw new HttpError(400, 'date debe tener formato YYYY-MM-DD');
    match = { date: day };
    period = { date: day };
  }

  const [attendanceByChild, pendingPickup, aidByKit, aidByChild] = await Promise.all([
    Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$child',
          arrivals: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'entregado'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'children', localField: '_id', foreignField: '_id', as: 'child' } },
      { $unwind: '$child' },
      {
        $project: {
          _id: 0,
          childId: '$_id',
          name: '$child.name',
          classroom: '$child.classroom',
          arrivals: 1,
          delivered: 1,
        },
      },
      { $sort: { name: 1 } },
    ]),
    Attendance.countDocuments({ ...match, status: 'presente' }),
    AidDelivery.aggregate([
      { $match: match },
      { $group: { _id: '$kitType', deliveries: { $sum: 1 }, units: { $sum: '$quantity' } } },
      { $project: { _id: 0, kitType: '$_id', deliveries: 1, units: 1 } },
      { $sort: { kitType: 1 } },
    ]),
    AidDelivery.aggregate([
      { $match: match },
      { $group: { _id: '$child', deliveries: { $sum: 1 }, units: { $sum: '$quantity' } } },
      { $lookup: { from: 'children', localField: '_id', foreignField: '_id', as: 'child' } },
      { $unwind: '$child' },
      { $project: { _id: 0, childId: '$_id', name: '$child.name', deliveries: 1, units: 1 } },
      { $sort: { name: 1 } },
    ]),
  ]);

  res.json({
    period,
    totals: {
      childrenAttended: attendanceByChild.length,
      pendingPickup,
      aidDeliveries: aidByKit.reduce((s, k) => s + k.deliveries, 0),
      aidUnits: aidByKit.reduce((s, k) => s + k.units, 0),
    },
    attendanceByChild,
    aidByChild,
    aidByKit,
  });
};

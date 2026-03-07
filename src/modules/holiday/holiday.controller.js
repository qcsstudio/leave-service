const service = require("./holiday.service");

exports.addHoliday = async (req, res) => {
  try {
    if (!["HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only HR can add holidays" });
    }

    const { name, date, type, description } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: "Name and date are required" });
    }

    const data = await service.addHoliday({
      companyId: req.user.companyId,
      name,
      date,
      type,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({ message: "Holiday added", data });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.getHolidays = async (req, res) => {
  try {
    const { year } = req.query;

    const data = await service.getHolidays({
      companyId: req.user.companyId,
      year: year ? Number(year) : undefined
    });

    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    if (!["HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only HR can update holidays" });
    }

    const { name, date, type, description } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (date) updates.date = date;
    if (type) updates.type = type;
    if (description !== undefined) updates.description = description;

    const data = await service.updateHoliday({
      companyId: req.user.companyId,
      holidayId: req.params.holidayId,
      updates
    });

    res.json({ message: "Holiday updated", data });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    if (!["HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only HR can delete holidays" });
    }

    await service.deleteHoliday({
      companyId: req.user.companyId,
      holidayId: req.params.holidayId
    });

    res.json({ message: "Holiday deleted" });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.upcomingHolidays = async (req, res) => {
  try {
    const data = await service.getUpcomingHolidays({
      companyId: req.user.companyId,
      limit: req.query.limit ? Number(req.query.limit) : 5
    });

    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

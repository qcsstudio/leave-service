const service = require("./device.service");

// Map frontend deviceType → backend enum
const typeMap = {
  Biometric_Scanner: "FINGERPRINT",
  Facial_Recognition: "FACE",
  RFID_Card_Reader: "RFID",
  Smart_Lock: "LOCK" // optional if you want to support Smart Lock later
};

exports.addDevice = async (req,res) => {
  try {

    if (!req.body.name || !req.body.deviceType) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Map frontend type to backend enum
    const deviceType = typeMap[req.body.deviceType];
    if (!deviceType) {
      return res.status(400).json({ message: "Invalid deviceType" });
    }

    const device = await service.createDevice({
      ...req.body,
      deviceType,             // use mapped type
      companyId: req.user.companyId
    });

    res.json({
      message: "Device registered",
      device
    });

  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};


exports.listDevices = async (req,res)=>{
  const data = await service.getDevices(req.user.companyId);
  res.json(data);
};


exports.removeDevice = async (req,res)=>{
  await service.deleteDevice(
    req.params.id,
    req.user.companyId
  );

  res.json({message:"Deleted"});
};

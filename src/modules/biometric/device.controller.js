const service = require("./device.service");

exports.addDevice = async (req,res)=>{
  try{

    if(!req.body.name || !req.body.deviceType){
      return res.status(400).json({message:"Missing fields"});
    }

    const device = await service.createDevice({
      ...req.body,
      companyId:req.user.companyId
    });

    res.json({
      message:"Device registered",
      device
    });

  }catch(e){
    res.status(400).json({message:e.message});
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

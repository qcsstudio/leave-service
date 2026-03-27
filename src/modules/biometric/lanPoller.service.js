



// const util = require('util');
// const exec = util.promisify(require('child_process').exec);
// const ZKLib = require('node-zklib');
// const DeviceModel = require("./device.model");

// const DEFAULT_PORT = 4370;

// // :mag: Ping check
// async function isReachableByPing(ip) {
//   try {
//     await exec(`ping -c 1 -W 1 ${ip}`);
//     return true;
//   } catch {
//     return false;
//   }
// }

// // :repeat: Retry connection
// async function connectWithRetries(ip, port, attempts = 3, timeout = 10000) {
//   let lastErr;

//   for (let i = 0; i < attempts; i++) {
//     try {
//       const zk = new ZKLib(ip, port, timeout, 4000);
//       await zk.createSocket();
//       return zk;
//     } catch (err) {
//       lastErr = err;
//       const delay = 1000 * (i + 1);
//       console.log(`:repeat: Retry ${i + 1} in ${delay}ms`);
//       await new Promise(r => setTimeout(r, delay));
//     }
//   }

//   throw lastErr;
// }

// // :inbox_tray: Fetch logs
// async function fetchLogsFromDevice(device) {
//   let zk;
//   const port = device.port || DEFAULT_PORT;

//   // :white_check_mark: FIX: handle all IP formats
//   const ip = device.ipAddress || device.ip || device.ip_address;

//   console.log(":receipt: Device Data:", device);

//   // :x: Prevent crash
//   if (!ip) {
//     console.error(":x: Missing IP for device:", device.name);
//     return [];
//   }

//   console.log(`:satellite_antenna: Connecting to ${device.name} (${ip})`);

//   try {
//     const reachable = await isReachableByPing(ip);

//     if (!reachable) {
//       console.warn(":warning: Device not reachable, trying anyway...");
//     }

//     zk = await connectWithRetries(ip, port);

//     console.log(":white_check_mark: Connected");

//     const logs = await zk.getAttendances();
//     const data = logs?.data || [];

//     console.log(`:inbox_tray: Logs received: ${data.length}`);

//     return data.map(log => ({
//       employeeCode: log.deviceUserId,
//       timestamp: log.recordTime
//     }));

//   } catch (err) {
//     console.error(`:x: Error (${ip}):`, err);
//     return [];
//   } finally {
//     if (zk) {
//       try {
//         await zk.disconnect();
//         console.log(":electric_plug: Disconnected");
//       } catch {}
//     }
//   }
// }

// // :fire: MAIN POLLER
// async function pollDevices() {
//   console.log(":arrows_counterclockwise: Checking biometric devices...");

//   try {
//     const devices = await DeviceModel.find();

//     if (!devices || devices.length === 0) {
//       console.log(":warning: No devices found in DB");
//       return;
//     }

//     for (const dev of devices) {

//       // :dart: ONLY YOUR DEVICE (IMPORTANT)
//       if (dev.ipAddress !== "192.168.1.19") {
//         console.log(`:black_right_pointing_double_triangle_with_vertical_bar: Skipping: ${dev.name}`);
//         continue;
//       }

//       const logs = await fetchLogsFromDevice(dev);

//       console.log(`:white_check_mark: ${dev.name}: ${logs.length} logs`);
//     }

//   } catch (err) {
//     console.error(":x: Poller Error:", err.message);
//   }
// }

// // :white_check_mark: EXPORT
// module.exports = {
//   pollDevices
// };



const util = require('util');
const exec = util.promisify(require('child_process').exec);
const ZKLib = require('zklib-js');
const DeviceModel = require("./device.model");
const BiometricEvent = require("./biometricEvent.model");
const processor = require("./event.processor");

const DEFAULT_PORT = 4370;

/**
 * ping check
 */
async function isReachableByPing(ip) {
  const pingCmd = process.platform === 'win32'
    ? `ping -n 1 -w 1000 ${ip}`
    : `ping -c 1 -W 1 ${ip}`;

  console.log(`[PING] checking reachability for ${ip}`);

  try {
    await exec(pingCmd);
    console.log(`[PING] success → ${ip} reachable`);
    return true;
  } catch (err) {
    console.warn(`[PING] failed → ${ip} not reachable`);
    return false;
  }
}

/**
 * retry connection
 */
async function connectWithRetries(ip, port, attempts = 3, timeout = 10000) {
  let lastErr;

  for (let i = 0; i < attempts; i++) {
    const attempt = i + 1;
    const zk = new ZKLib(ip, port, timeout, 4000);

    console.log(`[SOCKET] attempt ${attempt}/${attempts} → ${ip}:${port}`);

    try {
      const start = Date.now();

      await zk.createSocket();

      const duration = Date.now() - start;
      console.log(`[SOCKET] connected in ${duration}ms → ${ip}`);

      return zk;
    } catch (err) {
      lastErr = err;

      console.error(`[SOCKET] failed attempt ${attempt} → ${ip}`);
      console.error(`[SOCKET] reason: ${err.message}`);

      try { await zk.disconnect(); } catch {}

      const delay = 1000 * attempt;
      console.log(`[SOCKET] retrying in ${delay}ms...\n`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  console.error(`[SOCKET] all retries failed → ${ip}`);
  throw lastErr;
}

/**
 * find device
 */
async function findDevice(deviceSerialOrName) {
  console.log(`[DB] searching device → ${deviceSerialOrName}`);

  const device = await DeviceModel.findOne({
    $or: [
      { serialNumber: deviceSerialOrName },
      { name: { $regex: deviceSerialOrName, $options: "i" } }
    ]
  });

  if (device) {
    console.log(`[DB] device found → ${device.name}`);
  } else {
    console.warn(`[DB] device not found → ${deviceSerialOrName}`);
  }

  return device;
}

/**
 * fetch logs
 */
async function fetchLogsFromDevice(deviceSerialOrName) {
  let zk = null;

  console.log(`\n==============================`);
  console.log(`[DEVICE] starting → ${deviceSerialOrName}`);
  console.log(`==============================`);

  try {
    const device = await findDevice(deviceSerialOrName);

    if (!device) {
      return { device: null, logs: [] };
    }

    const port = device.port || DEFAULT_PORT;
    const ip = device.ipAddress || device.ip || device.ip_address;
    const deviceName = device.name || "Unknown Device";

    console.log(`[DEVICE] ${deviceName} → ip: ${ip}, port: ${port}`);

    if (!ip) {
      console.error(`[DEVICE] missing ip → ${deviceName}`);
      return { device, logs: [] };
    }

    // ping
    await isReachableByPing(ip);

    // connect
    zk = await connectWithRetries(ip, port);

    // fetch logs
    console.log(`[FETCH] getting attendance logs → ${deviceName}`);

    const startFetch = Date.now();
    const logs = await zk.getAttendances();
    const duration = Date.now() - startFetch;

    const data = logs?.data || [];

    console.log(`[FETCH] received ${data.length} logs in ${duration}ms`);

    return {
      device,
      logs: data.map(log => ({
        employeeCode: log.deviceUserId,
        timestamp: log.recordTime,
        deviceName,
        ip
      }))
    };

  } catch (err) {
    console.error(`[ERROR] device failed → ${deviceSerialOrName}`);
    console.error(`[ERROR] ${err.message}`);
    return { device: null, logs: [] };
  } finally {
    if (zk) {
      try {
        await zk.disconnect();
        console.log(`[SOCKET] disconnected`);
      } catch {}
    }
  }
}

/**
 * main poller
 */
async function pollDevices() {
  console.log(`\n==============================`);
  console.log(`[START] biometric sync started`);
  console.log(`[TIME] ${new Date().toISOString()}`);
  console.log(`==============================\n`);

  try {
    const devices = await DeviceModel.find({
      connectionMode: { $in: ["LAN", "LAN/IP"] },
      isActive: true
    });

    console.log(`[DB] total active devices → ${devices.length}`);

    if (!devices || devices.length === 0) {
      console.warn(`[DB] no devices found`);
      return;
    }

    const results = await Promise.allSettled(
      devices.map(dev =>
        fetchLogsFromDevice(dev.serialNumber || dev.name)
      )
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const devName = devices[i].name;

      console.log(`\n[PROCESS] device → ${devName}`);

      if (result.status === 'rejected') {
        console.error(`[PROCESS] failed → ${result.reason}`);
        continue;
      }

      const { device: resolvedDevice, logs } = result.value;

      if (!resolvedDevice) {
        console.warn(`[PROCESS] skipped → device not resolved`);
        continue;
      }

      console.log(`[PROCESS] logs to process → ${logs.length}`);

      for (const log of logs) {
        console.log(`[LOG] ${log.employeeCode} → ${log.timestamp}`);

        const exists = await BiometricEvent.findOne({
          deviceId: resolvedDevice._id,
          employeeCode: log.employeeCode,
          timestamp: log.timestamp
        });

        if (exists) {
          console.log(`[DUPLICATE] skipped → ${log.employeeCode}`);
          continue;
        }

        try {
          await processor.processEvent({
            device: resolvedDevice,
            employeeCode: log.employeeCode,
            timestamp: log.timestamp,
            rawPayload: log
          });

          console.log(`[SUCCESS] processed → ${log.employeeCode}`);
        } catch (err) {
          console.error(`[PROCESS ERROR] ${log.employeeCode}`);
          console.error(err.message);
        }
      }
    }

    console.log(`\n[END] biometric sync complete\n`);

  } catch (err) {
    console.error(`[CRITICAL] poller failed`);
    console.error(err.message);
  }
}

module.exports = {
  pollDevices,
  findDevice,
  fetchLogsFromDevice
};
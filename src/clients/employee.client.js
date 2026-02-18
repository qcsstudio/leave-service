const axios = require("axios");

const BASE =
  process.env.EMPLOYEE_SERVICE_URL ||
  "http://localhost:5000";

exports.findByBiometricCode = async (
  code,
  companyId
) => {
  try {

    const res = await axios.get(
      `${BASE}/employees/internal/employee/biometric`,
      {
        params: { code, companyId }
      }
    );

    return res.data;

  } catch (err) {
    return null;
  }
};

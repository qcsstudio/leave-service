exports.receive = (req, res) => {
  console.log("🔥 ADMS HIT");
  console.log("Headers:", req.headers);
  console.log("Query:", req.query);
  console.log("Body:", req.body);

  res.send("OK");
};
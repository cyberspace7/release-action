const globalSetup = () => {
  process.env.TZ = "UTC";
  process.env["NODE_ENV"] = "test";
};

module.exports = globalSetup;

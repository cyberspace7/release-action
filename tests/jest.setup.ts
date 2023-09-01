const globalSetup = () => {
  process.env.TZ = "UTC";
  process.env["NODE_ENV"] = "test";
};

export default globalSetup;

export const env = {
  port: Number(process.env.PORT ?? 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
  sessionCookieName: "sc_session",
  dataFile: process.env.CARACOL_DATA_FILE ?? `${process.cwd()}/data/users.json`,
};

export const isDevelopment = env.nodeEnv === "development";
export const isTest = env.nodeEnv === "test";

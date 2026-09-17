import { LogLevel } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "a8b09661-e072-43e9-945e-41512d641ccb",

    authority:
      "https://login.microsoftonline.com/8450369b-11fa-4413-8dc7-060ab9f34f41",

    redirectUri: "http://localhost:5173",
  },

  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },

  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;

        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;

          case LogLevel.Warning:
            console.warn(message);
            break;

          default:
            break;
        }
      },
    },
  },
};

export const powerBIRequest = {
  scopes: [
    "https://analysis.windows.net/powerbi/api/Report.Read.All",
  ],
};
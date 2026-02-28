import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [".next/**"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
];

export default config;

var defaultTheme = require('tailwindcss/defaultTheme');
// let notoSans = require('@fontsource/noto-sans');

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['noto-sans', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};

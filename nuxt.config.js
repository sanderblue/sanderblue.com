export default {
  mode: 'universal',

  /**
   * Headers of the page
   */
  head: {
    title: process.env.npm_package_name || 'Sander Blue',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content:
          process.env.npm_package_description ||
          "Hi, my name is Sander Blue and I'm a software engineer.",
      },
      {
        name: 'author',
        content: 'Sander Blue',
      },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },

  /**
   * Customize the progress-bar color
   */
  loading: { color: '#fff' },

  /**
   * Global CSS
   */
  css: ['~assets/scss/global.scss'],

  /**
   * Global Sass
   */
  styleResources: {
    scss: ['./assets/scss/*.scss'],
  },

  /**
   * Plugins to load before mounting the App
   */
  plugins: [],

  /**
   * Nuxt.js dev-modules
   */
  buildModules: [
    '@nuxt/typescript-build',
    // Doc: https://github.com/nuxt-community/nuxt-tailwindcss
    '@nuxtjs/tailwindcss',
  ],

  /**
   * Nuxt.js modules
   */
  modules: ['@nuxtjs/style-resources'],

  /**
   * Build configuration
   */
  build: {
    /**
     * You can extend webpack config here
     */
    extend(config, ctx) {},
  },
};

module.exports = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
      'postcss-purgecss': {
        content: [
          './public/index.html',
          './public/js/**/*.js',
        ],
        safelist: [
          'btn',
          'btn-primary',
          'btn-ghost',
          'btn-xs',
          'input',
          'input-bordered',
          'alert',
          'alert-success',
          'alert-error',
          'alert-info',
          'label',
          'label-text',
          'form-control',
          /^::backdrop/,
        ],
      },
    },
  };
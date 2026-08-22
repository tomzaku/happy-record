module.exports = api => {
  const isTest = api.env('test');

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current',
          },
        },
      ],
      '@babel/preset-typescript',
      // Needed for .tsx JSX (moon-ui, page packages, etc). `runtime: 'automatic'`
      // matches tsconfig.json's `"jsx": "react-jsx"` — no `import React` needed.
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
    // Only under Jest: see scripts/babel-plugin-import-meta-env.js for why.
    plugins: isTest ? [require.resolve('./scripts/babel-plugin-import-meta-env.js')] : [],
  };
};

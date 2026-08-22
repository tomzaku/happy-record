// Jest runs everything as CommonJS, but a few modules read Vite-injected env
// vars via `import.meta.env` (packages/global/src/lib/{api,supabase}.ts).
// `import.meta` is only valid inside a real ES module, so left untouched it's
// a runtime SyntaxError under Jest even though Babel happily parses it.
// Vite handles `import.meta.env` itself at build/dev time, so this only
// needs to run for the test env (wired up in babel.config.js) — swap
// `import.meta` for an object backed by `process.env` so `import.meta.env.X`
// keeps working the same way Vite's `.env` loading does (see web/.env.example).
module.exports = function importMetaEnvPlugin() {
  return {
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWithSourceString('({ env: process.env })');
        }
      },
    },
  };
};

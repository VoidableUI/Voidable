// Vite's ?raw imports, used by Reference.stories.ts to load the screens.
declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
}

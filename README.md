# Chitrapata - WebGL Canvas Editor

A React-based WebGL canvas editor built with TypeScript and Vite, featuring interactive drawing tools and selection controls.

## Technologies Used

- React 18
- TypeScript
- Vite
- WebGL
- Tailwind CSS
- Zustand (for state management)

## Features

- Interactive WebGL canvas
- Drawing tools
- Selection controls
- Toolbar for various operations
- State management via Zustand

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Running the Project

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/        # React components
│   ├── Canvas.tsx     # Main WebGL canvas
│   ├── SelectionControls.tsx  # Selection tools
│   └── Toolbar.tsx    # Drawing tools
├── lib/webgl/         # WebGL utilities
│   ├── context.ts     # WebGL context management
│   ├── shapes.ts      # Shape rendering
│   └── types.ts       # Type definitions
├── store/             # State management
│   └── canvasStore.ts # Zustand store for canvas state
├── App.tsx            # Main application
└── main.tsx           # Entry point
```

## ESLint Configuration (from template)

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## License

MIT
